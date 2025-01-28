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
    // Disable stuff on code that's not ours
    rules: {
      camelcase: [
        'error',
        {
          ignoreDestructuring: true,
          ignoreImports: true,
          allow: [
            'prompt_tokens',
            'total_tokens',
            'completion_tokens',
            'input_type',
          ],
        },
      ],
    },
  },
  {
    rules: {
      // to change whenever possible, set as warning for compatibility
      'perfectionist/sort-imports': 2,
      'perfectionist/sort-modules': 2,
      '@eslint-community/eslint-comments/require-description': 2,
      '@eslint-community/eslint-comments/disable-enable-pair': 2,
      'sonarjs/no-empty-test-file': 0, // duplicate of no-warning-comments
    },
  },
  {
    // disable some rules in test files
    files: ['**/tests/**'],
    rules: {
      'security/detect-non-literal-fs-filename': 0,
      'eslint/security/detect-non-literal-fs-filename': 0,
    },
  },
);
