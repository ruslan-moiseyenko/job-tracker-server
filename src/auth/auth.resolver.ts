import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { User } from '@prisma/client';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { UserAgent } from 'src/common/decorators/user-agent.decorator';
import { GqlThrottlerGuard } from 'src/common/guards/gql-throttler.guard';
import { GqlUser } from 'src/user/user.model';
import {
  AuthPayload,
  LoginInput,
  OAuthConnectionType,
  RefreshTokenInput,
  RegisterInput,
} from './auth.dto';
import { AuthService } from './auth.service';
import { Public } from 'src/common/decorators/public.decorator';

@Resolver()
@UseGuards(GqlThrottlerGuard)
export class AuthResolver {
  constructor(private authService: AuthService) {}

  @Public()
  @Mutation(() => GqlUser)
  async register(@Args('input') input: RegisterInput) {
    return this.authService.register(input);
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
    @Args('token') token: string,
    @CurrentUser() user: User,
    @Args('accessToken', { nullable: true }) accessToken?: string,
  ) {
    return this.authService.logout(token, user.id, accessToken);
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
}
