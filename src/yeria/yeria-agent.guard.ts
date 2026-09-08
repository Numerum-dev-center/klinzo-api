import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';
import { UserDetails } from '@numerum-tech/yeriasdk';
import { PrismaService } from '../shared/prisma/prisma.service';
import { UserEntity } from '../user/users/entities/user.entity';
import { Role, CollectorType } from '@prisma/client';
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
    } catch {
      if (isProduction) {
        throw new UnauthorizedException('Token Yeria agent invalide.');
      }
      claims = parseJwtClaims(token);
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
      const lastName = profile?.last_name || claims?.last_name || 'Terrain';
      const firstName = profile?.first_name || claims?.first_name || 'Agent';

      const existing = await this.prisma.user.findUnique({
        where: { email },
        include: { collector: true },
      });

      if (existing) {
        user = existing;
      } else {
        // Associer au premier collecteur disponible ou en créer un par défaut
        let collector = await this.prisma.collector.findFirst();
        if (!collector) {
          collector = await this.prisma.collector.create({
            data: {
              companyName: 'Klinzo Collecte Partenaire',
              registrationNumber: 'RC-KLZ-DEFAULT',
              contactEmail: 'contact@klinzo.app',
              contactPhone: '+225 01 02 03 04 05',
              type: CollectorType.COMPANY,
              adresse: 'Abidjan',
            },
          });
        }

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
            phone: claims?.phone || '0000000000',
            role: Role.AGENT_COLLECTEUR,
            emailVerified: true,
            isActive: true,
            collectorId: collector.id,
          },
          include: { collector: true },
        });
      }
    } else if (!user.collectorId) {
      if (isProduction) {
        throw new UnauthorizedException(
          'Agent terrain sans collecteur rattaché.',
        );
      }

      const collector = await this.prisma.collector.findFirst();
      if (collector) {
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: { collectorId: collector.id },
          include: { collector: true },
        });
      }
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
