import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import { RedisService } from 'src/redis/redis.service';

export enum TokenType {
  PASSWORD_RESET = 'PASSWORD_RESET',
  EMAIL_CHANGE = 'EMAIL_CHANGE',
}

@Injectable()
export class TokenService {
  private readonly logger = new Logger(TokenService.name);
  private readonly tokenExpirationMap: Record<TokenType, number> = {
    [TokenType.PASSWORD_RESET]: 10 * 60, // 10 minutes in seconds
    [TokenType.EMAIL_CHANGE]: 10 * 60, // 10 minutes in seconds
  };

  constructor(
    private readonly redisService: RedisService,
    private readonly configService: ConfigService,
  ) {
    // Override defaults with config if provided
    const passwordResetExpiration = this.configService.get<number>(
      'PASSWORD_RESET_EXPIRATION',
    );
    const emailChangeExpiration = this.configService.get<number>(
      'EMAIL_CHANGE_EXPIRATION',
    );

    if (passwordResetExpiration) {
      this.tokenExpirationMap[TokenType.PASSWORD_RESET] =
        passwordResetExpiration * 60; // Convert minutes to seconds
    }

    if (emailChangeExpiration) {
      this.tokenExpirationMap[TokenType.EMAIL_CHANGE] =
        emailChangeExpiration * 60; // Convert minutes to seconds
    }
  }

  /**
   * Generate a prefix key for Redis based on token type
   */
  private getKeyPrefix(type: TokenType): string {
    return `token:${type.toLowerCase()}:`;
  }

  /**
   * Generate a unique token
   */
  private generateToken(): string {
    return randomBytes(32).toString('hex');
  }

  /**
   * Generate a numeric verification code
   */
  private generateVerificationCode(): string {
    // Generate a 6-digit code
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Create a new token or code for the given user
   * @param userId - The ID of the user
   * @param type - The type of token (e.g., PASSWORD_RESET, EMAIL_CHANGE)
   * @param metadata - Optional metadata to associate with the token
   * @param useVerificationCode - Whether to use a verification code instead of a token
   * @returns An object containing the generated token and its expiration time
   *          in seconds
   *          or throws an error if the token could not be created
   *          or if the user ID is invalid
   *          or if the token type is invalid
   */
  async createToken(
    userId: string,
    type: TokenType,
    metadata?: Record<string, any>,
    useVerificationCode: boolean = false,
  ): Promise<{ token: string; expiresIn: number }> {
    const redisClient = this.redisService.getClient();

    // Generate token or code
    const token = useVerificationCode
      ? this.generateVerificationCode()
      : this.generateToken();
    const keyPrefix = this.getKeyPrefix(type);
    const expiresIn = this.tokenExpirationMap[type];

    // Store token in Redis with metadata and expiry
    const redisKey = `${keyPrefix}${token}`;
    const value = JSON.stringify({
      userId,
      type,
      metadata: metadata || {},
      createdAt: Date.now(),
    });

    // Remove any existing tokens for this user and type
    try {
      const pattern = `${keyPrefix}*`;
      const keys = await redisClient.keys(pattern);

      for (const key of keys) {
        const existingToken = await redisClient.get(key);
        if (!existingToken) continue;
        const data = JSON.parse(existingToken);
        if (data.userId === userId && data.type === type.toString()) {
          await redisClient.del(key);
        }
      }
    } catch (error) {
      this.logger.error(`Failed to clean up existing tokens: ${error.message}`);
    }

    // Store the new token
    await redisClient.set(redisKey, value, 'EX', expiresIn);

    return { token, expiresIn };
  }

  /**
   * Validate a token and return the associated data
   * @param token - The token to validate
   * @param type - The type of token (e.g., PASSWORD_RESET, EMAIL_CHANGE)
   * @returns An object indicating whether the token is valid, and if so, the user ID and metadata
   *          associated with the token
   */
  async validateToken(
    token: string,
    type: TokenType,
  ): Promise<{
    valid: boolean;
    reason?: string;
    userId?: string;
    metadata?: any;
  }> {
    try {
      const redisClient = this.redisService.getClient();
      const keyPrefix = this.getKeyPrefix(type);
      const redisKey = `${keyPrefix}${token}`;

      const value = await redisClient.get(redisKey);

      if (!value) {
        return { valid: false, reason: 'Token not found or expired' };
      }

      const data = JSON.parse(value);

      // Validate token type
      if (data.type !== type.toString()) {
        return { valid: false, reason: 'Invalid token type' };
      }

      return {
        valid: true,
        userId: data.userId,
        metadata: data.metadata,
      };
    } catch (error) {
      this.logger.error(`Token validation error: ${error.message}`);
      return { valid: false, reason: 'Validation error' };
    }
  }

  /**
   * Delete a token after it's been used
   * @param token - The token to delete
   * @param type - The type of token (e.g., PASSWORD_RESET, EMAIL_CHANGE)
   * @returns A promise that resolves when the token is deleted
   *          or rejects if an error occurs
   */
  async deleteToken(token: string, type: TokenType): Promise<void> {
    try {
      const redisClient = this.redisService.getClient();
      const keyPrefix = this.getKeyPrefix(type);
      const redisKey = `${keyPrefix}${token}`;

      await redisClient.del(redisKey);
    } catch (error) {
      this.logger.error(`Failed to delete token: ${error.message}`);
    }
  }

  /**
   * Get expiration time in minutes for a token type
   * @param type - The type of token (e.g., PASSWORD_RESET, EMAIL_CHANGE)
   */
  getExpirationMinutes(type: TokenType): number {
    return this.tokenExpirationMap[type] / 60; // Convert seconds to minutes
  }
}
