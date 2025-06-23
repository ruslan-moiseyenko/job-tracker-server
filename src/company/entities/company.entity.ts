import { ObjectType, Field, ID } from '@nestjs/graphql';
import { IsDate, IsOptional, IsString, IsBoolean } from 'class-validator';

@ObjectType()
export class Company {
  @Field(() => ID)
  id: string;

  @Field()
  @IsString()
  name: string;

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  website?: string;

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  description?: string;

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  companyNote?: string;

  @Field()
  @IsDate()
  createdAt: Date;

  @Field()
  @IsDate()
  updatedAt: Date;

  @Field(() => Boolean, {
    description: 'Whether this company is marked as favorite by the user',
  })
  @IsBoolean()
  isFavorite: boolean;

  @Field(() => Boolean, {
    description: 'Whether this company is blacklisted by the user',
  })
  @IsBoolean()
  isBlacklisted: boolean;

  // @Field(() => [CompanyContactPersonType], { nullable: true })
  // companyContactPersons?: CompanyContactPersonType[];

  // @Field(() => [CompanyLinkType], { nullable: true })
  // links?: CompanyLinkType[];
}
