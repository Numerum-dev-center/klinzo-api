import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UserService } from '../../user/users/user.service';
import { Role } from '@prisma/client';

interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  sessionVersion?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    configService: ConfigService,
    private readonly userService: UserService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET')!,
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.userService.findByTrackingIdForAuth(payload.sub);

    if (
      !user ||
      !user.isActive ||
      (user.role === Role.USAGER && !user.emailVerified) ||
      (payload.sessionVersion ?? 0) !== (user.sessionVersion ?? 0)
    ) {
      throw new UnauthorizedException('Compte inactif ou introuvable');
    }

    return {
      trackingId: user.trackingId,
      email: user.email,
      role: user.role,
    };
  }
}
