import { Logger } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { User } from '@prisma/client';
import { GraphQLError } from 'graphql';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { InternalServerError } from 'src/common/exceptions/graphql.exceptions';
import {
  RequestEmailChangeInput,
  VerifyEmailChangeInput,
} from 'src/user/dto/email-change.dto';
import { ChangePasswordInput, UserInput } from 'src/user/types/user.input';
import { ChangeProfileType } from 'src/user/types/user.type';
import { UserService } from 'src/user/user.service';

@Resolver()
export class UserResolver {
  logger = new Logger(UserResolver.name);

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
      return await this.userService.changePassword(user.id, input);
    } catch (error) {
      if (error instanceof GraphQLError) {
        throw error;
      }
      this.logger.error('Error changing password:', error);
      throw new InternalServerError('Failed to change password');
    }
  }

  @Query(() => String, { nullable: true })
  async getLastActiveSearch(@CurrentUser() user: User): Promise<string | null> {
    return await this.userService.getLastActiveSearch(user.id);
  }

  @Mutation(() => Boolean, {
    description:
      'Request to change email address. Sends verification code to new email.',
  })
  async requestEmailChange(
    @Args('input') input: RequestEmailChangeInput,
    @CurrentUser() user: User,
  ): Promise<boolean> {
    try {
      return await this.userService.requestEmailChange(user.id, input.newEmail);
    } catch (error) {
      if (error instanceof GraphQLError) {
        throw error;
      }
      this.logger.error('Error requesting email change:', error);
      throw new InternalServerError('Failed to process email change request');
    }
  }

  @Mutation(() => Boolean, {
    description: 'Verify email change with code received at new email address.',
  })
  async verifyEmailChange(
    @Args('input') input: VerifyEmailChangeInput,
    @CurrentUser() user: User,
  ): Promise<boolean> {
    try {
      return await this.userService.verifyEmailChange(
        user.id,
        input.verificationCode,
      );
    } catch (error) {
      if (error instanceof GraphQLError) {
        throw error;
      }
      this.logger.error('Error verifying email change:', error);
      throw new InternalServerError('Failed to verify email change');
    }
  }
}
