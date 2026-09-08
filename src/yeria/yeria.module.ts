import { Module } from '@nestjs/common';
import { YeriaPublicController } from './yeria.controller';
import { YeriaAgentController } from './yeria-agent.controller';
import { YeriaService } from './yeria.service';
import { YeriaAuthGuard } from './yeria-auth.guard';
import { YeriaOptionalAuthGuard } from './yeria-optional-auth.guard';
import { YeriaAgentGuard } from './yeria-agent.guard';
import { SharedModule } from '../shared/shared.module';

@Module({
  imports: [SharedModule],
  controllers: [YeriaAgentController, YeriaPublicController],
  providers: [
    YeriaService,
    YeriaAuthGuard,
    YeriaOptionalAuthGuard,
    YeriaAgentGuard,
  ],
  exports: [
    YeriaService,
    YeriaAuthGuard,
    YeriaOptionalAuthGuard,
    YeriaAgentGuard,
  ],
})
export class YeriaModule {}
