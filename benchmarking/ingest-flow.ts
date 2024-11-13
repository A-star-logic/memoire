/* eslint-disable no-console */
/* eslint-disable security/detect-non-literal-fs-filename */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* cSpell: disable */
import { readdir, readFile, writeFile } from 'node:fs/promises';

// core
import {
  addFTSDocument,
  calculateIDF,
  saveFTSIndexToDisk,
  usageStatsFTS,
} from '../src/database/search/database-search-fts.js';
import {
  bulkAddVectorChunks,
  saveVectorIndexToDisk,
  usageStatsVector,
} from '../src/database/search/database-search-vector.js';
import { getTotalMemoryUsage, SpeedMonitor } from '../src/utils/utils-apm.js';

const runName = process.argv.slice(2)[0];
if (!runName) {
  throw new Error('Please provide a run name');
}
const benchmarks = await readdir('./benchmarking', { recursive: true });
for (const benchmark of benchmarks) {
  if (benchmark.includes(runName)) {
    throw new Error('Run name already exists');
  }
}

const files = await readdir('./dataset', { recursive: true });

let limit = 0;
const maxDocuments = 1_000_000;
const ingestionMonitor = new SpeedMonitor();
for (const filePath of files) {
  if (filePath.includes('.json') && limit++ < maxDocuments) {
    const document = await readFile(`./dataset/${filePath}`, {
      encoding: 'utf8',
    });
    const data: {
      chunks: { [key: string]: { embedding: number[]; text: string } };
    } = JSON.parse(document);

    for (const chunk of Object.values(data.chunks)) {
      await addFTSDocument({
        documentID: filePath.replaceAll('.json', ''),
        text: chunk.text,
      });
      // await bulkAddVectorChunks({
      //   documentID: filePath.replaceAll('.json', ''),
      //   embeddings: [{ chunkID: 0, embedding: chunk.embedding }],
      // });
    }
  }
}

const idfMonitor = new SpeedMonitor();
await calculateIDF();
const idfSpeed = await idfMonitor.finishMonitoring();
console.log(`\nIndexing ${idfSpeed / 1000}s`);

const ingestionSpeed = await ingestionMonitor.finishMonitoring();
const memoryUsage = await getTotalMemoryUsage();
console.log(`\nIngestion in ${ingestionSpeed / 1000}s`);
console.log(`Memory used: ${memoryUsage}Mb`);

const FTSSpeedMonitor = new SpeedMonitor();
await saveFTSIndexToDisk();
const saveFTSToDiskSpeed = await FTSSpeedMonitor.finishMonitoring();
console.log(`\nSaving FTS index in ${saveFTSToDiskSpeed / 1000}s`);

const vectorIndexSpeedMonitor = new SpeedMonitor();
await saveVectorIndexToDisk();
const saveVectorIndexSpeed = await vectorIndexSpeedMonitor.finishMonitoring();
console.log(`Saving vector index in ${saveVectorIndexSpeed / 1000}s`);

const { totalDocuments: totalVectors } = await usageStatsVector();
const { totalDocuments, totalTerms } = await usageStatsFTS();

await writeFile(
  `./benchmarking/ingest-${runName}.json`,
  JSON.stringify(
    {
      idfSpeed: `${idfSpeed / 1000}s`,
      ingestionSpeed: `${ingestionSpeed / 1000}s`,
      memoryUsage: `${memoryUsage}Mb`,
      saveFTSToDiskSpeed: `${saveFTSToDiskSpeed / 1000}s`,
      saveVectorIndexSpeed: `${saveVectorIndexSpeed / 1000}s`,
      totalDocuments: new Intl.NumberFormat('en-US', {
        style: 'decimal',
      }).format(totalDocuments),
      totalTerms: new Intl.NumberFormat('en-US', {
        style: 'decimal',
      }).format(totalTerms),
      totalVectors: new Intl.NumberFormat('en-US', {
        style: 'decimal',
      }).format(totalVectors),
    },
    undefined,
    2,
  ),
);
