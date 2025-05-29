import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from 'src/redis/redis.service';

@Injectable()
export class DistributedLockService {
  private readonly logger = new Logger(DistributedLockService.name);
  private readonly DEFAULT_TTL = 30; // 30 seconds default TTL
  private readonly RETRY_DELAY = 100; // 100ms between retries
  private readonly MAX_RETRIES = 50; // Max retries before giving up

  constructor(private readonly redisService: RedisService) {}

  /**
   * Acquire a distributed lock and execute function
   * @param lockKey - Unique key for the lock
   * @param fn - Function to execute while holding the lock
   * @param ttl - Lock time-to-live in seconds
   * @returns Promise resolving to the function's return value
   */
  async withDistributedLock<T>(
    lockKey: string,
    fn: () => Promise<T>,
    ttl: number = this.DEFAULT_TTL,
  ): Promise<T> {
    const lockValue = this.generateLockValue();
    const acquired = await this.acquireLock(lockKey, lockValue, ttl);

    if (!acquired) {
      throw new Error(`Failed to acquire lock for key: ${lockKey}`);
    }

    try {
      this.logger.debug(`Lock acquired for key: ${lockKey}`);
      const result = await fn();
      return result;
    } finally {
      await this.releaseLock(lockKey, lockValue);
      this.logger.debug(`Lock released for key: ${lockKey}`);
    }
  }

  /**
   * Try to acquire a lock with retries
   */
  private async acquireLock(
    lockKey: string,
    lockValue: string,
    ttl: number,
  ): Promise<boolean> {
    const client = this.redisService.getClient();

    for (let attempt = 0; attempt < this.MAX_RETRIES; attempt++) {
      // Try to set the lock with NX (only if not exists) and EX (expiration)
      const result = await client.set(
        `lock:${lockKey}`,
        lockValue,
        'EX',
        ttl,
        'NX',
      );

      if (result === 'OK') {
        return true; // Lock acquired
      }

      // Wait before retrying
      await this.sleep(this.RETRY_DELAY);
    }

    return false; // Failed to acquire lock
  }

  /**
   * Release the lock only if we own it
   */
  private async releaseLock(lockKey: string, lockValue: string): Promise<void> {
    const client = this.redisService.getClient();

    // Lua script to atomically check and delete the lock
    const luaScript = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
    `;

    try {
      await client.eval(luaScript, 1, `lock:${lockKey}`, lockValue);
    } catch (error) {
      this.logger.error(`Failed to release lock ${lockKey}:`, error);
    }
  }

  /**
   * Generate a unique value for this lock instance
   */
  private generateLockValue(): string {
    return `${process.pid}-${Date.now()}-${Math.random()}`;
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Check if a lock exists
   */
  async isLocked(lockKey: string): Promise<boolean> {
    const client = this.redisService.getClient();
    const exists = await client.exists(`lock:${lockKey}`);
    return exists === 1;
  }
}
