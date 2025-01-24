// node
// do not mix them up with the async ones, or tests will fail (it seems vi mocks do not reset properly)
import { unlinkSync } from 'node:fs';

// libs
import { afterEach, describe, expect, test, vi } from 'vitest';

// functions to test
import {
  addFTSDocument,
  calculateIDF,
  deleteFTSDocument,
  exists,
  FTSSearch,
  saveFTSIndexToDisk,
} from '../../database-search-fts.js';

const mockDocument1: Parameters<typeof addFTSDocument>[0] = {
  documentID: '1',
  text: 'test document',
};
const mockDocument2: Parameters<typeof addFTSDocument>[0] = {
  documentID: '2',
  text: 'test document 2',
};

afterEach(async () => {
  vi.resetAllMocks();
  await deleteFTSDocument({ documentID: '1' });
  await deleteFTSDocument({ documentID: '2' });
  try {
    unlinkSync('.testMemoire/fts/termsData.json');
  } catch (error) {
    if (error instanceof Error && error.message.includes('ENOENT')) {
      return;
    }
    throw error;
  }
});

describe('saving & loading indexes', async () => {
  test('Saving to disk will save to disk', async () => {
    const fsPromise = await import('node:fs/promises');
    const writeSpy = vi.spyOn(fsPromise, 'writeFile');
    await addFTSDocument(mockDocument1);
    await addFTSDocument(mockDocument2);
    await saveFTSIndexToDisk();

    expect(writeSpy.mock.calls[0][0]).toBe('.testMemoire/fts/termsData.json');
    expect(writeSpy.mock.calls[1][0]).toBe('.testMemoire/fts/1.json');
    expect(writeSpy.mock.calls[2][0]).toBe('.testMemoire/fts/2.json');
  });

  // test('Loading from disk will restore the right data structures', async () => {
  //   mkdirSync('.testMemoire/fts', { recursive: true });
  //   writeFileSync(
  //     '.testMemoire/fts/termsData.json',
  //     '[["test",{"documentFrequency":2,"inverseDocumentFrequency":null}],["document",{"documentFrequency":2,"inverseDocumentFrequency":null}],["2",{"documentFrequency":1,"inverseDocumentFrequency":null}]]',
  //   );
  //   writeFileSync(
  //     '.testMemoire/fts/1.json',
  //     '{"termFrequency":{"test":1,"document":1},"wordLength":2}',
  //   );
  //   writeFileSync(
  //     '.testMemoire/fts/2.json',
  //     '{"termFrequency":{"2":1,"test":1,"document":1},"wordLength":3}',
  //   );

  //   expect(await exists({ documentID: '1' })).toBeFalsy();
  //   expect(await exists({ documentID: '2' })).toBeFalsy();

  //   await loadFTSIndexFromDisk();

  //   expect(await exists({ documentID: '1' })).toBeTruthy();
  //   expect(await exists({ documentID: '2' })).toBeTruthy();
  //   await calculateIDF();

  //   const results = await FTSSearch({ maxResults: 100, query: '2' });
  //   expect(results.length).toBe(2);
  // });
});

describe('Search will search and sort the results', async () => {
  test('Search will search and sort the results', async () => {
    await addFTSDocument(mockDocument1);
    await addFTSDocument(mockDocument2);
    await calculateIDF();
    const results = await FTSSearch({ maxResults: 100, query: '2' });
    expect(results.length).toBe(2);
    expect(results[0].documentID).toBe('2');
    expect(results[1].documentID).toBe('1');
  });

  test('Search will filter the number of output to number of documents if less than 100', async () => {
    await addFTSDocument(mockDocument1);
    await addFTSDocument(mockDocument2);
    await calculateIDF();
    const results = await FTSSearch({ maxResults: 1, query: '2' });
    expect(results.length).toBe(2);
  });

  test('Search will filter the number of output to maxResults if maxResults is greater than 100', async () => {
    for (let index = 0; index < 200; index++) {
      const mockDocument: Parameters<typeof addFTSDocument>[0] = {
        documentID: `${index}`,
        text: `test document ${index}`,
      };
      await addFTSDocument(mockDocument);
    }
    await calculateIDF();

    const maxResults = 101;
    const results = await FTSSearch({ maxResults, query: '1' });

    expect(results.length).toBe(maxResults);

    //deleting all the documents created for this test case
    for (let index = 0; index < 200; index++) {
      await deleteFTSDocument({ documentID: `${index}` });
    }
  });

  test('Search can work with never seen before words', async () => {
    await addFTSDocument(mockDocument1);
    await addFTSDocument(mockDocument2);
    await calculateIDF();
    const results = await FTSSearch({
      maxResults: 100,
      query: 'azertyuiop' /* cSpell: disable-line */,
    });
    expect(results.length).toBe(2);
  });
});

describe('deleteFTSDocument', async () => {
  test('deleteFTSDocument will delete the document from the index and from the disk', async () => {
    vi.mock('node:fs/promises');
    const fsModule = await import('node:fs/promises');
    fsModule.unlink = vi.fn().mockResolvedValue(undefined);
    await addFTSDocument(mockDocument1);
    await deleteFTSDocument({ documentID: '1' });
    const exist = await exists({ documentID: '1' });
    expect(exist).toBe(false);
    expect(fsModule.unlink).toHaveBeenCalledTimes(1);
  });

  test('deleteFTSDocument will soft fail if the document does not exist', async () => {
    await deleteFTSDocument({ documentID: '1' });
  });
});
