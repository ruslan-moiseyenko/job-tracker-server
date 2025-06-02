import { InputType, Field, Int } from '@nestjs/graphql';
import {
  IsString,
  IsOptional,
  IsInt,
  Min,
  IsArray,
  ValidateNested,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  CreateApplicationStageInput,
  UpdateApplicationStageInput,
  BulkReorderInput,
} from 'src/application-stage/application-stage.service';

@InputType()
export class CreateApplicationStageInputDto
  implements CreateApplicationStageInput
{
  @Field({ description: 'Stage name' })
  @IsString()
  name: string;

  @Field({ nullable: true, description: 'Stage description' })
  @IsOptional()
  @IsString()
  description?: string;

  @Field({ nullable: true, description: 'Stage color (hex)' })
  @IsOptional()
  @IsString()
  color?: string;

  @Field({
    nullable: true,
    description: 'ID of stage to insert after (optional, defaults to end)',
  })
  @IsOptional()
  @IsString()
  @IsUUID()
  insertAfter?: string;
}

@InputType()
export class UpdateApplicationStageInputDto
  implements UpdateApplicationStageInput
{
  @Field({ nullable: true, description: 'Stage name' })
  @IsOptional()
  @IsString()
  name?: string;

  @Field({ nullable: true, description: 'Stage description' })
  @IsOptional()
  @IsString()
  description?: string;

  @Field({ nullable: true, description: 'Stage color (hex)' })
  @IsOptional()
  @IsString()
  color?: string;
}

@InputType()
export class StageOrderDto {
  @Field({ description: 'Stage ID' })
  @IsString()
  @IsUUID()
  id: string;

  @Field(() => Int, { description: 'Order position' })
  @IsInt()
  @Min(1)
  order: number;
}

@InputType()
export class BulkReorderStagesInputDto implements BulkReorderInput {
  @Field(() => [StageOrderDto], {
    description: 'Array of stage IDs with their new orders',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StageOrderDto)
  stages: StageOrderDto[];
}

@InputType()
export class SwapStageOrdersInputDto {
  @Field({ description: 'First stage ID' })
  @IsString()
  @IsUUID()
  stageId1: string;

  @Field({ description: 'Second stage ID' })
  @IsString()
  @IsUUID()
  stageId2: string;
}

@InputType()
export class MoveStageInputDto {
  @Field({ description: 'Stage ID to move' })
  @IsString()
  @IsUUID()
  stageId: string;

  @Field({ description: 'Position to move to: "first", "last", or stage ID' })
  @IsString()
  position: string; // "first", "last", "after:stageId", "before:stageId"
}
