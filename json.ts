import { DObject, Property, StringValue, LiteralString } from '@postdfm/ast'
import { AnyList } from '@postdfm/ast/list/anyList'
import { DoubleValue } from '@postdfm/ast/value/doubleValue'
import { IntegerValue } from '@postdfm/ast/value/integerValue'
import { VariantValue } from '@postdfm/ast/value/variantValue'
import { IdentifierValue } from '@postdfm/ast/value/identifierValue'
import { VariantList } from '@postdfm/ast/list/variantList'
import { BinaryStringList } from '@postdfm/ast/list/binaryStringList'
import fsp from 'fs/promises'
import cjson from 'compressed-json'

type ChildObject = {
    [key: string]: undefined | string | number | { [key: string]: number } | ChildObject[]
    type?: string
    name?: string
    Caption?: string
    enum?: { key: string, value: number }[]
    children?: ChildObject[]
    ParameterNr?: number
    NumericType?: string
    bit?: number
    bitSize?: number
    scale?: number
    offset?: number
}

type SioxParameterObject = {
    type: string
    bit: number
    bitSize: number
    par: number
    scale?: number
    offset?: number
}

type SioxObjectChildren = (SioxObject | SioxFolderObject)[]

type SioxFolderObject = {
    [key: string]: string | SioxObjectChildren | undefined
    children?: SioxObjectChildren
}

type SioxObject = {
    [key: string]: undefined | string | number | boolean | { [key: string]: number } | SioxObject | SioxParameterObject | { key: string, value: number }[]
    type: string
    //name: string
    //displayName: string
    par: number
    bitSize?: number
    bit?: number
    scale?: number
    offset?: number
    setup?: boolean
    enum?: { key: string, value: number }[]
}

const sioxPropertyName = ["enum", "Caption", "SioxBus", "ParameterNr", "MemoryType", "ParamMaskStr", "Scale", "Offset", "ParamMask", "NumericType"]
const useSioxPropertyName = ["enum", "caption", "sioxBus", "parameter", "memoryType", "paramMask", "scale", "offset", "paramMask", "numericType"]

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
    if (!result && node.children) {
        // Check child labels
        for (const sib of node.children) {
            // Check for label(s) above
            if (sib.type === 'TLabel') {
                const c = getProperty(sib, 'Caption')
                if (c) {
                    const cx = getProperty(sib, 'Left') as number
                    const cy = getProperty(sib, 'Top') as number
                    if (cy < y && Math.abs(cx - x) <= 7) {
                        if (!result)
                            result = c as string
                        else
                            result += ' ' + c as string
                    }
                }
            }
        }
    }
    if (!result && findProperty(node, 'Items.Strings')) {
        const s = getProperty(node, 'Items.Strings') as string[][]
        if (s.length && s[0].length)
            result = s[0][0]
    }
    if (!result && parent.children) {
        for (const sib of parent.children) {
            // Check for label to the left
            if (sib.type === 'TLabel') {
                const c = getProperty(sib, 'Caption')
                if (c) {
                    const cx = getProperty(sib, 'Left') as number
                    const cy = getProperty(sib, 'Top') as number
                    const cw = getProperty(sib, 'Width') as number
                    if (cx < x && Math.abs(cy - y) <= 7 && (cx + cw) < x) {
                        result = c as string
                        break
                    }
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
                    if (cy < y && Math.abs(cx - x) <= 7) {
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
        return prev = prev || (val.name === 'SioxBus' && !(node.type === 'TVSVersion'))
    }, false)
    if (isSIOX) {
        obj.name = node.name
        //obj.astType = node.astType
        obj.type = node.type
        if (obj.type === 'TVSRadioGroup') {
            obj.enum = []
            const itemStrings = findProperty(node, 'Items.Strings')
            if (itemStrings) {
                const items = getPropertyValue(itemStrings) as string[][]
                const valueStrings = findProperty(node, 'Values.Strings')
                if (valueStrings) {
                    const values = getPropertyValue(valueStrings) as string[][]
                    for (const [index, item] of items.entries()) {
                        obj.enum.push({ key: item[0], value: parseInt(values[index][0]) })
                    }
                }
            }
        }
        for (const prop of node.properties) {
            if (sioxPropertyName.indexOf(prop.name) >= 0) {
                const val = getPropertyValue(prop) as string | number
                if (val) {
                    obj[prop.name] = val
                    if (prop.name === 'ParamMaskStr') {
                        const mask = parseInt('0x' + obj[prop.name])
                        delete obj[prop.name]
                        obj.bit = getMaskBit(mask)
                        obj.bitSize = getMaskBitSize(mask)
                    }
                    if (prop.name === 'Scale') {
                        obj.scale = parseFloat(obj[prop.name] as string)
                    }
                    if (prop.name === 'Offset') {
                        obj.offset = parseFloat(obj[prop.name] as string)
                    }
                }
            }
        }
        if (!obj.Caption && parent) {
            obj.Caption = getCaptionFromSomeLabel(node, parent)
            if (obj.Caption.indexOf('TVS') === 0)
                console.log(`No label found for ${node.name}`)
        }
        if (obj.parameter === undefined)
            obj.parameter = 0
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
            if (child.type !== 'TTabbedNotebook') {
                const objChild = {} as ChildObject
                obj.children.push(objChild)
                saveChildObject(objChild, child, node)
            } else {
                for (const subChild of child.children) {
                    const objChild = {} as ChildObject
                    obj.children.push(objChild)
                    saveChildObject(objChild, subChild, node)
                }
            }
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
    await fsp.writeFile(fileName, JSON.stringify(childObj))
}

const isSioxObject = (obj: object | ChildObject): obj is ChildObject => {
    if (obj)
        return (obj as ChildObject).SioxBus !== undefined
    else
        return false
}

let unnamedIndex = 0
const getName = (child: ChildObject) => {
    let name = child.name
    if (!name)
        name = child.type + (unnamedIndex++).toString()
    if (child.Caption)
        name = child.Caption
    if (name)
        name = name.replace('&', '')
    return name as string
}

const saveObject = (childObj: ChildObject, obj: SioxFolderObject | SioxObject = {}) => {
    if (isSioxObject(childObj)) {
        const sioxObj = obj as SioxObject
        //sioxObj.name = getName(childObj)
        //sioxObj.displayName = sioxObj.name
        if (childObj.ParameterNr)
            sioxObj.par = childObj.ParameterNr
        else
            sioxObj.par = 0
        switch (childObj.type) {
            case 'TVSCheckbox': {
                sioxObj.type = 'BOOL'
                sioxObj.bit = childObj.bit
                //sioxObj.bitSize = 1
            }
                break
            case 'TVSRadioGroup': {
                sioxObj.type = 'BOOL'
                sioxObj.bit = childObj.bit
                //sioxObj.bitSize = 1
            }
                break
            case 'TVSEdit': {
                sioxObj.type = childObj.NumericType ? ((childObj.NumericType.indexOf("igned") >= 0) ? 'INT' : 'WORD') : 'WORD'
                sioxObj.bit = childObj.bit ? childObj.bit : undefined
                sioxObj.bitSize = childObj.bitSize ? (childObj.bitSize != 16 ? childObj.bitSize : undefined) : undefined
                sioxObj.scale = childObj.scale ? childObj.scale : undefined
                sioxObj.offset = childObj.offset ? childObj.offset : undefined
            }
                break
            case 'TVSEdit32': {
                sioxObj.type = childObj.NumericType ? ((childObj.NumericType.indexOf("igned") >= 0) ? 'LINT' : 'DWORD') : 'DWORD'
                sioxObj.bit = childObj.bit ? childObj.bit : undefined
                sioxObj.bitSize = childObj.bitSize ? (childObj.bitSize != 32 ? childObj.bitSize : undefined) : undefined
                sioxObj.scale = childObj.scale ? childObj.scale : undefined
                sioxObj.offset = childObj.offset ? childObj.offset : undefined
            }
                break
            case 'TVSText': {
                sioxObj.type = 'STRING'
            }
                break
            default: console.log(`Unhandled SIOX type ${childObj.type} (${childObj.name})`)
        }
        if (childObj.MemoryType)
            sioxObj.setup = childObj.MemoryType === 'mtEEprom'
        if (childObj.enum)
            sioxObj.enum = childObj.enum
    }
    if (childObj.children) {
        for (const child of childObj.children) {
            const name = getName(child)
            obj[name] = {} as SioxObject
            saveObject(child, obj[name] as SioxObject)
        }
    }
    return obj
}

const renameProperties = (obj: SioxFolderObject | SioxObject) => {
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

const convertScaleToMinMax = (obj: SioxFolderObject | SioxObject) => {
    for (const prop in obj) {
        if (prop === "scale") {
            let scale = obj[prop] as number | undefined
            let offset = (typeof obj.offset === 'number') ? obj.offset : 0
            if (scale === undefined)
                scale = 1
            if (offset === undefined)
                offset = 0
            let bitSize = obj.bitSize as number | undefined
            if (bitSize === undefined)
                bitSize = 16
            let type = obj.type as string
            if (type === undefined)
                type = "WORD"
            const signed = type.indexOf("S") === 0
            obj.rawMin = signed ? -Math.pow(2, bitSize) : 0
            obj.rawMax = signed ? (Math.pow(2, bitSize - 1) - 1) : (Math.pow(2, bitSize) - 1)
            obj.min = (obj.rawMin - offset) / (obj.scale as number)
            obj.max = (obj.rawMax - offset) / (obj.scale as number)
            delete obj['scale']
            if (obj.offset !== undefined)
                delete obj['offset']
        }
        if (typeof obj[prop] === 'object')
            convertScaleToMinMax(obj[prop] as SioxObject)
    }
}

export const saveAsObject = async (ast: DObject, fileName: string, cb: (obj: { [key: string]: unknown }) => void) => {
    const childObj: ChildObject = {}
    saveChildObject(childObj, ast, undefined)
    const obj = saveObject(childObj)
    renameProperties(obj)
    convertScaleToMinMax(obj)
    await fsp.writeFile(fileName, JSON.stringify(obj, undefined, 2))

    if (cb)
        cb(obj as unknown as { [key: string]: unknown })

}

