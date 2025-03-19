import type { InferInsertModel, InferSelectModel } from 'drizzle-orm';
import { jsonb, pgTable, text, uuid } from 'drizzle-orm/pg-core';

export type DocumentStatus =
  | 'error'
  | 'indexed'
  | 'pendingIndexing'
  | 'uploading';

export const documentsTable = pgTable('documents', {
  documentID: uuid('document_id').primaryKey().notNull(),
  metadata: jsonb('metadata').notNull(),
  status: text('status').notNull().default('uploading').$type<DocumentStatus>(),
  title: text('title'),
});

export type Document = InferSelectModel<typeof documentsTable>;
export type DocumentInsert = InferInsertModel<typeof documentsTable>;
