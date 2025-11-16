module.exports = {
  env: {
    node: true,
    es2021: true,
  },
  extends: ['eslint:recommended', 'airbnb-base'],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  rules: {
    'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    'no-unused-vars': ['error', { argsIgnorePattern: 'next' }],
    'import/extensions': ['error', 'ignorePackages'],
    'linebreak-style': 'off',
    'no-underscore-dangle': ['error', { allow: ['_id'] }],
    'consistent-return': 'off',
    'no-plusplus': ['error', { allowForLoopAfterthoughts: true }],
    'func-names': 'off',
    'no-param-reassign': ['error', { props: false }],
    'radix': ['error', 'always'],
  },
};
