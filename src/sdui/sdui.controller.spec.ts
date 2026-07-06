import { Test, TestingModule } from '@nestjs/testing';
import { SduiController } from './sdui.controller';
import { SduiService } from './sdui.service';

describe('SduiController', () => {
  let controller: SduiController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SduiController],
      providers: [SduiService],
    }).compile();

    controller = module.get<SduiController>(SduiController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
