import type { InferSelectModel } from 'drizzle-orm';
import {
  index,
  integer,
  pgTable,
  text,
  uuid,
  vector,
} from 'drizzle-orm/pg-core';

export const chunksTable = pgTable(
  'chunks',
  {
    chunkContent: text('chunk_content').notNull(),
    chunkID: integer('chunk_id').notNull(),
    documentID: uuid('document_id').notNull(),
    embeddingTE3L: vector('text-embedding-3-large', {
      dimensions: 1536,
    }).notNull(),
  },
  (table) => {
    return [
      index('embeddingIndex').using(
        'hnsw',
        table.embeddingTE3L.op('vector_cosine_ops'),
      ),
    ];
  },
);

export type Chunk = InferSelectModel<typeof chunksTable>;
