import { Module } from '@nestjs/common';
import { JwtStrategy } from 'src/auth/jwt.strategy';
import { PrismaService } from '../prisma/prisma.service';
import { AuthResolver } from './auth.resolver';
import { AuthService } from './auth.service';

@Module({
  providers: [AuthResolver, AuthService, PrismaService, JwtStrategy],
})
export class AuthModule {}
