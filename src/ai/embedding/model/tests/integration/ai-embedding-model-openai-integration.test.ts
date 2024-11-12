// libs
import { beforeEach, describe, expect, test, vi } from 'vitest';

// test function
import { embedDocument } from '../../ai-embedding-model-openai.js';

beforeEach(() => {
  vi.unstubAllEnvs(); /* cSpell: disable-line */
});

// spy
vi.mock('axios', async () => {
  // from https://github.com/vitest-dev/vitest/issues/855
  const actual = await import('axios');
  const mocked = {};
  for (const key of Object.keys(actual)) {
    // @ts-expect-error don't care
    // eslint-disable-next-line unicorn/prefer-ternary
    if (typeof actual[key] === 'function') {
      // @ts-expect-error don't care
      mocked[key] = vi.fn(actual[key]);
    } else {
      // @ts-expect-error don't care
      mocked[key] = actual[key];
    }
  }
  return mocked;
});
import module from 'axios';
const axiosSpy = vi.mocked(module);

describe('embedDocument with Azure', async () => {
  test('embedDocument will embed a document ', async () => {
    const response = await embedDocument({
      chunks: ['test document'],
    });
    expect(response).toBeDefined();
    expect(response.length).toBe(1);
    expect(axiosSpy).toHaveBeenCalledOnce();
    // @ts-expect-error don't care
    expect(axiosSpy.mock.calls[0][0].url).toContain('openai.azure.com');
  });

  test('multiple chunks will give multiple embeddings', async () => {
    const response = await embedDocument({
      chunks: ['text 1', 'text 2'],
    });
    expect(response.length).toBe(2);
    expect(axiosSpy).toHaveBeenCalledOnce();
    // @ts-expect-error don't care
    expect(axiosSpy.mock.calls[0][0].url).toContain('openai.azure.com');
  });
});

describe('embedDocument with OpenAI', async () => {
  test('embedDocument will embed a document ', async () => {
    vi.stubEnv('OPENAI_KEY', process.env.OPENAI_KEY_OVERRIDE);
    vi.stubEnv('OPENAI_DEPLOYMENT', undefined);
    const response = await embedDocument({
      chunks: ['test document'],
    });
    expect(response).toBeDefined();
    expect(response.length).toBe(1);
    expect(axiosSpy).toHaveBeenCalledOnce();
    // @ts-expect-error don't care
    expect(axiosSpy.mock.calls[0][0].url).toContain('api.openai.com');
  });

  test('multiple chunks will give multiple embeddings', async () => {
    vi.stubEnv('OPENAI_KEY', process.env.OPENAI_KEY_OVERRIDE);
    vi.stubEnv('OPENAI_DEPLOYMENT', undefined);
    const response = await embedDocument({
      chunks: ['text 1', 'text 2'],
    });
    expect(response.length).toBe(2);
    expect(axiosSpy).toHaveBeenCalledOnce();
    // @ts-expect-error don't care
    expect(axiosSpy.mock.calls[0][0].url).toContain('api.openai.com');
  });
});
