import { Field, InputType } from '@nestjs/graphql';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';
import { ValidationConstants } from 'src/common/constants/validation.constants';

@InputType({ description: 'Input for requesting a password reset' })
export class RequestPasswordResetInput {
  @Field({ description: 'Email address associated with the account' })
  @IsEmail()
  @IsString()
  email: string;
}

@InputType({ description: 'New password to set' })
export class ResetPasswordInput {
  @Field()
  @IsString()
  @IsNotEmpty()
  token: string;

  @Field()
  @IsString()
  @MinLength(ValidationConstants.PASSWORD_MIN_LENGTH, {
    message: `Password must be at least ${ValidationConstants.PASSWORD_MIN_LENGTH} characters long`,
  })
  @Matches(ValidationConstants.PASSWORD_PATTERN, {
    message:
      'Password must contain at least one uppercase letter, one lowercase letter, and one number',
  })
  newPassword: string;
}
