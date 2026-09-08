import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../user/users/user.service';
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';

describe('AuthService', () => {
  let service: AuthService;
  const userServiceMock = {
    create: jest.fn(),
    findByEmail: jest.fn(),
    findByTrackingIdForAuth: jest.fn(),
    updateRefreshToken: jest.fn(),
    removeRefreshToken: jest.fn(),
  };
  const jwtServiceMock = {
    signAsync: jest.fn(),
    verifyAsync: jest.fn(),
  };
  const configServiceMock = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UserService,
          useValue: userServiceMock,
        },
        {
          provide: JwtService,
          useValue: jwtServiceMock,
        },
        {
          provide: ConfigService,
          useValue: configServiceMock,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('rejects login for inactive users', async () => {
    userServiceMock.findByEmail.mockResolvedValue({
      trackingId: 'user-1',
      email: 'inactive@example.com',
      password: 'hashed-password',
      role: 'USAGER',
      isActive: false,
    });

    await expect(
      service.login({ email: 'inactive@example.com', password: 'secret' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(jwtServiceMock.signAsync).not.toHaveBeenCalled();
    expect(userServiceMock.updateRefreshToken).not.toHaveBeenCalled();
  });

  it('rejects refresh tokens for inactive users', async () => {
    jwtServiceMock.verifyAsync.mockResolvedValue({ sub: 'user-1' });
    userServiceMock.findByTrackingIdForAuth.mockResolvedValue({
      trackingId: 'user-1',
      email: 'inactive@example.com',
      hashedRefreshToken: 'hashed-refresh-token',
      role: 'USAGER',
      isActive: false,
    });

    await expect(service.refreshTokens('refresh-token')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(jwtServiceMock.signAsync).not.toHaveBeenCalled();
    expect(userServiceMock.updateRefreshToken).not.toHaveBeenCalled();
  });
});
