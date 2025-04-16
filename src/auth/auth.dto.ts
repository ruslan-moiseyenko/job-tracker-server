import { Field, InputType, ObjectType } from '@nestjs/graphql';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

@InputType()
export class RegisterInput {
  @Field()
  @IsEmail()
  @IsString()
  email: string;

  @Field()
  @IsString()
  @MinLength(4)
  password: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MinLength(2)
  firstName?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MinLength(2)
  lastName?: string;
}

@InputType()
export class LoginInput {
  @Field()
  @IsEmail()
  @IsString()
  email: string;

  @Field()
  @IsString()
  @MinLength(4)
  password: string;
}

@ObjectType()
export class AuthPayload {
  @Field()
  @IsString()
  accessToken: string;

  @Field()
  @IsString()
  refreshToken: string;
}
