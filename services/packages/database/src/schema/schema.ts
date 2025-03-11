import { pgTable, uuid, text, jsonb, timestamp } from 'drizzle-orm/pg-core';

export const documents = pgTable('documents', {
  documentId: uuid('document_id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  metadata: jsonb('metadata').notNull().default('{}'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
});

export const chunks = pgTable('chunks', {
  id: uuid('id').primaryKey().defaultRandom(),
  documentId: uuid('document_id')
    .notNull()
    .references(() => documents.documentId, { onDelete: 'cascade' }),
  chunkContent: text('chunk_content').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
});
