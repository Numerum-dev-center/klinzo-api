import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  BadRequestException,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { UserService } from '../user/users/user.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { CreateUserDto } from '../user/users/dto/requests/create-user.dto';
import { LoginDto } from './dto/requests/login.dto';
import * as bcrypt from 'bcrypt';
import { Role } from '@prisma/client';
import { createHash, randomInt } from 'node:crypto';
import * as nodemailer from 'nodemailer';
import { PrismaService } from '../shared/prisma/prisma.service';

const CODE_LIFETIME_MS = 10 * 60 * 1000;
const RESEND_DELAY_MS = 60 * 1000;
const MAX_ATTEMPTS = 5;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private userService: UserService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {}

  async register(createUserDto: CreateUserDto) {
    const userDto = {
      ...createUserDto,
      email: createUserDto.email.trim().toLowerCase(),
      role: Role.USAGER,
      isActive: true,
      emailVerified: false,
    };
    const user = await this.userService.create(userDto);
    const emailSent = await this.issueVerificationCode(user.email);
    return { email: user.email, emailSent, verificationRequired: true };
  }

  private codeHash(email: string, code: string): string {
    return createHash('sha256')
      .update(`${email.toLowerCase()}:${code}:${this.configService.get<string>('JWT_SECRET')}`)
      .digest('hex');
  }

  private async issueVerificationCode(email: string): Promise<boolean> {
    const code = String(randomInt(0, 10_000)).padStart(4, '0');
    await this.prisma.user.update({
      where: { email },
      data: {
        emailVerificationCodeHash: this.codeHash(email, code),
        emailVerificationExpiresAt: new Date(Date.now() + CODE_LIFETIME_MS),
        emailVerificationSentAt: null,
        emailVerificationAttempts: 0,
      },
    });

    const host = this.configService.get<string>('SMTP_HOST');
    const port = Number(this.configService.get<string>('SMTP_PORT') || 587);
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASSWORD');
    const from = this.configService.get<string>('SMTP_FROM');
    if (!host || !user || !pass || !from) {
      this.logger.warn('Code de vérification non envoyé : configuration SMTP manquante.');
      return false;
    }

    try {
      const transport = nodemailer.createTransport({
        host, port, secure: port === 465, requireTLS: port !== 465,
        auth: { user, pass },
      });
      await transport.sendMail({
        from, to: email,
        subject: 'Vérifiez votre adresse e-mail Klinzo',
        text: `Votre code de vérification Klinzo est ${code}. Il expire dans 10 minutes. Si vous n'avez pas créé de compte, ignorez ce message.`,
      });
      await this.prisma.user.update({
        where: { email }, data: { emailVerificationSentAt: new Date() },
      });
      return true;
    } catch (error) {
      this.logger.error('Échec de l’envoi du code de vérification.', error);
      return false;
    }
  }

  async resendVerificationCode(email: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const account = await this.userService.findByEmail(normalizedEmail);
    if (!account || account.role !== Role.USAGER || account.emailVerified) {
      return { message: 'Si ce compte attend une vérification, un code sera envoyé.' };
    }
    if (account.emailVerificationSentAt &&
        Date.now() - account.emailVerificationSentAt.getTime() < RESEND_DELAY_MS) {
      throw new HttpException('Patientez une minute avant de demander un autre code.', HttpStatus.TOO_MANY_REQUESTS);
    }
    const emailSent = await this.issueVerificationCode(normalizedEmail);
    return { message: emailSent ? 'Un nouveau code a été envoyé.' : 'Envoi impossible pour le moment. Réessayez plus tard.' };
  }

  async verifyEmail(email: string, code: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const account = await this.userService.findByEmail(normalizedEmail);
    if (!account || account.role !== Role.USAGER || account.emailVerified ||
        !account.emailVerificationCodeHash || !account.emailVerificationExpiresAt) {
      throw new BadRequestException('Code invalide ou expiré.');
    }
    if (account.emailVerificationExpiresAt.getTime() < Date.now()) {
      throw new BadRequestException('Code expiré. Demandez un nouveau code.');
    }
    if (account.emailVerificationAttempts >= MAX_ATTEMPTS) {
      throw new BadRequestException('Trop de tentatives. Demandez un nouveau code.');
    }

    const matches = this.codeHash(normalizedEmail, code) === account.emailVerificationCodeHash;
    if (!matches) {
      await this.prisma.user.update({
        where: { email: normalizedEmail },
        data: { emailVerificationAttempts: { increment: 1 } },
      });
      throw new BadRequestException('Code invalide ou expiré.');
    }

    const claimed = await this.prisma.user.updateMany({
      where: {
        email: normalizedEmail,
        emailVerified: false,
        emailVerificationCodeHash: account.emailVerificationCodeHash,
        emailVerificationExpiresAt: { gt: new Date() },
        emailVerificationAttempts: { lt: MAX_ATTEMPTS },
      },
      data: {
        emailVerified: true,
        emailVerificationCodeHash: null,
        emailVerificationExpiresAt: null,
        emailVerificationSentAt: null,
        emailVerificationAttempts: 0,
      },
    });
    if (claimed.count !== 1) throw new BadRequestException('Code invalide ou expiré.');
    const tokens = await this.getTokens(account.trackingId, account.email, account.role, account.sessionVersion);
    await this.userService.updateRefreshToken(account.trackingId, tokens.refreshToken);
    return { tokens, role: account.role };
  }

  private resetCodeHash(email: string, code: string): string {
    return createHash('sha256')
      .update(`password-reset:${email.toLowerCase()}:${code}:${this.configService.get<string>('JWT_SECRET')}`)
      .digest('hex');
  }

  async requestPasswordReset(email: string) {
    const response = { message: 'Si un compte actif existe pour cette adresse, un code de réinitialisation sera envoyé.' };
    const normalizedEmail = email.trim();
    const account = await this.prisma.user.findFirst({
      where: { email: { equals: normalizedEmail, mode: 'insensitive' } },
    });
    if (!account || !account.isActive) return response;
    if (account.passwordResetSentAt &&
        Date.now() - account.passwordResetSentAt.getTime() < RESEND_DELAY_MS) return response;

    const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
    await this.prisma.user.update({
      where: { email: account.email },
      data: {
        passwordResetCodeHash: this.resetCodeHash(account.email, code),
        passwordResetExpiresAt: new Date(Date.now() + CODE_LIFETIME_MS),
        passwordResetSentAt: null,
        passwordResetAttempts: 0,
      },
    });

    const host = this.configService.get<string>('SMTP_HOST');
    const port = Number(this.configService.get<string>('SMTP_PORT') || 587);
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASSWORD');
    const from = this.configService.get<string>('SMTP_FROM');
    if (!host || !user || !pass || !from) {
      this.logger.warn('Réinitialisation non envoyée : configuration SMTP manquante.');
      return response;
    }

    try {
      const transport = nodemailer.createTransport({
        host, port, secure: port === 465, requireTLS: port !== 465,
        auth: { user, pass },
      });
      await transport.sendMail({
        from, to: account.email,
        subject: 'Réinitialisez votre mot de passe Klinzo',
        text: `Votre code de réinitialisation Klinzo est ${code}. Il expire dans 10 minutes. Si vous n'avez pas demandé ce changement, ignorez ce message.`,
      });
      await this.prisma.user.update({
        where: { email: account.email }, data: { passwordResetSentAt: new Date() },
      });
    } catch (error) {
      this.logger.error('Échec de l’envoi du code de réinitialisation.', error);
    }
    return response;
  }

  async resetPassword(email: string, code: string, password: string) {
    const account = await this.prisma.user.findFirst({
      where: { email: { equals: email.trim(), mode: 'insensitive' } },
    });
    if (!account || !account.isActive || !account.passwordResetCodeHash ||
        !account.passwordResetExpiresAt || account.passwordResetExpiresAt.getTime() <= Date.now() ||
        account.passwordResetAttempts >= MAX_ATTEMPTS) {
      throw new BadRequestException('Code invalide ou expiré. Demandez un nouveau code.');
    }
    if (this.resetCodeHash(account.email, code) !== account.passwordResetCodeHash) {
      await this.prisma.user.update({
        where: { email: account.email },
        data: { passwordResetAttempts: { increment: 1 } },
      });
      throw new BadRequestException('Code invalide ou expiré.');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const claimed = await this.prisma.user.updateMany({
      where: {
        email: account.email,
        passwordResetCodeHash: account.passwordResetCodeHash,
        passwordResetExpiresAt: { gt: new Date() },
        passwordResetAttempts: { lt: MAX_ATTEMPTS },
      },
      data: {
        password: hashedPassword,
        hashedRefreshToken: null,
        sessionVersion: { increment: 1 },
        passwordResetCodeHash: null,
        passwordResetExpiresAt: null,
        passwordResetSentAt: null,
        passwordResetAttempts: 0,
      },
    });
    if (claimed.count !== 1) throw new BadRequestException('Code invalide ou expiré.');
    return { message: 'Mot de passe modifié. Connectez-vous avec votre nouveau mot de passe.' };
  }

  async changePassword(trackingId: string, password: string) {
    const hashedPassword = await bcrypt.hash(password, 10);
    await this.prisma.user.update({
      where: { trackingId },
      data: {
        password: hashedPassword,
        hashedRefreshToken: null,
        sessionVersion: { increment: 1 },
      },
    });
    return { message: 'Mot de passe modifié. Reconnectez-vous avec votre nouveau mot de passe.' };
  }

  async login(loginDto: LoginDto) {
    const user = await this.userService.findByEmail(loginDto.email);
    if (!user) throw new UnauthorizedException('Identifiants invalides');
    if (!user.isActive) throw new UnauthorizedException('Compte désactivé');

    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.password,
    );
    if (!isPasswordValid)
      throw new UnauthorizedException('Identifiants invalides');
    if (user.role === Role.USAGER && !user.emailVerified) {
      throw new ForbiddenException('Adresse e-mail non vérifiée. Saisissez le code reçu par e-mail.');
    }

    const tokens = await this.getTokens(user.trackingId, user.email, user.role, user.sessionVersion);
    await this.userService.updateRefreshToken(
      user.trackingId,
      tokens.refreshToken,
    );
    return tokens;
  }

  async logout(trackingId: string) {
    await this.userService.removeRefreshToken(trackingId);
  }

  async refreshTokens(refreshToken: string) {
    try {
      const payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET')!,
      });

      const user = await this.userService.findByTrackingIdForAuth(payload.sub);
      if (!user || !user.isActive || (payload.sessionVersion ?? 0) !== (user.sessionVersion ?? 0) ||
          (user.role === Role.USAGER && !user.emailVerified) || !user.hashedRefreshToken) {
        throw new ForbiddenException('Access denied');
      }

      const refreshTokenMatches = await bcrypt.compare(
        refreshToken,
        user.hashedRefreshToken,
      );
      if (!refreshTokenMatches) {
        throw new ForbiddenException('Access denied');
      }

      const tokens = await this.getTokens(
        user.trackingId,
        user.email,
        user.role,
        user.sessionVersion,
      );
      await this.userService.updateRefreshToken(
        user.trackingId,
        tokens.refreshToken,
      );
      return tokens;
    } catch {
      throw new ForbiddenException('Invalid refresh token');
    }
  }

  async getTokens(trackingId: string, email: string, role: string, sessionVersion = 0) {
    const jwtPayload = { sub: trackingId, email, role, sessionVersion };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(jwtPayload, {
        secret: this.configService.get<string>('JWT_SECRET')!,
        expiresIn: this.configService.get<string>('JWT_EXPIRATION')! as any,
      }),
      this.jwtService.signAsync(jwtPayload, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET')!,
        expiresIn: this.configService.get<string>(
          'JWT_REFRESH_EXPIRATION',
        )! as any,
      }),
    ]);

    return {
      accessToken,
      refreshToken,
    };
  }
}
