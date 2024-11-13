/* eslint-disable fp/no-class */
/* eslint-disable fp/no-this */

/**
 * Use this to monitor the speed of the application on a specific function.
 *
 * Can't I use just Date.now directly? - No, this function is made so when we need more precise measure we won't have to refactor the rest of the codebase
 *
 * To use it:
 *
 * - Create an instance of this class `const speedMonitor = new SpeedMonitor();`
 * - Once the function you want to monitor has finished execution, end the monitoring with `const executionTime = await speedMonitor.finishMonitoring();`
 */
export class SpeedMonitor {
  #startTime: number;

  constructor() {
    this.#startTime = Date.now();
  }

  /**
   * Stop the monitoring and return the performances values
   * @returns execution time in `ms`
   */
  public async finishMonitoring(): Promise<number> {
    return Date.now() - this.#startTime;
  }
}

/**
 * Return the memory usage of the app (only the heap used)
 * @returns the memory usage in `MB`
 */
export async function getTotalMemoryUsage(): Promise<number> {
  return Math.round((process.memoryUsage().heapUsed / 1024 / 1024) * 100) / 100;
}
