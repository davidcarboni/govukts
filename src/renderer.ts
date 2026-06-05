import nunjucks from 'nunjucks'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const govukFrontendDist = join(
  dirname(fileURLToPath(import.meta.resolve('govuk-frontend/package.json'))),
  'dist'
)

const env = nunjucks.configure(govukFrontendDist, { autoescape: false })

export function renderMacro(macroPath: string, macroName: string, params: object): string {
  const template = `{%- from "${macroPath}" import ${macroName} -%}{{ ${macroName}(params) }}`
  return env.renderString(template, { params }).trim()
}
