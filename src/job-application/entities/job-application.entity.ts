import { ObjectType, Field, Int, ID } from '@nestjs/graphql';
import { IsString, IsOptional, IsDate, IsArray, IsInt } from 'class-validator';
import { CompanyType } from './company.entity';

@ObjectType()
export class ApplicationStageType {
  @Field(() => ID)
  @IsString()
  id: string;

  @Field()
  @IsString()
  name: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  description?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  color?: string;

  @Field(() => Int)
  @IsInt()
  order: number;

  @Field()
  @IsDate()
  createdAt: Date;

  @Field()
  @IsDate()
  updatedAt: Date;
}

@ObjectType()
export class JobApplicationType {
  @Field(() => ID)
  @IsString()
  id: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  positionTitle?: string;

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

  @Field(() => ApplicationStageType, { nullable: true })
  currentStage?: ApplicationStageType;

  @Field()
  @IsDate()
  createdAt: Date;

  @Field()
  @IsDate()
  updatedAt: Date;
}
