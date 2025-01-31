import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type postgres from 'postgres';
import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest';

vi.mock('node:fs/promises', () => {
  return {
    mkdir: vi.fn(),
    readFile: vi.fn(),
    writeFile: vi.fn(),
  };
});

vi.mock('../../database-dq.js', () => {
  return {
    db: {
      $client: {} as postgres.Sql,
      delete: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined),
      }),
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue({
            limit: vi
              .fn()
              .mockResolvedValue([
                { createdAt: 123, documentID: 'doc-DB', id: 99 },
              ]),
          }),
        }),
      }),
    } as unknown as PostgresJsDatabase<{ [key: string]: unknown }> & {
      $client: postgres.Sql;
    },
  };
});

describe('Database Queue (DB Mode)', () => {
  beforeAll(() => {
    process.env.SUPABASE_URL = 'postgres://fakeUrl';
    vi.resetModules();
  });

  afterAll(() => {
    process.env.SUPABASE_URL = '';
  });

  test('queueAdd() will call db.insert(...) when DB is available', async () => {
    const { queueAdd } = await import('../../database-dq-queue.js');
    await queueAdd({ createdAt: 111, documentID: 'doc-1' });

    const { db } = (await import('../../database-dq.js')) as {
      db: PostgresJsDatabase<{ [key: string]: unknown }> & {
        $client: postgres.Sql;
      };
    };
    expect(db.insert).toHaveBeenCalledTimes(1);

    const fs = await import('node:fs/promises');
    expect(fs.writeFile).not.toHaveBeenCalled();
  });

  test('queueGetNext() will call db.select(...) and db.delete(...) in DB mode', async () => {
    const { queueGetNext } = await import('../../database-dq-queue.js');
    const item = await queueGetNext();

    const { db } = (await import('../../database-dq.js')) as {
      db: PostgresJsDatabase<{ [key: string]: unknown }> & {
        $client: postgres.Sql;
      };
    };
    expect(db.select).toHaveBeenCalledTimes(1);
    expect(db.delete).toHaveBeenCalledTimes(1);
    expect(item).toEqual({
      createdAt: 123,
      documentID: 'doc-DB',
    });

    const fs = await import('node:fs/promises');
    expect(fs.writeFile).not.toHaveBeenCalled();
  });

  test('queueAdd() will throw error if DB insert fails', async () => {
    const { queueAdd } = await import('../../database-dq-queue.js');
    const { db } = (await import('../../database-dq.js')) as {
      db: PostgresJsDatabase<{ [key: string]: unknown }> & {
        $client: postgres.Sql;
      };
    };
    vi.mocked(db.insert).mockReturnValueOnce({
      values: vi.fn().mockRejectedValue(new Error('Database error')),
    } as never);

    await expect(
      queueAdd({ createdAt: 111, documentID: 'doc-1' }),
    ).rejects.toThrow('Database error');
  });

  test('queueGetNext() will return undefined if DB select returns empty', async () => {
    const { queueGetNext } = await import('../../database-dq-queue.js');
    const { db } = (await import('../../database-dq.js')) as {
      db: PostgresJsDatabase<{ [key: string]: unknown }> & {
        $client: postgres.Sql;
      };
    };

    vi.mocked(db.select).mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        orderBy: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    } as never);

    const item = await queueGetNext();
    expect(item).toBeUndefined();
  });

  test('queueGetNext() will return correct item from DB', async () => {
    const { queueGetNext } = await import('../../database-dq-queue.js');
    const { db } = (await import('../../database-dq.js')) as {
      db: PostgresJsDatabase<{ [key: string]: unknown }> & {
        $client: postgres.Sql;
      };
    };

    vi.mocked(db.select).mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        orderBy: vi.fn().mockReturnValue({
          limit: vi
            .fn()
            .mockResolvedValue([
              { createdAt: 456, documentID: 'doc-test', id: 100 },
            ]),
        }),
      }),
    } as never);

    const item = await queueGetNext();
    expect(item).toEqual({
      createdAt: 456,
      documentID: 'doc-test',
    });
  });
});
