import { Test, TestingModule } from '@nestjs/testing';
import { JobApplicationService } from './job-application.service';
import { CompanyService } from '../company/company.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateJobApplicationInput } from './dto/create-job-application.input';
import { BadRequestException } from '@nestjs/common';
import { NotFoundError } from '../common/exceptions/graphql.exceptions';

describe('JobApplicationService - Integration with CompanyInput', () => {
  let jobApplicationService: JobApplicationService;
  let companyService: CompanyService;
  let prismaService: PrismaService;

  const mockUser = { id: 'user-1' };

  beforeEach(async () => {
    const mockPrismaService = {
      jobApplication: {
        create: jest.fn(),
      },
      company: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
      },
      jobSearch: {
        findFirst: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JobApplicationService,
        {
          provide: CompanyService,
          useValue: {
            create: jest.fn(),
            findCompanyById: jest.fn(),
            searchCompanies: jest.fn(),
          },
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    jobApplicationService = module.get<JobApplicationService>(
      JobApplicationService,
    );
    companyService = module.get<CompanyService>(CompanyService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  describe('create with existing company', () => {
    it('should create job application with existing company ID', async () => {
      const existingCompany = {
        id: 'comp-1',
        name: 'Apple Inc',
        userId: 'user-1',
      };
      const mockJobApplication = {
        id: 'job-1',
        positionTitle: 'Software Engineer',
        companyId: 'comp-1',
        userId: 'user-1',
      };

      const mockJobSearch = {
        id: 'search-1',
        title: 'Tech Jobs',
        userId: 'user-1',
      };

      // Mock job search validation
      (prismaService.jobSearch.findFirst as jest.Mock).mockResolvedValue(
        mockJobSearch,
      );

      // Mock company lookup
      (companyService.findCompanyById as jest.Mock).mockResolvedValue(
        existingCompany,
      );

      // Mock job application creation
      (prismaService.jobApplication.create as jest.Mock).mockResolvedValue(
        mockJobApplication,
      );

      const input: CreateJobApplicationInput = {
        positionTitle: 'Software Engineer',
        jobLinks: ['https://example.com/job'],
        jobSearchId: 'search-1',
        company: {
          existingCompanyId: 'comp-1',
        },
      };

      const result = await jobApplicationService.create(mockUser.id, input);

      expect(result).toEqual(mockJobApplication);
      expect(companyService.findCompanyById).toHaveBeenCalledWith(
        'comp-1',
        'user-1',
      );
      expect(prismaService.jobApplication.create).toHaveBeenCalledWith({
        data: {
          positionTitle: 'Software Engineer',
          companyId: 'comp-1',
          jobLinks: ['https://example.com/job'],
          jobSearchId: 'search-1',
        },
        include: {
          company: true,
          currentStage: true,
          jobSearch: true,
        },
      });
    });

    it('should throw error if existing company not found', async () => {
      const mockJobSearch = {
        id: 'search-1',
        title: 'Tech Jobs',
        userId: 'user-1',
      };

      // Mock job search validation
      (prismaService.jobSearch.findFirst as jest.Mock).mockResolvedValue(
        mockJobSearch,
      );

      (companyService.findCompanyById as jest.Mock).mockResolvedValue(null);

      const input: CreateJobApplicationInput = {
        positionTitle: 'Software Engineer',
        jobLinks: ['https://example.com/job'],
        jobSearchId: 'search-1',
        company: {
          existingCompanyId: 'non-existent',
        },
      };

      await expect(
        jobApplicationService.create(mockUser.id, input),
      ).rejects.toThrow(NotFoundError);
      await expect(
        jobApplicationService.create(mockUser.id, input),
      ).rejects.toThrow('Company not found');
    });
  });

  describe('create with new company', () => {
    it('should create job application with new company', async () => {
      const newCompany = { id: 'comp-2', name: 'Tesla Inc', userId: 'user-1' };
      const mockJobApplication = {
        id: 'job-2',
        positionTitle: 'ML Engineer',
        companyId: 'comp-2',
        userId: 'user-1',
      };

      const mockJobSearch = {
        id: 'search-1',
        title: 'Tech Jobs',
        userId: 'user-1',
      };

      // Mock job search validation
      (prismaService.jobSearch.findFirst as jest.Mock).mockResolvedValue(
        mockJobSearch,
      );

      // Mock company creation
      (companyService.create as jest.Mock).mockResolvedValue(newCompany);

      // Mock job application creation
      (prismaService.jobApplication.create as jest.Mock).mockResolvedValue(
        mockJobApplication,
      );

      const input: CreateJobApplicationInput = {
        positionTitle: 'ML Engineer',
        jobLinks: ['https://example.com/job'],
        jobSearchId: 'search-1',
        company: {
          newCompany: {
            name: 'Tesla Inc',
            website: 'https://tesla.com',
            description: 'Electric vehicles and clean energy',
          },
        },
      };

      const result = await jobApplicationService.create(mockUser.id, input);

      expect(result).toEqual(mockJobApplication);
      expect(companyService.create).toHaveBeenCalledWith('user-1', {
        name: 'Tesla Inc',
        website: 'https://tesla.com',
        description: 'Electric vehicles and clean energy',
      });
      expect(prismaService.jobApplication.create).toHaveBeenCalledWith({
        data: {
          positionTitle: 'ML Engineer',
          companyId: 'comp-2',
          jobLinks: ['https://example.com/job'],
          jobSearchId: 'search-1',
        },
        include: {
          company: true,
          currentStage: true,
          jobSearch: true,
        },
      });
    });

    it('should prevent creating duplicate companies', async () => {
      const similarCompany = { id: 'comp-3', name: 'Tesla Motors' };

      const mockJobSearch = {
        id: 'search-1',
        title: 'Tech Jobs',
        userId: 'user-1',
      };

      // Mock job search validation
      (prismaService.jobSearch.findFirst as jest.Mock).mockResolvedValue(
        mockJobSearch,
      );

      // Mock company creation to throw an error
      (companyService.create as jest.Mock).mockRejectedValue(
        new Error('Company "Tesla Inc" already exists'),
      );

      // Mock searchCompanies to return similar companies
      (companyService.searchCompanies as jest.Mock).mockResolvedValue([
        similarCompany,
      ]);

      const input: CreateJobApplicationInput = {
        positionTitle: 'Software Engineer',
        jobLinks: ['https://example.com/job'],
        jobSearchId: 'search-1',
        company: {
          newCompany: {
            name: 'Tesla Inc',
          },
        },
      };

      await expect(
        jobApplicationService.create(mockUser.id, input),
      ).rejects.toThrow('Company "Tesla Inc" already exists.');
    });
  });

  describe('validation', () => {
    it('should reject input with both existingCompanyId and newCompany', async () => {
      const mockJobSearch = {
        id: 'search-1',
        title: 'Tech Jobs',
        userId: 'user-1',
      };

      // Mock job search validation
      (prismaService.jobSearch.findFirst as jest.Mock).mockResolvedValue(
        mockJobSearch,
      );

      const input = {
        positionTitle: 'Software Engineer',
        jobLinks: ['https://example.com/job'],
        jobSearchId: 'search-1',
        company: {
          existingCompanyId: 'comp-1',
          newCompany: {
            name: 'Apple Inc',
          },
        },
      } as any;

      // This should be caught by the DTO validation, but let's test the service logic too
      await expect(
        jobApplicationService.create(mockUser.id, input),
      ).rejects.toThrow();
    });

    it('should reject input with neither existingCompanyId nor newCompany', async () => {
      const mockJobSearch = {
        id: 'search-1',
        title: 'Tech Jobs',
        userId: 'user-1',
      };

      // Mock job search validation
      (prismaService.jobSearch.findFirst as jest.Mock).mockResolvedValue(
        mockJobSearch,
      );

      const input = {
        positionTitle: 'Software Engineer',
        jobLinks: ['https://example.com/job'],
        jobSearchId: 'search-1',
        company: {},
      } as any;

      // This should be caught by the DTO validation, but let's test the service logic too
      await expect(
        jobApplicationService.create(mockUser.id, input),
      ).rejects.toThrow();
    });
  });
});
