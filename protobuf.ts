import { Folder, Parameter } from './generated/VisualSioxForm.js'

export const testProtoBuf = async (obj: { [key: string] : unknown }) => {
    const form: Folder = {
        id: 1,
        name: "root",
        parameter: undefined,
        children: []
    }
    const convertToProtoBufObject = (obj: { [key: string] : unknown }, folder: Folder) => {
        Object.keys(obj).map(value => {
            if (typeof obj[value] === 'object') {
                folder.children.push({ id: 1, name: value, children: [], parameter: undefined })
                convertToProtoBufObject(obj[value] as { [key: string] : unknown }, folder.children[folder.children.length - 1])
            } else {
                if (!folder.parameter)
                    folder.parameter = { id: 1, name: folder.name, par: 0 } as Parameter
                (folder.parameter as unknown as { [key: string] : unknown })[value] = obj[value] as unknown
            }
        })
    }
    convertToProtoBufObject(obj, form)
    const encoded = Folder.encode(form).finish()
    console.log(encoded)
    const decoded = Folder.decode(encoded)
    console.log(decoded)
}
