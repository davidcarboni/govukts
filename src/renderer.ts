import nunjucks from 'nunjucks'
import { govukTemplates } from './generated/govukTemplates.js'

class StringLoader extends nunjucks.Loader {
  async = false

  getSource(name: string): nunjucks.LoaderSource {
    const src = govukTemplates[name]
    if (src === undefined) throw new Error(`Template not found: ${name}`)
    return { src, path: name, noCache: false }
  }

  resolve(from: string, to: string): string {
    const dir = from.split('/').slice(0, -1).join('/')
    const combined = dir ? `${dir}/${to}` : to
    const resolved: string[] = []
    for (const part of combined.split('/')) {
      if (part === '..') resolved.pop()
      else if (part !== '.') resolved.push(part)
    }
    return resolved.join('/')
  }
}

const env = new nunjucks.Environment(new StringLoader(), { autoescape: false })

export function renderMacro(macroPath: string, macroName: string, params: object): string {
  const template = `{%- from "${macroPath}" import ${macroName} -%}{{ ${macroName}(params) }}`
  return env.renderString(template, { params }).trim()
}
