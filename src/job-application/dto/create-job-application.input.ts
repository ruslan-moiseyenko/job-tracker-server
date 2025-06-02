import { InputType, Int, Field } from '@nestjs/graphql';
import {
  IsInt,
  IsOptional,
  Min,
  IsString,
  IsUUID,
  IsArray,
} from 'class-validator';

@InputType()
export class CreateJobApplicationInput {
  @Field({ description: 'Job position title' })
  @IsString()
  positionTitle: string;

  @Field({
    nullable: true,
    description: 'Job description (markdown supported)',
  })
  @IsOptional()
  @IsString()
  jobDescription?: string;

  @Field(() => [String], { description: 'Array of job posting links' })
  @IsArray()
  @IsString({ each: true })
  jobLinks: string[];

  @Field({
    nullable: true,
    description: 'Custom color for the application row',
  })
  @IsOptional()
  @IsString()
  customColor?: string;

  @Field(() => Int, { nullable: true, description: 'Expected salary' })
  @IsOptional()
  @IsInt()
  @Min(0)
  salary?: number;

  // Company relation field - reference existing company by ID
  @Field({ description: 'Company ID to associate with this application' })
  @IsString()
  @IsUUID()
  companyId: string;

  @Field({ description: 'Job search ID this application belongs to' })
  @IsString()
  @IsUUID()
  jobSearchId: string;

  @Field({ nullable: true, description: 'Current application stage ID' })
  @IsOptional()
  @IsString()
  @IsUUID()
  currentStageId?: string;
}
