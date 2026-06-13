import nextConfig from 'eslint-config-next';
import tseslint from 'typescript-eslint';

/**
 * Project ESLint config (flat config).
 *
 * Base: eslint-config-next (React, React Hooks / Compiler, Next, TS parser).
 * Extensions below tighten React effect patterns and baseline TS/JS quality.
 *
 * @see .cursor/rules/react-quality.mdc for approved patterns (e.g. async fetch in useEffect).
 */
const eslintConfig = [
  ...nextConfig,

  {
    ignores: ['node_modules/**', 'prisma/migrations/**', '.next/**'],
  },

  // --- React & hooks (React Compiler rules) ---
  {
    name: 'dispensaire/react',
    files: ['**/*.{js,jsx,ts,tsx}'],
    rules: {
      'react/no-unescaped-entities': 'off',

      // Core hooks — must not break
      'react-hooks/rules-of-hooks': 'error',

      // Sync state updates inside effects → prefer derived state, events, or async callbacks
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/immutability': 'warn',
      'react-hooks/purity': 'warn',

      // Noisy with manual useMemo in data tables; React Compiler handles optimization when enabled
      'react-hooks/preserve-manual-memoization': 'off',

      'react-hooks/exhaustive-deps': 'warn',
    },
  },

  // --- TypeScript quality ---
  {
    name: 'dispensaire/typescript',
    files: ['**/*.{ts,tsx}'],
    plugins: {
      '@typescript-eslint': tseslint.plugin,
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      // Auto-fixable; prefer `import { type Foo }` over duplicate import lines
      '@typescript-eslint/consistent-type-imports': [
        'warn',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      '@typescript-eslint/no-non-null-assertion': 'warn',
    },
  },

  // --- General JS baseline ---
  {
    name: 'dispensaire/baseline',
    files: ['**/*.{js,jsx,ts,tsx,mjs,cjs}'],
    rules: {
      eqeqeq: ['warn', 'always', { null: 'ignore' }],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-debugger': 'warn',
      'prefer-const': 'warn',
      // Do not use eslint/no-duplicate-imports — conflicts with `import type` split lines in TS
    },
  },

  // --- Tests: slightly relaxed ---
  {
    name: 'dispensaire/tests',
    files: ['**/*.{test,spec}.{ts,tsx,js,jsx}', '**/__tests__/**'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      'no-console': 'off',
    },
  },
];

export default eslintConfig;
