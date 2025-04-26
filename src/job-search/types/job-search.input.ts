import { Field, InputType, Int } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsInt,
  IsOptional,
  Min,
  IsString,
  IsBoolean,
} from 'class-validator';

@InputType()
export class CreateJobSearchInput {
  @Field()
  @IsString()
  title: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  description?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  startDate: Date;

  @Field({ nullable: true })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  endDate?: Date;

  @Field()
  @IsBoolean()
  isActive: boolean;
}

@InputType()
export class UpdateJobSearchInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  title?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  description?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  startDate?: Date;

  @Field({ nullable: true })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  endDate?: Date;

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

@InputType()
export class DateRangeInput {
  @Field({
    nullable: true,
    description: 'Start date of the range (inclusive)',
  })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  startDate?: Date;

  @Field({
    nullable: true,
    description: 'End date of the range (inclusive)',
  })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  endDate?: Date;
}

@InputType()
export class JobSearchFilterInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  title?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @Field(() => DateRangeInput, { nullable: true })
  @IsOptional()
  @Type(() => DateRangeInput)
  dateRange?: DateRangeInput;

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  hasApplications?: boolean;
}

@InputType()
export class PaginationInput {
  @Field(() => Int, {
    nullable: true,
    description: 'Number of items to skip (offset)',
    defaultValue: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  offset?: number;

  @Field(() => Int, {
    nullable: true,
    description: 'Number of items to return (limit)',
    defaultValue: 10,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number;
}

// @InputType()
// export class DateRangeInput {
//   @Field({ nullable: true })
//   startDate?: Date;

//   @Field({ nullable: true })
//   endDate?: Date;
// }
