/* eslint-disable no-console */
/* eslint-disable sonarjs/no-unused-collection */
/* eslint-disable security/detect-non-literal-fs-filename */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* cSpell: disable */
import { readdir, readFile } from 'node:fs/promises';
import { BM25 } from './bm25.js';
import { addDocument, calculateIDF, search } from './bm25 async.js';
import { calculateSimilarity } from './similarity.js';

const files = await readdir('./dataset', { recursive: true });
const vectorArray: { embedding: number[]; index: string }[] = [];

const formatMemoryUsage = (data: number): string => {
  return `${Math.round((data / 1024 / 1024) * 100) / 100} MB`;
};

const bm25 = new BM25();

const start = new Date();
// await Promise.all(
//   files.map(async (filePath) => {
//     if (filePath.includes('.json')) {
//       const document = await readFile(`./dataset/${files[0]}`, {
//         encoding: 'utf8',
//       });
//       const data: {
//         chunks: { [key: string]: { embedding: number[]; text: string } };
//       } = JSON.parse(document);

//       for (const chunk of Object.values(data.chunks)) {
//         vectorArray.push({
//           embedding: chunk.embedding,
//           index: filePath,
//         });
//         //await bm25.addDocument({ document: chunk.text });
//       }
//     }
//   }),
// );
for (const filePath of files) {
  if (filePath.includes('.json')) {
    const document = await readFile(`./dataset/${files[0]}`, {
      encoding: 'utf8',
    });
    const data: {
      chunks: { [key: string]: { embedding: number[]; text: string } };
    } = JSON.parse(document);

    for (const chunk of Object.values(data.chunks)) {
      vectorArray.push({
        embedding: chunk.embedding,
        index: filePath,
      });
      await bm25.addDocument({ document: chunk.text });
      await addDocument({ documentID: filePath, text: chunk.text });
    }
  }
}
await bm25.calculateIDF();
await calculateIDF();

console.log(
  `total documents: ${bm25.documentsTermFrequency.length}; total unique terms: ${Object.keys(bm25.documentFrequency).length}`,
);

const end = new Date();
console.log(
  `\nIngestion: ${vectorArray.length} documents in ${(end.getTime() - start.getTime()) / 1000}s`,
);

const fakeQuery = vectorArray[0];
const searchStart = new Date();
const vectorResults: { index: string; score: number }[] = [];
for (const document of vectorArray) {
  const score = await calculateSimilarity({
    vectorA: fakeQuery.embedding,
    vectorB: document.embedding,
  });
  vectorResults.push({ index: document.index, score });
}

const searchEnd = new Date();
const sortStart = new Date();
vectorResults.sort((a, b) => {
  return b.score - a.score;
});
const sortEnd = new Date();
console.log(
  `\nVector search took ${(searchEnd.getTime() - searchStart.getTime()) / 1000}s`,
  `Sort took ${(sortEnd.getTime() - sortStart.getTime()) / 1000}s`,
);

const searchKWStart = new Date();
await bm25.search({ query: 'railway clock' });
await search({ query: 'railway clock' });
const searchKWEnd = new Date();
console.log(
  `\nKeyword search took ${(searchKWEnd.getTime() - searchKWStart.getTime()) / 1000}s`,
);
console.log(`Memory used: ${formatMemoryUsage(process.memoryUsage().rss)}`);
