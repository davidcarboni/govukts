# @carboni/govukts

TypeScript types and rendering functions for all 36 GOV.UK Frontend components, with no runtime dependencies.

## Installation

```
npm install @carboni/govukts
```

## Usage

```typescript
import { govukButton, govukInput } from '@carboni/govukts'
import type { GovukButton } from '@carboni/govukts'

const button: GovukButton = { text: 'Continue' }
const html = govukButton(button)
```

Each function accepts a fully typed params object and returns an HTML string.

## Development

```shell
npm run generate   # regenerate types and render functions from govuk-frontend
npm run build      # full build (generate + bundle + declarations)
npm run release    # release a patch; or: npm run release minor / major
```

## Changelog

### v0.1.0
Initial release — all 36 GOV.UK Frontend components with generated TypeScript types and render functions.
