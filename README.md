# GOV.UK types and rendering

## Build

```shell
npm run generate
npm run build
```

## Usage

```typescript
  import { govukButton, govukInput } from 'govukts'
  import type { GovukButton } from 'govukts'

  const button: GovukButton = { text: 'Continue' };
  const html = govukButton(button)
```
