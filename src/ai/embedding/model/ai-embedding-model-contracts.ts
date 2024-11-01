export interface EmbeddingModelInput {
  chunks: string[];
}
export type EmbeddingModelOutput = {
  chunkID: string;
  chunkText: string;
  embedding: number[];
}[];

export interface IsTooLargeInput {
  text: string;
}
