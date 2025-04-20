import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { AuthService } from 'src/auth/auth.service';
import { RedisService } from 'src/redis/redis.service';

@Injectable()
export class JwtAuthMiddleware implements NestMiddleware {
  private readonly logger = new Logger(JwtAuthMiddleware.name);

  constructor(
    private authService: AuthService,
    private redisService: RedisService,
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);

      try {
        // Check if Redis is available first
        await this.redisService.getClient().ping();

        // Check if token is blacklisted
        const isBlacklisted = await this.redisService.isBlacklisted(token);

        if (isBlacklisted) {
          return next();
        }

        const user = await this.authService.validateAccessToken(token);
        if (user) {
          req.user = user;
        }
      } catch (error) {
        if (error.message === 'Redis is not connected') {
          this.logger.error('Redis connection unavailable:', error);
          // Allow the request to proceed even if Redis is down
          const user = await this.authService.validateAccessToken(token);
          if (user) {
            req.user = user;
          }
        } else {
          this.logger.error('JWT validation error:', error.message);
        }
      }
    }

    next();
  }
}
