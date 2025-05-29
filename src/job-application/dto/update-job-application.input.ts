import { CreateJobApplicationInput } from './create-job-application.input';
import { InputType, Field, Int, PartialType } from '@nestjs/graphql';

@InputType()
export class UpdateJobApplicationInput extends PartialType(
  CreateJobApplicationInput,
) {
  @Field(() => Int)
  id: number;
}
