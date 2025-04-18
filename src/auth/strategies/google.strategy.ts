import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy } from 'passport-google-oauth20';
import { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthService } from '../auth.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
    private authService: AuthService,
  ) {
    const requiredConfigs = {
      clientID: configService.get<string>('GOOGLE_CLIENT_ID'),
      clientSecret: configService.get<string>('GOOGLE_CLIENT_SECRET'),
      callbackURL: configService.get<string>('GOOGLE_CALLBACK_URL'),
    };

    const missingConfigs = Object.entries(requiredConfigs)
      .filter(([, value]) => !value)
      .map(([key]) => key);

    if (missingConfigs.length > 0) {
      throw new Error(
        `Missing Google OAuth configuration: ${missingConfigs.join(', ')}`,
      );
    }

    super({
      clientID: requiredConfigs.clientID!,
      clientSecret: requiredConfigs.clientSecret!,
      callbackURL: requiredConfigs.callbackURL!,
      scope: ['email', 'profile'],
      passReqToCallback: true,
    });
  }

  async validate(
    req: Request,
    accessToken: string,
    refreshToken: string,
    profile: Profile,
  ) {
    if (!profile.emails?.[0]?.value) {
      throw new Error('Email not provided by Google');
    }

    return this.authService.validateOAuthUser({
      email: profile.emails[0].value,
      firstName: profile.name?.givenName,
      lastName: profile.name?.familyName,
      provider: 'google',
      providerId: profile.id,
    });
  }
}
