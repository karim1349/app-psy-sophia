const baseConfig = require('../../config/jest.base');

module.exports = {
  ...baseConfig,
  displayName: '@qiima/queries',
  testEnvironment: 'jsdom',
  testMatch: ['**/__tests__/**/*.ts', '**/__tests__/**/*.tsx', '**/?(*.)+(spec|test).ts', '**/?(*.)+(spec|test).tsx'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  moduleNameMapper: {
    '^@qiima/state/session\\.native$': '<rootDir>/../state/src/session.native.ts',
    '^@qiima/state/session\\.web$': '<rootDir>/../state/src/session.web.ts',
    '^@qiima/(.*)$': '<rootDir>/../$1/src',
  },
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.test.{ts,tsx}',
    '!src/**/__tests__/**',
    '!src/index.ts', // Exclude exports file from coverage
    '!src/native.net.ts', // Exclude native network listener (platform-specific, hard to test in Jest)
  ],
  coverageThreshold: {
    global: {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85,
    },
  },
};
