/* eslint-disable no-console */
/* eslint-disable security/detect-non-literal-fs-filename */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* cSpell: disable */
import { readdir, readFile } from 'node:fs/promises';

// core
import { addDocument, search } from './core/search.js';
import {
  calculateIDF,
  saveFTSIndexToDisk,
} from './database/search/database-search-fts.js';
import { saveVectorIndexToDisk } from './database/search/database-search-vector.js';
import { flushCache } from './database/search/database-search-source.js';

const files = await readdir('./dataset', { recursive: true });

const formatMemoryUsage = (data: number): string => {
  return `${Math.round((data / 1024 / 1024) * 100) / 100} MB`;
};

let ingestionTimes: number[] = [];
let iteration = 0;
const start = new Date();
for (const filePath of files) {
  if (filePath.includes('.json') && iteration < 1000) {
    iteration += 1;
    const startIngestionTime = new Date();
    const document = await readFile(`./dataset/${filePath}`, {
      encoding: 'utf8',
    });
    const data: {
      chunks: { [key: string]: { embedding: number[]; text: string } };
    } = JSON.parse(document);

    for (const chunk of Object.values(data.chunks)) {
      await addDocument({
        chunkedContent: [chunk.text],
        documentID: filePath.replaceAll('.json', ''),
        embeddings: [{ chunkID: 0, embedding: chunk.embedding }],
        metadata: {},
        title: filePath,
      });
    }
    const endIngestion = new Date();
    ingestionTimes.push(endIngestion.getTime() - startIngestionTime.getTime());
  }
}
const end = new Date();
console.log(`\nIngestion in ${(end.getTime() - start.getTime()) / 1000}s`);
const averageTime =
  ingestionTimes.reduce((a, b) => {
    return a + b;
  }, 0) / ingestionTimes.length;
console.log(`Average ingestion time: ${averageTime / 1000}s`);
ingestionTimes = []; // release memory

console.log(`Memory used: ${formatMemoryUsage(process.memoryUsage().rss)}`);
const startFlush = new Date();
await flushCache();
const endFlush = new Date();
console.log(
  `\nFlushing cache in ${(endFlush.getTime() - startFlush.getTime()) / 1000}s`,
);

console.log(`Memory used: ${formatMemoryUsage(process.memoryUsage().rss)}`);

const startIndexing = new Date();
await calculateIDF();
const endIndexing = new Date();
console.log(
  `\nIndexing ${(endIndexing.getTime() - startIndexing.getTime()) / 1000}s`,
);

const startSaveFTSIndex = new Date();
await saveFTSIndexToDisk();
const endSaveFTSIndex = new Date();
console.log(
  `\nSaving FTS index in ${(endSaveFTSIndex.getTime() - startSaveFTSIndex.getTime()) / 1000}s`,
);
const startSaveVectorIndex = new Date();
await saveVectorIndexToDisk();
const endSaveVectorIndex = new Date();
console.log(
  `\nSaving vector index in ${(endSaveVectorIndex.getTime() - startSaveVectorIndex.getTime()) / 1000}s`,
);

const document = await readFile(`./dataset/${files[0]}`, {
  encoding: 'utf8',
});
const data: {
  chunks: { [key: string]: { embedding: number[]; text: string } };
} = JSON.parse(document);

const fakeQuery = {
  embedding: data.chunks['0'].embedding,
  text: data.chunks['0'].text,
};

const searchStart = new Date();
await search({
  embedding: fakeQuery.embedding,
  query: fakeQuery.text,
});
const searchEnd = new Date();

console.log(
  `\nSearch took ${(searchEnd.getTime() - searchStart.getTime()) / 1000}s`,
);

console.log(`Memory used: ${formatMemoryUsage(process.memoryUsage().rss)}`);
