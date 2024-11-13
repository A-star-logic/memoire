// /* eslint-disable no-console */
// // /* eslint-disable no-console */
// // /* eslint-disable security/detect-non-literal-fs-filename */
// // /* eslint-disable @typescript-eslint/no-unsafe-assignment */
// // /* cSpell: disable */
// import { readdir, readFile } from 'node:fs/promises';

// // core
// import { search } from '../src/core/core-search.js';
// import { calculateIDF } from '../src/database/search/database-search-fts.js';
// import { getTotalMemoryUsage } from '../src/utils/utils-apm.js';
// import { vi } from 'vitest';

// console.log(`Memory used: ${await getTotalMemoryUsage()}`);

// await calculateIDF();

// const files = await readdir('./dataset', { recursive: true });
// const document = await readFile(`./dataset/${files[0]}`, {
//   encoding: 'utf8',
// });

// // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
// const data: {
//   chunks: { [key: string]: { embedding: number[]; text: string } };
// } = JSON.parse(document);

// const fakeQuery = {
//   embedding: data.chunks['0'].embedding,
//   text: data.chunks['0'].text,
// };

// const searchStart = new Date();
// const vi.fn()
// await search({
//   query: fakeQuery.text,
// });
// const searchEnd = new Date();

// console.log(
//   `\nSearch took ${(searchEnd.getTime() - searchStart.getTime()) / 1000}s`,
// );

// console.log(`Memory used: ${await getTotalMemoryUsage()}`);
// eslint-disable-next-line unicorn/no-empty-file
