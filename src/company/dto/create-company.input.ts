import { InputType, Field } from '@nestjs/graphql';
import { IsOptional, IsString } from 'class-validator';
import { ICreateCompanyInput } from 'src/company/company.service';

@InputType()
export class CreateCompanyInput implements ICreateCompanyInput {
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
