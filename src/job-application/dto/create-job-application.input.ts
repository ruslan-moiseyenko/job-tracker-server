import { InputType, Int, Field } from '@nestjs/graphql';
import {
  IsInt,
  IsOptional,
  Min,
  IsString,
  IsUUID,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CompanyInput } from './company-input.dto';

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

  @Field(() => CompanyInput, {
    description: 'Company to associate with this application (existing or new)',
  })
  @ValidateNested()
  @Type(() => CompanyInput)
  company: CompanyInput;

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
