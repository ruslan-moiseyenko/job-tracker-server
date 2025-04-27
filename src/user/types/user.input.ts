import { Field, InputType } from '@nestjs/graphql';
import { IsOptional, IsString } from 'class-validator';

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
  password?: string;
}

@InputType()
export class ChangeEmailInput {
  @Field()
  @IsString()
  email?: string;
}
