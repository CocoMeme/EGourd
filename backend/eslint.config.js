const js = require('@eslint/js');
const prettier = require('eslint-plugin-prettier');
const prettierConfig = require('eslint-config-prettier');
const globals = require('globals');

module.exports = [
  js.configs.recommended,
  {
    plugins: {
      prettier: prettier,
    },
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.commonjs,
        ...(globals.jest || {
          describe: 'readonly',
          it: 'readonly',
          expect: 'readonly',
          beforeAll: 'readonly',
          afterAll: 'readonly',
          beforeEach: 'readonly',
          afterEach: 'readonly',
          jest: 'readonly',
          test: 'readonly',
        }),
      },
    },
    rules: {
      ...prettierConfig.rules,
      'prettier/prettier': 'error',
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-console': 'off',
      'no-undef': 'error',
      'no-prototype-builtins': 'off',
      'no-useless-escape': 'off',
      'no-useless-assignment': 'off',
    },
  },
  {
    rules: {
      'preserve-caught-error': 'off',
    },
  },
];
