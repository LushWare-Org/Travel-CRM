import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

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
  // Non-type-checked recommended rules (not recommendedTypeChecked — that
  // needs a `parserOptions.project` wired to tsconfig.json and is
  // meaningfully slower; revisit once the TS migration is further along).
  ...tseslint.configs.recommended.map((config) => ({
    ...config,
    files: ['**/*.{ts,tsx}'],
  })),
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      globals: { ...globals.browser, process: 'readonly' },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // Same bootstrap posture as the JS block above: warn, not error,
      // during the incremental migration (see UI_REWRITE_PROGRESS.md).
      '@typescript-eslint/no-unused-vars': ['warn', { varsIgnorePattern: '^[A-Z_]' }],
      '@typescript-eslint/no-explicit-any': 'warn',
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
    },
  },
  {
    // Node-executed config files, not browser bundle code.
    files: ['*.config.js', '*.config.ts'],
    languageOptions: {
      globals: globals.node,
    },
  },
]
