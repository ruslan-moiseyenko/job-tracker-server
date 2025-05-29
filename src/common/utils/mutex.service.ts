import { Injectable } from '@nestjs/common';

@Injectable()
export class MutexService {
  private locks = new Map<string, Promise<void>>();

  /**
   * Acquire a lock for a specific key and execute the function
   * @param key - Unique identifier for the lock (e.g., userId, token)
   * @param fn - Function to execute while holding the lock
   * @returns Promise resolving to the function's return value
   */
  async withLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
    // Wait for any existing lock on this key
    const existingLock = this.locks.get(key);
    if (existingLock) {
      await existingLock;
    }

    // Create a new lock
    let resolve: () => void;
    const lockPromise = new Promise<void>((res) => {
      resolve = res;
    });

    this.locks.set(key, lockPromise);

    try {
      // Execute the function
      const result = await fn();
      return result;
    } finally {
      // Always release the lock
      this.locks.delete(key);
      resolve!();
    }
  }

  /**
   * Check if a key is currently locked
   */
  isLocked(key: string): boolean {
    return this.locks.has(key);
  }

  /**
   * Get the number of active locks
   */
  getActiveLockCount(): number {
    return this.locks.size;
  }
}
