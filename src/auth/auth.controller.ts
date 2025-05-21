import { Controller, Get, Logger, Req, Res, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '@nestjs/passport';
import { Request, Response } from 'express';
import { UserAgent } from '../common/decorators/user-agent.decorator';
import { OAuthUser } from './auth.dto';
import { AuthService } from './auth.service';
import { Public } from 'src/common/decorators/public.decorator';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Public()
  @Get('google')
  @UseGuards(AuthGuard('google'))
  googleAuth() {
    this.logger.log('Google Auth endpoint hit');
    // Guard redirects to Google
  }

  @Public()
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthRedirect(
    @Req() req: Request,
    @Res() res: Response,
    @UserAgent() userAgent: string,
  ) {
    try {
      const user = req.user as OAuthUser;
      if (!user) {
        throw new Error('Authentication failed');
      }

      await this.authService.handleGoogleAuth(user, userAgent, res);
      const frontendUrl = this.configService.get('FRONTEND_URL');

      if (!frontendUrl) {
        throw new Error('Frontend URL not configured');
      }

      // Now that we're using cookies, we only need to redirect with success status
      const redirectUrl = `${frontendUrl}/oauth-redirect?success=true`;

      return res.redirect(redirectUrl);
    } catch (error: any) {
      const frontendUrl = this.configService.get('FRONTEND_URL') || '';
      const errorData = {
        message: error.message || 'Authentication failed',
        code: error.code || 'UNKNOWN_ERROR',
      };
      // Redirect with error information
      const errorRedirectUrl = `${frontendUrl}/oauth-redirect?error=${encodeURIComponent(JSON.stringify(errorData))}`;
      return res.redirect(errorRedirectUrl);
    }
  }
}
