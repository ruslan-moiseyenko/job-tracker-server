import { Field, ID, ObjectType } from '@nestjs/graphql';
import { IsString, IsOptional, IsDate } from 'class-validator';

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
  createdAt: Date;

  @Field()
  @IsDate()
  updatedAt: Date;

  // @Field(() => [JobApplicationType], { nullable: true })
  // applications?: JobApplicationType[];
}
