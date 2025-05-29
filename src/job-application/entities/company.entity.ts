import { ObjectType, Field, ID } from '@nestjs/graphql';
import { IsString, IsOptional, IsDate, IsUrl } from 'class-validator';

@ObjectType()
export class CompanyType {
  @Field(() => ID)
  @IsString()
  id: string;

  @Field()
  @IsString()
  name: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @IsUrl()
  website?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  industry?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  description?: string;

  @Field()
  @IsDate()
  createdAt: Date;

  @Field()
  @IsDate()
  updatedAt: Date;
}
