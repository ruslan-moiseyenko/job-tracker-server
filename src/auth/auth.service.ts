import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import {
  AuthenticationError,
  ConfigurationError,
  ConflictError,
  OAuthError,
} from '../common/exceptions/graphql.exceptions';
import { PrismaService } from '../prisma/prisma.service';
import { LoginInput, RegisterInput, OAuthUser } from './auth.dto';
import { GraphQLError } from 'graphql';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async register(input: RegisterInput) {
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

    return user;
  }

  async login(input: LoginInput, userAgent: string) {
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

    return {
      accessToken,
      refreshToken,
    };
  }

  async logout(token: string) {
    try {
      await this.prisma.token.delete({
        where: { token },
      });
      return true;
    } catch (_error) {
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

  async refreshTokens(token: string, userAgent: string) {
    const storedToken = await this.prisma.token.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!storedToken) {
      throw new AuthenticationError('Invalid refresh token');
    }

    if (storedToken.expDate < new Date()) {
      await this.prisma.token.delete({ where: { token } });
      throw new AuthenticationError('Refresh token expired');
    }

    // Verify token signature
    try {
      const secret = this.configService.get<string>('JWT_REFRESH_SECRET');
      if (!secret) {
        throw new ConfigurationError('JWT configuration is missing');
      }
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

    // Remove old token and create new one
    await this.prisma.token.delete({ where: { token } });
    await this.prisma.token.create({
      data: {
        token: refreshToken,
        userAgent,
        userId: storedToken.userId,
        expDate: new Date(Date.now() + refreshExpSeconds * 1000),
      },
    });

    return {
      accessToken,
      refreshToken,
      user: storedToken.user,
    };
  }

  async validateOAuthUser(oauthData: OAuthUser) {
    try {
      // Check if this OAuth account is already connected to a user
      const existingConnection =
        await this.prisma.userOAuthConnection.findUnique({
          where: {
            provider_providerId: {
              provider: oauthData.provider,
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

  async handleGoogleAuth(input: string | OAuthUser, userAgent: string) {
    const user =
      typeof input === 'string' ? await this.handleGoogleCode(input) : input;

    // Create or update user in database
    const dbUser = await this.validateOAuthUser(user);

    if (!dbUser || !dbUser.id) {
      throw new Error('User ID is required for token generation');
    }

    // Generate tokens
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const accessToken = this.generateAccessToken(dbUser.id);
    const refreshToken = this.generateRefreshToken();

    // Store refresh token
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
}
