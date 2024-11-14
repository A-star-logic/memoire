/**
 * Extract text from a binary stream
 * @param root named parameter
 * @param root.binaryStream the binary stream to extract text from
 * @returns a Promise that resolves to the string
 */
export async function extractText({
  binaryStream,
}: {
  binaryStream: Buffer;
}): Promise<string> {
  return binaryStream.toString('utf8');
}
