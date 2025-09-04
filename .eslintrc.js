
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: { project: null, tsconfigRootDir: __dirname },
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended'
  ],
  env: { node: true, jest: true },
  rules: {
    '@typescript-eslint/no-unused-vars': ['error', { 'argsIgnorePattern': '^_' }],
    'no-console': 'off'
  }
};
