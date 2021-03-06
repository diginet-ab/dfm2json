#!/usr/bin/env node

import fs from "fs";
import { postdfm } from "postdfm";

// only if implementing your own plugin
import { Plugin, Hooks } from "@postdfm/plugin";
import { findProperty, getPropertyValue, saveAsObject } from "./json.js";
import { program } from 'commander'
import windows1252 from 'windows-1252'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

type Options = {
  debug: boolean
}

class SomePlugin extends Plugin {
  constructor(public fileName: string) {
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
        saveAsObject(ast, this.fileName)
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
export const convertDfmToJson = async (source: string, dest: string, options: Options) => {
  const fileName = source

  let dfm = fs.readFileSync(
    fileName,
    //.dfm files tend to be ascii instead of utf8
    { encoding:'ascii'}
  );

  dfm = windows1252.decode(dfm)

  const runner = await postdfm({
    plugins: [new SomePlugin(dest)],
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

const main = async () => {
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
    .description('CLI to convert Delphi DFM text files to JSON.')
    .version(version)
    .option('-d, --debug', 'Debug info')
    .argument('<source>', 'Source file')
    .argument('[target]', 'Target file', './output.json')
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    .action(async (source: string, target: string, options: Options, command) => {
      await convertDfmToJson(source.replaceAll('\\', '/'), target.replaceAll('\\', '/'), options)
    })

  program.parse()
}

main()
