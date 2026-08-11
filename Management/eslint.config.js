import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'

export default [
  { ignores: ['dist'] },
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      // `process.env.NODE_ENV` is statically replaced by vite.config.js's
      // `define` block at build time, not a real runtime global.
      globals: { ...globals.browser, process: 'readonly' },
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      // Bootstrap note: this repo had no lint gate before now, so these two
      // rules start at 'warn' against ~140 pre-existing violations rather
      // than blocking CI on an unrelated cleanup. Tighten to 'error' once
      // the existing debt is cleaned up.
      'no-unused-vars': ['warn', { varsIgnorePattern: '^[A-Z_]' }],
      'no-empty': 'warn',
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
    },
  },
  {
    // Node-executed config files, not browser bundle code.
    files: ['*.config.js'],
    languageOptions: {
      globals: globals.node,
    },
  },
]
