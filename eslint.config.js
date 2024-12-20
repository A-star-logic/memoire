// @ts-check
import astarEslint from '@ansearch/config/linters/eslint.config.js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  ...astarEslint,
  {
    ignores: [
      'python_env/*',
      'dataset/*',
      '.prettierrc*',
      './files-parsing/tests/sampleFiles/**',
    ],
  },
  {
    files: ['**/server**', '**/api**'],
    rules: {
      'sonarjs/no-throw-literal': 0,
      '@typescript-eslint/only-throw-error': 0,
    },
  },
  {
    rules: {
      // to change whenever possible
      'perfectionist/sort-imports': 1,
      'perfectionist/sort-modules': 1,
    },
  },
);
