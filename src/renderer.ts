import * as nunjucks from 'nunjucks'
import { dirname, join } from 'path'

// Resolve govuk-frontend's dist folder so macros can be found via their
// canonical import path: "govuk/components/<name>/macro.njk"
const govukFrontendDist = join(dirname(require.resolve('govuk-frontend/package.json')), 'dist')

const env = nunjucks.configure(govukFrontendDist, { autoescape: false })

export function renderMacro(macroPath: string, macroName: string, params: object): string {
  const template = `{%- from "${macroPath}" import ${macroName} -%}{{ ${macroName}(params) }}`
  return env.renderString(template, { params }).trim()
}
