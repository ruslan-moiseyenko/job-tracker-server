import { Controller, Get, Logger, Req, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
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
    @UserAgent() userAgent: string,
  ) {
    try {
      const user = req.user as OAuthUser;
      if (!user) {
        throw new Error('Authentication failed');
      }

      const tokens = await this.authService.handleGoogleAuth(user, userAgent);
      const frontendUrl = this.configService.get('FRONTEND_URL');

      if (!frontendUrl) {
        throw new Error('Frontend URL not configured');
      }

      return `
        <script>
          window.opener.postMessage({ 
            type: 'OAUTH_CALLBACK',
            payload: ${JSON.stringify(tokens)}
          }, '${frontendUrl}');
          window.close();
        </script>`;
    } catch (error: any) {
      const frontendUrl = this.configService.get('FRONTEND_URL');
      return `
        <script>
          window.opener.postMessage({ 
            type: 'OAUTH_ERROR',
            error: ${JSON.stringify({
              message: error.message || 'Authentication failed',
              code: error.code || 'UNKNOWN_ERROR',
            })}
          }, '${frontendUrl}');
          window.close();
        </script>`;
    }
  }
}
