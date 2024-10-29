import { prepareForBM25 } from './text-processing.js';

const b = 0.75;
const k1 = 1.5;

const documentsData: {
  [documentID: string]: {
    termFrequency: { [key: string]: number };
    wordLength: number;
  };
} = {};
const termsData: {
  [term: string]: {
    documentFrequency: number;
    inverseDocumentFrequency: number;
  };
} = {};

/**
 * Calculate the bm25 score of a query against a document
 * @param root named parameters
 * @param root.averageDocumentLength the average document length
 * @param root.documentID the id of the document
 * @param root.normalizedQuery the query normalised
 * @returns the score
 */
async function bm25({
  averageDocumentLength,
  documentID,
  normalizedQuery,
}: {
  averageDocumentLength: number;
  documentID: string;
  normalizedQuery: string[];
}): Promise<number> {
  let score = 0;
  const documentLength = documentsData[documentID].wordLength;
  const documentTermFrequency = documentsData[documentID].termFrequency;
  for (const term of normalizedQuery) {
    if (term in documentTermFrequency) {
      const freq = documentTermFrequency[term];
      const idf = termsData[term].inverseDocumentFrequency;
      const numerator = idf * freq * (k1 + 1);
      const denominator =
        freq + k1 * (1 - b + (b * documentLength) / averageDocumentLength);
      score += numerator / denominator;
    }
  }
  return score;
}

/**
 * Add a document to the full text search index
 * **IMPORTANT**: This function must be sync, or it could mess the calculations
 * @param root named parameters
 * @param root.documentID the id of the document
 * @param root.text the text of the document
 */
export async function addDocument({
  documentID,
  text,
}: {
  documentID: string;
  text: string;
}): Promise<void> {
  const normalizedText = await prepareForBM25({ text });
  // calculate the TF of this document
  const documentTermFrequency: { [key: string]: number } = {};
  for (const word of normalizedText) {
    // create or increment the value in the object
    documentTermFrequency[word] = documentTermFrequency[word]
      ? documentTermFrequency[word] + 1
      : 1;
  }
  documentsData[documentID] = {
    termFrequency: documentTermFrequency,
    wordLength: normalizedText.length,
  };

  // calculate the document frequency and IDF of each terms from this document
  for (const [term, frequency] of Object.entries(documentTermFrequency)) {
    const termData: (typeof termsData)[string] = termsData[term] ?? {};

    termData.documentFrequency = termData.documentFrequency
      ? termData.documentFrequency + frequency
      : frequency;

    termsData[term] = termData;
  }
}

/**
 * Calculate the IDF of the index; must be run after ingesting documents and before searching
 */
export async function calculateIDF(): Promise<void> {
  for (const [, termData] of Object.entries(termsData)) {
    termData.inverseDocumentFrequency = Math.log(
      (Object.keys(documentsData).length - termData.documentFrequency + 0.5) /
        (termData.documentFrequency + 0.5) +
        1,
    );
  }
}

/**
 * Execute a full text search
 * @param root named parameters
 * @param root.query the text query to use for the full text search
 * @returns an array of scores
 */
export async function search({ query }: { query: string }): Promise<number[]> {
  console.log(
    `total documents: ${Object.keys(documentsData).length}; total unique terms: ${Object.keys(termsData).length}`,
  );
  console.log(Object.values(termsData));
  console.log(Object.keys(termsData));

  const normalizedQuery = await prepareForBM25({ text: query });
  const totalWordsLength = Object.values(documentsData).reduce(
    (sum, currentData) => {
      return sum + currentData.wordLength;
    },
    0,
  );
  const averageDocumentLength =
    totalWordsLength / Object.keys(documentsData).length;

  return await Promise.all(
    Object.keys(documentsData).map(async (documentID) => {
      const score = await bm25({
        averageDocumentLength,
        documentID,
        normalizedQuery,
      });
      return score;
    }),
  );
}
