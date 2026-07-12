import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import UserController from './user.controller';
import { SharedModule } from '../../shared/shared.module';
import { CollectorsModule } from '../collectors/collectors.module';

@Module({
  imports: [SharedModule, CollectorsModule],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
