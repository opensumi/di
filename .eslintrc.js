module.exports = {
  env: {
    es6: true,
    node: true,
  },
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended', 'prettier'],
  rules: {
    'no-prototype-builtins': 'warn',
    '@typescript-eslint/no-explicit-any': 0,
    '@typescript-eslint/ban-types': [
      'warn',
      {
        types: {
          Function: false,
        },
      },
    ],
    '@typescript-eslint/no-this-alias': [
      'error',
      {
        allowDestructuring: false,
        allowedNames: ['self', 'injector'],
      },
    ],
  },
};
