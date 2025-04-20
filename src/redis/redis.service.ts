import {
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private redisClient: Redis;
  private readonly logger = new Logger(RedisService.name);
  private isConnected = false;

  constructor(private configService: ConfigService) {
    this.redisClient = new Redis({
      host: this.configService.get('REDIS_HOST', 'localhost'),
      port: this.configService.get('REDIS_PORT', 6379),
      password: this.configService.get('REDIS_PASSWORD', ''),
      db: this.configService.get('REDIS_DB', 0),
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

    this.redisClient.on('error', (error) => {
      this.isConnected = false;
      this.logger.error('Redis connection error:', error);
    });

    this.redisClient.on('connect', () => {
      this.isConnected = true;
      this.logger.log('Redis connected');
    });
  }

  async onModuleInit() {
    try {
      await this.redisClient.ping();
      this.isConnected = true;
      this.logger.log('Redis connection established');
    } catch (error) {
      this.logger.error('Redis connection failed:', error);
      throw error; // This will prevent the application from starting if Redis is not available
    }
  }

  async onModuleDestroy() {
    await this.redisClient.quit();
    this.isConnected = false;
  }

  getClient(): Redis {
    if (!this.isConnected) {
      throw new Error('Redis is not connected');
    }
    return this.redisClient;
  }

  // Add a token to the blacklist with expiration
  async addToBlacklist(
    token: string,
    expiryTimeInSeconds: number,
  ): Promise<void> {
    try {
      if (!this.isConnected) {
        throw new Error('Redis is not connected');
      }
      const key = `bl_${token}`;
      await this.redisClient.set(key, '1', 'EX', expiryTimeInSeconds);
      this.logger.debug(
        `Token added to blacklist: ${key}, expires in ${expiryTimeInSeconds}s`,
      );
    } catch (error) {
      this.logger.error('Failed to add token to blacklist:', error);
      throw error;
    }
  }

  // Check if a token is blacklisted
  async isBlacklisted(token: string): Promise<boolean> {
    try {
      if (!this.isConnected) {
        throw new Error('Redis is not connected');
      }
      const key = `bl_${token}`;
      const result = await this.redisClient.get(key);
      return result !== null;
    } catch (error) {
      this.logger.error('Failed to check token blacklist:', error);
      throw error;
    }
  }

  // Remove a token from the blacklist
  async removeFromBlacklist(token: string): Promise<void> {
    try {
      if (!this.isConnected) {
        throw new Error('Redis is not connected');
      }
      const key = `bl_${token}`;
      await this.redisClient.del(key);
      this.logger.debug(`Token removed from blacklist: ${key}`);
    } catch (error) {
      this.logger.error('Failed to remove token from blacklist:', error);
      throw error;
    }
  }
}
