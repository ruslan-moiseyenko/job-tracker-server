import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { JobApplicationService } from './job-application.service';
import { CreateJobApplicationInput } from './dto/create-job-application-final.input';
import { JobApplicationType } from './entities/job-application.entity';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { User } from '@prisma/client';

@Resolver(() => JobApplicationType)
export class JobApplicationResolver {
  constructor(private readonly jobApplicationService: JobApplicationService) {}

  // Example using simple company ID approach
  @Mutation(() => JobApplicationType)
  async createJobApplication(
    @Args('input') input: CreateJobApplicationInput,
    @CurrentUser() user: User,
  ) {
    return this.jobApplicationService.create(input, user.id);
  }

  // Example GraphQL mutation that would be generated:
  /*
  mutation CreateJobApplication($input: CreateJobApplicationInput!) {
    createJobApplication(input: $input) {
      id
      positionTitle
      jobDescription
      jobLinks
      customColor
      salary
      company {
        id
        name
        website
        industry
      }
      jobSearch {
        id
        title
      }
      currentStage {
        id
        name
        color
      }
      finalStatus {
        id
        name
        color
      }
      createdAt
      updatedAt
    }
  }
  */

  // Example usage in the frontend:
  /*
  const input = {
    positionTitle: "Senior Frontend Developer",
    jobDescription: "## About the Role\nWe are looking for...",
    jobLinks: ["https://company.com/careers/123"],
    customColor: "#4CAF50",
    salary: 120000,
    companyId: "550e8400-e29b-41d4-a716-446655440000", // Existing company ID
    jobSearchId: "550e8400-e29b-41d4-a716-446655440001", // Existing job search ID
    currentStageId: "550e8400-e29b-41d4-a716-446655440002", // Optional stage ID
    finalStatusId: null // No final status yet
  };
  */
}
