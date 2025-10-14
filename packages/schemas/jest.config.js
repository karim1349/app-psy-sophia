const baseConfig = require('../../config/jest.base.js');

module.exports = {
  ...baseConfig,
  displayName: '@qiima/schemas',
  testEnvironment: 'node',
};
