import { Test, TestingModule } from '@nestjs/testing';
import { Role } from '@prisma/client';
import { CollectorsController } from './collectors.controller';
import { CollectorsService } from './collectors.service';
import { ROLES_KEY } from '../../shared/security/roles.decorator';

describe('CollectorsController', () => {
  const controllerPrototype = CollectorsController.prototype;

  const collectorsServiceMock = {
    create: jest.fn(),
    findAll: jest.fn(),
    search: jest.fn(),
    getActiveCollectors: jest.fn(),
    getInactiveCollectors: jest.fn(),
    findByType: jest.fn(),
    findByKycStatus: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    suspend: jest.fn(),
    reactivate: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CollectorsController],
      providers: [
        {
          provide: CollectorsService,
          useValue: collectorsServiceMock,
        },
      ],
    }).compile();

    expect(
      module.get<CollectorsController>(CollectorsController),
    ).toBeDefined();
  });

  it('allows authenticated users to list active collectors for the user dashboard', () => {
    const findActive = Object.getOwnPropertyDescriptor(
      controllerPrototype,
      'findActive',
    )?.value as CollectorsController['findActive'];
    const roles = Reflect.getMetadata(ROLES_KEY, findActive);

    expect(roles).toEqual(
      expect.arrayContaining([
        Role.SUPER_ADMIN_SAAS,
        Role.GESTIONNAIRE_SAAS,
        Role.USAGER,
      ]),
    );
  });

  it('keeps the full collectors listing restricted to SaaS roles', () => {
    const findAll = Object.getOwnPropertyDescriptor(
      controllerPrototype,
      'findAll',
    )?.value as CollectorsController['findAll'];
    const roles = Reflect.getMetadata(ROLES_KEY, findAll);

    expect(roles).toEqual([Role.SUPER_ADMIN_SAAS, Role.GESTIONNAIRE_SAAS]);
  });
});
