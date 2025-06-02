import { Injectable } from '@nestjs/common';
import { JobApplication } from '@prisma/client';
import { NotFoundError } from 'src/common/exceptions/graphql.exceptions';
import { CreateJobApplicationInput } from './dto/create-job-application.input';
import { UpdateJobApplicationInput } from './dto/update-job-application.input';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class JobApplicationService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    userId: string,
    createJobApplicationInput: CreateJobApplicationInput,
  ): Promise<JobApplication> {
    // First verify the job search belongs to the user
    const jobSearch = await this.prisma.jobSearch.findFirst({
      where: {
        id: createJobApplicationInput.jobSearchId,
        userId: userId,
      },
    });

    if (!jobSearch) {
      throw new NotFoundError('Job search not found or access denied');
    }

    return await this.prisma.jobApplication.create({
      data: createJobApplicationInput,
      include: {
        company: true,
        currentStage: true,
        jobSearch: true,
      },
    });
  }

  async findAllForUser(userId: string): Promise<JobApplication[]> {
    return await this.prisma.jobApplication.findMany({
      where: {
        jobSearch: {
          userId: userId,
        },
      },
      include: {
        company: true,
        currentStage: true,
        jobSearch: true,
      },
      orderBy: {
        applicationDate: 'desc',
      },
    });
  }

  async findAllForJobSearch(
    jobSearchId: string,
    userId: string,
  ): Promise<JobApplication[]> {
    return await this.prisma.jobApplication.findMany({
      where: {
        jobSearchId,
        jobSearch: {
          userId: userId,
        },
      },
      include: {
        company: true,
        currentStage: true,
      },
      orderBy: {
        applicationDate: 'desc',
      },
    });
  }

  async findOne(id: string, userId: string): Promise<JobApplication | null> {
    return await this.prisma.jobApplication.findFirst({
      where: {
        id,
        jobSearch: {
          userId: userId,
        },
      },
      include: {
        company: true,
        currentStage: true,
        jobSearch: true,
        comments: {
          include: {
            user: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
        contactPersons: {
          include: {
            contactPerson: true,
          },
        },
      },
    });
  }

  async update(
    id: string,
    userId: string,
    updateJobApplicationInput: UpdateJobApplicationInput,
  ): Promise<JobApplication> {
    // First verify the application belongs to the user
    const existingApplication = await this.findOne(id, userId);
    if (!existingApplication) {
      throw new NotFoundError('Job application not found');
    }

    return await this.prisma.jobApplication.update({
      where: { id },
      data: updateJobApplicationInput,
      include: {
        company: true,
        currentStage: true,
        jobSearch: true,
      },
    });
  }

  async remove(id: string, userId: string): Promise<JobApplication> {
    // First verify the application belongs to the user
    const existingApplication = await this.findOne(id, userId);
    if (!existingApplication) {
      throw new NotFoundError('Job application not found');
    }

    return await this.prisma.jobApplication.delete({
      where: { id },
      include: {
        company: true,
        currentStage: true,
        jobSearch: true,
      },
    });
  }
}
