import { Test, TestingModule } from '@nestjs/testing';
import { MutexService } from 'src/common/utils/mutex.service';

describe('MutexService Integration Test', () => {
  let service: MutexService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MutexService],
    }).compile();

    service = module.get<MutexService>(MutexService);
  });

  it('should prevent concurrent execution', async () => {
    const results: number[] = [];
    const delay = (ms: number) =>
      new Promise((resolve) => setTimeout(resolve, ms));

    // Simulate concurrent operations
    const operation = async (id: number) => {
      await service.withLock('test-key', async () => {
        results.push(id);
        await delay(10); // Simulate some work
        results.push(id + 100);
      });
    };

    // Start multiple operations concurrently
    await Promise.all([operation(1), operation(2), operation(3)]);

    // Results should be in pairs (e.g., [1, 101, 2, 102, 3, 103])
    // Not interleaved (e.g., [1, 2, 3, 101, 102, 103])
    expect(results).toHaveLength(6);

    // Check that each operation completed atomically
    for (let i = 0; i < results.length; i += 2) {
      expect(results[i + 1]).toBe(results[i] + 100);
    }
  });

  it('should allow concurrent operations with different keys', async () => {
    const results: string[] = [];
    const delay = (ms: number) =>
      new Promise((resolve) => setTimeout(resolve, ms));

    const operation = async (key: string, value: string) => {
      await service.withLock(key, async () => {
        results.push(`${value}-start`);
        await delay(5);
        results.push(`${value}-end`);
      });
    };

    // Operations with different keys should run concurrently
    await Promise.all([operation('key1', 'A'), operation('key2', 'B')]);

    expect(results).toHaveLength(4);
    expect(results).toContain('A-start');
    expect(results).toContain('A-end');
    expect(results).toContain('B-start');
    expect(results).toContain('B-end');
  });
});
