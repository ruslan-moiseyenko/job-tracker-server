import { Injectable } from '@nestjs/common';
import { JobSearch } from '@prisma/client';
import {
  CreateJobSearchInput,
  JobSearchFilterInput,
  PaginationInput,
} from 'src/job-search/types/job-search.input';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class JobSearchService {
  constructor(private readonly prisma: PrismaService) {}

  async findOne(id: string, userId: string): Promise<JobSearch | null> {
    return await this.prisma.jobSearch.findUnique({
      where: { id, userId },
    });
  }

  async findAllForUser(
    userId: string,
    filter?: JobSearchFilterInput,
    pagination?: PaginationInput,
  ): Promise<JobSearch[]> {
    const whereClause: any = { userId };

    if (filter) {
      if (filter.title) {
        whereClause.title = { contains: filter.title, mode: 'insensitive' };
      }

      if (filter.isActive !== undefined) {
        whereClause.isActive = filter.isActive;
      }

      if (filter.dateRange) {
        if (filter.dateRange.startDate) {
          whereClause.startDate = { gte: filter.dateRange.startDate };
        }
        if (filter.dateRange.endDate) {
          whereClause.startDate = {
            ...whereClause.startDate,
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
      orderBy: { startDate: 'desc' },
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
}
