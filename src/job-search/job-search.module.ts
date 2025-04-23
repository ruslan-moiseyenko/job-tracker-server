import { Module } from '@nestjs/common';
import { JobSearchService } from './job-search.service';
import { JobSearchResolver } from './job-search.resolver';

@Module({
  providers: [JobSearchService, JobSearchResolver]
})
export class JobSearchModule {}
