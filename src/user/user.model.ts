import { ObjectType, Field, ID } from '@nestjs/graphql';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

@ObjectType()
export class GqlUser {
  @Field(() => ID)
  @IsString()
  id: string;

  @Field()
  @IsEmail()
  @IsString()
  @MinLength(4)
  email: string;

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

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  provider?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  providerId?: string;
}
