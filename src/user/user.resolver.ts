import { Args, Mutation, Resolver, Query } from '@nestjs/graphql';
import { User } from '@prisma/client';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { InternalServerError } from 'src/common/exceptions/graphql.exceptions';
import { ChangePasswordInput, UserInput } from 'src/user/types/user.input';
import { ChangeProfileType } from 'src/user/types/user.type';
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
  @Mutation(() => ChangeProfileType)
  async updateUserProfile(
    @Args('data') data: UserInput,
    @CurrentUser() user: User,
  ): Promise<ChangeProfileType> {
    try {
      return await this.userService.updateUserData(user.id, data);
    } catch (error) {
      console.error('Error updating user data:', error);
      throw new InternalServerError('Failed to update user data');
    }
  }

  @Mutation(() => Boolean)
  async changePassword(
    @Args('input') input: ChangePasswordInput,
    @CurrentUser() user: User,
  ): Promise<boolean> {
    try {
      return await this.userService.changePassword(user.id, input.password);
    } catch (error) {
      console.error('Error changing password:', error);
      throw new InternalServerError('Failed to change password');
    }
  }

  @Query(() => String, { nullable: true })
  async getLastActiveSearch(@CurrentUser() user: User): Promise<string | null> {
    return await this.userService.getLastActiveSearch(user.id);
  }
}
