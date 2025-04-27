import { Args, Mutation, Resolver, Query } from '@nestjs/graphql';
import { User } from '@prisma/client';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { UserService } from 'src/user/user.service';

@Resolver()
export class UserResolver {
  constructor(private readonly userService: UserService) {}

  @Mutation(() => Boolean)
  async setLastActiveSearch(
    @Args('searchId') searchId: string,
    @CurrentUser() user: User,
  ): Promise<boolean> {
    try {
      await this.userService.updateLastActiveSearch(user.id, searchId);
      return true;
    } catch (error) {
      console.error('Error updating last active search:', error);
      return false;
    }
  }

  @Query(() => String, { nullable: true })
  async getLastActiveSearch(@CurrentUser() user: User): Promise<string | null> {
    return await this.userService.getLastActiveSearch(user.id);
  }
}
