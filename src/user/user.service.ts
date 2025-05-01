import { Injectable, Logger } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import {
  AuthenticationError,
  BadUserInputError,
  ConflictError,
  NotFoundError,
} from 'src/common/exceptions/graphql.exceptions';
import { EmailService } from 'src/email/email.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { TokenService, TokenType } from 'src/token/token.service';
import { ChangePasswordInput } from 'src/user/types/user.input';
import { ChangeProfileType } from 'src/user/types/user.type';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tokenService: TokenService,
    private readonly emailService: EmailService,
  ) {}

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

  /**
   * Initiate the email change process for a user
   */
  async requestEmailChange(userId: string, newEmail: string): Promise<boolean> {
    try {
      // Find the user
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new NotFoundError('User not found');
      }

      // Check if new email is different from current
      if (user.email.toLowerCase() === newEmail.toLowerCase()) {
        throw new BadUserInputError(
          'New email is the same as your current email',
        );
      }

      // Check if new email is already in use
      const existingUser = await this.prisma.user.findUnique({
        where: { email: newEmail.toLowerCase() },
      });

      if (existingUser) {
        throw new ConflictError('Email already in use');
      }

      // Generate a verification code
      const { token: verificationCode, expiresIn: expiresInSeconds } =
        await this.tokenService.createToken(
          user.id,
          TokenType.EMAIL_CHANGE,
          { newEmail: newEmail.toLowerCase() },
          true, // Use a verification code instead of a token
        );

      // Convert seconds to minutes for user-friendly display
      const expirationMinutes = Math.ceil(expiresInSeconds / 60);

      // Send verification email to the NEW email
      // TODO: Why not used the response from the email service?
      await this.emailService.sendEmailChangeVerification(newEmail, {
        username: user.firstName || user.email,
        verificationCode,
        newEmail,
        expiresIn: `${expirationMinutes} minutes`,
      });

      this.logger.log(
        `Email change requested for user ${userId}: ${user.email} → ${newEmail}`,
      );
      return true;
    } catch (error) {
      if (
        error instanceof BadUserInputError ||
        error instanceof ConflictError ||
        error instanceof NotFoundError
      ) {
        throw error;
      }
      this.logger.error('Error in requestEmailChange:', error);
      return false;
    }
  }

  /**
   * Verify and complete the email change process
   */
  async verifyEmailChange(
    userId: string,
    verificationCode: string,
  ): Promise<boolean> {
    try {
      // Validate the verification code
      const validation = await this.tokenService.validateToken(
        verificationCode,
        TokenType.EMAIL_CHANGE,
      );

      if (!validation.valid) {
        throw new AuthenticationError('Invalid or expired verification code');
      }

      // Check if the token belongs to the current user
      if (validation.userId !== userId) {
        throw new AuthenticationError(
          'Verification code does not belong to this user',
        );
      }

      // Get the new email from metadata
      const newEmail = validation.metadata?.newEmail;
      if (!newEmail) {
        throw new BadUserInputError('New email information not found');
      }

      // Check again if email is already taken (race condition)
      const existingUser = await this.prisma.user.findUnique({
        where: { email: newEmail },
      });

      if (existingUser && existingUser.id !== userId) {
        throw new ConflictError('Email is now used by another account');
      }

      // Update the user's email
      await this.prisma.user.update({
        where: { id: userId },
        data: { email: newEmail },
      });

      // Delete the used verification code
      await this.tokenService.deleteToken(
        verificationCode,
        TokenType.EMAIL_CHANGE,
      );

      this.logger.log(
        `Email changed successfully for user ${userId} to ${newEmail}`,
      );
      return true;
    } catch (error) {
      if (
        error instanceof AuthenticationError ||
        error instanceof BadUserInputError ||
        error instanceof ConflictError
      ) {
        throw error;
      }
      this.logger.error('Error in verifyEmailChange:', error);
      return false;
    }
  }
}
