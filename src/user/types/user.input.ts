import { Field, InputType } from '@nestjs/graphql';
import { IsOptional, IsString, Matches, MinLength } from 'class-validator';
import { ValidationConstants } from 'src/common/constants/validation.constants';

@InputType()
export class UserInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  firstName?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  lastName?: string;
}

@InputType()
export class ChangePasswordInput {
  @Field()
  @IsString()
  oldPassword: string;

  @Field()
  @IsString()
  @MinLength(ValidationConstants.PASSWORD_MIN_LENGTH, {
    message: 'Password must contain at least one lowercase letter',
  })
  @Matches(ValidationConstants.PASSWORD_PATTERN, {
    message:
      'Password must contain at least one uppercase, one lowercase letter, and one number',
  })
  newPassword: string;
}

@InputType()
export class ChangeEmailInput {
  @Field()
  @IsString()
  email?: string;
}
