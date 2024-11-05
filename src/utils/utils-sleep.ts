/**
 * Asynchronously wait for a number of milliseconds.
 *
 * When using this function to rate limit API calls, **YOU MUST ENSURE** that only one call is being made when using this method, or it will be useless
 * @param ms The number of milliseconds to wait
 * @returns void
 */
export function sleep(ms: number): Promise<unknown> {
  return new Promise((resolve) => {
    return setTimeout(resolve, ms);
  });
}
