import { InputType, Field } from '@nestjs/graphql';
import {
  IsOptional,
  IsString,
  IsBoolean,
  IsNotEmpty,
  MinLength,
} from 'class-validator';
import { ICreateCompanyInput } from 'src/company/company.service';

@InputType()
export class CreateCompanyInput implements ICreateCompanyInput {
  @Field({ description: 'Company name' })
  @IsString()
  @IsNotEmpty({ message: 'Company name cannot be empty' })
  @MinLength(2, { message: 'Company name must be at least 2 character long' })
  name: string;

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
