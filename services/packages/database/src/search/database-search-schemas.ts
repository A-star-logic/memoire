import type { InferSelectModel } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import {
  index,
  integer,
  pgTable,
  text,
  uuid,
  vector,
} from 'drizzle-orm/pg-core';

export const searchChunksTable = pgTable(
  'search_chunks',
  {
    chunkContent: text('chunk_content').notNull(),
    chunkID: integer('chunk_id').notNull(),
    documentID: uuid('document_id').notNull(),
    embedding: vector('embedding', {
      dimensions: 1536,
    }).notNull(),
  },
  (table) => {
    return [
      index('embeddingIndex').using(
        'hnsw',
        table.embedding.op('vector_cosine_ops'),
      ),
      index('chunk_text_search').using(
        'gin',
        sql`to_tsvector('english', ${table.chunkContent})`,
      ),
    ];
  },
);

export type Chunk = InferSelectModel<typeof searchChunksTable>;
