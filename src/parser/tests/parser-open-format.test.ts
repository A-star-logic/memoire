// node
import { readFile } from 'node:fs/promises';
import path from 'node:path';

// libs
import { expect, test } from 'vitest';

// test functions
import { parseStream } from '../parser.ee.js';

// Load OpenDocument test files
const odtPath = path.join(import.meta.dirname, 'sampleFiles', 'test.odt');
const odsPath = path.join(import.meta.dirname, 'sampleFiles', 'test.ods');
const odpPath = path.join(import.meta.dirname, 'sampleFiles', 'test.odp');

const odtDocument = await readFile(odtPath);
const odsDocument = await readFile(odsPath);
const odpDocument = await readFile(odpPath);

// Expected outputs
const expectOdtOutput =
  'This is a test document\nThose two sentences should be present in tests';

const expectOdsOutput =
  'This is a test for xlsx\nthis is another column\nthis sentence should also be in the tests\nThis is a second sheet\nwith formulaes';

const expectOdpOutput =
  'This is a file\nThis sentence should also be in tests\nThis is a second slide\nWith additional text\nand\nA table';

test('the parser can extract information from an odt file', async () => {
  const result = await parseStream({
    binaryStream: odtDocument,
    documentName: 'test',
    mimeType: 'application/vnd.oasis.opendocument.text',
  });
  expect(result).toBe(expectOdtOutput);
});

test('the parser can work with odt files without MIME types', async () => {
  const result = await parseStream({
    binaryStream: odtDocument,
    documentName: 'test.odt',
    mimeType: undefined,
  });
  expect(result).toBe(expectOdtOutput);
});

test('the parser can extract information from an ods file', async () => {
  const result = await parseStream({
    binaryStream: odsDocument,
    documentName: 'test',
    mimeType: 'application/vnd.oasis.opendocument.spreadsheet',
  });
  expect(result).toBe(expectOdsOutput);
});

test('the parser can work with ods files without MIME types', async () => {
  const result = await parseStream({
    binaryStream: odsDocument,
    documentName: 'test.ods',
    mimeType: undefined,
  });
  expect(result).toBe(expectOdsOutput);
});

test('the parser can extract information from an odp file', async () => {
  const result = await parseStream({
    binaryStream: odpDocument,
    documentName: 'test',
    mimeType: 'application/vnd.oasis.opendocument.presentation',
  });
  expect(result.split(/\s+/).join(' ')).toContain(
    expectOdpOutput.split(/\s+/).join(' '),
  );
});

test('the parser can work with odp files without MIME types', async () => {
  const result = await parseStream({
    binaryStream: odpDocument,
    documentName: 'test.odp',
    mimeType: undefined,
  });
  expect(result.split(/\s+/).join(' ')).toContain(
    expectOdpOutput.split(/\s+/).join(' '),
  );
});
