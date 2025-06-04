import { Module } from '@nestjs/common';
import { GoogleStrategy } from 'src/auth/strategies/google.strategy';
import { JwtStrategy } from 'src/auth/strategies/jwt.strategy';
import { PrismaService } from '../prisma/prisma.service';
import { AuthController } from './auth.controller';
import { AuthResolver } from './auth.resolver';
import { AuthService } from './auth.service';
import { EmailService } from 'src/email/email.service';
import { TokenService } from 'src/token/token.service';
import { CookieService } from './cookie.service';
import { ApplicationStageService } from 'src/application-stage/application-stage.service';

@Module({
  controllers: [AuthController],
  providers: [
    AuthResolver,
    AuthService,
    PrismaService,
    JwtStrategy,
    GoogleStrategy,
    EmailService,
    TokenService,
    CookieService,
    ApplicationStageService,
  ],
  exports: [CookieService],
})
export class AuthModule {}
