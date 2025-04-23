import { Test, TestingModule } from '@nestjs/testing';
import { JobSearchResolver } from './job-search.resolver';

describe('JobSearchResolver', () => {
  let resolver: JobSearchResolver;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [JobSearchResolver],
    }).compile();

    resolver = module.get<JobSearchResolver>(JobSearchResolver);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });
});
