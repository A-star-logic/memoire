type Vector = number[];

/**
 * Calculate the Cosine similarity between two vectors
 * @param root named parameter
 * @param root.vectorA the first vector
 * @param root.vectorB the vector to compare to
 * @returns the similarity score
 */
export async function calculateSimilarity({
  vectorA,
  vectorB,
}: {
  vectorA: Vector;
  vectorB: Vector;
}): Promise<number> {
  if (vectorA.length !== vectorB.length) {
    throw new Error('Vectors must be the same length');
  }
  // why no functional programming here?
  // because with FP, we would need three loops O(n+n+n)
  // instead of one loop that mutates those three variables O(n)
  let sumAxB = 0;
  let sumASquare = 0;
  let sumBSquare = 0;

  for (const increment of vectorA.keys()) {
    sumAxB += vectorA[increment] * vectorB[increment];
    sumASquare += vectorA[increment] * vectorA[increment];
    sumBSquare += vectorB[increment] * vectorB[increment];
  }

  const sqrtVectorA = Math.sqrt(sumASquare);
  const sqrtVectorB = Math.sqrt(sumBSquare);
  const result = sumAxB / (sqrtVectorA * sqrtVectorB);
  if (Number.isNaN(result)) {
    throw new TypeError('Result is not a number');
  }
  return result;
}
