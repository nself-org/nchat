/**
 * Purpose:    Writes src/routes.generated.tsx from the page files in src/pages.
 * Inputs:     src/pages/*Page.tsx (route read from each file's header).
 * Outputs:    src/routes.generated.tsx (gitignored). Exit 0 ok, 1 on a bad page header.
 * Usage:      node scripts/generate-routes.mjs   (also: pnpm generate:routes)
 * SOT:        F-NCHAT-VITE-ROUTES-01
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parsePages, renderRoutes } from './routes-lib.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const pagesDir = join(root, 'src', 'pages')

try {
  const pages = readdirSync(pagesDir)
    .filter((f) => f.endsWith('Page.tsx'))
    .map((file) => ({ file, source: readFileSync(join(pagesDir, file), 'utf8') }))
  const rows = parsePages(pages)
  writeFileSync(join(root, 'src', 'routes.generated.tsx'), renderRoutes(rows))
  console.log(`generate-routes: wrote ${rows.length} routes`)
} catch (err) {
  console.error(`generate-routes: ${err.message}`)
  process.exit(1)
}
