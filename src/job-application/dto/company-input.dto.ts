import { InputType, Field } from '@nestjs/graphql';
import { IsOptional, IsString, IsUUID, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { IsValidCompanyInput } from 'src/job-application/validators/company-input.validator';

@InputType()
export class NewCompanyInput {
  @Field({ description: 'Company name' })
  @IsString()
  name: string;

  @Field({ nullable: true, description: 'Company website URL' })
  @IsString()
  @IsOptional()
  website?: string;

  @Field({ nullable: true, description: 'Company description' })
  @IsString()
  @IsOptional()
  description?: string;
}

@InputType()
export class CompanyInput {
  @Field({
    nullable: true,
    description: 'ID of existing company to associate with this application',
  })
  @IsOptional()
  @IsString()
  @IsUUID()
  existingCompanyId?: string;

  @Field({
    nullable: true,
    description: 'Data for creating a new company',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => NewCompanyInput)
  newCompany?: NewCompanyInput;

  @IsValidCompanyInput()
  _validation?: any; // only used for validation, not a part of the GraphQL schema
}
