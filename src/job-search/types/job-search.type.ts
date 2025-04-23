import { Field, ID, ObjectType } from '@nestjs/graphql';
import { IsString, IsOptional, IsDate, IsBoolean } from 'class-validator';

@ObjectType()
export class JobSearchType {
  @Field(() => ID)
  id: string;

  @Field()
  @IsString()
  title: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  description?: string;

  @Field()
  @IsDate()
  startDate: Date;

  @Field({ nullable: true })
  @IsOptional()
  @IsDate()
  endDate?: Date;

  @Field()
  @IsBoolean()
  isActive: boolean;

  @Field()
  @IsDate()
  createdAt: Date;

  @Field()
  @IsDate()
  updatedAt: Date;

  // @Field(() => [JobApplicationType], { nullable: true })
  // applications?: JobApplicationType[];
}
