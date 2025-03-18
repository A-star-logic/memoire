/**
 * This file is used to select the embedding model depending on the env
 *
 * The default will fall back to a local model (not recommended in prod!)
 */

import { logger } from '@astarlogic/services-database/reporting';

const cohereModel = await import('./ai-embedding-model-cohere.js');
const embedDocumentFunction = cohereModel.embedDocument;
const embedQueryFunction = cohereModel.embedQuery;
const isTooLargeFunction = cohereModel.isTooLarge;
logger.info('Using Cohere model for embedding');

export const embedDocument = embedDocumentFunction;
export const embedQuery = embedQueryFunction;
export const isTooLarge = isTooLargeFunction;
