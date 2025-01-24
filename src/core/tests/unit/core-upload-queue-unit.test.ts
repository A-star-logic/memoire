import { beforeEach, describe, expect, test, vi } from 'vitest';

import * as queueModule from '../../../database/queue/database-queue.js';
import * as temporaryModule from '../../../database/temp/database-temporary.js';
import {
  addItemForLaterProcessing,
  getNextItemToProcess,
} from '../../core-upload-queue.js';

describe('Upload Queue Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('addItemForLaterProcessing calls storeTextAndMetadata & queueAdd', async () => {
    vi.spyOn(temporaryModule, 'storeTextAndMetadata').mockResolvedValue(
      undefined,
    );
    vi.spyOn(queueModule, 'queueAdd').mockResolvedValue(undefined);

    await addItemForLaterProcessing('doc-1', 'fake content', {
      some: 'metadata',
    });

    expect(temporaryModule.storeTextAndMetadata).toHaveBeenCalledTimes(1);
    expect(temporaryModule.storeTextAndMetadata).toHaveBeenCalledWith(
      'doc-1',
      'fake content',
      { some: 'metadata' },
    );

    expect(queueModule.queueAdd).toHaveBeenCalledTimes(1);
    expect(queueModule.queueAdd).toHaveBeenCalledWith({
      createdAt: expect.any(Number),
      documentID: 'doc-1',
    });
  });

  test('getNextItemToProcess returns undefined if queue is empty', async () => {
    vi.spyOn(queueModule, 'queueGetNext').mockResolvedValue(undefined);

    vi.spyOn(temporaryModule, 'readTemporaryText');
    vi.spyOn(temporaryModule, 'readTemporaryMetadata');

    const result = await getNextItemToProcess();
    expect(result).toBeUndefined();

    expect(queueModule.queueGetNext).toHaveBeenCalledTimes(1);
    expect(temporaryModule.readTemporaryText).not.toHaveBeenCalled();
    expect(temporaryModule.readTemporaryMetadata).not.toHaveBeenCalled();
  });

  test('getNextItemToProcess reads files if queue item exists', async () => {
    vi.spyOn(queueModule, 'queueGetNext').mockResolvedValue({
      createdAt: 123,
      documentID: 'doc-1',
    });
    vi.spyOn(temporaryModule, 'readTemporaryText').mockResolvedValue(
      'Some text',
    );
    vi.spyOn(temporaryModule, 'readTemporaryMetadata').mockResolvedValue({
      foo: 'bar',
    });

    const result = await getNextItemToProcess();

    expect(queueModule.queueGetNext).toHaveBeenCalledTimes(1);
    expect(temporaryModule.readTemporaryText).toHaveBeenCalledWith('doc-1');
    expect(temporaryModule.readTemporaryMetadata).toHaveBeenCalledWith('doc-1');

    expect(result).toEqual({
      documentID: 'doc-1',
      metadata: { foo: 'bar' },
      text: 'Some text',
    });
  });
});
