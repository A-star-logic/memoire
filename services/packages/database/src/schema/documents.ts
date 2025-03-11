import { jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

/**
 * Documents table schema definition using drizzle-orm
 * Includes support for full-text search via tsvector
 * Note: content_vector is managed by PostgreSQL triggers
 */
export const documents = pgTable('documents', {
  content: text('content'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  documentId: uuid('document_id').primaryKey().defaultRandom(),
  metadata: jsonb('metadata').notNull().default({}),
  title: text('title'),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

/**
 * Type definitions for document operations
 */
export type Document = typeof documents.$inferSelect;
export type NewDocument = typeof documents.$inferInsert;
