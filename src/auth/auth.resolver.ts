import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { User } from '@prisma/client';
import { GqlAuthGuard } from 'src/auth/gql-auth.guard';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { UserAgent } from 'src/common/decorators/user-agent.decorator';
import { GqlThrottlerGuard } from 'src/common/guards/gql-throttler.guard';
import { GqlUser } from 'src/user/user.model';
import { AuthPayload, LoginInput, RegisterInput } from './auth.dto';
import { AuthService } from './auth.service';

@Resolver()
@UseGuards(GqlThrottlerGuard)
export class AuthResolver {
  constructor(private authService: AuthService) {}

  @Mutation(() => GqlUser)
  async register(@Args('input') input: RegisterInput) {
    return this.authService.register(input);
  }

  @Mutation(() => AuthPayload)
  async login(
    @Args('input') input: LoginInput,
    @UserAgent() userAgent: string,
  ) {
    return this.authService.login(input, userAgent);
  }

  @Query(() => GqlUser)
  @UseGuards(GqlAuthGuard)
  me(@CurrentUser() user: User) {
    return user;
  }
}
