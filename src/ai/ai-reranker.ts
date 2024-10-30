import type { FTSSearch } from '../database/search/database-search-fts.js';
import type { vectorSearch } from '../database/search/database-search-vector.js';

type ReRankOutput = {
  chunkID?: number;
  documentID: string;
  score: number;
}[];

/**
 * Calculate the RRF score
 * @param root named params
 * @param root.searchRank  number represents rank of the search result
 * @param root.smoothingConstant smoothing constant for re-ranking, usually 60
 * @returns a number representing rrf score
 */
async function calculateRRF({
  searchRank,
  smoothingConstant = 60,
}: {
  searchRank: number;
  smoothingConstant?: number;
}): Promise<number> {
  return 1 / (smoothingConstant + (searchRank + 1));
}

/**
 * Re-rank the results from a keyword and vector search.
 * Note that the resulting array can be higher than both original arrays, don't forget to trim it
 * @param root named parameters
 * @param root.keywordResults the results from the keyword search
 * @param root.vectorResults the results from the vector search
 * @param root.maxResults the maximum number of results to return
 * @returns a re-ranked list of results
 */
export async function rerank({
  keywordResults,
  maxResults = 100,
  vectorResults,
}: {
  keywordResults: Awaited<ReturnType<typeof FTSSearch>>;
  maxResults?: number;
  vectorResults: Awaited<ReturnType<typeof vectorSearch>>;
}): Promise<ReRankOutput> {
  if (keywordResults.length === 0 && vectorResults.length === 0)
    throw new Error('No results to rerank');
  if (vectorResults.length === 0) {
    return keywordResults;
  }
  if (keywordResults.length === 0) {
    return vectorResults;
  }

  const vectorRRFPromise = vectorResults.map(async (result, position) => {
    return {
      ...result,
      score: await calculateRRF({ searchRank: position }),
    };
  });
  const keywordRRFPromise = keywordResults.map(async (result, position) => {
    return {
      ...result,
      score: await calculateRRF({ searchRank: position }),
    };
  });
  const vectorRRF = await Promise.all(vectorRRFPromise);
  const keywordRRF = await Promise.all(keywordRRFPromise);

  const results: ReRankOutput = await Promise.all(
    vectorRRF.map(async (result) => {
      const keywordDocument = keywordRRF.find((document) => {
        return document.documentID === result.documentID;
      });
      return {
        ...result,
        score: keywordDocument?.score
          ? result.score + keywordDocument.score
          : result.score,
      };
    }),
  );

  // find any document from keyword search missing from the vector search
  const additionalKeywordResults = keywordRRF.filter((keywordDocument) => {
    return !results.some((result) => {
      return result.documentID === keywordDocument.documentID;
    });
  });
  if (additionalKeywordResults.length > 0) {
    results.push(...additionalKeywordResults);
  }

  results.sort((a, b) => {
    return b.score - a.score;
  });
  return results.splice(maxResults + 1);
}
