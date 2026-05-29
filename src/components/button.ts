import { renderMacro } from '../renderer'

// Exactly one of text or html must be provided.
type ButtonContent =
  | { text: string; html?: never }
  | { html: string; text?: never }

// Parameters mirror the govukButton Nunjucks macro:
// https://design-system.service.gov.uk/components/button/
export type ButtonParams = ButtonContent & {
  name?: string
  type?: 'submit' | 'reset' | 'button'
  value?: string
  disabled?: boolean
  /** Renders the button as an <a> tag */
  href?: string
  classes?: string
  attributes?: Record<string, string>
  preventDoubleClick?: boolean
  isStartButton?: boolean
  id?: string
}

export function button(params: ButtonParams): string {
  return renderMacro('govuk/components/button/macro.njk', 'govukButton', params)
}
