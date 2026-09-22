import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../user/users/user.service';
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../shared/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { createHash } from 'node:crypto';

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
  const prismaServiceMock = {
    user: { update: jest.fn(), updateMany: jest.fn(), findFirst: jest.fn() },
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
        {
          provide: PrismaService,
          useValue: prismaServiceMock,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('registers an unverified user without issuing tokens', async () => {
    userServiceMock.create.mockResolvedValue({ trackingId: 'new-user', email: 'new@example.com' });
    jest.spyOn(service as any, 'issueVerificationCode').mockResolvedValue(true);
    const result = await service.register({
      firstName: 'Ama', lastName: 'Doe', email: 'NEW@example.com',
      phone: '+22890000000', password: 'password123',
    });
    expect(userServiceMock.create).toHaveBeenCalledWith(expect.objectContaining({
      email: 'new@example.com', role: 'USAGER', emailVerified: false,
    }));
    expect(result).toEqual({ email: 'new@example.com', emailSent: true, verificationRequired: true });
    expect(jwtServiceMock.signAsync).not.toHaveBeenCalled();
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

  it('rejects a refresh token issued before a password reset', async () => {
    jwtServiceMock.verifyAsync.mockResolvedValue({ sub: 'user-2', sessionVersion: 0 });
    userServiceMock.findByTrackingIdForAuth.mockResolvedValue({
      trackingId: 'user-2', email: 'user@example.com',
      role: 'USAGER', isActive: true, emailVerified: true,
      sessionVersion: 1, hashedRefreshToken: 'old-hash',
    });
    await expect(service.refreshTokens('old-refresh-token')).rejects.toBeInstanceOf(ForbiddenException);
    expect(jwtServiceMock.signAsync).not.toHaveBeenCalled();
  });

  it('rejects login for an unverified user after checking the password', async () => {
    userServiceMock.findByEmail.mockResolvedValue({
      trackingId: 'user-2', email: 'pending@example.com',
      password: await bcrypt.hash('password123', 4),
      role: 'USAGER', isActive: true, emailVerified: false,
    });
    await expect(service.login({ email: 'pending@example.com', password: 'password123' }))
      .rejects.toBeInstanceOf(ForbiddenException);
    expect(jwtServiceMock.signAsync).not.toHaveBeenCalled();
  });

  it('accepts a valid four-digit code once and issues a session', async () => {
    const email = 'pending@example.com';
    const code = '0042';
    configServiceMock.get.mockImplementation((key) => key === 'JWT_SECRET' ? 'test-secret' : 'refresh-secret');
    userServiceMock.findByEmail.mockResolvedValue({
      trackingId: 'user-2', email, role: 'USAGER', emailVerified: false,
      emailVerificationCodeHash: createHash('sha256').update(`${email}:${code}:test-secret`).digest('hex'),
      emailVerificationExpiresAt: new Date(Date.now() + 60_000),
      emailVerificationAttempts: 0,
    });
    prismaServiceMock.user.updateMany.mockResolvedValue({ count: 1 });
    jwtServiceMock.signAsync.mockResolvedValueOnce('access-token').mockResolvedValueOnce('refresh-token');

    await expect(service.verifyEmail(email, code)).resolves.toEqual({
      tokens: { accessToken: 'access-token', refreshToken: 'refresh-token' }, role: 'USAGER',
    });
    expect(prismaServiceMock.user.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ emailVerified: true, emailVerificationCodeHash: null }),
    }));
    expect(userServiceMock.updateRefreshToken).toHaveBeenCalledWith('user-2', 'refresh-token');
  });

  it('rejects an expired code without creating a session', async () => {
    userServiceMock.findByEmail.mockResolvedValue({
      email: 'pending@example.com', role: 'USAGER', emailVerified: false,
      emailVerificationCodeHash: 'hash',
      emailVerificationExpiresAt: new Date(Date.now() - 1000),
      emailVerificationAttempts: 0,
    });
    await expect(service.verifyEmail('pending@example.com', '1234')).rejects.toThrow('Code expiré');
    expect(prismaServiceMock.user.updateMany).not.toHaveBeenCalled();
    expect(jwtServiceMock.signAsync).not.toHaveBeenCalled();
  });

  it('does not reveal whether a password reset account exists', async () => {
    prismaServiceMock.user.findFirst.mockResolvedValue(null);
    await expect(service.requestPasswordReset('unknown@example.com')).resolves.toEqual({
      message: 'Si un compte actif existe pour cette adresse, un code de réinitialisation sera envoyé.',
    });
    expect(prismaServiceMock.user.update).not.toHaveBeenCalled();
  });

  it('resets the password with a valid code and revokes previous sessions', async () => {
    const email = 'user@example.com';
    const code = '000042';
    configServiceMock.get.mockImplementation((key) => key === 'JWT_SECRET' ? 'test-secret' : 'refresh-secret');
    prismaServiceMock.user.findFirst.mockResolvedValue({
      email, isActive: true,
      passwordResetCodeHash: createHash('sha256').update(`password-reset:${email}:${code}:test-secret`).digest('hex'),
      passwordResetExpiresAt: new Date(Date.now() + 60_000),
      passwordResetAttempts: 0,
    });
    prismaServiceMock.user.updateMany.mockResolvedValue({ count: 1 });

    await expect(service.resetPassword(email, code, 'newpassword123')).resolves.toEqual({
      message: 'Mot de passe modifié. Connectez-vous avec votre nouveau mot de passe.',
    });
    const update = prismaServiceMock.user.updateMany.mock.calls[0][0];
    expect(await bcrypt.compare('newpassword123', update.data.password)).toBe(true);
    expect(update.data).toEqual(expect.objectContaining({
      hashedRefreshToken: null, sessionVersion: { increment: 1 }, passwordResetCodeHash: null,
    }));
  });

  it('rejects an expired password reset code', async () => {
    prismaServiceMock.user.findFirst.mockResolvedValue({
      email: 'user@example.com', isActive: true,
      passwordResetCodeHash: 'hash',
      passwordResetExpiresAt: new Date(Date.now() - 1000),
      passwordResetAttempts: 0,
    });
    await expect(service.resetPassword('user@example.com', '123456', 'newpassword123'))
      .rejects.toThrow('Code invalide ou expiré');
    expect(prismaServiceMock.user.updateMany).not.toHaveBeenCalled();
  });
});
