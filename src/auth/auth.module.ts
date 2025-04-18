import { Module } from '@nestjs/common';
import { JwtStrategy } from 'src/auth/strategies/jwt.strategy';
import { GoogleStrategy } from 'src/auth/strategies/google.strategy';
import { PrismaService } from '../prisma/prisma.service';
import { AuthResolver } from './auth.resolver';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';

@Module({
  controllers: [AuthController],
  providers: [
    AuthResolver,
    AuthService,
    PrismaService,
    JwtStrategy,
    GoogleStrategy,
  ],
})
export class AuthModule {}
