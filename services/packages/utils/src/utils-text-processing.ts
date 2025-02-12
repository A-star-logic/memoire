/**
 * Prepare a given string for use with BM25
 * @param root named parameter
 * @param root.text the text to prepare
 * @returns an array of words
 */
export async function prepareForBM25({
  text,
}: {
  text: string;
}): Promise<string[]> {
  const cleanedText = await cleanText({ text });
  return tokenize({ text: cleanedText });
}

/**
 * Clean a string from any special characters and lowercase it
 * @param root named parameter
 * @param root.text a string to clean
 * @returns a normalized string
 */
async function cleanText({ text }: { text: string }): Promise<string> {
  // replace '.' or ',' with a white space https://regex101.com/r/uBXssf/1
  let normalizedText = text.replaceAll(/[,.]/g, ' ');
  // remove any character that is neither a space or a word character https://regex101.com/r/ofzoTb/1
  normalizedText = normalizedText.replaceAll(/[^\s\w]|\r|\n/g, '');
  // remove multi white spaces
  normalizedText = normalizedText.replaceAll(/\s+/g, ' ');
  return normalizedText.toLowerCase();
}

/**
 * Split a string into substrings of individual words
 * @param root named params
 * @param root.text the string to split
 * @returns an array of words
 */
async function tokenize({ text }: { text: string }): Promise<string[]> {
  // regex: split by whitespace characters
  return text.split(/\s+/);
}
