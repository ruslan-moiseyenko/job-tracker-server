import { Test, TestingModule } from '@nestjs/testing';
import { JobSearchService } from './job-search.service';
import { PrismaService } from 'src/prisma/prisma.service';

describe('JobSearchService', () => {
  let service: JobSearchService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JobSearchService,
        {
          provide: PrismaService,
          useValue: {
            jobSearch: {
              findUnique: jest.fn(),
              findMany: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<JobSearchService>(JobSearchService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
