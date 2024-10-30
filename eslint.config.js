// @ts-check
import astarEslint from '@ansearch/config/linters/eslint.config.js';
import tseslint from 'typescript-eslint';

export default tseslint.config(...astarEslint, {
  ignores: ['.python_env/*', 'dataset/*'],
  rules: {
    'no-console': 1,
  },
});
