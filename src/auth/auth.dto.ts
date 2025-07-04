import {
  Field,
  InputType,
  ObjectType,
  registerEnumType,
} from '@nestjs/graphql';
import {
  IsEmail,
  IsOptional,
  IsString,
  MinLength,
  IsDate,
  Matches,
} from 'class-validator';
import { GqlUser } from '../user/user.model';
import { ValidationConstants } from 'src/common/constants/validation.constants';

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
  displayName?: string;
  avatarUrl?: string;
  userData?: any; // For internal use, not exposed via GraphQL
}

@ObjectType()
export class OAuthConnectionType {
  @Field()
  @IsString()
  id: string;

  @Field()
  @IsString()
  provider: string;

  @Field()
  @IsString()
  providerId: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  displayName?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @Field()
  @IsDate()
  createdAt: Date;
}

@InputType()
export class RegisterInput {
  @Field()
  @IsEmail()
  @IsString()
  email: string;

  @Field()
  @IsString()
  @MinLength(ValidationConstants.PASSWORD_MIN_LENGTH, {
    message: `Password must be at least ${ValidationConstants.PASSWORD_MIN_LENGTH} characters long`,
  })
  @Matches(ValidationConstants.PASSWORD_PATTERN, {
    message:
      'Password must contain at least one uppercase, one lowercase letter, and one number',
  })
  password: string;

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
export class LoginInput {
  @Field()
  @IsEmail()
  @IsString()
  email: string;

  @Field()
  @IsString()
  @MinLength(ValidationConstants.PASSWORD_MIN_LENGTH)
  password: string;
}

@InputType()
export class RefreshTokenInput {
  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  refreshToken?: string;
}

@ObjectType()
export class AuthPayload {
  @Field(() => GqlUser, { nullable: true })
  user?: GqlUser;
}

@ObjectType()
export class RefreshTokenResponse {
  @Field()
  success: boolean;
}

@ObjectType()
export class OAuthUrlResponse {
  @Field()
  @IsString()
  url: string;
}

@ObjectType()
export class OAuthSuccessResponse {
  @Field(() => GqlUser)
  user: GqlUser;

  @Field()
  success: boolean;
}
