import { BedrockRuntimeClient } from '@aws-sdk/client-bedrock-runtime';

if (!process.env.AWS_REGION) {
  throw new Error('Please set AWS_REGION');
}
if (!process.env.AWS_ACCESS_KEY_ID) {
  throw new Error('Please set AWS_ACCESS_KEY_ID');
}
if (!process.env.AWS_SECRET_ACCESS_KEY) {
  throw new Error('Please set AWS_SECRET_ACCESS_KEY');
}

export const bedrockClient = new BedrockRuntimeClient({
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
  region: process.env.AWS_REGION,
});
