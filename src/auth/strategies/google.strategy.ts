import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { Profile, Strategy } from 'passport-google-oauth20';
import { AuthService } from 'src/auth/auth.service';
import { OAuthError } from 'src/common/exceptions/graphql.exceptions';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  private readonly logger = new Logger(GoogleStrategy.name);

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

    this.logger.log('Initializing Google Strategy');
  }

  async validate(
    req: Request,
    accessToken: string,
    refreshToken: string,
    profile: Profile,
  ) {
    if (!profile.emails?.[0]?.value) {
      throw new OAuthError('Email not provided by Google');
    }

    return this.authService.validateOAuthUser({
      email: profile.emails[0].value,
      firstName: profile.name?.givenName,
      lastName: profile.name?.familyName,
      provider: 'google',
      providerId: profile.id,
      displayName: profile.displayName,
      avatarUrl: profile.photos?.[0]?.value,
      userData: {
        // Here we can store additional data that might be useful internally
        // but isn't exposed directly through GraphQL
        locale: profile._json?.locale,
        verifiedEmail: profile._json?.email_verified,
      },
    });
  }
}
