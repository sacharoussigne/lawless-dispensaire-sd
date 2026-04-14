import nextConfig from 'eslint-config-next';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';

const eslintConfig = [
  ...nextConfig,
  {
    ignores: ['node_modules/**', 'prisma/migrations/**'],
  },
  {
    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
    },
    rules: {
      'react/no-unescaped-entities': 'off',
      'react-hooks/exhaustive-deps': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/preserve-manual-memoization': 'warn',
    },
  },
];

export default eslintConfig;
