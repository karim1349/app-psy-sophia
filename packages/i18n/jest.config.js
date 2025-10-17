const baseConfig = require('../../config/jest.base.js');

module.exports = {
  ...baseConfig,
  displayName: '@app-psy-sophia/i18n',
  testEnvironment: 'jsdom',
  testMatch: ['<rootDir>/src/**/*.test.{ts,tsx}'],
  setupFilesAfterEnv: ['<rootDir>/src/test-setup.ts'],
};
