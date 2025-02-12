// libs
import { calculateSimilarity } from '@astarlogic/services-utils/utils-similarity.js';
import { describe, expect, test } from 'vitest';

// utils
import { embedDocument } from '../../../embedding/model/ai-embedding-model-local-snowflake.js';

// test function
import { generateHypotheticalAnswer } from '../../ai-agents-hyde.ts.js';

describe.skipIf(!process.env.TEST_APIS)(
  'Invoking LLM to generate hypothetical answer',
  async () => {
    test('calling function with a query generated an answer', async () => {
      const hypotheticalAnswer = await generateHypotheticalAnswer({
        query:
          'what is answer to the Great Question of Life, the Universe, and Everything',
      });
      expect(hypotheticalAnswer).toBeDefined();
      expect(typeof hypotheticalAnswer).toBe('string');
    });
    test('Generated answer is similar to actual answer for general question', async () => {
      const hypotheticalAnswer = await generateHypotheticalAnswer({
        query:
          'what is answer to the Great Question of Life, the Universe, and Everything',
      });
      const actualAnswer =
        'According to Douglas Adams\' "The Hitchhiker\'s Guide to the Galaxy," the answer to the Great Question of Life, the Universe, and Everything is... 42.';
      const answerEmbeddings = await embedDocument({
        chunks: [actualAnswer, hypotheticalAnswer],
      });
      const similarityScore = await calculateSimilarity({
        vectorA: answerEmbeddings[0].embedding,
        vectorB: answerEmbeddings[1].embedding,
      });
      expect(similarityScore).toBeGreaterThan(0.6);
    });
  },
);
