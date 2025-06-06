import { Test, TestingModule } from '@nestjs/testing';
import { JobApplicationService } from './job-application.service';
import { CompanyService } from '../company/company.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateJobApplicationInput } from './dto/create-job-application.input';

describe('JobApplicationService - Company Integration', () => {
  let jobApplicationService: JobApplicationService;
  let companyService: CompanyService;
  let prismaService: PrismaService;

  const mockUser = { id: 'user-123' };
  const mockCompany = {
    id: 'company-456',
    name: 'Test Company',
    userId: 'user-123',
  };

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

    const mockCompanyService = {
      findCompanyById: jest.fn(),
      create: jest.fn(),
      findSimilarCompanies: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JobApplicationService,
        CompanyService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    })
      .overrideProvider(CompanyService)
      .useValue(mockCompanyService)
      .compile();

    jobApplicationService = module.get<JobApplicationService>(
      JobApplicationService,
    );
    companyService = module.get<CompanyService>(CompanyService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  it('should create job application with existing company', async () => {
    const input: CreateJobApplicationInput = {
      company: {
        existingCompanyId: 'company-456',
      },
      positionTitle: 'Software Engineer',
      jobLinks: ['https://example.com/job/123'],
      jobSearchId: 'job-search-123',
    };

    const mockJobSearch = {
      id: 'job-search-123',
      title: 'Test Job Search',
      userId: 'user-123',
    };

    const mockJobApplication = {
      id: 'job-app-789',
      companyId: 'company-456',
      positionTitle: 'Software Engineer',
      jobSearchId: 'job-search-123',
      applicationDate: new Date(),
      jobLinks: ['https://example.com/job/123'],
    };

    // Mock job search validation
    (prismaService.jobSearch.findFirst as jest.Mock).mockResolvedValue(
      mockJobSearch,
    );

    // Mock finding existing company
    (companyService.findCompanyById as jest.Mock).mockResolvedValue(
      mockCompany,
    );

    // Mock job application creation
    (prismaService.jobApplication.create as jest.Mock).mockResolvedValue(
      mockJobApplication,
    );

    const result = await jobApplicationService.create(mockUser.id, input);

    expect(companyService.findCompanyById).toHaveBeenCalledWith(
      'company-456',
      'user-123',
    );
    expect(prismaService.jobApplication.create).toHaveBeenCalledWith({
      data: {
        positionTitle: 'Software Engineer',
        jobLinks: ['https://example.com/job/123'],
        jobSearchId: 'job-search-123',
        companyId: 'company-456',
      },
      include: {
        company: true,
        currentStage: true,
        jobSearch: true,
      },
    });
    expect(result).toEqual(mockJobApplication);
  });

  it('should create job application with new company', async () => {
    const input: CreateJobApplicationInput = {
      company: {
        newCompany: {
          name: 'New Startup Inc',
          website: 'https://newstartup.com',
          description: 'Innovative tech company',
        },
      },
      positionTitle: 'Full Stack Developer',
      jobLinks: ['https://example.com/job/456'],
      jobSearchId: 'job-search-123',
    };

    const mockJobSearch = {
      id: 'job-search-123',
      title: 'Test Job Search',
      userId: 'user-123',
    };

    const newMockCompany = {
      id: 'company-new-789',
      name: 'New Startup Inc',
      website: 'https://newstartup.com',
      description: 'Innovative tech company',
      userId: 'user-123',
    };

    const mockJobApplication = {
      id: 'job-app-new-456',
      companyId: 'company-new-789',
      positionTitle: 'Full Stack Developer',
      jobSearchId: 'job-search-123',
      applicationDate: new Date(),
      jobLinks: ['https://example.com/job/456'],
    };

    // Mock job search validation
    (prismaService.jobSearch.findFirst as jest.Mock).mockResolvedValue(
      mockJobSearch,
    );

    // Mock new company creation
    (companyService.create as jest.Mock).mockResolvedValue(newMockCompany);

    // Mock job application creation
    (prismaService.jobApplication.create as jest.Mock).mockResolvedValue(
      mockJobApplication,
    );

    const result = await jobApplicationService.create(mockUser.id, input);

    expect(companyService.create).toHaveBeenCalledWith('user-123', {
      name: 'New Startup Inc',
      website: 'https://newstartup.com',
      description: 'Innovative tech company',
    });
    expect(prismaService.jobApplication.create).toHaveBeenCalledWith({
      data: {
        positionTitle: 'Full Stack Developer',
        jobLinks: ['https://example.com/job/456'],
        jobSearchId: 'job-search-123',
        companyId: 'company-new-789',
      },
      include: {
        company: true,
        currentStage: true,
        jobSearch: true,
      },
    });
    expect(result).toEqual(mockJobApplication);
  });

  it('should throw error when existing company not found', async () => {
    const input: CreateJobApplicationInput = {
      company: {
        existingCompanyId: 'non-existent-company',
      },
      positionTitle: 'Software Engineer',
      jobLinks: ['https://example.com/job/789'],
      jobSearchId: 'job-search-123',
    };

    const mockJobSearch = {
      id: 'job-search-123',
      title: 'Test Job Search',
      userId: 'user-123',
    };

    // Mock job search validation
    (prismaService.jobSearch.findFirst as jest.Mock).mockResolvedValue(
      mockJobSearch,
    );

    // Mock company not found
    (companyService.findCompanyById as jest.Mock).mockResolvedValue(null);

    await expect(
      jobApplicationService.create(mockUser.id, input),
    ).rejects.toThrow('Company not found');

    expect(companyService.findCompanyById).toHaveBeenCalledWith(
      'non-existent-company',
      'user-123',
    );
  });

  it('should propagate company creation errors', async () => {
    const input: CreateJobApplicationInput = {
      company: {
        newCompany: {
          name: 'Duplicate Company',
        },
      },
      positionTitle: 'Software Engineer',
      jobLinks: ['https://example.com/job/999'],
      jobSearchId: 'job-search-123',
    };

    const mockJobSearch = {
      id: 'job-search-123',
      title: 'Test Job Search',
      userId: 'user-123',
    };

    // Mock job search validation
    (prismaService.jobSearch.findFirst as jest.Mock).mockResolvedValue(
      mockJobSearch,
    );

    // Mock company creation failure
    (companyService.create as jest.Mock).mockRejectedValue(
      new Error('Company with name "Duplicate Company" already exists'),
    );

    await expect(
      jobApplicationService.create(mockUser.id, input),
    ).rejects.toThrow('Company with name "Duplicate Company" already exists');

    expect(companyService.create).toHaveBeenCalledWith('user-123', {
      name: 'Duplicate Company',
    });
  });
});
