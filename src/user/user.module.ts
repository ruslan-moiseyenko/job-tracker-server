import { Module } from '@nestjs/common';
import { UserResolver } from './user.resolver';
import { UserService } from './user.service';
import { TokenService } from 'src/token/token.service';

@Module({
  providers: [UserService, UserResolver, TokenService],
})
export class UserModule {}
