import { ObjectType, Field, ID } from '@nestjs/graphql';
import { IsDate, IsOptional, IsString } from 'class-validator';

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

  @Field()
  @IsDate()
  createdAt: Date;

  @Field()
  @IsDate()
  updatedAt: Date;

  // Relations - these would be resolved using @ResolveField in the resolver
  // Commented out for now, but you can add them when needed
  // @Field(() => [JobApplicationType], { nullable: true })
  // applications?: JobApplicationType[];

  // @Field(() => [CompanyNoteType], { nullable: true })
  // notes?: CompanyNoteType[];

  // @Field(() => [CompanyContactPersonType], { nullable: true })
  // companyContactPersons?: CompanyContactPersonType[];

  // @Field(() => [CompanyLinkType], { nullable: true })
  // links?: CompanyLinkType[];
}
