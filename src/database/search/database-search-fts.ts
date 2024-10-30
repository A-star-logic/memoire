// node
import { mkdir, readFile, writeFile } from 'node:fs/promises';

// utils
import { prepareForBM25 } from '../../utils/text-processing.js';

const b = 0.75;
const k1 = 1.5;

let documentsData: {
  [documentID: string]: {
    termFrequency: { [key: string]: number };
    wordLength: number;
  };
} = {};
let termsData: {
  [term: string]: {
    documentFrequency: number;
    inverseDocumentFrequency: number;
  };
} = {};

/**
 * Load the index from disk
 */
export async function loadFTSIndexFromDisk(): Promise<void> {
  try {
    documentsData = JSON.parse(
      await readFile('.memoire/fts/documentsData.json', { encoding: 'utf8' }),
    ) as typeof documentsData;
    termsData = JSON.parse(
      await readFile('.memoire/fts/termsData.json', { encoding: 'utf8' }),
    ) as typeof termsData;
  } catch {
    console.log('No full text search index found; creating a new one');
  }
}

/**
 * Save the index to disk
 */
export async function saveFTSIndexToDisk(): Promise<void> {
  await mkdir('.memoire/fts', { recursive: true });
  await writeFile(
    '.memoire/fts/documentsData.json',
    JSON.stringify(documentsData),
  );
  await writeFile('.memoire/fts/termsData.json', JSON.stringify(termsData));
}

/**
 * Verify if a document has been indexed
 *
 * **Note**: We are using the FTS index as "ground truth" for speed
 * @param root named parameters
 * @param root.documentID the id of the document
 * @returns true if the document exists
 */
export async function exists({
  documentID,
}: {
  documentID: string;
}): Promise<boolean> {
  return documentID in documentsData;
}

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
export async function addFTSDocument({
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

  await calculateIDF();
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
 * @param root.maxResults the maximum number of results
 * @returns an array of scores
 */
export async function FTSSearch({
  maxResults,
  query,
}: {
  maxResults: number;
  query: string;
}): Promise<{ documentID: string; score: number }[]> {
  const normalizedQuery = await prepareForBM25({ text: query });
  const totalWordsLength = Object.values(documentsData).reduce(
    (sum, currentData) => {
      return sum + currentData.wordLength;
    },
    0,
  );
  const averageDocumentLength =
    totalWordsLength / Object.keys(documentsData).length;

  const results: Awaited<ReturnType<typeof FTSSearch>> = [];
  // todo: can be optimised to limit results size to maxResult instead of splicing it at the end
  for (const documentID of Object.keys(documentsData)) {
    const score = await bm25({
      averageDocumentLength,
      documentID,
      normalizedQuery,
    });
    results.push({ documentID, score });
  }
  return results.splice(maxResults + 1);
}
