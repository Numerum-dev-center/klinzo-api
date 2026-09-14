import { Test, TestingModule } from '@nestjs/testing';
import UserController from './user.controller';
import { UserService } from './user.service';

describe('UserController', () => {
  let controller: UserController;
  const userServiceMock = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
<<<<<<< Updated upstream
      providers: [
        {
          provide: UserService,
          useValue: userServiceMock,
        },
      ],
=======
      providers: [{ provide: UserService, useValue: {} }],
>>>>>>> Stashed changes
    }).compile();

    controller = module.get<UserController>(UserController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
