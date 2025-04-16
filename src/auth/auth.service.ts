import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { PrismaService } from '../prisma/prisma.service';
import { LoginInput, RegisterInput } from './auth.dto';

const ACCESS_SECRET = 'access_secret';
const REFRESH_SECRET = 'refresh_secret';

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService) {}

  async register(input: RegisterInput) {
    const existing = await this.prisma.user.findUnique({
      where: { email: input.email },
    });
    if (existing) throw new ConflictException('Email already in use');

    const hashed = await bcrypt.hash(input.password, 10);
    const user = await this.prisma.user.create({
      data: {
        email: input.email,
        password: hashed,
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
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(input.password, user.password);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    const accessToken = this.generateAccessToken(user.id);
    const refreshToken = this.generateRefreshToken();

    await this.prisma.token.create({
      data: {
        token: refreshToken,
        userAgent: userAgent,
        userId: user.id,
        expDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return {
      accessToken,
      refreshToken,
    };
  }

  generateAccessToken(userId: string): string {
    return jwt.sign({ sub: userId }, ACCESS_SECRET, { expiresIn: '15m' });
  }

  generateRefreshToken(): string {
    return jwt.sign({}, REFRESH_SECRET, { expiresIn: '7d' });
  }

  async validateAccessToken(token: string) {
    try {
      const payload = jwt.verify(token, ACCESS_SECRET) as { sub: string };
      return await this.prisma.user.findUnique({ where: { id: payload.sub } });
    } catch {
      return null;
    }
  }
}
