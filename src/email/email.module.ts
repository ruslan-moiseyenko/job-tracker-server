import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EmailService } from './email.service';
import { ScheduleModule } from '@nestjs/schedule';
import { EmailMonitorService } from 'src/common/monitoring/email-monitor.service';

@Global()
@Module({
  imports: [ConfigModule, ScheduleModule.forRoot()],
  providers: [EmailService, EmailMonitorService],
  exports: [EmailService, EmailMonitorService],
})
export class EmailModule {}
