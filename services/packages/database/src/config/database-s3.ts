import { S3Client } from '@aws-sdk/client-s3';
import type { Environment } from '../../../../environment.js';

export let s3Client: S3Client;

/**
 * Initialize the connection to the PostgreSQL database
 * @param root named parameters
 * @param root.env environment variables
 */
export function initS3Client({ env }: { env: Environment }): void {
  if (!env.AWS_ACCESS_KEY_ID) {
    throw new Error('AWS_ACCESS_KEY_ID is not set');
  }

  if (!env.AWS_SECRET_ACCESS_KEY) {
    throw new Error('AWS_SECRET_ACCESS_KEY is not set');
  }

  s3Client = new S3Client({
    credentials: {
      accessKeyId: env.AWS_ACCESS_KEY_ID,
      secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
    },
    region: env.AWS_REGION,
  });
}
