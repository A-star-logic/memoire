// @ts-check
import astarEslint from '@ansearch/config/linters/eslint.config.js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  ...astarEslint,
  {
    ignores: ['python_env/*', 'dataset/*', '.prettierrc*'],
  },
  {
    files: ['**/server**', '**/api**'],
    rules: {
      'sonarjs/no-throw-literal': 0,
      '@typescript-eslint/only-throw-error': 0,
    },
  },
);
