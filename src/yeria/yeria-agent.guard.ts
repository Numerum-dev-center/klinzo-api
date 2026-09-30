import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';
import {
  UserDetails,
  ViewExpiredError,
  YeriaPlatformUnreachableError,
} from '@numerum-tech/yeriasdk';
import { PrismaService } from '../shared/prisma/prisma.service';
import { UserEntity } from '../user/users/entities/user.entity';
import { Role } from '@prisma/client';
import { getYeriaAgentApp, getYeriaAgentServiceId } from './yeria.config';

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
export class YeriaAgentGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const url = req.url || '';

    // Bypasser les fichiers médias / images chargés par l'app mobile
    if (/\.(png|jpg|jpeg|svg|webp|gif)$/i.test(url)) {
      return true;
    }

    const authHeader = req.headers?.authorization;

    if (!authHeader || !authHeader.toLowerCase().startsWith('bearer ')) {
      throw new UnauthorizedException(
        'Accès réservé aux agents terrain. Token Yeria Bearer requis.',
      );
    }

    const token = authHeader.slice(7).trim();
    const agentApp = getYeriaAgentApp();
    const serviceId = getYeriaAgentServiceId();
    const isProduction = process.env.NODE_ENV === 'production';

    let claims: any = null;
    try {
      claims = await agentApp.verifyUserToken(token, serviceId);
    } catch (e: any) {
      if (e instanceof YeriaPlatformUnreachableError) {
        throw new ServiceUnavailableException(
          "Service d'authentification Yeria momentanément indisponible.",
        );
      }
      const isExpired =
        e instanceof ViewExpiredError || e?.name === 'ViewExpiredError';
      if (isProduction) {
        throw new UnauthorizedException(
          isExpired ? 'Token Yeria agent expiré.' : 'Token Yeria agent invalide.',
        );
      }
      claims = parseJwtClaims(token);
      if (!claims?.sub) {
        throw new UnauthorizedException(
          isExpired ? 'Token expiré.' : 'Token invalide.',
        );
      }
    }

    const sub = claims?.sub;
    if (!sub) {
      throw new UnauthorizedException('Token Yeria invalide ou expiré.');
    }

    // 1. Trouver ou provisionner l'agent terrain
    let user = await this.prisma.user.findFirst({
      where: { trackingId: String(sub) },
      include: { collector: true },
    });

    if (!user) {
      if (isProduction) {
        throw new UnauthorizedException('Agent terrain non provisionné.');
      }

      let profile: UserDetails | null = null;
      try {
        profile = await agentApp.fetchUserDetails({ userServiceToken: token });
      } catch {
        profile = {
          user_id: String(sub),
          email: claims?.email || null,
          first_name: claims?.first_name || claims?.firstname || null,
          last_name: claims?.last_name || claims?.lastname || null,
          country_code: claims?.country_code || null,
        };
      }

      const email =
        profile?.email || claims?.email || `agent-${sub}@klinzo.local`;
      const existing = await this.prisma.user.findUnique({
        where: { email },
        include: { collector: true },
      });

      if (existing?.collectorId) {
        user = existing;
      } else {
        throw new UnauthorizedException(
          'Agent terrain non provisionné par son collecteur.',
        );
      }
    } else if (!user.collectorId) {
      throw new UnauthorizedException(
        'Agent terrain sans collecteur rattaché.',
      );
    }

    if (
      user.role !== Role.AGENT_COLLECTEUR &&
      user.role !== Role.ADMIN_COLLECTEUR
    ) {
      throw new UnauthorizedException('Compte non autorisé côté agent.');
    }

    if (!user.isActive || !user.collector?.isActive) {
      throw new UnauthorizedException('Compte agent ou collecteur désactivé.');
    }

    if (!user.collector) {
      throw new UnauthorizedException(
        'Agent terrain sans collecteur rattaché.',
      );
    }

    const userEntity = new UserEntity(user);
    req.user = userEntity;
    req.yeriaUser = userEntity;
    req.agentCollector = user.collector;
    req.yeriaToken = token;

    return true;
  }
}
