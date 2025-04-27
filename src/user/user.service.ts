import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from 'src/prisma/prisma.service';
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

  async changePassword(userId: string, password: string): Promise<boolean> {
    const hashedPassword = await bcrypt.hash(password, 10);
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
