const baseConfig = require('../../config/eslint-base.js');

module.exports = [
  ...baseConfig,
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      // Add any schemas-specific rules here
    },
  },
];
