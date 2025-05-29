import { Global, Module } from '@nestjs/common';
import { MutexService } from './utils/mutex.service';

@Global()
@Module({
  providers: [MutexService],
  exports: [MutexService],
})
export class CommonModule {}
