import type { InferInsertModel, InferSelectModel } from 'drizzle-orm';
import { jsonb, pgEnum, pgTable, text, uuid } from 'drizzle-orm/pg-core';

export const documentStatus = pgEnum('document_status', [
  'uploading',
  'errorUploading',
  'pendingIndexing',
  'errorIndexing',
  'indexed',
]);
export const documentsTable = pgTable('documents', {
  documentID: uuid('document_id').primaryKey().notNull(),
  metadata: jsonb('metadata').notNull(),
  status: documentStatus('status').notNull().default('uploading'),
  title: text('title'),
});

export type Document = InferSelectModel<typeof documentsTable>;
export type DocumentInsert = InferInsertModel<typeof documentsTable>;
