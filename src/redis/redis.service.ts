import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private redisClient: Redis;

  constructor(private configService: ConfigService) {
    this.redisClient = new Redis({
      host: this.configService.get('REDIS_HOST', 'localhost'),
      port: this.configService.get('REDIS_PORT', 6379),
      password: this.configService.get('REDIS_PASSWORD', ''),
      db: this.configService.get('REDIS_DB', 0),
    });
  }

  async onModuleInit() {
    // Testing Redis connection
    try {
      await this.redisClient.ping();
      console.log('Redis connection established');
    } catch (error) {
      console.error('Redis connection failed:', error);
    }
  }

  async onModuleDestroy() {
    await this.redisClient.quit();
  }

  getClient(): Redis {
    return this.redisClient;
  }

  // Add a token to the blacklist with expiration
  async addToBlacklist(
    token: string,
    expiryTimeInSeconds: number,
  ): Promise<void> {
    await this.redisClient.set(`bl_${token}`, '1', 'EX', expiryTimeInSeconds);
  }

  // Check if a token is blacklisted
  async isBlacklisted(token: string): Promise<boolean> {
    const result = await this.redisClient.get(`bl_${token}`);
    return result !== null;
  }

  // Remove a token from the blacklist
  async removeFromBlacklist(token: string): Promise<void> {
    await this.redisClient.del(`bl_${token}`);
  }
}
