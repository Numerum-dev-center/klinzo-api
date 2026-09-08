import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { UserService } from '../user/users/user.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { CreateUserDto } from '../user/users/dto/requests/create-user.dto';
import { LoginDto } from './dto/requests/login.dto';
import * as bcrypt from 'bcrypt';
import { Role } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async register(createUserDto: CreateUserDto) {
    // Force role to USAGER for public registration
    const userDto = { ...createUserDto, role: Role.USAGER, isActive: true };
    const user = await this.userService.create(userDto);
    const tokens = await this.getTokens(user.trackingId, user.email, user.role);
    await this.userService.updateRefreshToken(
      user.trackingId,
      tokens.refreshToken,
    );
    return { user, tokens };
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

    const tokens = await this.getTokens(user.trackingId, user.email, user.role);
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
      if (!user || !user.isActive || !user.hashedRefreshToken) {
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

  async getTokens(trackingId: string, email: string, role: string) {
    const jwtPayload = { sub: trackingId, email, role };

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
