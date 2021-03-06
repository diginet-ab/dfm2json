import { DObject, Property, StringValue, LiteralString } from '@postdfm/ast'
import { AnyList } from '@postdfm/ast/list/AnyList'
import { DoubleValue } from '@postdfm/ast/value/doubleValue'
import { IntegerValue } from '@postdfm/ast/value/integerValue'
import { VariantValue } from '@postdfm/ast/value/variantValue'
import { IdentifierValue } from '@postdfm/ast/value/identifierValue'
import { VariantList } from '@postdfm/ast/list/variantList'
import { BinaryStringList } from '@postdfm/ast/list/binaryStringList'
import fsp from 'fs/promises'

type ChildObject = {
    [key: string]: undefined | string | number | { [key: string]: number } | ChildObject[]
    type?: string
    name?: string
    Caption?: string
    enum?: { [key: string]: number }
    children?: ChildObject[]
}

type SioxParameterObject = {
    type: string
    bit: number
    bitSize: number
    parameter: number
}

type SioxObject = {
    [key: string]: undefined | string | number | SioxObject | SioxParameterObject
    type?: string
}

const sioxPropertyName = ["enum", "Caption", "SioxBus", "ParameterNr", "MemoryType", "ParamMaskStr", "Scale", "Offset", "ParamMask"]
const useSioxPropertyName = ["enum", "caption", "sioxBus", "parameter", "memoryType", "paramMask", "scale", "offset", "paramMask"]

export const getPropertyValue = (prop: Property) => {
    let result
    const getReal = (prop: Property) => {
        const result = parseFloat(parseFloat((prop.value as DoubleValue).value.integer + '0.' + (prop.value as DoubleValue).value.fraction).toFixed(6))
        return result
    }
    const getString = (prop: Property) => {
        let result = ''
        if (prop.value instanceof StringValue)
            result = prop.value.value.map(v => v.value).join('')
        return result
    }
    const getStringArray = (prop: VariantValue): string[] => {
        let result: string[] = []
        if (Array.isArray(prop.value) && prop.value.length > 0 && prop.value[0] instanceof LiteralString)
            result = prop.value.map(v => v.value)
        return result
    }
    switch ((prop.value as AnyList).astType) {
        case 'identifier': result = (prop.value as IdentifierValue).value as string; break
        case 'integer': result = parseInt((prop.value as IntegerValue).value as unknown as string) as number; break
        case 'double': result = getReal(prop) as number; break
        case 'single': result = getReal(prop) as number; break
        case 'string': result = getString(prop) as string; break
        case 'variantList': result = (prop.value as VariantList).values.map((p: VariantValue) => getStringArray(p)) as string[][]; break
        case 'binaryStringList': result = (prop.value as BinaryStringList).values.map(v => v.value).join(''); break
    }
    return result
}

export const findProperty = (node: DObject, name: string) => {
    let result
    for (const prop of node.properties) {
        if (prop.name === name) {
            result = prop
            break
        }
    }
    return result
}

export const getProperty = (node: DObject, name: string) => {
    let result
    for (const prop of node.properties) {
        if (prop.name === name) {
            result = getPropertyValue(prop)
            break
        }
    }
    return result
}

const getMaskBit = (mask: number) => {
    let bit = 0
    while (!(mask & 1) && bit < 9999) {
        bit++
        mask >>= 1
    }
    return bit
}

const getMaskBitSize = (mask: number) => {
    let bit = 0
    while (!(mask & 1) && bit < 9999) {
        bit++
        mask >>= 1
    }
    let size = 0
    while (mask & 1 && size < 9999) {
        size++
        mask >>= 1
    }
    return size
}

const getCaptionFromSomeLabel = (node: DObject, parent: DObject) => {
    let result: string | undefined
    const x = getProperty(node, 'Left') as number
    const y = getProperty(node, 'Top') as number
    for (const sib of parent.children) {
        // Check for label to the left
        if (sib.type === 'TLabel') {
            const c = getProperty(sib, 'Caption')
            if (c) {
                const cx = getProperty(sib, 'Left') as number
                const cy = getProperty(sib, 'Top') as number
                const cw = getProperty(sib, 'Width') as number
                if (cx < x && Math.abs(cy - y) < 5 && (cx + cw) < x) {
                    result = c as string
                    break
                }
            }
        }
    }
    if (!result) {
        for (const sib of parent.children) {
            // Check for label(s) above
            if (sib.type === 'TLabel') {
                const c = getProperty(sib, 'Caption')
                if (c) {
                    const cx = getProperty(sib, 'Left') as number
                    const cy = getProperty(sib, 'Top') as number
                    if (cy < y && Math.abs(cx - x) < 5) {
                        if (!result)
                            result = c as string
                        else
                            result += ' ' + c as string
                    }
                }
            }
        }
    }
    if (!result) {
        // Get group box caption
        if (parent.type === 'TGroupBox') {
            result = getProperty(parent, 'Caption') as string | undefined
        }
    }
    if (!result)
        result = node.name
    if (result)
        result += ' ??'
    return result
}

const saveChildObject = (obj: ChildObject, node: DObject, parent?: DObject) => {
    const isSIOX = node.properties.reduce((prev, val) => {
        return prev = prev || val.name === 'SioxBus'
    }, false)
    if (isSIOX) {
        obj.name = node.name
        //obj.astType = node.astType
        obj.type = node.type.substring(1)
        if (obj.type === 'VSRadioGroup') {
            obj.enum = {}
            const itemStrings = findProperty(node, 'Items.Strings')
            if (itemStrings) {
                const items = getPropertyValue(itemStrings) as string[][]
                const valueStrings = findProperty(node, 'Values.Strings')
                if (valueStrings) {
                    const values = getPropertyValue(valueStrings) as string[][]
                    for (const [index, item] of items.entries()) {
                        obj.enum[item[0]] = parseInt(values[index][0])
                    }
                }
            }
        }
        if (node.type === 'TVSEdit' && parent) {
            obj.Caption = getCaptionFromSomeLabel(node, parent)
        }
        for (const prop of node.properties) {
            if (sioxPropertyName.indexOf(prop.name) >= 0) {
                const val = getPropertyValue(prop) as string | number
                if (val) {
                    obj[prop.name] = val
                    if (prop.name === 'ParamMaskStr') {
                        const mask = parseInt('0x' + obj[prop.name])
                        delete obj[prop.name]
                        obj['bit'] = getMaskBit(mask)
                        obj['bitSize'] = getMaskBitSize(mask)
                    }
                }
            }
        }
    } else {
        switch (node.type) {
            case 'TTabbedNotebook':
            case 'TGroupBox':
            case 'TTabPage': {
                obj.name = node.name
                //obj.astType = node.astType
                obj.type = node.type.substring(1)
                const val = getProperty(node, 'Caption') as string
                if (val)
                    obj.Caption = val
                break;
            }
        }
    }
    if (node.children && node.children.length) {
        obj.children = []
        for (const child of node.children) {
            const objChild = {}
            obj.children.push(objChild)
            saveChildObject(objChild, child, node)
        }
    }
    if (obj.children) {
        // Remove empty children
        let index = 0
        while (index < obj.children.length) {
            if (Object.getOwnPropertyNames(obj.children[index]).length === 0)
                obj.children.splice(index, 1)
            else
                index++
        }
    }
}

export const saveAsJson = async (ast: DObject, fileName: string) => {
    const childObj: ChildObject = {}
    saveChildObject(childObj, ast, undefined)
    await fsp.writeFile(fileName, JSON.stringify(childObj, undefined, 2))
}

const getTypeFromVsType = (type: string) => {
    let result
    if (type) {
        switch (type) {
            case 'VSEdit': result = 'WORD'; break
            case 'VSText': result = 'STRING'; break
            case 'VSCheckbox': result = 'BIT'; break
        }
    }
    return result
}

const saveObject = (childObj: ChildObject, obj: SioxObject = {}) => {
    obj = Object.assign(obj, childObj)
    //obj = JSON.parse(JSON.stringify(childObj))
    if (obj['SioxBus'])
        delete obj['SioxBus']
    if (obj.type) {
        const type = getTypeFromVsType(obj.type)
        if (type)
            obj['type'] = type
        else
            delete obj['type']
    }
    if (childObj.children) {
        delete obj['children']
        let index = 1
        for (const child of childObj.children) {
            const getName = (child: ChildObject) => {
                let name = child.name
                if (!name)
                    name = child.type + index.toString()
                if (child.Caption) {
                    name = child.Caption
                    delete child['Caption']
                }
                if (name)
                    name = name.replace('&', '')
                return name as string
            }
            if (child.type !== 'TabbedNotebook') {
                const name = getName(child)
                obj[name] = {} as SioxObject
                saveObject(child, obj[name] as SioxObject)
                index++
            } else if (child.children) {
                for (const c of child.children) {
                    const name = getName(c)
                    obj[name] = {}
                    saveObject(c, obj[name] as SioxObject)
                    index++
                }
            }
        }
    }
    delete obj['name']
    return obj
}

const renameProperties = (obj: SioxObject) => {
    for (const prop in obj) {
        const index = sioxPropertyName.indexOf(prop)
        if (index >= 0 && sioxPropertyName[index] !== useSioxPropertyName[index]) {
            obj[useSioxPropertyName[index]] = obj[prop]
            delete obj[prop]
        }
        if (typeof obj[prop] === 'object')
            renameProperties(obj[prop] as SioxObject)
    }
}

export const saveAsObject = async (ast: DObject, fileName: string) => {
    const childObj: ChildObject = {}
    saveChildObject(childObj, ast, undefined)
    const obj = saveObject(childObj)
    renameProperties(obj)
    await fsp.writeFile(fileName, JSON.stringify(obj, undefined, 2))
}

