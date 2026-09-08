import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';
import { UserDetails } from '@numerum-tech/yeriasdk';
import { PrismaService } from '../shared/prisma/prisma.service';
import { UserEntity } from '../user/users/entities/user.entity';
import { Role } from '@prisma/client';
import { getYeriaApp, getYeriaServiceId } from './yeria.config';

function parseJwtClaims(token: string): any {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    return JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'));
  } catch {
    return null;
  }
}

@Injectable()
export class YeriaOptionalAuthGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const authHeader = req.headers?.authorization;

    if (!authHeader || !authHeader.toLowerCase().startsWith('bearer ')) {
      return true;
    }

    const token = authHeader.slice(7).trim();
    const yeriaApp = getYeriaApp();
    const serviceId = getYeriaServiceId();
    const isProduction = process.env.NODE_ENV === 'production';

    try {
      let claims: any = null;
      try {
        claims = await yeriaApp.verifyUserToken(token, serviceId);
      } catch {
        if (isProduction) return true;
        // En local ou mode test sans plateforme distante Yeria, extraction des claims du JWT
        claims = parseJwtClaims(token);
      }

      const sub = claims?.sub;
      if (!sub) return true;

      let user = await this.prisma.user.findFirst({
        where: { trackingId: String(sub) },
      });

      if (!user) {
        let profile: UserDetails | null = null;
        try {
          profile = await yeriaApp.fetchUserDetails({
            userServiceToken: token,
          });
        } catch {
          profile = {
            user_id: String(sub),
            email: claims?.email || null,
            first_name:
              claims?.first_name ||
              claims?.firstname ||
              claims?.name?.split(' ')[0] ||
              null,
            last_name:
              claims?.last_name ||
              claims?.lastname ||
              claims?.name?.split(' ').slice(1).join(' ') ||
              null,
            country_code: claims?.country_code || null,
          };
        }

        const email =
          profile?.email || claims?.email || `yeria-${sub}@users.klinzo.local`;
        const lastName = profile?.last_name || claims?.last_name || 'Client';
        const firstName = profile?.first_name || claims?.first_name || 'Yeria';
        const phone =
          (profile as any)?.phone_number || claims?.phone || '0000000000';

        const existingByEmail = await this.prisma.user.findUnique({
          where: { email },
        });

        if (existingByEmail) {
          user = existingByEmail;
        } else {
          const dummyPassword = await bcrypt.hash(
            crypto.randomBytes(32).toString('hex'),
            10,
          );
          user = await this.prisma.user.create({
            data: {
              trackingId: String(sub),
              email,
              password: dummyPassword,
              firstName,
              lastName,
              phone,
              role: Role.USAGER,
              emailVerified: true,
              isActive: true,
            },
          });
        }
      }

      if (!user.isActive) return true;

      const userEntity = new UserEntity(user);
      req.user = userEntity;
      req.yeriaUser = userEntity;
      req.yeriaToken = token;
    } catch (e: any) {
      console.warn(
        '[YeriaOptionalAuthGuard] could not resolve user:',
        e?.message || e,
      );
    }

    return true;
  }
}
