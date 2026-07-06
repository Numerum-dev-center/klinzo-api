import { Module } from '@nestjs/common';
import { ConfigModule } from './config/config.module';
import { SecurityModule } from './security/security.module';
import { PrismaService } from './prisma/prisma.service';

@Module({
  imports: [ConfigModule, SecurityModule],
  providers: [PrismaService]
})
export class SharedModule {}
