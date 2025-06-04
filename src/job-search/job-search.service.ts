import { Injectable } from '@nestjs/common';
import { JobSearch } from '@prisma/client';
import { NotFoundError } from 'src/common/exceptions/graphql.exceptions';
import {
  CreateJobSearchInput,
  JobSearchFilterInput,
  PaginationInput,
  UpdateJobSearchInput,
} from 'src/job-search/dto/job-search.input';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class JobSearchService {
  constructor(private readonly prisma: PrismaService) {}

  async findOne(id: string, userId: string): Promise<JobSearch | null> {
    return await this.prisma.jobSearch.findUnique({
      where: { id, userId },
    });
  }

  async findFilteredForUser(
    userId: string,
    filter?: JobSearchFilterInput,
    pagination?: PaginationInput,
  ): Promise<JobSearch[]> {
    const whereClause: any = { userId };

    if (filter) {
      if (filter.title) {
        whereClause.OR = [
          { title: { contains: filter.title, mode: 'insensitive' } },
          { description: { contains: filter.title, mode: 'insensitive' } },
        ];
      }

      if (filter.dateRange) {
        if (filter.dateRange.startDate) {
          whereClause.createdAt = { gte: filter.dateRange.startDate };
        }
        if (filter.dateRange.endDate) {
          whereClause.createdAt = {
            ...whereClause.createdAt,
            lte: filter.dateRange.endDate,
          };
        }
      }

      if (filter.hasApplications !== undefined) {
        whereClause.applications = filter.hasApplications
          ? { some: {} }
          : { none: {} };
      }
    }

    const take = pagination?.limit || 10;
    const skip = pagination?.offset || 0;

    return this.prisma.jobSearch.findMany({
      where: whereClause,
      take,
      skip,
      orderBy: { createdAt: 'desc' },
    });
  }

  async createJobSearch(
    userId: string,
    input: CreateJobSearchInput,
  ): Promise<JobSearch> {
    return await this.prisma.jobSearch.create({
      data: {
        ...input,
        userId,
      },
    });
  }

  async updateJobSearch(
    id: string,
    userId: string,
    input: UpdateJobSearchInput,
  ): Promise<JobSearch> {
    return await this.prisma.jobSearch.update({
      where: { id, userId },
      data: input,
    });
  }

  async deleteJobSearch(id: string, userId: string): Promise<JobSearch> {
    // First check if the job search exists
    const jobSearch = await this.prisma.jobSearch.findUnique({
      where: { id, userId },
    });

    // If no job search found, throw a NotFoundException
    if (!jobSearch) {
      throw new NotFoundError(`Job search with id ${id} not found`);
    }

    // If it exists, proceed with deletion
    return await this.prisma.jobSearch.delete({
      where: { id, userId },
    });
  }
}
