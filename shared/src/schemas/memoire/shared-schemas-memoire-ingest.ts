import type { Static } from '@sinclair/typebox';
import { Type } from '@sinclair/typebox';

export const ingestMultipartSchema = Type.Object({
  documentID: Type.String(),
  file: Type.String({ format: 'binary' }),
  metadata: Type.Optional(Type.Object({})),
  mimeType: Type.Optional(Type.String()),
});
export type IngestMultipart = Static<typeof ingestMultipartSchema>;
