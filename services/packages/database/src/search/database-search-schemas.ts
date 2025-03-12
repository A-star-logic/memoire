import type { InferSelectModel } from 'drizzle-orm';
import {
  index,
  integer,
  jsonb,
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

export const documentsTable = pgTable('documents', {
  documentId: uuid('document_id').primaryKey().notNull(),
  metadata: jsonb('metadata').notNull(),
  title: text('title'),
});

export type Document = InferSelectModel<typeof documentsTable>;
