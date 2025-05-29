import { Global, Module } from '@nestjs/common';
import { MutexService } from './mutex.service';
import { DistributedLockService } from './distributed-lock.service';

@Global() // Make this module global so services are available everywhere
@Module({
  providers: [MutexService, DistributedLockService],
  exports: [MutexService, DistributedLockService],
})
export class UtilsModule {}
