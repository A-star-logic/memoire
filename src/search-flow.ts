// /* eslint-disable no-console */
// /* eslint-disable security/detect-non-literal-fs-filename */
// /* eslint-disable @typescript-eslint/no-unsafe-assignment */
// /* cSpell: disable */
// import { readdir, readFile } from 'node:fs/promises';

// // core
// import { search } from './core/search.js';
// import { calculateIDF } from './database/search/database-search-fts.js';

// const formatMemoryUsage = (data: number): string => {
//   return `${Math.round((data / 1024 / 1024) * 100) / 100} MB`;
// };

// console.log(`Memory used: ${formatMemoryUsage(process.memoryUsage().rss)}`);

// const startIndexing = new Date();
// await calculateIDF();
// const endIndexing = new Date();
// console.log(
//   `\nIndexing ${(endIndexing.getTime() - startIndexing.getTime()) / 1000}s`,
// );

// const files = await readdir('./dataset', { recursive: true });
// const document = await readFile(`./dataset/${files[0]}`, {
//   encoding: 'utf8',
// });
// const data: {
//   chunks: { [key: string]: { embedding: number[]; text: string } };
// } = JSON.parse(document);

// const fakeQuery = {
//   embedding: data.chunks['0'].embedding,
//   text: data.chunks['0'].text,
// };

// const searchStart = new Date();
// await search({
//   embedding: fakeQuery.embedding,
//   query: fakeQuery.text,
// });
// const searchEnd = new Date();

// console.log(
//   `\nSearch took ${(searchEnd.getTime() - searchStart.getTime()) / 1000}s`,
// );

// console.log(`Memory used: ${formatMemoryUsage(process.memoryUsage().rss)}`);
// eslint-disable-next-line unicorn/no-empty-file
