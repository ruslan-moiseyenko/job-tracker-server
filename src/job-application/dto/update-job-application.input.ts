import { InputType, Field, Int } from '@nestjs/graphql';
import {
  IsOptional,
  IsString,
  IsUUID,
  IsArray,
  IsInt,
  Min,
} from 'class-validator';

@InputType()
export class UpdateJobApplicationInput {
  @Field({ nullable: true, description: 'Job position title' })
  @IsOptional()
  @IsString()
  positionTitle?: string;

  @Field({
    nullable: true,
    description: 'Job description (markdown supported)',
  })
  @IsOptional()
  @IsString()
  jobDescription?: string;

  @Field(() => [String], {
    nullable: true,
    description: 'Array of job posting links',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  jobLinks?: string[];

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

  @Field({ nullable: true, description: 'Current application stage ID' })
  @IsOptional()
  @IsString()
  @IsUUID()
  currentStageId?: string;

  @Field({
    nullable: true,
    description: 'Company ID to associate with this application',
  })
  @IsOptional()
  @IsString()
  @IsUUID()
  companyId?: string;

  // Note: jobSearchId is intentionally excluded from updates
  // This is a structural relationship that shouldn't change after creation
}
