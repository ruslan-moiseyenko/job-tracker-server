import { Global, Module } from '@nestjs/common';
import { MutexService } from './mutex.service';

@Global() // Make this module global so services are available everywhere
@Module({
  providers: [MutexService],
  exports: [MutexService],
})
export class UtilsModule {}
