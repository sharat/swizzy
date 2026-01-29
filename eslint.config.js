/* global require, module */
const tsPlugin = require('@typescript-eslint/eslint-plugin');
const tsParser = require('@typescript-eslint/parser');
const js = require('@eslint/js');

module.exports = [
  js.configs.recommended,
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        project: './tsconfig.json'
      },
      globals: {
        console: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        BufferEncoding: 'readonly',
        require: 'readonly',
        module: 'readonly',
        __dirname: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly'
      }
    },
    plugins: {
      '@typescript-eslint': tsPlugin
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/explicit-function-return-type': 'warn',
      '@typescript-eslint/no-unused-vars': ['error', {
        'argsIgnorePattern': '^_',
        'varsIgnorePattern': '^_'
      }],
      'no-console': ['warn', {
        allow: ['warn', 'error']
      }],
      'quotes': ['error', 'single', {
        'allowTemplateLiterals': true
      }],
      'semi': ['error', 'always'],
      'indent': ['error', 2, {
        'SwitchCase': 1,
        'FunctionDeclaration': {
          'parameters': 1,
          'body': 1
        },
        'FunctionExpression': {
          'parameters': 1,
          'body': 1
        }
      }],
      'no-multi-spaces': 'error',
      'no-trailing-spaces': 'error',
      'comma-dangle': ['error', 'never'],
      'object-curly-spacing': ['error', 'always'],
      'max-len': ['error', {
        'code': 120,
        'ignoreComments': true,
        'ignoreUrls': true,
        'ignoreStrings': true,
        'ignoreTemplateLiterals': true,
        'ignoreRegExpLiterals': true
      }],
      'camelcase': 'error',
      'no-var': 'error',
      'prefer-const': 'error',
      'eqeqeq': ['error', 'always'],
      'no-multiple-empty-lines': ['error', {
        'max': 1,
        'maxEOF': 0
      }]
    }
  },
  {
    ignores: [
      'dist/',
      'node_modules/',
      'coverage/',
      '**/*.js',
      '**/*.d.ts',
      '!eslint.config.js'
    ]
  }
];
