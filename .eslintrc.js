module.exports = {
    root: true,
    env: {
      node: true,
      jest: true,
      es2021: true
    },
    extends: [
      'eslint:recommended',
      'plugin:@typescript-eslint/recommended'
    ],
    parser: '@typescript-eslint/parser',
    plugins: [
      '@typescript-eslint'
    ],
    parserOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      project: './tsconfig.json'
    },
    rules: {
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
    },
    ignorePatterns: [
      'dist/',
      'node_modules/',
      'coverage/',
      '*.js',
      '*.d.ts'
    ]
  };