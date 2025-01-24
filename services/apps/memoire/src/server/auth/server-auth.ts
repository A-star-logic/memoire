// builtin
import crypto from 'node:crypto';

// server
import type { CustomRequest } from '../types.js';

/* v8 ignore start */
if (!process.env.API_KEY) {
  throw new Error('Please set your API_KEY');
}
const API_KEY = process.env.API_KEY;
/* v8 ignore stop */

/**
 * Verify the request has an API token, verify it, and verify the request can go ahead
 *
 * **Note This function will reject management tokens!**
 * @param root named parameters
 * @param root.request the request
 * @throws 401 on error
 * @returns the customer
 */
export async function tokenAuth({
  request,
}: {
  request: CustomRequest;
}): Promise<undefined> {
  if (request.headers.authorization?.includes('Bearer ')) {
    const token = request.headers.authorization.replace('Bearer ', '');
    if (
      (await verifyAPIToken({ apiToken: token })) ||
      (process.env.NODE_ENV === 'test' && token.endsWith('testToken'))
    ) {
      return undefined;
    }
    throw {
      message: 'Authentication required: invalid token',
      statusCode: 401,
    };
  }

  throw {
    message: 'Authentication required: missing token',
    statusCode: 401,
  };
}

/**
 * Perform an integrity & authenticity validation on the api token
 * @param root named parameters
 * @param root.apiToken the token to verify
 * @returns true if the check pass, fail otherwise
 */
export async function verifyAPIToken({
  apiToken,
}: {
  apiToken: string;
}): Promise<boolean> {
  const sentToken = Buffer.from(apiToken);
  const secret = Buffer.from(API_KEY);
  return (
    secret.length === sentToken.length &&
    crypto.timingSafeEqual(secret, sentToken)
  );
}
