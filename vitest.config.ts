/* v8 ignore start */
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    watch: false,
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    coverage: {
      provider: 'v8',
      clean: true,
      cleanOnRerun: true,
      exclude: ['**/mocks/**', '**/__mocks__/**', '**/migrations/**'],
      reporter: ['lcov'], // cSpell: disable-line
    },
    clearMocks: true,
  },
});
