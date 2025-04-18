import {
  Field,
  InputType,
  ObjectType,
  registerEnumType,
} from '@nestjs/graphql';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';
import { GqlUser } from '../user/user.model';

export enum OAuthProvider {
  GOOGLE = 'google',
  GITHUB = 'github', // for future use
}

registerEnumType(OAuthProvider, {
  name: 'OAuthProvider',
});

export interface OAuthUser {
  email: string;
  firstName?: string;
  lastName?: string;
  provider: string;
  providerId: string;
}

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

@InputType()
export class RefreshTokenInput {
  @Field()
  @IsString()
  refreshToken: string;
}

@ObjectType()
export class AuthPayload {
  @Field()
  @IsString()
  accessToken: string;

  @Field()
  @IsString()
  refreshToken: string;

  @Field(() => GqlUser, { nullable: true })
  user?: GqlUser;
}

@ObjectType()
export class OAuthUrlResponse {
  @Field()
  url: string;
}
