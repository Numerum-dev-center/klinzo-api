import { Test, TestingModule } from '@nestjs/testing';
import { SduiService } from './sdui.service';

describe('SduiService', () => {
  let service: SduiService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SduiService],
    }).compile();

    service = module.get<SduiService>(SduiService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
