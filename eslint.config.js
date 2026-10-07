import js from '@eslint/js';
import globals from 'globals';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';

/**
 * Flat ESLint config shared by the backend (Node/ESM) and the frontend
 * (React/Vite). Test files get the test-runner globals they need.
 */
export default [
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/coverage/**',
      '.husky/**',
      '.playwright-mcp/**',
    ],
  },

  // --- Base rules for all JS/JSX -------------------------------------------
  {
    files: ['**/*.{js,jsx}'],
    ...js.configs.recommended,
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    rules: {
      ...js.configs.recommended.rules,
      'no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' },
      ],
    },
  },

  // --- Backend (Node) -------------------------------------------------------
  {
    files: ['backend/**/*.js'],
    languageOptions: {
      globals: { ...globals.node },
    },
    rules: {
      // Server logging goes through `console` and is annotated inline where used.
      'no-console': 'warn',
    },
  },

  // --- Frontend (browser + React) ------------------------------------------
  {
    files: ['frontend/**/*.{js,jsx}'],
    plugins: { react, 'react-hooks': reactHooks },
    languageOptions: {
      globals: { ...globals.browser },
    },
    settings: { react: { version: 'detect' } },
    rules: {
      ...react.configs.flat.recommended.rules,
      ...react.configs.flat['jsx-runtime'].rules,
      ...reactHooks.configs.recommended.rules,
      'react/prop-types': 'off',
    },
  },

  // --- Tests ----------------------------------------------------------------
  {
    files: ['**/*.test.{js,jsx}', '**/test/**/*.{js,jsx}'],
    languageOptions: {
      globals: { ...globals.node, ...globals.vitest },
    },
    rules: {
      // Tests stub out logging to keep runner output readable.
      'no-console': 'off',
    },
  },

  // --- Tooling / config files run in Node ----------------------------------
  {
    files: ['*.config.{js,jsx}', '**/*.config.{js,jsx}', 'eslint.config.js'],
    languageOptions: {
      globals: { ...globals.node },
    },
  },
];
