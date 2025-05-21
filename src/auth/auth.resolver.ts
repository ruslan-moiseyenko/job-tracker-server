import { UseGuards } from '@nestjs/common';
import { Args, Context, Mutation, Query, Resolver } from '@nestjs/graphql';
import { User } from '@prisma/client';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { Public } from 'src/common/decorators/public.decorator';
import { UserAgent } from 'src/common/decorators/user-agent.decorator';
import { AuthenticationError } from 'src/common/exceptions/graphql.exceptions';
import { GqlThrottlerGuard } from 'src/common/guards/gql-throttler.guard';
import { GqlContext } from 'src/common/types/graphql.context';
import { GqlUser } from 'src/user/user.model';
import {
  AuthPayload,
  LoginInput,
  OAuthConnectionType,
  RefreshTokenInput,
  RegisterInput,
  RefreshTokenResponse,
  OAuthSuccessResponse,
} from './auth.dto';
import { AuthService } from './auth.service';
import {
  RequestPasswordResetInput,
  ResetPasswordInput,
} from 'src/auth/password-reset.dto';

@Resolver()
@UseGuards(GqlThrottlerGuard)
export class AuthResolver {
  constructor(private authService: AuthService) {}

  @Public()
  @Mutation(() => AuthPayload)
  async register(
    @Args('input') input: RegisterInput,
    @UserAgent() userAgent: string,
    @Context() context: GqlContext,
  ) {
    return this.authService.register(input, userAgent, context.res);
  }

  @Public()
  @Mutation(() => AuthPayload)
  async login(
    @Args('input') input: LoginInput,
    @UserAgent() userAgent: string,
    @Context() context: GqlContext,
  ) {
    return this.authService.login(input, userAgent, context.res);
  }

  @Public()
  @Mutation(() => RefreshTokenResponse)
  async refreshToken(
    @Args('input', { nullable: true }) input?: RefreshTokenInput,
    @UserAgent() userAgent?: string,
    @Context() context?: GqlContext,
  ) {
    // For cookie-based auth, get refresh token from cookies if not provided in input
    const refreshToken: string =
      (input && input.refreshToken) ||
      (context &&
        context.req &&
        context.req.cookies &&
        context.req.cookies.refresh_token);

    if (!refreshToken) {
      throw new AuthenticationError('Refresh token is required');
    }

    await this.authService.refreshTokens(
      refreshToken,
      userAgent || '',
      context?.res,
    );
    return { success: true };
  }

  @Mutation(() => Boolean)
  async logout(
    @Args('refreshToken', { nullable: true }) inputRefreshToken?: string,
    @CurrentUser() user?: User,
    @Context() context?: GqlContext,
  ) {
    if (!user || !context) {
      throw new AuthenticationError('User authentication required');
    }

    // Get tokens from either cookies or header
    let accessToken: string | undefined;
    let refreshToken = inputRefreshToken;

    // Try to get tokens from cookies first
    if (!refreshToken && context.req.cookies?.refresh_token) {
      refreshToken = context.req.cookies.refresh_token;
    }

    // Get access token from header if not using from cookies
    const authHeader = context.req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      accessToken = authHeader.substring(7);
    } else if (context.req.cookies?.access_token) {
      accessToken = context.req.cookies.access_token;
    }

    if (!refreshToken) {
      throw new AuthenticationError('Refresh token is required');
    }

    return this.authService.logout(
      refreshToken,
      user.id,
      accessToken,
      context.res,
    );
  }

  @Query(() => GqlUser)
  me(@CurrentUser() user: User) {
    return user;
  }

  @Mutation(() => AuthPayload)
  googleAuth(@UserAgent() _userAgent: string) {
    // This will be handled by Google OAuth strategy
    return null;
  }

  @Public()
  @Mutation(() => OAuthSuccessResponse)
  async googleAuthCallback(
    @Args('code') code: string,
    @UserAgent() userAgent: string,
    @Context() context: GqlContext,
  ) {
    if (!context.res) {
      throw new Error('Response object is required for OAuth authentication');
    }
    const result = await this.authService.handleGoogleAuth(
      code,
      userAgent,
      context.res,
    );
    return {
      user: result.user,
      success: true,
    };
  }

  @Query(() => [OAuthConnectionType])
  async getMyOAuthConnections(@CurrentUser() user: User) {
    return this.authService.getOAuthConnections(user.id);
  }

  @Mutation(() => Boolean)
  async removeOAuthConnection(
    @CurrentUser() user: User,
    @Args('connectionId') connectionId: string,
  ) {
    return this.authService.removeOAuthConnection(user.id, connectionId);
  }

  @Public()
  @Mutation(() => Boolean, {
    description: "Request a password reset. Sends reset link to user's email.",
  })
  async requestPasswordReset(@Args('input') input: RequestPasswordResetInput) {
    return this.authService.requestPasswordReset(input.email);
  }

  @Public()
  @Mutation(() => Boolean, {
    description: 'Reset password using token received via email.',
  })
  async resetPassword(@Args('input') input: ResetPasswordInput) {
    return this.authService.resetPassword(input.token, input.newPassword);
  }
}
