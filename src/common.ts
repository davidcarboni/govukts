export type GovukAttributes = Record<string, string | boolean | number>

export interface GovukPluralisation {
  one?: string
  other?: string
  [form: string]: string | undefined
}
