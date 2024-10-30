export interface CohereEmbeddingBody {
  texts: string[];
  input_type:
    | 'search_document'
    | 'search_query'
    | 'classification'
    | 'clustering';
}

export interface CohereEmbeddingResponse {
  id: string;
  texts: string[];
  embeddings: number[][];
  response_type: string;
}
