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
} from 'src/job-search/types/job-search.input';
import { JobSearchType } from 'src/job-search/types/job-search.type';

@Resolver(() => JobSearchType)
@UseGuards(GqlThrottlerGuard)
export class JobSearchResolver {
  constructor(private readonly jobSearchService: JobSearchService) {}

  @Mutation(() => JobSearchType)
  async createJobSearch(
    @Args('input') input: CreateJobSearchInput,
    @CurrentUser() user: User,
  ) {
    return this.jobSearchService.createJobSearch(user.id, input);
  }

  @Mutation(() => JobSearchType)
  async updateJobSearch(
    @Args('id') id: string,
    @Args('input') input: UpdateJobSearchInput,
    @CurrentUser() user: User,
  ) {
    return this.jobSearchService.updateJobSearch(id, user.id, input);
  }

  @Mutation(() => Boolean)
  async deleteJobSearch(@Args('id') id: string, @CurrentUser() user: User) {}

  @Query(() => JobSearchType, { nullable: true })
  async getJobSearchById(@Args('id') id: string, @CurrentUser() user: User) {
    return this.jobSearchService.findOne(id, user.id);
  }

  @Query(() => [JobSearchType])
  async getMyJobSearches(
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

  @Mutation(() => JobSearchType)
  async archiveJobSearch(@Args('id') id: string, @CurrentUser() user: User) {}

  @Mutation(() => JobSearchType)
  async activateJobSearch(@Args('id') id: string, @CurrentUser() user: User) {}

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
