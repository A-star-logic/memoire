export interface EmbeddingModelInput {
  chunks: string[];
}
export type EmbeddingModelOutput = {
  chunkID: number;
  chunkText: string;
  embedding: number[];
}[];

export interface IsTooLargeInput {
  text: string;
}
