import { Module } from '@nestjs/common';
import { JobApplicationService } from './job-application.service';
import { JobApplicationResolver } from './job-application.resolver';
import { PrismaModule } from 'src/prisma/prisma.module';
import { CompanyModule } from 'src/company/company.module';

@Module({
  imports: [PrismaModule, CompanyModule],
  providers: [JobApplicationResolver, JobApplicationService],
})
export class JobApplicationModule {}
