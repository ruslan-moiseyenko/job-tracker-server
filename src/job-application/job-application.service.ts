import { Injectable } from '@nestjs/common';
import { JobApplication } from '@prisma/client';
import { NotFoundError } from 'src/common/exceptions/graphql.exceptions';
import { CreateJobApplicationInput } from './dto/create-job-application.input';
import { UpdateJobApplicationInput } from './dto/update-job-application.input';
import { PrismaService } from 'src/prisma/prisma.service';
import { CompanyService } from 'src/company/company.service';

@Injectable()
export class JobApplicationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly companyService: CompanyService,
  ) {}

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

    // Handle company creation or validation
    let companyId: string;

    if (createJobApplicationInput.company.existingCompanyId) {
      // Verify the existing company belongs to the user
      const existingCompany = await this.companyService.findCompanyById(
        createJobApplicationInput.company.existingCompanyId,
        userId,
      );

      if (!existingCompany) {
        throw new NotFoundError('Company not found');
      }

      companyId = existingCompany.id;
    } else if (createJobApplicationInput.company.newCompany) {
      // Create new company
      try {
        const newCompany = await this.companyService.create(
          userId,
          createJobApplicationInput.company.newCompany,
        );
        companyId = newCompany.id;
      } catch (error) {
        // If company already exists, try to find it and suggest using existing
        if (
          error instanceof Error &&
          error.message.includes('already exists')
        ) {
          const existingCompanies = await this.companyService.searchCompanies(
            createJobApplicationInput.company.newCompany.name,
            userId,
          );

          if (existingCompanies && existingCompanies.length > 0) {
            throw new Error(
              `Company "${createJobApplicationInput.company.newCompany.name}" already exists.`,
            );
          }
        }
        throw error;
      }
    } else {
      throw new Error(
        'Either existingCompanyId or newCompany must be provided',
      );
    }

    // Create job application with resolved companyId
    const { company: _company, ...applicationData } = createJobApplicationInput;

    return await this.prisma.jobApplication.create({
      data: {
        ...applicationData,
        companyId,
      },
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

    // If companyId is being updated, verify the new company belongs to the user
    if (updateJobApplicationInput.companyId) {
      const company = await this.companyService.findCompanyById(
        updateJobApplicationInput.companyId,
        userId,
      );

      if (!company) {
        throw new NotFoundError('Company not found or access denied');
      }
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

  async delete(id: string, userId: string): Promise<JobApplication> {
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
