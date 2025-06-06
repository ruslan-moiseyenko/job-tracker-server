import { Test, TestingModule } from '@nestjs/testing';
import { JobApplicationService } from './job-application.service';
import { PrismaService } from '../prisma/prisma.service';
import { CompanyService } from '../company/company.service';

describe('JobApplicationService', () => {
  let service: JobApplicationService;

  beforeEach(async () => {
    const mockPrismaService = {};
    const mockCompanyService = {};

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JobApplicationService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: CompanyService,
          useValue: mockCompanyService,
        },
      ],
    }).compile();

    service = module.get<JobApplicationService>(JobApplicationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
