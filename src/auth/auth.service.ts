import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import {
  AuthenticationError,
  ConfigurationError,
  ConflictError,
} from '../common/exceptions/graphql.exceptions';
import { PrismaService } from '../prisma/prisma.service';
import { LoginInput, RegisterInput } from './auth.dto';

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
    if (!user) {
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
}
