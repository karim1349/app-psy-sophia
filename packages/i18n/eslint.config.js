const baseConfig = require('../../config/eslint-base.js');

module.exports = [
  ...baseConfig,
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      // Add any i18n-specific rules here
    },
  },
];
