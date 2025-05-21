import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CookieOptions, Response } from 'express';

@Injectable()
export class CookieService {
  constructor(private readonly configService: ConfigService) {}

  /**
   * Set a cookie with the provided settings
   */
  setCookie(
    res: Response,
    name: string,
    value: string,
    options: Partial<CookieOptions> = {},
  ): void {
    const defaultOptions: CookieOptions = {
      httpOnly: true,
      secure: this.configService.get<string>('NODE_ENV') === 'production',
      sameSite:
        this.configService.get<string>('NODE_ENV') === 'production'
          ? 'none'
          : 'lax',
      path: '/',
    };

    res.cookie(name, value, { ...defaultOptions, ...options });
  }

  /**
   * Set an access token cookie
   */
  setAccessTokenCookie(res: Response, token: string): void {
    const accessExpSeconds = parseInt(
      this.configService.get<string>('JWT_ACCESS_EXPIRATION', '900'),
    );

    this.setCookie(res, 'access_token', token, {
      maxAge: accessExpSeconds * 1000, // Convert to milliseconds
    });
  }

  /**
   * Set a refresh token cookie
   */
  setRefreshTokenCookie(res: Response, token: string): void {
    const refreshExpSeconds = parseInt(
      this.configService.get<string>('JWT_REFRESH_EXPIRATION', '604800'),
    );

    this.setCookie(res, 'refresh_token', token, {
      maxAge: refreshExpSeconds * 1000, // Convert to milliseconds
    });
  }

  /**
   * Clear authentication cookies
   */
  clearAuthCookies(res: Response): void {
    this.setCookie(res, 'access_token', '', { maxAge: 0 });
    this.setCookie(res, 'refresh_token', '', { maxAge: 0 });
  }
}
