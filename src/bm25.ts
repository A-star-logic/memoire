import { prepareForBM25 } from './text-processing.js';

/* eslint-disable fp/no-this */
// eslint-disable-next-line fp/no-class
export class BM25 {
  b: number;
  documentFrequency: { [key: string]: number };
  documentsLength: number[];
  documentsTermFrequency: { [key: string]: number }[];
  inverseDocumentFrequency: { [key: string]: number };
  k1: number;

  constructor() {
    this.documentFrequency = {};
    this.documentsTermFrequency = [];
    this.inverseDocumentFrequency = {};
    this.documentsLength = [];
    this.k1 = 1.5;
    this.b = 0.75;
  }

  /**
   * Calculate the bm25 score of a query against a document
   * @param root named parameters
   * @param root.averageDocumentLength the average document length
   * @param root.index the index of the document
   * @param root.query the query
   * @returns the score
   */
  async #bm25({
    averageDocumentLength,
    index,
    query,
  }: {
    averageDocumentLength: number;
    index: number;
    query: string;
  }): Promise<number> {
    let score = 0;
    const documentLength = this.documentsLength[index];
    const documentTermFrequency = this.documentsTermFrequency[index];
    for (const term of query) {
      if (term in documentTermFrequency) {
        const freq = documentTermFrequency[term];
        const idf = this.inverseDocumentFrequency[term];
        const numerator = idf * freq * (this.k1 + 1);
        const denominator =
          freq +
          this.k1 *
            (1 - this.b + (this.b * documentLength) / averageDocumentLength);
        score += numerator / denominator;
      }
    }
    return score;
  }

  /**
   * Add a document to the full text search index
   * @param root named parameters
   * @param root.document the document to add to the index
   */
  async addDocument({ document }: { document: string }): Promise<void> {
    const normalized = await prepareForBM25({ text: document });
    this.documentsLength.push(normalized.length);

    // calculate the TF of this document
    const documentTermFrequency: { [key: string]: number } = {};
    for (const word of normalized) {
      // create or increment the value in the object
      documentTermFrequency[word] = documentTermFrequency[word]
        ? documentTermFrequency[word] + 1
        : 1;
    }
    this.documentsTermFrequency.push(documentTermFrequency);

    // calculate the document frequency of each terms from this document
    for (const [term, frequency] of Object.entries(documentTermFrequency)) {
      this.documentFrequency[term] = this.documentFrequency[term]
        ? this.documentFrequency[term] + frequency
        : frequency;
    }
  }

  /**
   * Calculate the IDF for the index; can be slow
   */
  async calculateIDF(): Promise<void> {
    const start = new Date();
    for (const [term, frequency] of Object.entries(this.documentFrequency)) {
      this.inverseDocumentFrequency[term] = Math.log(
        (this.documentsTermFrequency.length - frequency + 0.5) /
          (frequency + 0.5) +
          1,
      );
    }
    const end = new Date();
    console.log(`IDF calculation: ${end.getTime() - start.getTime()}ms`);
  }

  /**
   * Execute a full text search
   * @param root named parameters
   * @param root.query the text query to use for the full text search
   * @returns an array of scores
   */
  async search({ query }: { query: string }): Promise<number[]> {
    const totalWordsLength = this.documentsLength.reduce((sum, current) => {
      return sum + current;
    }, 0);

    const averageDocumentLength =
      totalWordsLength / this.documentsLength.length;

    return await Promise.all(
      this.documentsTermFrequency.map(async (_, index) => {
        const score = await this.#bm25({ averageDocumentLength, index, query });
        return score;
      }),
    );
  }
}
