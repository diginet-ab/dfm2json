#!/usr/bin/env node

import fs from "fs";
import { postdfm } from "postdfm";
import path from 'path'

// only if implementing your own plugin
import { Plugin, Hooks } from "@postdfm/plugin";
import { findProperty, getPropertyValue, saveAsObject } from "./json.js";
import { program } from 'commander'
import { decode as decode1252 } from 'windows-1252'
import { fileURLToPath } from 'url'
import shellJs from 'shelljs'
import { dirname } from 'path'
import {packageDirectory} from 'pkg-dir'
import { getInstalledPath } from 'get-installed-path'
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

type Options = {
  debug: boolean
}

class SomePlugin extends Plugin {
  constructor(public fileName: string, public cb: (obj: { [key: string] : unknown }) => void) {
    super()
  }
  install(hooks: Hooks) {
    //hooks.string.tap('a', ast => {
    // manipulate AST here
    //console.log(ast)
    //})

    // all AST types can be manipulated, see AST.ASTTypes

    // also available:
    // - "after" hook for certain types
    hooks.after.object.tap('b', ast => {
      // manipulate AST here
      if (ast.type == 'TSIOXForm') {
        //saveAsJson(ast, './out.json')
        saveAsObject(ast, this.fileName, this.cb)
      }
      if (ast.type == 'TImage') {
        const p = findProperty(ast, 'Picture.Data')
        if (p)
          getPropertyValue(p)
      }
    })
    // - "all" hook for everything - excludes "after" hooks
    //hooks.all.tap('c', (ast: DObject) => {
    // manipulate AST here
    //})
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const convertDfmToJson = async (source: string, dest: string, options: Options, cb: (obj: { [key: string] : unknown }) => void) => {
  const fileName = source

  let dfm = fs.readFileSync(
    fileName,
    //.dfm files tend to be ascii instead of utf8
    { encoding:'binary'}
  );

  dfm = decode1252(dfm)

  const runner = await postdfm({
    plugins: [new SomePlugin(dest, cb)],
  });

  await runner.process(dfm, {
    //filename used for reporting errors
    from: fileName,
  });

}


const getVersion = async () => {
  let packageJson: { version?: string } = {}
  let json = ''
  try {
    json = fs.readFileSync(__dirname + '/package.json', { encoding: 'utf-8' })
  } catch {
    json = fs.readFileSync(__dirname + '/../package.json', { encoding: 'utf-8' })
  }
  packageJson = JSON.parse(json)
  return packageJson.version
}

const changeExtension = (file: string, extension: string) => {
  const basename = path.basename(file, path.extname(file))
  return path.join(path.dirname(file), basename + extension)
}

export let pkgDir: string | undefined

const main = async () => {
  pkgDir = await getInstalledPath('@diginet/dfm2json')
  let version = ''
  try {
    const ver = await getVersion()
    if (ver)
      version = ver
  } catch (e) {
    console.log(e)
  }
  program
    .name('dfm2json')
    .description('CLI to convert Delphi DFM text files to JSON.\nDefault output file is source file name with extension .json.')
    .version(version)
    .option('-d, --debug', 'Debug info')
    .argument('<source>', 'Source file (.txt, .dfm or .dff).')
    .argument('[target]', 'Target file', '')
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    .action(async (source: string, target: string, options: Options, command) => {
      if (target === '') {
        target = changeExtension(source, '.json')
      }
      let createdTxt = false
      if (path.extname(source) === '.dfm' || path.extname(source) === '.dff') {
        const txtFile = changeExtension(source, '.txt')
        createdTxt = !fs.existsSync(txtFile)
        if (options.debug)
          console.log('Package directory: ' + pkgDir)
        const result = shellJs.exec(`${ pkgDir }\\convert.exe -t "${ source }"`)
        console.log(result.toString())
        source = changeExtension(source, '.txt')
      }
      await convertDfmToJson(source.replaceAll('\\', '/'), target.replaceAll('\\', '/'), options, (obj) => {
        //testProtoBuf(obj)
      })
      if (createdTxt)
        fs.unlinkSync(source)
    })

  program.parse()
}

main()
