// node
import { readFile } from 'node:fs/promises';
import path from 'node:path';

// libs
import { expect, test } from 'vitest';

// test functions
import { parseStream } from '../parser.ee.js';

// Load test documents
const docxPath = path.join(import.meta.dirname, 'sampleFiles', 'test.docx');
// eslint-disable-next-line security/detect-non-literal-fs-filename
const wordDocument = await readFile(docxPath);
const expectOutput =
  'This is a test document for DocX.\nThose two sentences should be present in tests.';

test('the parser can extract information from a docx file', async () => {
  const result = await parseStream({
    binaryStream: wordDocument,
    documentName: 'test',
    mimeType:
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
  expect(result).toBe(expectOutput);
});

test('the parser can work with word docs without MIME types', async () => {
  const result = await parseStream({
    binaryStream: wordDocument,
    documentName: 'test.docx',
    mimeType: undefined,
  });
  expect(result).toBe(expectOutput);
});

// const largeDocxPath = path.join(
//   import.meta.dirname,
//   'sampleFiles',
//   'large_test.docx',
// );
// // eslint-disable-next-line security/detect-non-literal-fs-filename
// const largeWordDocument = await readFile(largeDocxPath);

// test('the parser can handle large docx files', async () => {
//   const result = await parseStream({
//     binaryStream: largeWordDocument,
//     documentName: 'large_test.docx',
//     mimeType: undefined,
//   });

//   const expectedStart =
//     'Video provides a powerful way to help you prove your point.';
//   expect(result.startsWith(expectedStart)).toBe(true);

//   const expectedContent = 'When you work on a table';
//   expect(result.includes(expectedContent)).toBe(true);
// }, 50_000);
