import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import * as bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';
import { GraphQLError } from 'graphql';
import * as jwt from 'jsonwebtoken';
import { RedisService } from 'src/redis/redis.service';
import {
  AuthenticationError,
  ConfigurationError,
  ConflictError,
  NotFoundError,
  OAuthError,
} from '../common/exceptions/graphql.exceptions';
import { PrismaService } from '../prisma/prisma.service';
import { LoginInput, OAuthUser, RegisterInput } from './auth.dto';
import { EmailService } from 'src/email/email.service';
import { TokenService, TokenType } from 'src/token/token.service';
import { CookieService } from './cookie.service';
import { MutexService } from '../common/utils/mutex.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
    private readonly emailService: EmailService,
    private readonly tokenService: TokenService,
    private readonly cookieService: CookieService,
    private readonly mutexService: MutexService,
  ) {}

  async register(input: RegisterInput, userAgent: string, res?: Response) {
    const existing = await this.prisma.user.findUnique({
      where: { email: input.email },
    });
    if (existing) {
      throw new ConflictError('User with this email already exists');
    }

    const hashedPassword = await bcrypt.hash(input.password, 10);
    const user = await this.prisma.user.create({
      data: {
        email: input.email,
        password: hashedPassword,
        firstName: input.firstName,
        lastName: input.lastName,
      },
    });

    // Generate tokens for automatic login
    const accessToken = this.generateAccessToken(user.id);
    const refreshToken = this.generateRefreshToken();

    const refreshExpSeconds = parseInt(
      this.configService.get<string>('JWT_REFRESH_EXPIRATION', '604800'),
    );

    await this.prisma.token.create({
      data: {
        token: refreshToken,
        userAgent: userAgent,
        userId: user.id,
        expDate: new Date(Date.now() + refreshExpSeconds * 1000),
      },
    });

    // If response object is available, set cookies
    if (res) {
      this.cookieService.setAccessTokenCookie(res, accessToken);
      this.cookieService.setRefreshTokenCookie(res, refreshToken);

      // When using cookies, don't return tokens in the response
      return {
        user,
      };
    }

    // When not using cookies, include tokens in the response
    return {
      accessToken,
      refreshToken,
      user,
    };
  }

  async login(input: LoginInput, userAgent: string, res?: Response) {
    const user = await this.prisma.user.findUnique({
      where: { email: input.email },
    });
    if (!user || !user.password) {
      throw new AuthenticationError('Invalid credentials');
    }

    const valid = await bcrypt.compare(input.password, user.password);
    if (!valid) {
      throw new AuthenticationError('Invalid credentials');
    }

    const accessToken = this.generateAccessToken(user.id);
    const refreshToken = this.generateRefreshToken();

    const refreshExpSeconds = parseInt(
      this.configService.get<string>('JWT_REFRESH_EXPIRATION', '604800'),
    );

    await this.prisma.token.create({
      data: {
        token: refreshToken,
        userAgent: userAgent,
        userId: user.id,
        expDate: new Date(Date.now() + refreshExpSeconds * 1000),
      },
    });

    // If response object is available, set cookies
    if (res) {
      this.cookieService.setAccessTokenCookie(res, accessToken);
      this.cookieService.setRefreshTokenCookie(res, refreshToken);

      // When using cookies, don't return tokens in the response
      return {
        user,
      };
    }

    // When not using cookies, include tokens in the response
    return {
      accessToken,
      refreshToken,
      user,
    };
  }

  async logout(
    refreshToken: string,
    userId: string,
    accessToken?: string,
    res?: Response,
  ) {
    try {
      const tokenRecord = await this.prisma.token.findUnique({
        where: { token: refreshToken },
      });

      // Check if the token exists
      if (!tokenRecord) {
        throw new AuthenticationError('Invalid refresh token');
      }

      // Check if the token belongs to the user
      if (tokenRecord.userId !== userId) {
        throw new AuthenticationError(
          'Token does not belong to the current user',
        );
      }

      // Delete the refresh token
      await this.prisma.token.delete({
        where: { token: refreshToken },
      });

      // Clear cookies if response object is available
      if (res) {
        this.cookieService.clearAuthCookies(res);
      }

      // Handle access token blacklisting
      if (accessToken) {
        try {
          const secret = this.configService.get<string>('JWT_ACCESS_SECRET');
          if (!secret) {
            throw new ConfigurationError('JWT configuration is missing');
          }

          const decoded = jwt.verify(accessToken, secret) as { exp?: number };
          if (decoded && decoded.exp) {
            const currentTimestamp = Math.floor(Date.now() / 1000);
            const expiresIn = decoded.exp - currentTimestamp;

            if (expiresIn > 0) {
              await this.redisService.addToBlacklist(accessToken, expiresIn);
              this.logger.debug(
                `Access token blacklisted for ${expiresIn} seconds`,
              );
            } else {
              this.logger.debug(
                'Access token already expired, no need to blacklist',
              );
            }
          }
        } catch (error) {
          if (error.name === 'JsonWebTokenError') {
            this.logger.error(
              'Invalid access token provided during logout:',
              error.message,
            );
          } else if (error.name === 'TokenExpiredError') {
            this.logger.debug('Access token already expired during logout');
          } else {
            throw error;
          }
        }
      }

      return true;
    } catch (error) {
      this.logger.error('Error during logout:', error);
      if (
        error instanceof AuthenticationError ||
        error instanceof ConfigurationError
      ) {
        throw error;
      }
      return false;
    }
  }

  generateAccessToken(userId: string): string {
    const secret = this.configService.get<string>('JWT_ACCESS_SECRET');
    if (!secret) {
      throw new ConfigurationError('JWT configuration is missing');
    }

    return jwt.sign({ sub: userId }, secret as jwt.Secret, {
      expiresIn: `${this.configService.get('JWT_ACCESS_EXPIRATION', '900')}s`,
    });
  }

  generateRefreshToken(): string {
    const secret = this.configService.get('JWT_REFRESH_SECRET');
    if (!secret) {
      throw new ConfigurationError('JWT configuration is missing');
    }

    return jwt.sign({}, secret as jwt.Secret, {
      expiresIn: `${this.configService.get('JWT_REFRESH_EXPIRATION', '604800')}s`,
    });
  }

  async validateAccessToken(token: string) {
    try {
      const secret = this.configService.get<string>('JWT_ACCESS_SECRET');
      if (!secret) {
        throw new ConfigurationError('JWT configuration is missing');
      }

      const payload = jwt.verify(token, secret as jwt.Secret) as {
        sub: string;
      };

      if (!payload.sub) {
        return null;
      }

      return await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        // Token expired, normal situation
        return null;
      } else if (error.name === 'JsonWebTokenError') {
        console.log(`Invalid token: ${error.message}`);
        return null;
      } else {
        console.error('JWT validation error:', error);
        return null;
      }
    }
  }

  async refreshTokens(
    token: string,
    userAgent: string,
    res?: Response,
  ): Promise<{ accessToken: string; refreshToken: string } | void> {
    // Use mutex to prevent concurrent token refresh operations
    return this.mutexService.withLock(`refresh_token_${token}`, async () => {
      const storedToken = await this.prisma.token.findUnique({
        where: { token },
        include: { user: true },
      });

      if (!storedToken) {
        throw new AuthenticationError('Invalid refresh token');
      }

      // check configuration
      const secret = this.configService.get<string>('JWT_REFRESH_SECRET');
      if (!secret) {
        throw new ConfigurationError('JWT configuration is missing');
      }

      if (storedToken.expDate < new Date()) {
        await this.prisma.token.deleteMany({ where: { token } });
        throw new AuthenticationError('Refresh token expired');
      }

      // Verify token signature
      try {
        jwt.verify(token, secret);
      } catch {
        throw new AuthenticationError('Invalid refresh token');
      }

      // Generate new tokens
      const accessToken = this.generateAccessToken(storedToken.userId);
      const refreshToken = this.generateRefreshToken();
      const refreshExpSeconds = parseInt(
        this.configService.get<string>('JWT_REFRESH_EXPIRATION', '604800'),
      );

      // Remove old token and create new one (only if it still exists)
      // Use deleteMany to avoid issues if multiple or none of the tokens exist
      await this.prisma.token.deleteMany({ where: { token } });
      await this.prisma.token.create({
        data: {
          token: refreshToken,
          userAgent,
          userId: storedToken.userId,
          expDate: new Date(Date.now() + refreshExpSeconds * 1000),
        },
      });

      // If response object is available, set cookies
      if (res) {
        this.cookieService.setAccessTokenCookie(res, accessToken);
        this.cookieService.setRefreshTokenCookie(res, refreshToken);
        // When using cookies, don't return tokens
        return;
      }

      // When not using cookies, return tokens
      const result = {
        accessToken,
        refreshToken,
      };
      return result;
    });
  }

  async validateOAuthUser(oauthData: OAuthUser) {
    try {
      // Check if this OAuth account is already connected to a user
      const existingConnection =
        await this.prisma.userOAuthConnection.findUnique({
          where: {
            provider_providerId: {
              provider: oauthData.provider || 'google', // Default to 'google' if provider is undefined
              providerId: oauthData.providerId,
            },
          },
          include: { user: true },
        });

      if (existingConnection) {
        return existingConnection.user;
      }

      // If no connection exists, look for a user with the same email
      let user = await this.prisma.user.findUnique({
        where: { email: oauthData.email },
      });

      // Transaction to ensure data consistency
      try {
        return await this.prisma.$transaction(async (prisma) => {
          // If user doesn't exist, create one
          if (!user) {
            // Create random password for security
            const randomPassword =
              Math.random().toString(36).slice(-10) +
              Math.random().toString(36).slice(-10);
            const hashedPassword = await bcrypt.hash(randomPassword, 10);

            try {
              user = await prisma.user.create({
                data: {
                  email: oauthData.email,
                  password: hashedPassword,
                  firstName: oauthData.firstName,
                  lastName: oauthData.lastName,
                },
              });
            } catch (error) {
              // Handle specific Prisma errors
              if (
                error.code === 'P2002' &&
                error.meta?.target?.includes('email')
              ) {
                throw new ConflictError('Email already in use');
              }
              throw error;
            }
          }

          // Create OAuth connection for the user
          try {
            await prisma.userOAuthConnection.create({
              data: {
                provider: oauthData.provider,
                providerId: oauthData.providerId,
                displayName: oauthData.displayName,
                avatarUrl: oauthData.avatarUrl,
                userData: oauthData.userData || {},
                userId: user.id,
              },
            });
          } catch (error) {
            // Handle duplicate connection error
            if (
              error.code === 'P2002' &&
              (error.meta?.target?.includes('provider_providerId') ||
                (error.meta?.target?.includes('provider') &&
                  error.meta?.target?.includes('providerId')))
            ) {
              throw new ConflictError(
                'This OAuth account is already connected to another user',
              );
            }
            throw error;
          }

          return user;
        });
      } catch (error) {
        // Handle transaction specific errors
        if (error instanceof ConflictError) {
          throw error; // Re-throw custom errors
        }

        console.error('OAuth validation transaction failed:', error);

        throw new OAuthError('Failed to process OAuth authentication', {
          originalError:
            process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
      }
    } catch (error) {
      if (error instanceof GraphQLError) {
        throw error; // Re-throw GraphQL errors
      }

      console.error('Unexpected error in validateOAuthUser:', error);

      throw new OAuthError('Authentication failed due to an unexpected error', {
        originalError:
          process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }

  /**
   * Process Google authentication with either:
   * - authorization code from Google
   * - OAuthUser data object
   * - validated user object from the database
   */
  async handleGoogleAuth(
    input: string | OAuthUser,
    userAgent: string,
    res?: Response,
  ) {
    // The type annotation here varies based on your actual user model
    let dbUser: any;

    // Step 1: Get the user from OAuth data
    // We need to handle multiple input formats due to different ways this method can be called
    if (typeof input === 'string') {
      // Case 1: We have a Google auth code that needs exchange
      const oauthData = await this.handleGoogleCode(input);
      // Then validate/find/create the user in our database
      dbUser = await this.validateOAuthUser(oauthData);
    } else if ('id' in input) {
      // Case 2: We already have a validated database user (from strategy)
      dbUser = input;
    } else {
      // Case 3: We have raw OAuth user data that needs validation
      dbUser = await this.validateOAuthUser(input);
    }

    // Step 2: Validate the user
    if (!dbUser || !dbUser.id) {
      throw new Error('User ID is required for token generation');
    }

    // Look up OAuth connections for this user to include in the response
    const oauthConnections = await this.prisma.userOAuthConnection.findMany({
      where: { userId: dbUser.id },
      orderBy: { createdAt: 'desc' },
      take: 1, // Just get the most recent one
    });

    // If we have an OAuth connection, add provider info to the user object
    if (oauthConnections && oauthConnections.length > 0) {
      const connection = oauthConnections[0];
      // Enrich user object with provider info
      dbUser = {
        ...dbUser,
        provider: connection.provider,
        providerId: connection.providerId,
      };
    }

    // Step 3: Generate and return tokens
    const userId = String(dbUser.id);
    const accessToken = this.generateAccessToken(userId);
    const refreshToken = this.generateRefreshToken();

    // Store the refresh token
    const refreshExpSeconds = parseInt(
      this.configService.get<string>('JWT_REFRESH_EXPIRATION', '604800'),
    );

    await this.prisma.token.create({
      data: {
        token: refreshToken,
        userAgent,
        userId: dbUser.id,
        expDate: new Date(Date.now() + refreshExpSeconds * 1000),
      },
    });

    // Set cookies if response object is available
    if (res) {
      this.cookieService.setAccessTokenCookie(res, accessToken);
      this.cookieService.setRefreshTokenCookie(res, refreshToken);

      // When using cookies, don't return tokens in the response
      return {
        user: dbUser,
      };
    }

    // When not using cookies, include tokens in the response
    return {
      accessToken,
      refreshToken,
      user: dbUser,
    };
  }

  private async handleGoogleCode(code: string): Promise<OAuthUser> {
    const client = new OAuth2Client(
      this.configService.get('GOOGLE_CLIENT_ID'),
      this.configService.get('GOOGLE_CLIENT_SECRET'),
      this.configService.get('GOOGLE_CALLBACK_URL'),
    );

    try {
      // Exchange code for tokens
      const { tokens } = await client.getToken(code);

      // Verify ID token
      const ticket = await client.verifyIdToken({
        idToken: tokens.id_token!,
        audience: this.configService.get('GOOGLE_CLIENT_ID'),
      });

      const payload = ticket.getPayload();
      if (!payload) {
        throw new AuthenticationError('Invalid token payload');
      }

      return {
        email: payload.email!,
        firstName: payload.given_name,
        lastName: payload.family_name,
        provider: 'google',
        providerId: payload.sub,
      };
    } catch (_error) {
      throw new AuthenticationError('Failed to verify Google authentication');
    }
  }

  /**
   * Get all OAuth connections for a user
   */
  async getOAuthConnections(userId: string) {
    return await this.prisma.userOAuthConnection.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Remove an OAuth connection
   */
  async removeOAuthConnection(userId: string, connectionId: string) {
    // Verify the connection belongs to the user
    const connection = await this.prisma.userOAuthConnection.findFirst({
      where: {
        id: connectionId,
        userId,
      },
    });

    if (!connection) {
      throw new AuthenticationError('OAuth connection not found');
    }

    // Check if user has password - if not, they need at least one OAuth connection
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        userOAuthConnection: true,
      },
    });

    if (!user?.password && (user?.userOAuthConnection?.length ?? 0) <= 1) {
      throw new AuthenticationError(
        'Cannot remove the last OAuth connection without setting a password',
      );
    }

    // Delete the connection
    await this.prisma.userOAuthConnection.delete({
      where: { id: connectionId },
    });

    return true;
  }

  /**
   * Initiate the password reset process for a user
   * @param email - The email address of the user
   * @returns A boolean indicating whether the request was successful
   */
  async requestPasswordReset(email: string): Promise<boolean> {
    try {
      // Find the user
      const user = await this.prisma.user.findUnique({
        where: { email: email.toLowerCase() },
      });

      // Return true even if user doesn't exist (for security)
      if (!user) {
        this.logger.log(
          `Password reset requested for non-existent email: ${email}`,
        );
        return true;
      }

      // Generate a password reset token
      const { token, expiresIn } = await this.tokenService.createToken(
        user.id,
        TokenType.PASSWORD_RESET,
      );

      // Create password reset link
      const resetLink = this.emailService.generatePasswordResetLink(token);
      const expirationMinutes = Math.ceil(expiresIn / 60); // seconds to minutes

      // Send the password reset email
      await this.emailService.sendPasswordResetEmail(user.email, {
        username: user.firstName || user.email,
        resetLink,
        expiresIn: `${expirationMinutes} minutes`,
      });

      this.logger.log(`Password reset token generated for user: ${user.id}`);
      return true;
    } catch (error) {
      this.logger.error('Error in requestPasswordReset:', error);
      return false;
    }
  }

  /**
   * Reset a user's password using the provided token
   * @param token - The password reset token
   * @param newPassword - The new password to set
   * @returns A boolean indicating whether the password was reset successfully
   */
  async resetPassword(token: string, newPassword: string): Promise<boolean> {
    try {
      // Validate the token
      const validation = await this.tokenService.validateToken(
        token,
        TokenType.PASSWORD_RESET,
      );

      if (!validation.valid) {
        throw new AuthenticationError('Invalid or expired reset token');
      }

      // Get user ID from validation
      const userId = validation.userId;

      // Find the user
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new NotFoundError('User not found');
      }

      // Hash the new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update the user's password
      await this.prisma.user.update({
        where: { id: userId },
        data: { password: hashedPassword },
      });

      // Delete the used token
      await this.tokenService.deleteToken(token, TokenType.PASSWORD_RESET);

      this.logger.log(`Password reset successful for user: ${userId}`);
      return true;
    } catch (error) {
      this.logger.error('Error in resetPassword:', error);
      if (error instanceof GraphQLError) {
        throw error;
      }
      return false;
    }
  }
}
