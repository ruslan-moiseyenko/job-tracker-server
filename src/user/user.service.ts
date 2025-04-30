import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import {
  BadUserInputError,
  NotFoundError,
} from 'src/common/exceptions/graphql.exceptions';
import { PrismaService } from 'src/prisma/prisma.service';
import { ChangePasswordInput } from 'src/user/types/user.input';
import { ChangeProfileType } from 'src/user/types/user.type';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async updateLastActiveSearch(
    userId: string,
    searchId: string,
  ): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { lastActiveSearchId: searchId },
    });
  }

  async getLastActiveSearch(userId: string): Promise<string | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { lastActiveSearchId: true },
    });
    return user?.lastActiveSearchId || null;
  }

  async updateUserData(
    userId: string,
    data: ChangeProfileType,
  ): Promise<ChangeProfileType> {
    const response = await this.prisma.user.update({
      where: { id: userId },
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
      },
    });

    return {
      firstName: response.firstName ?? undefined,
      lastName: response.lastName ?? undefined,
    };
  }

  async changePassword(
    userId: string,
    input: ChangePasswordInput,
  ): Promise<boolean> {
    const { newPassword, oldPassword } = input;
    //check if the old password is correct
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { password: true },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // If the user doesn't have a password,
    // we assume they are setting it for the first time
    // or had OAuth and are now setting a password
    if (!user.password) {
      try {
        await this.prisma.user.update({
          where: { id: userId },
          data: { password: hashedPassword },
        });
        return true;
      } catch (error) {
        console.error('Error changing password:', error);
        return false;
      }
    }

    const isPasswordValid = await bcrypt.compare(oldPassword, user.password);

    if (!isPasswordValid) {
      throw new BadUserInputError('Old password is incorrect');
    }

    try {
      await this.prisma.user.update({
        where: { id: userId },
        data: { password: hashedPassword },
      });
      return true;
    } catch (error) {
      console.error('Error changing password:', error);
      return false;
    }
  }
}
