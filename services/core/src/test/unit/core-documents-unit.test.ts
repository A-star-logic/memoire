import { describe, expect, test, vi } from 'vitest';

import { parseAndIndexDocument } from '../../core-documents.js';

vi.mock('@astarlogic/services-database/document');
const databaseDocumentModule = await import(
  '@astarlogic/services-database/document'
);
vi.mock('ai/models');
const aiModelsModule = await import('ai/models');
vi.mock('@astarlogic/services-parser');
const parserModule = await import('@astarlogic/services-parser');
vi.mock('@astarlogic/services-database/search');
const databaseSearchInterface = await import(
  '@astarlogic/services-database/search'
);

describe('parseAndIndexDocument', () => {
  test('should download a blob, parse it, embed the chunks and add them to the search index, and sync the document status at each step', async () => {
    databaseDocumentModule.loadBlob = vi.fn().mockResolvedValue({
      binaryStream: Buffer.from('test'),
      mimeType: 'text/plain',
    } satisfies Awaited<ReturnType<typeof databaseDocumentModule.loadBlob>>);
    parserModule.parseStream = vi
      .fn()
      .mockResolvedValue(['test'] satisfies Awaited<
        ReturnType<typeof parserModule.parseStream>
      >);
    aiModelsModule.embedDocumentChunks = vi.fn().mockResolvedValue([
      {
        chunkContent: 'test',
        chunkID: 0,
        embedding: [0, 0, 0],
      },
    ] satisfies Awaited<ReturnType<typeof aiModelsModule.embedDocumentChunks>>);
    databaseSearchInterface.addDocumentToSearch = vi
      .fn()
      .mockResolvedValue(
        undefined satisfies Awaited<
          ReturnType<typeof databaseSearchInterface.addDocumentToSearch>
        >,
      );
    databaseDocumentModule.updateDocument = vi
      .fn()
      .mockResolvedValue(
        undefined satisfies Awaited<
          ReturnType<typeof databaseDocumentModule.updateDocument>
        >,
      );

    await parseAndIndexDocument({ documentID: '123' });

    expect(databaseDocumentModule.loadBlob).toHaveBeenCalledTimes(1);
    expect(parserModule.parseStream).toHaveBeenCalledTimes(1);
    expect(aiModelsModule.embedDocumentChunks).toHaveBeenCalledTimes(1);
    expect(databaseSearchInterface.addDocumentToSearch).toHaveBeenCalledTimes(
      1,
    );
    expect(databaseSearchInterface.addDocumentToSearch).toHaveBeenCalledWith({
      chunks: [
        {
          chunkContent: 'test',
          chunkID: 0,
          embedding: [0, 0, 0],
        },
      ],
      documentID: '123',
    });
    expect(databaseDocumentModule.updateDocument).toHaveBeenCalledTimes(1);
    expect(databaseDocumentModule.updateDocument).toHaveBeenCalledWith({
      documentID: '123',
      status: 'indexed',
    });
  });
});
