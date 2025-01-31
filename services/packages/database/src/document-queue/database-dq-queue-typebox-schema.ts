import type { Static } from '@sinclair/typebox';
import { Type } from '@sinclair/typebox';

export const QueueItemSchema = Type.Object({
  createdAt: Type.Number(),
  documentID: Type.String(),
});

export type QueueItem = Static<typeof QueueItemSchema>;
