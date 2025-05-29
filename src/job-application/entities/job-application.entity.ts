import { ObjectType, Field, Int, ID } from '@nestjs/graphql';
import { IsString, IsOptional, IsDate, IsArray, IsInt } from 'class-validator';
import { CompanyType } from './company.entity';

@ObjectType()
export class JobApplicationType {
  @Field(() => ID)
  @IsString()
  id: string;

  @Field()
  @IsString()
  positionTitle: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  jobDescription?: string;

  @Field(() => [String])
  @IsArray()
  jobLinks: string[];

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  customColor?: string;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  salary?: number;

  @Field()
  @IsDate()
  applicationDate: Date;

  // Relations
  @Field(() => CompanyType)
  company: CompanyType;

  @Field()
  @IsDate()
  createdAt: Date;

  @Field()
  @IsDate()
  updatedAt: Date;
}
