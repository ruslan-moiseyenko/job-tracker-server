import { Test, TestingModule } from '@nestjs/testing';
import { JobSearchResolver } from './job-search.resolver';
import { JobSearchService } from './job-search.service';
import { GqlThrottlerGuard } from '../common/guards/gql-throttler.guard';

describe('JobSearchResolver', () => {
  let resolver: JobSearchResolver;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JobSearchResolver,
        {
          provide: JobSearchService,
          useValue: {
            findOne: jest.fn(),
            findFilteredForUser: jest.fn(),
            createJobSearch: jest.fn(),
            updateJobSearch: jest.fn(),
            deleteJobSearch: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(GqlThrottlerGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    resolver = module.get<JobSearchResolver>(JobSearchResolver);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });
});
