import { Module } from '@nestjs/common';
import { ApplicationStageService } from './application-stage.service';
import { ApplicationStageResolver } from './application-stage.resolver';

@Module({
  providers: [ApplicationStageService, ApplicationStageResolver],
  exports: [ApplicationStageService],
})
export class ApplicationStageModule {}
