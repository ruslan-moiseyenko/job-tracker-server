import { UseGuards } from '@nestjs/common';
import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { User } from '@prisma/client';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { GqlThrottlerGuard } from 'src/common/guards/gql-throttler.guard';
import { JobApplicationService } from './job-application.service';
import { JobApplicationType } from './entities/job-application.entity';
import { CreateJobApplicationInput } from './dto/create-job-application.input';
import { UpdateJobApplicationInput } from './dto/update-job-application.input';

@Resolver(() => JobApplicationType)
@UseGuards(GqlThrottlerGuard)
export class JobApplicationResolver {
  constructor(private readonly jobApplicationService: JobApplicationService) {}

  @Mutation(() => JobApplicationType)
  async createJobApplication(
    @Args('input') input: CreateJobApplicationInput,
    @CurrentUser() user: User,
  ) {
    return this.jobApplicationService.create(user.id, input);
  }

  @Query(() => [JobApplicationType], { name: 'jobApplications' })
  async findAllJobApplications(@CurrentUser() user: User) {
    return this.jobApplicationService.findAllForUser(user.id);
  }

  @Query(() => [JobApplicationType], { name: 'jobApplicationsBySearch' })
  async findJobApplicationsBySearch(
    @Args('jobSearchId') jobSearchId: string,
    @CurrentUser() user: User,
  ) {
    return this.jobApplicationService.findAllForJobSearch(jobSearchId, user.id);
  }

  @Query(() => JobApplicationType, { name: 'jobApplication', nullable: true })
  async findOneJobApplication(
    @Args('id') id: string,
    @CurrentUser() user: User,
  ) {
    return this.jobApplicationService.findOne(id, user.id);
  }

  @Mutation(() => JobApplicationType)
  async updateJobApplication(
    @Args('id') id: string,
    @Args('input') input: UpdateJobApplicationInput,
    @CurrentUser() user: User,
  ) {
    return this.jobApplicationService.update(id, user.id, input);
  }

  @Mutation(() => JobApplicationType)
  async removeJobApplication(
    @Args('id') id: string,
    @CurrentUser() user: User,
  ) {
    return this.jobApplicationService.remove(id, user.id);
  }
}
