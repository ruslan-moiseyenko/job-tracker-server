import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { JobApplicationService } from './job-application.service';
import { JobApplication } from './entities/job-application.entity';
import { CreateJobApplicationInput } from './dto/create-job-application.input';
import { UpdateJobApplicationInput } from './dto/update-job-application.input';

@Resolver(() => JobApplication)
export class JobApplicationResolver {
  constructor(private readonly jobApplicationService: JobApplicationService) {}

  @Mutation(() => JobApplication)
  createJobApplication(
    @Args('createJobApplicationInput')
    createJobApplicationInput: CreateJobApplicationInput,
  ) {
    return this.jobApplicationService.create(createJobApplicationInput);
  }

  @Query(() => [JobApplication], { name: 'jobApplication' })
  findAll() {
    return this.jobApplicationService.findAll();
  }

  @Query(() => JobApplication, { name: 'jobApplication' })
  findOne(@Args('id', { type: () => Int }) id: number) {
    return this.jobApplicationService.findOne(id);
  }

  @Mutation(() => JobApplication)
  updateJobApplication(
    @Args('updateJobApplicationInput')
    updateJobApplicationInput: UpdateJobApplicationInput,
  ) {
    return this.jobApplicationService.update(
      updateJobApplicationInput.id,
      updateJobApplicationInput,
    );
  }

  @Mutation(() => JobApplication)
  removeJobApplication(@Args('id', { type: () => Int }) id: number) {
    return this.jobApplicationService.remove(id);
  }
}
