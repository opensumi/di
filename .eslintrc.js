module.exports = {
  env: {
    es6: true,
    node: true,
  },
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended', 'prettier'],
  rules: {
    '@typescript-eslint/no-this-alias': 'warn',
    'no-prototype-builtins': 'warn',
    '@typescript-eslint/ban-types': 'warn',
  },
};
