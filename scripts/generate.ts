import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const camelCase = (s: string) => s.split('-').map((p, i) => i === 0 ? p : p.charAt(0).toUpperCase() + p.slice(1)).join('')
const upperFirst = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
const kebabCase = (s: string) => s.replace(/([A-Z])/g, m => `-${m.toLowerCase()}`)
const singular = (name: string): string => {
  if (name.endsWith('ies')) return name.slice(0, -3) + 'y'
  if (name.endsWith('s') && !name.endsWith('ss')) return name.slice(0, -1)
  return name
}

interface MacroOption {
  name: string
  type: string
  required: boolean
  description?: string
  params?: MacroOption[]
  isComponent?: boolean
}

interface InterfaceData { interfaceName: string; body: string }

interface FileOutputData {
  interfaces: InterfaceData[]
  commonImports: Set<string>
  componentImports: Map<string, string>
}

const CURRENT_DIR = path.dirname(fileURLToPath(import.meta.url))
const GOVUK_ROOT = path.dirname(fileURLToPath(import.meta.resolve('govuk-frontend/package.json')))
const GOVUK_COMPONENTS = path.join(GOVUK_ROOT, 'dist/govuk/components')
const OUTPUT_DIR = path.join(CURRENT_DIR, '../src/generated')

const PLURALISATION_FIELDS = new Set([
  'charactersUnderLimitText',
  'charactersOverLimitText',
  'wordsUnderLimitText',
  'wordsOverLimitText',
  'multipleFilesChosenText',
])

const FIELD_PAIRS: Record<string, string> = {
  text: 'html', html: 'text',
  maxlength: 'maxwords', maxwords: 'maxlength',
}

const getComponentNames = (): string[] =>
  fs.readdirSync(GOVUK_COMPONENTS)
    .filter(name => fs.existsSync(path.join(GOVUK_COMPONENTS, name, 'macro-options.json')))

const kebabToPascalCase = (s: string) => upperFirst(camelCase(s))

const getFieldCounterpart = (name: string): string | null => {
  if (name in FIELD_PAIRS) return FIELD_PAIRS[name]!
  if (name.endsWith('Text') && name !== 'Text') return name.slice(0, -4) + 'Html'
  if (name.endsWith('Html') && name !== 'Html') return name.slice(0, -4) + 'Text'
  return null
}

const isOptionalField = (param: MacroOption, siblings: MacroOption[]): boolean => {
  if (!param.required) return true
  const counterpart = getFieldCounterpart(param.name)
  return counterpart !== null && siblings.some(s => s.name === counterpart && s.required)
}

const getFieldType = (option: MacroOption, parentName: string, output: FileOutputData): string => {
  if (option.type === 'string') return 'string'
  if (option.type === 'boolean') return 'boolean'
  if (option.type === 'integer') return 'number'

  if (option.type === 'array') {
    if (!option.params?.length) return 'string[]'
    const name = `${parentName}${kebabToPascalCase(singular(option.name))}`
    addInterface(name, option.params, output)
    return `${name}[]`
  }

  if (option.type === 'object') {
    if (option.isComponent && !option.params) {
      const component = kebabCase(option.name)
      const type = `Govuk${kebabToPascalCase(component)}`
      output.componentImports.set(type, component)
      return type
    }
    if (option.params?.length) {
      const name = `${parentName}${kebabToPascalCase(option.name)}`
      addInterface(name, option.params, output)
      return name
    }
    if (PLURALISATION_FIELDS.has(option.name)) {
      output.commonImports.add('GovukPluralisation')
      return 'GovukPluralisation'
    }
    output.commonImports.add('GovukAttributes')
    return 'GovukAttributes'
  }

  throw new Error(`Unhandled macro option type: ${option.type}`)
}

const addInterface = (interfaceName: string, options: MacroOption[], output: FileOutputData): void => {
  const lines = options
    .filter(o => o.type !== 'nunjucks-block')
    .map(option => {
      const type = getFieldType(option, interfaceName, output)
      const q = isOptionalField(option, options) ? '?' : ''
      return `  ${option.name}${q}: ${type}`
    })
  output.interfaces.push({ interfaceName, body: `export interface ${interfaceName} {\n${lines.join('\n')}\n}` })
}

const buildOutputData = (component: string): FileOutputData => {
  const output: FileOutputData = { interfaces: [], commonImports: new Set(), componentImports: new Map() }
  const options: MacroOption[] = JSON.parse(
    fs.readFileSync(path.join(GOVUK_COMPONENTS, component, 'macro-options.json'), 'utf-8')
  )
  addInterface(`Govuk${kebabToPascalCase(component)}`, options, output)
  return output
}

const generateComponentFile = (component: string, output: FileOutputData): string => {
  const pascal = kebabToPascalCase(component)
  const interfaceName = `Govuk${pascal}`
  const functionName = `govuk${pascal}`
  const macroPath = `govuk/components/${component}/macro.njk`

  const lines = ['// GENERATED FILE – do not edit directly. Run: npm run generate', '']

  lines.push(`import { renderMacro } from '../renderer.js'`)

  if (output.commonImports.size > 0)
    lines.push(`import type { ${[...output.commonImports].sort().join(', ')} } from '../common.js'`)

  for (const [type, comp] of [...output.componentImports.entries()].sort(([a], [b]) => a.localeCompare(b)))
    lines.push(`import type { ${type} } from './${comp}.js'`)

  lines.push('')

  for (const iface of [...output.interfaces].reverse()) {
    lines.push(iface.body)
    lines.push('')
  }

  lines.push(`export function ${functionName}(params: ${interfaceName}): string {`)
  lines.push(`  return renderMacro('${macroPath}', '${functionName}', params)`)
  lines.push(`}`)
  lines.push('')

  return lines.join('\n')
}

const generateIndexFile = (components: string[]): string => {
  const lines = [
    '// GENERATED FILE – do not edit directly. Run: npm run generate',
    '',
    "export type { GovukAttributes, GovukPluralisation } from './common.js'",
    '',
    ...components.map(c => `export * from './generated/${c}.js'`),
    '',
  ]
  return lines.join('\n')
}

const generateTemplatesFile = (): string => {
  const distDir = path.join(GOVUK_ROOT, 'dist')
  const entries: string[] = []

  const walk = (dir: string): void => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        walk(fullPath)
      } else if (entry.name.endsWith('.njk')) {
        const key = path.relative(distDir, fullPath).replace(/\\/g, '/')
        const value = fs.readFileSync(fullPath, 'utf-8')
        entries.push(`  ${JSON.stringify(key)}: ${JSON.stringify(value)},`)
      }
    }
  }

  walk(distDir)

  return [
    '// GENERATED FILE – do not edit directly. Run: npm run generate',
    '',
    'export const govukTemplates: Record<string, string> = {',
    ...entries,
    '}',
    '',
  ].join('\n')
}

const run = (): void => {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true })

  const components = getComponentNames()
  const outputDataMap = new Map(components.map(c => [c, buildOutputData(c)]))

  for (const component of components) {
    fs.writeFileSync(
      path.join(OUTPUT_DIR, `${component}.ts`),
      generateComponentFile(component, outputDataMap.get(component)!)
    )
  }

  fs.writeFileSync(path.join(OUTPUT_DIR, 'govukTemplates.ts'), generateTemplatesFile())

  fs.writeFileSync(
    path.join(CURRENT_DIR, '../src/index.ts'),
    generateIndexFile(components)
  )

  console.log(`Generated ${components.length} components + templates`)
}

run()
