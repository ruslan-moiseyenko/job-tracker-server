import { Test, TestingModule } from '@nestjs/testing';
import { JobApplicationResolver } from './job-application.resolver';
import { JobApplicationService } from './job-application.service';
import { PrismaService } from '../prisma/prisma.service';
import { CompanyService } from '../company/company.service';
import { GqlThrottlerGuard } from '../common/guards/gql-throttler.guard';

describe('JobApplicationResolver', () => {
  let resolver: JobApplicationResolver;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JobApplicationResolver,
        JobApplicationService,
        {
          provide: PrismaService,
          useValue: {},
        },
        {
          provide: CompanyService,
          useValue: {},
        },
      ],
    })
      .overrideGuard(GqlThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();

    resolver = module.get<JobApplicationResolver>(JobApplicationResolver);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });
});
