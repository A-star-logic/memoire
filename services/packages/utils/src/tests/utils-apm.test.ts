// libs
import { sleep } from '@astarlogic/shared/shared-sleep.js';
import { describe, expect, test } from 'vitest';

// functions to test
import { getTotalMemoryUsage, SpeedMonitor } from '../utils-apm.js';

describe('getTotalMemoryUsage', async () => {
  test('getTotalMemoryUsage', async () => {
    const result = await getTotalMemoryUsage();
    expect(result).toBeDefined();
    expect(result).toBeTypeOf('number');
    expect(result).toBeGreaterThan(0);
    expect(result).toBeLessThan(100); // this test should never be above 100mb
  });
});

describe('SpeedMonitor', async () => {
  test('SpeedMonitor return an execution time', async () => {
    const speedMonitor = new SpeedMonitor();
    await sleep(100);
    const executionTime = await speedMonitor.finishMonitoring();
    expect(executionTime).toBeDefined();
    expect(executionTime).toBeTypeOf('number');
    expect(executionTime).toBeGreaterThan(0);
  });

  test('multiple speed monitor will have different execution time', async () => {
    const speedMonitor1 = new SpeedMonitor();
    const speedMonitor2 = new SpeedMonitor();
    await sleep(100);
    const executionTime2 = await speedMonitor2.finishMonitoring();
    await sleep(100);
    const executionTime1 = await speedMonitor1.finishMonitoring();

    expect(executionTime1).toBeDefined();
    expect(executionTime1).toBeTypeOf('number');
    expect(executionTime1).toBeGreaterThan(0);
    expect(executionTime2).toBeDefined();
    expect(executionTime2).toBeTypeOf('number');
    expect(executionTime2).toBeGreaterThan(0);
    expect(executionTime1).not.toBe(executionTime2);
    expect(executionTime2).toBeLessThan(executionTime1);
  });
});
