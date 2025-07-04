import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { RedisService } from 'src/redis/redis.service';
import {
  AuthenticationError,
  ConfigurationError,
} from '../../common/exceptions/graphql.exceptions';
import { PrismaService } from '../../prisma/prisma.service';

// Custom extractor that tries cookies first, then falls back to auth header
const cookieExtractor = (req: Request): string | null => {
  if (req && req.cookies) {
    return req.cookies['access_token'];
  }
  return null;
};

const tokenExtractor = (request: Request): string | null => {
  // Try to get the token from cookies first
  const cookieToken = cookieExtractor(request);
  if (cookieToken) {
    return cookieToken;
  }

  // Fall back to header
  return ExtractJwt.fromAuthHeaderAsBearerToken()(request);
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
  ) {
    const jwtSecret = configService.get<string>('JWT_ACCESS_SECRET');
    if (!jwtSecret) {
      throw new ConfigurationError('JWT configuration is missing');
    }

    super({
      jwtFromRequest: tokenExtractor,
      secretOrKey: jwtSecret,
      passReqToCallback: true, // Pass the request to the validate function
    });
  }

  async validate(request: Request, payload: { sub: string }) {
    // Get the token from cookies or auth header
    const token = tokenExtractor(request);
    if (!token) {
      throw new AuthenticationError('Token not found');
    }

    // Check if token is blacklisted
    const isBlacklisted = await this.redisService.isBlacklisted(token);

    if (isBlacklisted) {
      throw new AuthenticationError('Token has been revoked');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user) {
      throw new AuthenticationError('User not found');
    }

    return user;
  }
}
