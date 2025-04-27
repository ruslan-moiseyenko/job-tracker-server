import { Field, InputType } from '@nestjs/graphql';
import { IsOptional, IsString, Matches, MinLength } from 'class-validator';

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
  @MinLength(5, {
    message: 'Password must contain at least one lowercase letter',
  })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message:
      'Password must contain at least one uppercase, one lowercase letter, and one number',
  })
  password: string;
}

@InputType()
export class ChangeEmailInput {
  @Field()
  @IsString()
  email?: string;
}
