import { bigint, pgTable, serial, varchar } from 'drizzle-orm/pg-core';

export const queueTable = pgTable('queue', {
  createdAt: bigint('created_at', { mode: 'number' }).notNull(),
  documentID: varchar('document_id', { length: 255 }).notNull(),
  id: serial('id').primaryKey(),
});
