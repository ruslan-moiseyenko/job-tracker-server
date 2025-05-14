import { UseGuards } from '@nestjs/common';
import { Args, Context, Mutation, Query, Resolver } from '@nestjs/graphql';
import { User } from '@prisma/client';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { Public } from 'src/common/decorators/public.decorator';
import { UserAgent } from 'src/common/decorators/user-agent.decorator';
import { GqlThrottlerGuard } from 'src/common/guards/gql-throttler.guard';
import { GqlContext } from 'src/common/types/graphql.context';
import { GqlUser } from 'src/user/user.model';
import {
  AuthPayload,
  LoginInput,
  OAuthConnectionType,
  RefreshTokenInput,
  RegisterInput,
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
  ) {
    return this.authService.register(input, userAgent);
  }

  @Public()
  @Mutation(() => AuthPayload)
  async login(
    @Args('input') input: LoginInput,
    @UserAgent() userAgent: string,
  ) {
    return this.authService.login(input, userAgent);
  }

  @Public()
  @Mutation(() => AuthPayload)
  async refreshToken(
    @Args('input') input: RefreshTokenInput,
    @UserAgent() userAgent: string,
  ) {
    return this.authService.refreshTokens(input.refreshToken, userAgent);
  }

  @Mutation(() => Boolean)
  async logout(
    @Args('refreshToken') refreshToken: string,
    @CurrentUser() user: User,
    @Context() context: GqlContext,
  ) {
    const authHeader = context.req.headers.authorization;
    let accessToken: string | undefined;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      accessToken = authHeader.substring(7);
    }
    return this.authService.logout(refreshToken, user.id, accessToken);
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
  @Mutation(() => AuthPayload)
  async googleAuthCallback(
    @Args('code') code: string,
    @UserAgent() userAgent: string,
  ) {
    return await this.authService.handleGoogleAuth(code, userAgent);
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
