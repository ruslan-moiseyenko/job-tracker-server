import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { User } from '@prisma/client';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { GqlThrottlerGuard } from 'src/common/guards/gql-throttler.guard';
import { JobSearchService } from 'src/job-search/job-search.service';
import {
  CreateJobSearchInput,
  JobSearchFilterInput,
  PaginationInput,
  UpdateJobSearchInput,
} from 'src/job-search/dto/job-search.input';
import { JobSearchType } from 'src/job-search/dto/job-search.type';

@Resolver(() => JobSearchType)
@UseGuards(GqlThrottlerGuard)
export class JobSearchResolver {
  constructor(private readonly jobSearchService: JobSearchService) {}

  @Mutation(() => JobSearchType, {
    description: '🔎 Job Searches: Create a new job search',
  })
  async createJobSearch(
    @Args('input') input: CreateJobSearchInput,
    @CurrentUser() user: User,
  ) {
    return this.jobSearchService.createJobSearch(user.id, input);
  }

  @Mutation(() => JobSearchType, {
    description: '🔎 Job Searches: Update an existing job search',
  })
  async updateJobSearch(
    @Args('id') id: string,
    @Args('input') input: UpdateJobSearchInput,
    @CurrentUser() user: User,
  ) {
    return this.jobSearchService.updateJobSearch(id, user.id, input);
  }

  @Mutation(() => JobSearchType, {
    description: '🔎 Job Searches: Delete a job search',
  })
  async deleteJobSearch(@Args('id') id: string, @CurrentUser() user: User) {
    return this.jobSearchService.deleteJobSearch(id, user.id);
  }

  @Query(() => JobSearchType, {
    nullable: true,
    description: '🔎 Job Searches: Get a specific job search by ID',
  })
  async getJobSearchById(@Args('id') id: string, @CurrentUser() user: User) {
    return this.jobSearchService.findOne(id, user.id);
  }

  @Query(() => [JobSearchType], {
    description:
      '🔎 Job Searches: Get all job searches with optional filtering and pagination',
  })
  async getAllJobSearches(
    @CurrentUser() user: User,
    @Args('filter', { nullable: true }) filter: JobSearchFilterInput,
    @Args('pagination', { nullable: true }) pagination: PaginationInput,
  ) {
    return this.jobSearchService.findFilteredForUser(
      user.id,
      filter,
      pagination,
    );
  }

  // Получение статистики для конкретного поиска
  // @Query(() => JobSearchStatisticsType)
  // async getJobSearchStatistics(
  //   @Args('id') id: string,
  //   @CurrentUser() user: User,
  // ) {}

  // Связанные сущности
  // @ResolveField(() => [JobApplicationType])
  // async applications(
  //   @Parent() jobSearch: JobSearch,
  //   @Args('filter', { nullable: true }) filter: JobApplicationFilterInput,
  //   @Args('pagination', { nullable: true }) pagination: PaginationInput,
  // ) {}
}
