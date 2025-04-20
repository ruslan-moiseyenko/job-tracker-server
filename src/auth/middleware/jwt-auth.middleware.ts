import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { AuthService } from 'src/auth/auth.service';
import { RedisService } from 'src/redis/redis.service';

@Injectable()
export class JwtAuthMiddleware implements NestMiddleware {
  constructor(
    private authService: AuthService,
    private redisService: RedisService,
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);

      try {
        // Check if token is blacklisted
        const isBlacklisted = await this.redisService.isBlacklisted(token);
        if (isBlacklisted) {
          // if blacklisted, continue without attaching user
          next();
          return;
        }

        const user = await this.authService.validateAccessToken(token);
        if (user) {
          // Attach the user to the request
          req.user = user;
        }
      } catch (error) {
        // Just log the error but don't block the request
        console.error('JWT validation error:', error.message);
      }
    }

    next();
  }
}
