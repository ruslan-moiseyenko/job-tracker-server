import { Module } from '@nestjs/common';
import { JobApplicationService } from './job-application.service';
import { JobApplicationResolver } from './job-application.resolver';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [JobApplicationResolver, JobApplicationService],
})
export class JobApplicationModule {}
