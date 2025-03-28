import {
  DeleteObjectsCommand,
  paginateListObjectsV2,
  S3Client,
} from '@aws-sdk/client-s3';
import type { Environment } from '../../../../environment.js';

export let s3Client: S3Client;

/**
 * Clear all objects in the bucket
 * @param root named parameters
 * @param root.bucketName the name of the bucket
 */
export async function clearBucket({
  bucketName,
}: {
  bucketName: string;
}): Promise<void> {
  const paginator = paginateListObjectsV2(
    { client: s3Client },
    {
      Bucket: bucketName,
    },
  );

  const objectKeys = [];
  for await (const { Contents } of paginator) {
    objectKeys.push(
      ...Contents.map((object) => {
        return { Key: object.Key };
      }),
    );
  }

  const deleteCommand = new DeleteObjectsCommand({
    Bucket: bucketName,
    Delete: { Objects: objectKeys },
  });

  await s3Client.send(deleteCommand);
}

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
      sessionToken: env.AWS_SESSION_TOKEN,
    },
    region: 'eu-north-1',
  });
}
