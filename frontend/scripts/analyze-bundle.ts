#!/usr/bin/env tsx
/**
 * Bundle Size Analysis Script
 *
 * Analyzes Next.js build output and generates detailed bundle size report.
 *
 * Usage:
 *   pnpm build
 *   tsx scripts/analyze-bundle.ts
 */

import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'

// =============================================================================
// Types
// =============================================================================

interface BundleStats {
  route: string
  size: number
  firstLoadJS: number
  type: 'static' | 'dynamic' | 'middleware'
}

interface ChunkStats {
  name: string
  size: number
}

interface AnalysisResult {
  totalSize: number
  routes: BundleStats[]
  chunks: ChunkStats[]
  sharedSize: number
  largestRoutes: BundleStats[]
  recommendations: string[]
}

// =============================================================================
// Configuration
// =============================================================================

const BUILD_DIR = path.join(process.cwd(), '.next')
const OUTPUT_FILE = path.join(process.cwd(), 'docs', 'BUNDLE-ANALYSIS.md')

// Size thresholds (in KB)
const THRESHOLDS = {
  route: 100, // Warn if route > 100KB
  firstLoad: 200, // Warn if first load > 200KB
  chunk: 50, // Warn if chunk > 50KB
  total: 1000, // Warn if total > 1MB
}

// =============================================================================
// Main Function
// =============================================================================

async function main() {
  console.log('📊 Analyzing bundle sizes...\n')

  // Check if build exists
  if (!fs.existsSync(BUILD_DIR)) {
    console.error('❌ Build directory not found. Run `pnpm build` first.')
    process.exit(1)
  }

  // Parse build output
  const stats = parseBuildOutput()

  // Generate analysis
  const analysis = analyzeBundles(stats)

  // Generate report
  const report = generateReport(analysis)

  // Write to file
  fs.writeFileSync(OUTPUT_FILE, report)

  // Print summary
  printSummary(analysis)

  console.log(`\n✅ Analysis complete. Report saved to: ${OUTPUT_FILE}`)
}

// =============================================================================
// Parse Build Output
// =============================================================================

function parseBuildOutput(): AnalysisResult {
  // Run build to get fresh stats
  console.log('Building application for analysis...')

  try {
    const output = execSync('pnpm build', {
      encoding: 'utf8',
      stdio: 'pipe',
    })

    return parseBuildStats(output)
  } catch (error) {
    // Even if build has warnings, we can still parse output. `execSync`
    // attaches `stdout`/`stderr` to the thrown Error at runtime, but Node's
    // types don't model that — narrow structurally instead of widening to
    // `any`.
    const stdout =
      error instanceof Error && 'stdout' in error
        ? String((error as Error & { stdout?: unknown }).stdout ?? '')
        : ''
    return parseBuildStats(stdout)
  }
}

function parseBuildStats(output: string): AnalysisResult {
  const routes: BundleStats[] = []
  const chunks: ChunkStats[] = []
  let sharedSize = 0

  const lines = output.split('\n')

  // Parse route sizes
  const routeRegex = /^[├└│]\s+([○ƒλ])\s+(.+?)\s+(\d+\.?\d*)\s+([kK][bB])\s+(\d+\.?\d*)\s+([kK][bB])/
  const chunkRegex = /├\s+chunks\/(.+?)\s+(\d+\.?\d*)\s+([kK][bB])/
  const sharedRegex = /\+\s+First Load JS shared by all\s+(\d+\.?\d*)\s+([kK][bB])/

  for (const line of lines) {
    // Parse routes
    const routeMatch = line.match(routeRegex)
    if (routeMatch) {
      const [, symbol, route, size, , firstLoad] = routeMatch
      routes.push({
        route: route.trim(),
        size: parseFloat(size),
        firstLoadJS: parseFloat(firstLoad),
        type: symbol === '○' ? 'static' : 'dynamic',
      })
    }

    // Parse chunks
    const chunkMatch = line.match(chunkRegex)
    if (chunkMatch) {
      const [, name, size] = chunkMatch
      chunks.push({
        name,
        size: parseFloat(size),
      })
    }

    // Parse shared size
    const sharedMatch = line.match(sharedRegex)
    if (sharedMatch) {
      sharedSize = parseFloat(sharedMatch[1])
    }
  }

  const totalSize = routes.reduce((sum, route) => sum + route.size, 0)

  return {
    totalSize,
    routes,
    chunks,
    sharedSize,
    largestRoutes: [...routes].sort((a, b) => b.firstLoadJS - a.firstLoadJS).slice(0, 10),
    recommendations: [],
  }
}

// =============================================================================
// Analysis
// =============================================================================

function analyzeBundles(stats: AnalysisResult): AnalysisResult {
  const recommendations: string[] = []

  // Check total size
  if (stats.totalSize > THRESHOLDS.total) {
    recommendations.push(
      `⚠️  Total bundle size (${stats.totalSize.toFixed(2)}KB) exceeds threshold (${THRESHOLDS.total}KB)`
    )
  }

  // Check large routes
  const largeRoutes = stats.routes.filter((route) => route.firstLoadJS > THRESHOLDS.firstLoad)
  if (largeRoutes.length > 0) {
    recommendations.push(
      `⚠️  ${largeRoutes.length} routes exceed first load threshold (${THRESHOLDS.firstLoad}KB):`
    )
    largeRoutes.forEach((route) => {
      recommendations.push(`   - ${route.route}: ${route.firstLoadJS.toFixed(2)}KB`)
    })
  }

  // Check large chunks
  const largeChunks = stats.chunks.filter((chunk) => chunk.size > THRESHOLDS.chunk)
  if (largeChunks.length > 0) {
    recommendations.push(
      `⚠️  ${largeChunks.length} chunks exceed size threshold (${THRESHOLDS.chunk}KB):`
    )
    largeChunks.forEach((chunk) => {
      recommendations.push(`   - ${chunk.name}: ${chunk.size.toFixed(2)}KB`)
    })
  }

  // Optimization suggestions
  if (stats.sharedSize > 150) {
    recommendations.push(
      `💡 Shared bundle size is ${stats.sharedSize.toFixed(2)}KB. Consider:`,
      '   - Lazy loading heavy components',
      '   - Splitting large libraries',
      '   - Using dynamic imports'
    )
  }

  // Admin route optimization
  const adminRoutes = stats.routes.filter((r) => r.route.startsWith('/admin'))
  if (adminRoutes.length > 0) {
    const avgAdminSize = adminRoutes.reduce((sum, r) => sum + r.firstLoadJS, 0) / adminRoutes.length
    if (avgAdminSize > 200) {
      recommendations.push(
        `💡 Admin routes average ${avgAdminSize.toFixed(2)}KB. Consider:`,
        '   - Code splitting admin components',
        '   - Lazy loading charts and heavy UI',
        '   - Separate admin bundle'
      )
    }
  }

  stats.recommendations = recommendations
  return stats
}

// =============================================================================
// Report Generation
// =============================================================================

function generateReport(analysis: AnalysisResult): string {
  const now = new Date().toISOString().split('T')[0]

  let report = `# Bundle Size Analysis Report

**Date**: ${now}
**Total Routes**: ${analysis.routes.length}
**Total Size**: ${analysis.totalSize.toFixed(2)}KB
**Shared Bundle**: ${analysis.sharedSize.toFixed(2)}KB

---

## Summary

| Metric | Value |
|--------|-------|
| Total Routes | ${analysis.routes.length} |
| Static Routes | ${analysis.routes.filter((r) => r.type === 'static').length} |
| Dynamic Routes | ${analysis.routes.filter((r) => r.type === 'dynamic').length} |
| Total Route Size | ${analysis.totalSize.toFixed(2)}KB |
| Shared Bundle | ${analysis.sharedSize.toFixed(2)}KB |
| Chunks | ${analysis.chunks.length} |

---

## Largest Routes (Top 10)

| Route | Type | Size | First Load JS |
|-------|------|------|---------------|
`

  analysis.largestRoutes.forEach((route) => {
    const type = route.type === 'static' ? '○' : 'ƒ'
    report += `| ${route.route} | ${type} | ${route.size.toFixed(2)}KB | ${route.firstLoadJS.toFixed(2)}KB |\n`
  })

  report += `
---

## All Routes by First Load Size

| Route | Type | Size | First Load JS |
|-------|------|------|---------------|
`

  const sortedRoutes = [...analysis.routes].sort((a, b) => b.firstLoadJS - a.firstLoadJS)
  sortedRoutes.forEach((route) => {
    const type = route.type === 'static' ? '○' : 'ƒ'
    const warning = route.firstLoadJS > THRESHOLDS.firstLoad ? ' ⚠️' : ''
    report += `| ${route.route} | ${type} | ${route.size.toFixed(2)}KB | ${route.firstLoadJS.toFixed(2)}KB${warning} |\n`
  })

  report += `
---

## Chunks

| Chunk | Size |
|-------|------|
`

  const sortedChunks = [...analysis.chunks].sort((a, b) => b.size - a.size)
  sortedChunks.forEach((chunk) => {
    const warning = chunk.size > THRESHOLDS.chunk ? ' ⚠️' : ''
    report += `| ${chunk.name} | ${chunk.size.toFixed(2)}KB${warning} |\n`
  })

  report += `
---

## Recommendations

`

  if (analysis.recommendations.length === 0) {
    report += '✅ All bundles are within acceptable limits.\n'
  } else {
    analysis.recommendations.forEach((rec) => {
      report += `${rec}\n`
    })
  }

  report += `
---

## Thresholds

| Resource | Threshold | Status |
|----------|-----------|--------|
| Route Size | ${THRESHOLDS.route}KB | ${analysis.routes.some((r) => r.size > THRESHOLDS.route) ? '⚠️ Exceeded' : '✅ OK'} |
| First Load JS | ${THRESHOLDS.firstLoad}KB | ${analysis.routes.some((r) => r.firstLoadJS > THRESHOLDS.firstLoad) ? '⚠️ Exceeded' : '✅ OK'} |
| Chunk Size | ${THRESHOLDS.chunk}KB | ${analysis.chunks.some((c) => c.size > THRESHOLDS.chunk) ? '⚠️ Exceeded' : '✅ OK'} |
| Total Size | ${THRESHOLDS.total}KB | ${analysis.totalSize > THRESHOLDS.total ? '⚠️ Exceeded' : '✅ OK'} |

---

## Next Steps

1. Review routes exceeding thresholds
2. Implement lazy loading for heavy components
3. Optimize large chunks
4. Consider code splitting strategies
5. Run bundle analyzer: \`pnpm build:analyze\`

---

**Generated by**: scripts/analyze-bundle.ts
`

  return report
}

// =============================================================================
// Summary Print
// =============================================================================

function printSummary(analysis: AnalysisResult) {
  console.log('\n' + '='.repeat(60))
  console.log('BUNDLE SIZE SUMMARY')
  console.log('='.repeat(60))

  console.log(`\nTotal Routes: ${analysis.routes.length}`)
  console.log(`Total Size: ${analysis.totalSize.toFixed(2)}KB`)
  console.log(`Shared Bundle: ${analysis.sharedSize.toFixed(2)}KB`)

  console.log('\nLargest Routes:')
  analysis.largestRoutes.slice(0, 5).forEach((route, i) => {
    console.log(`  ${i + 1}. ${route.route}: ${route.firstLoadJS.toFixed(2)}KB`)
  })

  if (analysis.recommendations.length > 0) {
    console.log('\n⚠️  Issues Found:')
    analysis.recommendations.forEach((rec) => {
      console.log(`  ${rec}`)
    })
  } else {
    console.log('\n✅ All bundles within acceptable limits!')
  }

  console.log('\n' + '='.repeat(60))
}

// =============================================================================
// Run
// =============================================================================

main().catch((error) => {
  console.error('❌ Error:', error)
  process.exit(1)
})
