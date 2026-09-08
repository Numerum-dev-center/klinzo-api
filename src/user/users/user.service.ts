import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { UpdateUserDto } from './dto/requests/update-user.dto';
import { PrismaService } from '../../shared/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { UserEntity } from './entities/user.entity';
import { PageOptionsDto } from '../../shared/pagination/dto/requests/page-options.dto';
import { PageMetaDto } from '../../shared/pagination/dto/requests/page-meta.dto';
import { PageDto } from '../../shared/pagination/dto/requests/page.dto';
import {
  assertCollectorScope,
  isCollectorRole,
  RequestingUser,
} from '../../shared/security/requesting-user';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  private validateRoleAndCollector(role: Role, collectorTrackingId?: string) {
    const isSaaSRole = (
      [
        Role.SUPER_ADMIN_SAAS,
        Role.GESTIONNAIRE_SAAS,
        Role.SUPPORT_SAAS,
      ] as Role[]
    ).includes(role);
    const isCollectorRole = (
      [Role.ADMIN_COLLECTEUR, Role.AGENT_COLLECTEUR] as Role[]
    ).includes(role);

    if (isSaaSRole && collectorTrackingId) {
      throw new BadRequestException(
        "Un membre de l'équipe SaaS ne peut pas être rattaché à un collecteur.",
      );
    }

    if (isCollectorRole && !collectorTrackingId) {
      throw new BadRequestException(
        `Un utilisateur avec le rôle ${role} doit obligatoirement fournir un collectorTrackingId.`,
      );
    }
  }

  async create(createUserDto: any): Promise<UserEntity> {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email already in use');
    }

    const { collectorTrackingId, role, ...rest } = createUserDto;

    // 1. Validation Métier
    this.validateRoleAndCollector(role, collectorTrackingId);

    // 2. Vérification de l'existence du collecteur (uniquement s'il est fourni)
    let collectorId: bigint | undefined;
    if (collectorTrackingId) {
      const collector = await this.prisma.collector.findUnique({
        where: { trackingId: collectorTrackingId },
      });
      if (!collector) throw new NotFoundException('Collector introuvable');
      collectorId = collector.id;
    }

    // 3. Hashage du mot de passe
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(rest.password, salt);

    // 4. Création
    const user = await this.prisma.user.create({
      data: {
        ...rest,
        role,
        password: hashedPassword,
        ...(collectorId ? { collector: { connect: { id: collectorId } } } : {}),
      },
    });

    return new UserEntity(user);
  }

  async findAll(pageOptionsDto: PageOptionsDto): Promise<PageDto<UserEntity>> {
    const itemCount = await this.prisma.user.count();
    const users = await this.prisma.user.findMany({
      skip: pageOptionsDto.skip,
      take: pageOptionsDto.take,
      orderBy: { createdAt: 'desc' },
    });

    const pageMetaDto = new PageMetaDto({ itemCount, pageOptionsDto });
    const entities = users.map((user) => new UserEntity(user));

    return new PageDto(entities, pageMetaDto);
  }

  async findAllByCollector(
    collectorTrackingId: string,
    pageOptionsDto: PageOptionsDto,
    requestingUser: RequestingUser,
  ): Promise<PageDto<UserEntity>> {
    const collector = await this.prisma.collector.findUnique({
      where: { trackingId: collectorTrackingId },
    });

    if (!collector) {
      throw new NotFoundException('Collector not found');
    }
    await this.assertCanAccessCollector(collector.id, requestingUser);

    const where = { collectorId: collector.id };
    const itemCount = await this.prisma.user.count({ where });
    const users = await this.prisma.user.findMany({
      where,
      skip: pageOptionsDto.skip,
      take: pageOptionsDto.take,
      orderBy: { createdAt: 'desc' },
    });

    const pageMetaDto = new PageMetaDto({ itemCount, pageOptionsDto });
    const entities = users.map((user) => new UserEntity(user));

    return new PageDto(entities, pageMetaDto);
  }

  async findOne(trackingId: string): Promise<UserEntity> {
    const user = await this.prisma.user.findUnique({
      where: { trackingId },
      include: { collector: { select: { trackingId: true } } },
    });

    if (!user) {
      throw new NotFoundException(
        `User with trackingId ${trackingId} not found`,
      );
    }

    const { collector, ...userData } = user;
    return new UserEntity({
      ...userData,
      collectorTrackingId: collector?.trackingId,
    });
  }

  async update(
    trackingId: string,
    updateUserDto: UpdateUserDto,
  ): Promise<UserEntity> {
    await this.findOne(trackingId); // Ensure user exists

    if (updateUserDto.email) {
      const existingEmailOwner = await this.prisma.user.findUnique({
        where: { email: updateUserDto.email },
      });
      if (existingEmailOwner && existingEmailOwner.trackingId !== trackingId) {
        throw new ConflictException('Email already in use');
      }
    }

    let hashedPassword: string | undefined;
    if (updateUserDto.password) {
      const salt = await bcrypt.genSalt(10);
      hashedPassword = await bcrypt.hash(updateUserDto.password, salt);
    }

    const updateData = { ...updateUserDto };
    if (hashedPassword) {
      updateData.password = hashedPassword;
    }

    const updatedUser = await this.prisma.user.update({
      where: { trackingId },
      data: updateData,
    });

    return new UserEntity(updatedUser);
  }

  async remove(trackingId: string): Promise<void> {
    await this.findOne(trackingId); // Ensure user exists

    await this.prisma.user.delete({
      where: { trackingId },
    });
  }

  // --- Méthodes internes pour l'Auth ---

  findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  findByTrackingIdForAuth(trackingId: string) {
    return this.prisma.user.findUnique({
      where: { trackingId },
    });
  }

  async updateRefreshToken(
    trackingId: string,
    refreshToken: string,
  ): Promise<void> {
    const salt = await bcrypt.genSalt(10);
    const hashedRefreshToken = await bcrypt.hash(refreshToken, salt);
    await this.prisma.user.update({
      where: { trackingId },
      data: { hashedRefreshToken },
    });
  }

  async removeRefreshToken(trackingId: string): Promise<void> {
    await this.prisma.user.update({
      where: { trackingId },
      data: { hashedRefreshToken: null },
    });
  }

  private async assertCanAccessCollector(
    collectorId: bigint,
    requestingUser: RequestingUser,
  ): Promise<void> {
    if (!isCollectorRole(requestingUser.role)) return;

    const user = await this.prisma.user.findUnique({
      where: { trackingId: requestingUser.trackingId },
      select: { collectorId: true },
    });
    assertCollectorScope(user, collectorId);
  }
}
