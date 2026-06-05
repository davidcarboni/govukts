import { build } from 'esbuild'
import { execFileSync } from 'child_process'

execFileSync('tsc', [], { stdio: 'inherit' })

await build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  platform: 'node',
  target: 'node18',
  outfile: 'dist/index.js',
  format: 'esm',
  external: ['*.node'],
  sourcemap: true,
  // nunjucks is CJS and calls require('events') etc internally. esbuild's CJS-in-ESM
  // shim checks `typeof require !== "undefined"` before throwing, so providing a real
  // require via createRequire lets those calls succeed at runtime.
  banner: {
    js: "import { createRequire } from 'module';\nconst require = createRequire(import.meta.url);"
  }
})

console.log('Bundle complete: dist/index.js')
