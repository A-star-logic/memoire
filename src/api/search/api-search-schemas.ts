import { type Static, Type } from '@sinclair/typebox';

export const basicResponseSchema = Type.Object({
  message: Type.String({
    examples: ['ok'],
  }),
});
export type BasicResponse = Static<typeof basicResponseSchema>;

export const documentLinkBodySchema = Type.Object(
  {
    documents: Type.Array(
      Type.Object(
        {
          documentID: Type.String({
            description:
              'The ID of the document. **Note** This id can only support letters, numbers, dashes (-) and underscores (_)',
            examples: ['abc-123', 'document1'],
          }),
          metadata: Type.Optional(
            Type.Object(
              {},
              {
                description:
                  'Any metadata related to the document. This is not used for the search of filtering',
                examples: [{ meta: 'data' }],
              },
            ),
          ),
          title: Type.Optional(
            Type.String({
              description: 'The title of the document, if any',
              examples: ['My Document'],
            }),
          ),
          url: Type.String({ examples: ['https://example.com'] }),
        },
        {
          description: 'An array of document to ingest.',
        },
      ),
    ),
  },
  { additionalProperties: false },
);
export type DocumentLinkBody = Static<typeof documentLinkBodySchema>;

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
        metadata: Type.Optional(Type.Object({})),
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
