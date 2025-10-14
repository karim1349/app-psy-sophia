const baseConfig = require('../../config/jest.base.js');

module.exports = {
  ...baseConfig,
  displayName: '@qiima/api-client',
  testEnvironment: 'node',
};
