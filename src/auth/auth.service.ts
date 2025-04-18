import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import {
  AuthenticationError,
  ConfigurationError,
  ConflictError,
} from '../common/exceptions/graphql.exceptions';
import { PrismaService } from '../prisma/prisma.service';
import { LoginInput, RegisterInput, OAuthUser } from './auth.dto';

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
      return await this.prisma.user.findUnique({ where: { id: payload.sub } });
    } catch {
      return null;
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
    let user = await this.prisma.user.findUnique({
      where: { email: oauthData.email },
    });

    if (!user) {
      const randomPassword = Math.random().toString(36).slice(-8);
      const hashedPassword = await bcrypt.hash(randomPassword, 10);

      user = await this.prisma.user.create({
        data: {
          email: oauthData.email,
          password: hashedPassword, // not used, but needed for the user scheme
          firstName: oauthData.firstName,
          lastName: oauthData.lastName,
        },
      });
    }

    // ?? Update OAuth provider info if needed
    if (!user.providerId || user.provider !== oauthData.provider) {
      return this.prisma.user.update({
        where: { id: user.id },
        data: {
          provider: oauthData.provider,
          providerId: oauthData.providerId,
        },
      });
    }

    return user;
  }

  async handleGoogleAuth(input: string | OAuthUser, userAgent: string) {
    const user =
      typeof input === 'string' ? await this.handleGoogleCode(input) : input;

    // Create or update user in database
    const dbUser = await this.validateOAuthUser(user);

    // Generate tokens
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
}
