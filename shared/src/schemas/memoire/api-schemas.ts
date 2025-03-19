import { type Static, Type } from '@sinclair/typebox';

export const basicResponseSchema = Type.Object({
  message: Type.String({}),
});
export type BasicResponse = Static<typeof basicResponseSchema>;

export const searchBodySchema = Type.Object(
  {
    maxResults: Type.Optional(
      Type.Number({
        default: 100,
        description: 'The maximum number of results to return',
        examples: [10],
        minimum: 1,
      }),
    ),
    operationMode: Type.Optional(
      Type.Union([Type.Literal('speed'), Type.Literal('accuracy')], {
        default: 'speed',
        description: `Choose between speed and accuracy.
        \`speed\` will use regular mathematical models, and will reply within milliseconds.
        \`accuracy\` will leverage LLMs for a much more accurate result, but the reply can take up to 2 seconds.`,
      }),
    ),
    query: Type.String({
      description: 'The search query',
      examples: ['hello'],
    }),
  },
  { additionalProperties: false },
);
export type SearchBody = Static<typeof searchBodySchema>;
export const searchResponseSchema = Type.Object(
  {
    results: Type.Array(
      Type.Object({
        content: Type.String({
          description: 'The original document content',
        }),
        documentID: Type.String({}),
        highlights: Type.Optional(
          Type.String({
            description:
              '(Optional) the highlight of the document/Closest match. This is to be used in RAG or to display the relevant part of the document to the user',
          }),
        ),
        metadata: Type.Optional(Type.Any({})),
        score: Type.Number({
          description:
            'The search score of the document. This score can be higher than 1',
        }),
        title: Type.Optional(Type.String()),
      }),
    ),
  },
  { additionalProperties: false },
);
export type SearchResponse = Static<typeof searchResponseSchema>;

export const searchDeleteBodySchema = Type.Object(
  {
    documentIDs: Type.Array(Type.String(), {
      examples: [['document1', 'abc-123']],
    }),
  },
  { additionalProperties: false },
);
export type SearchDeleteBody = Static<typeof searchDeleteBodySchema>;

export const searchGetDocumentParametersSchema = Type.Object(
  {
    documentID: Type.String({}),
  },
  { additionalProperties: false },
);
export type SearchGetDocumentParameters = Static<
  typeof searchGetDocumentParametersSchema
>;
export const searchGetDocumentResponse = Type.Object(
  {
    content: Type.String({
      description: 'The original document content',
    }),
    documentID: Type.String({}),
    metadata: Type.Optional(Type.Any({})),
    title: Type.Optional(Type.String()),
  },
  { additionalProperties: false },
);
export type SearchGetDocumentResponse = Static<
  typeof searchGetDocumentResponse
>;

export const uploadFileResponseSchema = Type.Object({
  files: Type.Array(
    Type.Object({
      documentID: Type.String(),
      filename: Type.String(),
      status: Type.String({ examples: ['uploaded'] }),
    }),
  ),
  message: Type.String({ examples: ['Files uploaded successfully'] }),
});
