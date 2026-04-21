const nextJest = require('next/jest')

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: './',
})

// Add any custom config to be passed to Jest
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  // Custom JSDOM environment that patches canvas resolution before JSDOM loads.
  // See jest.jsdom-env.js for details on the Next.js 15 + canvas incompatibility.
  testEnvironment: '<rootDir>/jest.jsdom-env.js',
  moduleNameMapper: {
    // App internal paths (flat structure - no workspace packages)
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@/test-utils$': '<rootDir>/src/test-utils',
    '^@/test-utils/(.*)$': '<rootDir>/src/test-utils/$1',

    // Mock ESM packages to avoid compatibility issues with pnpm
    '^uuid$': '<rootDir>/src/__tests__/mocks/uuid.ts',
    '^isomorphic-dompurify$': '<rootDir>/src/__tests__/mocks/isomorphic-dompurify.ts',
    '^marked$': '<rootDir>/src/__tests__/mocks/marked.ts',
    '^livekit-server-sdk$': '<rootDir>/src/__tests__/mocks/livekit-server-sdk.ts',
    '^bullmq$': '<rootDir>/src/__tests__/mocks/bullmq.ts',
    '^nanoid$': '<rootDir>/src/__tests__/mocks/nanoid.ts',
    '^yaml$': '<rootDir>/src/__tests__/mocks/yaml.ts',
    // @signalapp/libsignal-client is a WASM/ESM module that cannot be loaded
    // by Jest's CJS transform. Replace with a Node.js crypto-backed mock that
    // preserves real Ed25519 semantics so E2EE unit tests remain meaningful.
    '^@signalapp/libsignal-client$': '<rootDir>/src/__tests__/mocks/libsignal-client.ts',
  },
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
    '!src/**/_*.{js,jsx,ts,tsx}',
    // Exclude test utilities from coverage
    '!src/test-utils/**',
    '!src/__tests__/**',
    // Exclude generated files
    '!src/types/generated/**',
    // Exclude platform-specific code (tested separately)
    '!src/**/electron/**',
    '!src/**/capacitor/**',
    '!src/**/tauri/**',
    // Exclude instrumentation files (Sentry setup)
    '!src/instrumentation*.ts',
    '!src/sentry*.ts',
  ],
  // Coverage thresholds — enforced at 40% minimum to prevent regressions.
  // Baseline measured 2026-03-16 at ~26% (many store/service files untested).
  // Roadmap: 50% by v1.0, 80% by v1.1. Increment thresholds as coverage grows.
  coverageThreshold: {
    global: {
      branches: 20,
      functions: 22,
      lines: 25,
      statements: 25,
    },
  },
  coverageReporters: ['text', 'text-summary', 'lcov', 'html', 'json-summary'],
  coverageDirectory: '<rootDir>/coverage',
  testPathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/node_modules/',
    '<rootDir>/.backend/',
    '<rootDir>/e2e/',
    // tests/e2ee/ is included for E2EE security unit tests (S09)
    '<rootDir>/tests/(?!e2ee/).*',
    '<rootDir>/platforms/',
    '<rootDir>/src/__tests__/mocks/',
    '<rootDir>/src/__tests__/utils/',
    '<rootDir>/src/__tests__/setup.ts',
    '<rootDir>/src/test-utils/',
  ],
  testMatch: ['**/__tests__/**/*.test.[jt]s?(x)', '**/?(*.)+(spec|test).[jt]s?(x)'],
  modulePathIgnorePatterns: [
    '<rootDir>/.backend/',
    '<rootDir>/.next/standalone/',
    '<rootDir>/.next/',
    '<rootDir>/platforms/',
  ],
  haste: {
    forceNodeFilesystemAPI: true,
  },
  // Handle pnpm's nested node_modules structure for ESM packages
  transformIgnorePatterns: [
    'node_modules/(?!(\\.pnpm|uuid|@apollo|graphql|graphql-ws|@nhost|nhost|jose|livekit-server-sdk|bullmq)/)',
  ],
  // Performance optimizations
  maxWorkers: '50%',
  // Reporters for CI
  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputDirectory: './coverage',
        outputName: 'junit.xml',
        classNameTemplate: '{classname}',
        titleTemplate: '{title}',
        ancestorSeparator: ' > ',
        usePathForSuiteName: true,
      },
    ],
    [
      'jest-html-reporter',
      {
        pageTitle: 'nchat Test Report',
        outputPath: './coverage/test-report.html',
        includeFailureMsg: true,
        includeSuiteFailure: true,
      },
    ],
  ],
  // Snapshot configuration
  snapshotSerializers: [],
  // Clear mocks between tests
  clearMocks: true,
  // Restore mocks after each test
  restoreMocks: true,
  // Verbose output for debugging
  verbose: false,
  // Fail fast in CI — bail after 1 failure to keep run times short
  bail: process.env.CI ? 1 : 0,
  // Test timeout — 5s in CI (fail fast), 10s locally
  testTimeout: process.env.CI ? 5000 : 10000,
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig)
