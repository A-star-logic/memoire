/**
 * This file is used to select the embedding model depending on the env
 *
 * The default will fall back to a local model (not recommended in prod!)
 */

import { logger } from '../../../database/reporting/database-external-config.js';
import { createDocumentChunks } from '../ai-chunking-fixed-size.js';

let embedDocumentFunction;
let embedQueryFunction;
let isTooLargeFunction;
let createDocumentChunkFunction;

switch (process.env.EMBEDDING_MODEL) {
  case 'cohere': {
    const cohereModel = await import('./ai-embedding-model-cohere.js');
    embedDocumentFunction = cohereModel.embedDocument;
    embedQueryFunction = cohereModel.embedQuery;
    isTooLargeFunction = cohereModel.isTooLarge;
    createDocumentChunkFunction = cohereModel.createDocumentChunks;
    logger.info('Using Cohere model for embedding');
    break;
  }

  case 'openai': {
    const openaiModel = await import('./ai-embedding-model-openai.js');
    embedDocumentFunction = openaiModel.embedDocument;
    embedQueryFunction = openaiModel.embedDocument;
    isTooLargeFunction = openaiModel.isTooLarge;
    createDocumentChunkFunction = createDocumentChunks;
    logger.info('Using OpenAI model for embedding');
    break;
  }

  case 'titanG1': {
    const titanModel = await import('./ai-embedding-model-titan-g1.js');
    embedDocumentFunction = titanModel.embedDocument;
    embedQueryFunction = titanModel.embedDocument;
    isTooLargeFunction = titanModel.isTooLarge;
    createDocumentChunkFunction = createDocumentChunks;
    logger.info('Using Titan model for embedding');
    break;
  }

  case 'titanV2': {
    const titanModel = await import('./ai-embedding-model-titan-v2.js');
    embedDocumentFunction = titanModel.embedDocument;
    embedQueryFunction = titanModel.embedDocument;
    isTooLargeFunction = titanModel.isTooLarge;
    createDocumentChunkFunction = createDocumentChunks;
    logger.info('Using Titan model for embedding');
    break;
  }

  default: {
    const localModel = await import('./ai-embedding-model-local.js');
    embedDocumentFunction = localModel.embedDocument;
    embedQueryFunction = localModel.embedDocument;
    isTooLargeFunction = localModel.isTooLarge;
    createDocumentChunkFunction = createDocumentChunks;
    logger.info('Using local model for embedding');
    break;
  }
}

export const embedDocument = embedDocumentFunction;
export const embedQuery = embedQueryFunction;
export const isTooLarge = isTooLargeFunction;
export const createChunks = createDocumentChunkFunction;
