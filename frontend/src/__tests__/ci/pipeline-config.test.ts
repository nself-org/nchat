/**
 * CI Pipeline Configuration Tests
 *
 * Validates GitHub Actions workflow configurations for:
 * - Deterministic execution order
 * - Proper job dependencies
 * - Quality gate enforcement
 * - Monorepo path detection
 *
 * @see .github/workflows/ci.yml
 * @see .github/workflows/pr-checks.yml
 * @see .claude/v092/C092-007-PIPELINE-MIGRATION.md
 */

import fs from 'fs'
import path from 'path'
// @ts-ignore - mocked module
import YAML from 'yaml'

describe('CI Pipeline Configuration', () => {
  // .github/ lives at repo root; tests run from frontend/ so go up one level
  const ciPath = path.join(process.cwd(), '..', '.github', 'workflows', 'ci.yml')
  const prChecksPath = path.join(
    process.cwd(),
    '..',
    '.github',
    'workflows',
    'pr-checks.yml'
  )

  let ciWorkflow: any
  let prChecksWorkflow: any

  beforeAll(() => {
    const ciContent = fs.readFileSync(ciPath, 'utf8')
    const prChecksContent = fs.readFileSync(prChecksPath, 'utf8')

    ciWorkflow = YAML.parse(ciContent)
    prChecksWorkflow = YAML.parse(prChecksContent)
  })

  describe('ci.yml - Main CI Workflow', () => {
    it('should have detect-changes as the first job', () => {
      const jobNames = Object.keys(ciWorkflow.jobs)
      expect(jobNames[0]).toBe('detect-changes')
    })

    it('should have all required change detection outputs', () => {
      const detectChanges = ciWorkflow.jobs['detect-changes']
      expect(detectChanges).toBeDefined()
      expect(detectChanges.outputs).toMatchObject({
        backend: expect.any(String),
        frontend: expect.any(String),
        web: expect.any(String),
        packages: expect.any(String),
        config: expect.any(String),
      })
    })

    it('should have lint job depend on detect-changes', () => {
      const lint = ciWorkflow.jobs.lint
      expect(lint.needs).toContain('detect-changes')
    })

    it('should have type-check job depend on detect-changes', () => {
      const typeCheck = ciWorkflow.jobs['type-check']
      expect(typeCheck.needs).toContain('detect-changes')
    })

    it('should have test job depend on detect-changes', () => {
      const test = ciWorkflow.jobs.test
      expect(test.needs).toContain('detect-changes')
    })

    it('should have hygiene job depend on detect-changes', () => {
      const hygiene = ciWorkflow.jobs.hygiene
      expect(hygiene.needs).toContain('detect-changes')
    })

    it('should have security job depend on quality gates', () => {
      const security = ciWorkflow.jobs.security
      expect(security.needs).toEqual(
        expect.arrayContaining(['detect-changes', 'lint', 'type-check'])
      )
    })

    it('should have build job depend on all quality gates', () => {
      const build = ciWorkflow.jobs.build
      expect(build.needs).toEqual(
        expect.arrayContaining([
          'detect-changes',
          'lint',
          'type-check',
          'test',
          'hygiene',
          'security',
        ])
      )
    })

    it('should have build job check quality gate results', () => {
      const build = ciWorkflow.jobs.build
      const condition = build.if

      expect(condition).toContain("needs.lint.result == 'success'")
      expect(condition).toContain("needs.type-check.result == 'success'")
      expect(condition).toContain("needs.test.result == 'success'")
    })

    it('should have e2e job depend on build', () => {
      const e2e = ciWorkflow.jobs.e2e
      expect(e2e.needs).toContain('build')
    })

    it('should have test job with jest runner', () => {
      // CI runs without coverage (--no-coverage) to avoid OOM; coverage is in test.yml
      const test = ciWorkflow.jobs.test
      const testStep = test.steps.find((s: any) => s.name === 'Run tests')
      expect(testStep).toBeDefined()
      expect(testStep.run).toContain('jest')
    })

    it.skip('should upload coverage to Codecov', () => {
      // Coverage upload is in test.yml (separate workflow), not ci.yml
      // ci.yml runs jest --no-coverage to avoid OOM on CI runners
    })
  })

  describe('pr-checks.yml - PR Validation Workflow', () => {
    it('should have changes detection job', () => {
      const changes = prChecksWorkflow.jobs.changes
      expect(changes).toBeDefined()
      expect(changes.name).toBe('Detect Changes')
    })

    it('should detect backend changes', () => {
      const changes = prChecksWorkflow.jobs.changes
      expect(changes.outputs).toHaveProperty('backend')
    })

    it('should detect frontend changes', () => {
      const changes = prChecksWorkflow.jobs.changes
      expect(changes.outputs).toHaveProperty('frontend')
    })

    it('should detect package changes', () => {
      const changes = prChecksWorkflow.jobs.changes
      expect(changes.outputs).toHaveProperty('packages')
    })

    it('should detect legacy src changes', () => {
      const changes = prChecksWorkflow.jobs.changes
      expect(changes.outputs).toHaveProperty('src')
    })

    it('should have lint job conditional on relevant changes', () => {
      const lint = prChecksWorkflow.jobs.lint
      const condition = lint.if

      expect(condition).toContain("needs.changes.outputs.backend == 'true'")
      expect(condition).toContain("needs.changes.outputs.frontend == 'true'")
      expect(condition).toContain("needs.changes.outputs.packages == 'true'")
      expect(condition).toContain("needs.changes.outputs.src == 'true'")
    })

    it('should have type-check job conditional on relevant changes', () => {
      const typeCheck = prChecksWorkflow.jobs['type-check']
      const condition = typeCheck.if

      expect(condition).toContain("needs.changes.outputs.backend == 'true'")
      expect(condition).toContain("needs.changes.outputs.frontend == 'true'")
      expect(condition).toContain("needs.changes.outputs.packages == 'true'")
    })

    it('should have test job conditional on code changes', () => {
      const test = prChecksWorkflow.jobs.test
      const condition = test.if

      expect(condition).toContain("needs.changes.outputs.frontend == 'true'")
      expect(condition).toContain("needs.changes.outputs.packages == 'true'")
      expect(condition).toContain("needs.changes.outputs.src == 'true'")
    })

    it('should have build job depend on quality gates', () => {
      const build = prChecksWorkflow.jobs.build
      expect(build.needs).toContain('lint')
      expect(build.needs).toContain('type-check')
    })

    it('should have PR status check job', () => {
      const status = prChecksWorkflow.jobs.status
      expect(status).toBeDefined()
      expect(status.name).toBe('PR Status Check')
      expect(status.needs).toEqual(
        expect.arrayContaining(['lint', 'type-check', 'test', 'build'])
      )
    })
  })

  describe('Path Filter Configuration', () => {
    it('ci.yml should filter backend paths correctly', () => {
      const detectChanges = ciWorkflow.jobs['detect-changes']
      const filterStep = detectChanges.steps.find(
        (s: any) => s.id === 'filter'
      )
      const filters = filterStep.with.filters

      expect(filters).toContain('backend:')
      expect(filters).toContain("- 'backend/**'")
      expect(filters).toContain("- '.backend/**'")
    })

    it('ci.yml should filter frontend paths correctly', () => {
      const detectChanges = ciWorkflow.jobs['detect-changes']
      const filterStep = detectChanges.steps.find(
        (s: any) => s.id === 'filter'
      )
      const filters = filterStep.with.filters

      expect(filters).toContain('frontend:')
      expect(filters).toContain("- 'frontend/**'")
    })

    it('ci.yml should filter package paths correctly', () => {
      const detectChanges = ciWorkflow.jobs['detect-changes']
      const filterStep = detectChanges.steps.find(
        (s: any) => s.id === 'filter'
      )
      const filters = filterStep.with.filters

      expect(filters).toContain('packages:')
      expect(filters).toContain("- 'frontend/src/**'")
    })

    it('ci.yml should filter web/frontend paths correctly', () => {
      const detectChanges = ciWorkflow.jobs['detect-changes']
      const filterStep = detectChanges.steps.find(
        (s: any) => s.id === 'filter'
      )
      const filters = filterStep.with.filters

      // ci.yml uses 'web:' filter (not 'legacy:') pointing to frontend/src
      expect(filters).toContain('web:')
      expect(filters).toContain("- 'frontend/src/**'")
      expect(filters).toContain("- 'frontend/public/**'")
    })

    it('pr-checks.yml should have backend filter', () => {
      const changes = prChecksWorkflow.jobs.changes
      const filterStep = changes.steps.find((s: any) => s.id === 'changes')
      const filters = filterStep.with.filters

      expect(filters).toContain('backend:')
      expect(filters).toContain("- 'backend/**'")
    })

    it('pr-checks.yml should have frontend filter', () => {
      const changes = prChecksWorkflow.jobs.changes
      const filterStep = changes.steps.find((s: any) => s.id === 'changes')
      const filters = filterStep.with.filters

      expect(filters).toContain('frontend:')
      expect(filters).toContain("- 'frontend/**'")
    })

    it('pr-checks.yml should have packages filter', () => {
      const changes = prChecksWorkflow.jobs.changes
      const filterStep = changes.steps.find((s: any) => s.id === 'changes')
      const filters = filterStep.with.filters

      expect(filters).toContain('packages:')
      expect(filters).toContain("- 'frontend/src/**'")
    })
  })

  describe('Stage Ordering Validation', () => {
    it('should enforce 4-stage execution model', () => {
      // Stage 0: detect-changes (no dependencies)
      const detectChanges = ciWorkflow.jobs['detect-changes']
      expect(detectChanges.needs).toBeUndefined()

      // Stage 1: Quality gates (depend on detect-changes only)
      const lint = ciWorkflow.jobs.lint
      const typeCheck = ciWorkflow.jobs['type-check']
      const test = ciWorkflow.jobs.test
      const hygiene = ciWorkflow.jobs.hygiene

      expect(lint.needs).toEqual(['detect-changes'])
      expect(typeCheck.needs).toEqual(['detect-changes'])
      expect(test.needs).toEqual(['detect-changes'])
      expect(hygiene.needs).toEqual(['detect-changes'])

      // Stage 2: Security (depends on Stage 1)
      const security = ciWorkflow.jobs.security
      expect(security.needs).toContain('lint')
      expect(security.needs).toContain('type-check')

      // Stage 3: Build (depends on all previous stages)
      const build = ciWorkflow.jobs.build
      expect(build.needs).toContain('lint')
      expect(build.needs).toContain('type-check')
      expect(build.needs).toContain('test')
      expect(build.needs).toContain('hygiene')
      expect(build.needs).toContain('security')

      // Stage 4: E2E (depends on build)
      const e2e = ciWorkflow.jobs.e2e
      expect(e2e.needs).toEqual(['build'])
    })

    it('should prevent build from running if quality gates fail', () => {
      const build = ciWorkflow.jobs.build
      const condition = build.if

      // Must check for 'success' result
      expect(condition).toContain("needs.lint.result == 'success'")
      expect(condition).toContain("needs.type-check.result == 'success'")
      expect(condition).toContain("needs.test.result == 'success'")
    })

    it('should allow build to run if optional gates are skipped', () => {
      const build = ciWorkflow.jobs.build
      const condition = build.if

      // hygiene and security can be skipped
      expect(condition).toContain("needs.hygiene.result == 'success'")
      expect(condition).toContain("needs.hygiene.result == 'skipped'")
      expect(condition).toContain("needs.security.result == 'success'")
      expect(condition).toContain("needs.security.result == 'skipped'")
    })
  })

  describe('Quality Gate Enforcement', () => {
    it('should run lint with correct command', () => {
      const lint = ciWorkflow.jobs.lint
      const lintStep = lint.steps.find((s: any) => s.name === 'Run ESLint')
      expect(lintStep).toBeDefined()
      expect(lintStep.run).toBe('HASURA_ADMIN_SECRET=ci-lint-placeholder-not-a-real-secret pnpm lint')
    })

    it('should run format check with correct command', () => {
      const lint = ciWorkflow.jobs.lint
      const formatStep = lint.steps.find((s: any) =>
        s.name.includes('formatting')
      )
      expect(formatStep).toBeDefined()
      expect(formatStep.run).toBe('pnpm format:check')
    })

    it('should run type check with correct command', () => {
      const typeCheck = ciWorkflow.jobs['type-check']
      const typeCheckStep = typeCheck.steps.find((s: any) =>
        s.name.includes('TypeScript')
      )
      expect(typeCheckStep).toBeDefined()
      expect(typeCheckStep.run).toBe('pnpm type-check')
    })

    it('should run tests with jest', () => {
      // CI uses --no-coverage to avoid OOM; coverage is collected in test.yml
      const test = ciWorkflow.jobs.test
      const testStep = test.steps.find((s: any) => s.name === 'Run tests')
      expect(testStep).toBeDefined()
      expect(testStep.run).toContain('jest')
    })

    it('should run production hygiene check', () => {
      const hygiene = ciWorkflow.jobs.hygiene
      const hygieneStep = hygiene.steps.find((s: any) =>
        s.name.includes('hygiene')
      )
      expect(hygieneStep).toBeDefined()
      expect(hygieneStep.run).toContain(
        'scripts/check-production-hygiene.sh'
      )
    })

    it('should run security audit', () => {
      const security = ciWorkflow.jobs.security
      const auditStep = security.steps.find((s: any) =>
        s.name.includes('audit')
      )
      expect(auditStep).toBeDefined()
      expect(auditStep.run).toContain('pnpm audit')
    })
  })

  describe('Monorepo Compatibility', () => {
    it('should support both web and frontend paths', () => {
      const lint = ciWorkflow.jobs.lint
      const condition = lint.if

      // Both web (frontend/src) and frontend paths trigger lint
      expect(condition).toContain("needs.detect-changes.outputs.web")
      expect(condition).toContain("needs.detect-changes.outputs.frontend")
    })

    it('should trigger tests for package changes', () => {
      const test = ciWorkflow.jobs.test
      const condition = test.if

      expect(condition).toContain("needs.detect-changes.outputs.packages")
    })

    it('should trigger type-check for config changes', () => {
      const typeCheck = ciWorkflow.jobs['type-check']
      const condition = typeCheck.if

      expect(condition).toContain("needs.detect-changes.outputs.config")
    })
  })

  describe('Node.js and pnpm Configuration', () => {
    it('should use Node.js 22', () => {
      expect(ciWorkflow.env.NODE_VERSION).toBe('22')
    })

    it('should use pnpm with frozen lockfile', () => {
      const lint = ciWorkflow.jobs.lint
      const installStep = lint.steps.find((s: any) =>
        s.name.includes('Install dependencies')
      )
      expect(installStep).toBeDefined()
      expect(installStep.run).toBe('pnpm install --frozen-lockfile --ignore-scripts')
    })

    it('should setup pnpm before Node.js', () => {
      const lint = ciWorkflow.jobs.lint
      const stepNames = lint.steps.map((s: any) => s.name)
      const pnpmIndex = stepNames.indexOf('Setup pnpm')
      const nodeIndex = stepNames.indexOf('Setup Node.js')

      expect(pnpmIndex).toBeGreaterThanOrEqual(0)
      expect(nodeIndex).toBeGreaterThanOrEqual(0)
      expect(pnpmIndex).toBeLessThan(nodeIndex)
    })
  })

  describe('Concurrency Control', () => {
    it('ci.yml should cancel in-progress runs', () => {
      expect(ciWorkflow.concurrency).toMatchObject({
        group: expect.stringContaining('github.workflow'),
        'cancel-in-progress': true,
      })
    })

    it('pr-checks.yml should cancel in-progress runs per PR', () => {
      expect(prChecksWorkflow.concurrency).toMatchObject({
        group: expect.stringContaining('pr-'),
        'cancel-in-progress': true,
      })
    })
  })
})
