import {
  IsOptional,
  IsString,
  IsBoolean,
  IsNotEmpty,
  MinLength,
} from 'class-validator';
import { CreateCompanyInput } from './create-company.input';
import { InputType, Field, PartialType } from '@nestjs/graphql';

@InputType()
export class UpdateCompanyInput extends PartialType(CreateCompanyInput) {
  @Field({ description: 'Company ID' })
  @IsString()
  @IsNotEmpty({ message: 'Company ID cannot be empty' })
  id: string;

  @Field({ nullable: true, description: 'Company name' })
  @IsString()
  @IsOptional()
  @IsNotEmpty({ message: 'Company name cannot be empty when provided' })
  @MinLength(1, { message: 'Company name must be at least 1 character long' })
  name?: string;

  @Field({ nullable: true, description: 'Company website URL' })
  @IsString()
  @IsOptional()
  website?: string;

  @Field({ nullable: true, description: 'Company description' })
  @IsString()
  @IsOptional()
  description?: string;

  @Field({ nullable: true, description: 'Mark company as favorite' })
  @IsBoolean()
  @IsOptional()
  isFavorite?: boolean;

  @Field({ nullable: true, description: 'Mark company as blacklisted' })
  @IsBoolean()
  @IsOptional()
  isBlacklisted?: boolean;

  @Field({ nullable: true, description: 'Company note content' })
  @IsString()
  @IsOptional()
  companyNote?: string;
}
