import { ObjectType, Field, ID } from '@nestjs/graphql';
import {
  IsDate,
  IsEmail,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

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

  @Field(() => Date)
  @IsDate()
  createdAt: Date;

  @Field(() => Date)
  @IsDate()
  updatedAt: Date;

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

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  lastActiveSearchId?: string;
}
