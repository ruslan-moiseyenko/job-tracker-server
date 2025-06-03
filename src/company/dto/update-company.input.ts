import { IsOptional, IsString } from 'class-validator';
import { CreateCompanyInput } from './create-company.input';
import { InputType, Field, PartialType } from '@nestjs/graphql';

@InputType()
export class UpdateCompanyInput extends PartialType(CreateCompanyInput) {
  @Field({ description: 'Company ID' })
  @IsString()
  id: string;

  @Field({ nullable: true, description: 'Company name' })
  @IsString()
  @IsOptional()
  name?: string;

  @Field({ nullable: true, description: 'Company website URL' })
  @IsString()
  @IsOptional()
  website?: string;

  @Field({ nullable: true, description: 'Company description' })
  @IsString()
  @IsOptional()
  description?: string;
}
