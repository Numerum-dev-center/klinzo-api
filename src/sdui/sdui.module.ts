import { Module } from '@nestjs/common';
import { SduiService } from './sdui.service';
import { SduiController } from './sdui.controller';

@Module({
  controllers: [SduiController],
  providers: [SduiService],
})
export class SduiModule {}
