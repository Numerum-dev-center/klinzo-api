import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PickupRequestStatus, Role } from '@prisma/client';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { PageDto } from '../../shared/pagination/dto/requests/page.dto';
import { PageMetaDto } from '../../shared/pagination/dto/requests/page-meta.dto';
import { PageOptionsDto } from '../../shared/pagination/dto/requests/page-options.dto';
import {
  assertCollectorScope,
  assertUserScope,
  isCollectorRole,
  RequestingUser,
} from '../../shared/security/requesting-user';
import { CreatePickupRequestDto } from './dto/requests/create-pickup-request.dto';
import { SchedulePickupRequestDto } from './dto/requests/schedule-pickup-request.dto';
import { CancelPickupRequestDto } from './dto/requests/cancel-pickup-request.dto';
import { PickupRequestResponse } from './dto/responses/pickup-request.response';

const pickupRequestInclude = {
  user: true,
  collector: true,
};

@Injectable()
export class PickupRequestService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    dto: CreatePickupRequestDto,
    requestingUser: RequestingUser,
  ): Promise<PickupRequestResponse> {
    if (requestingUser.role !== Role.USAGER) {
      throw new ForbiddenException('Only users can create pickup requests');
    }

    const [user, collector] = await Promise.all([
      this.prisma.user.findUnique({
        where: { trackingId: requestingUser.trackingId },
      }),
      this.prisma.collector.findUnique({
        where: { trackingId: dto.collectorTrackingId },
      }),
    ]);

    if (!user) throw new NotFoundException('User not found');
    if (!collector) throw new NotFoundException('Collector not found');
    if (!collector.isActive) {
      throw new BadRequestException('Collector is not active');
    }

    const request = await this.prisma.pickupRequest.create({
      data: {
        userId: user.id,
        collectorId: collector.id,
        wasteType: dto.wasteType,
        addressText: dto.addressText,
        latitude: dto.latitude,
        longitude: dto.longitude,
        preferredDate: dto.preferredDate
          ? new Date(dto.preferredDate)
          : undefined,
        estimatedPrice: dto.estimatedPrice,
        notes: dto.notes,
      },
      include: pickupRequestInclude,
    });

    return new PickupRequestResponse(request);
  }

  async findAll(
    pageOptionsDto: PageOptionsDto,
    requestingUser: RequestingUser,
  ): Promise<PageDto<PickupRequestResponse>> {
    const where = await this.scopeWhere(requestingUser);
    const itemCount = await this.prisma.pickupRequest.count({ where });
    const requests = await this.prisma.pickupRequest.findMany({
      where,
      skip: pageOptionsDto.skip,
      take: pageOptionsDto.take,
      orderBy: { createdAt: 'desc' },
      include: pickupRequestInclude,
    });

    const pageMetaDto = new PageMetaDto({ itemCount, pageOptionsDto });
    return new PageDto(
      requests.map((request) => new PickupRequestResponse(request)),
      pageMetaDto,
    );
  }

  async findOne(
    trackingId: string,
    requestingUser: RequestingUser,
  ): Promise<PickupRequestResponse> {
    const request = await this.prisma.pickupRequest.findUnique({
      where: { trackingId },
      include: pickupRequestInclude,
    });
    if (!request) throw new NotFoundException('Pickup request not found');
    await this.assertCanAccess(request, requestingUser);

    return new PickupRequestResponse(request);
  }

  async schedule(
    trackingId: string,
    dto: SchedulePickupRequestDto,
    requestingUser: RequestingUser,
  ): Promise<PickupRequestResponse> {
    const request = await this.findRawOrThrow(trackingId);
    await this.assertCollectorCanManage(request.collectorId, requestingUser);
    if (request.status !== PickupRequestStatus.NEW) {
      throw new BadRequestException('Pickup request is not NEW');
    }

    const updated = await this.prisma.pickupRequest.update({
      where: { trackingId },
      data: {
        status: PickupRequestStatus.SCHEDULED,
        scheduledDate: new Date(dto.scheduledDate),
        finalPrice: dto.finalPrice ?? request.estimatedPrice,
      },
      include: pickupRequestInclude,
    });

    return new PickupRequestResponse(updated);
  }

  async complete(
    trackingId: string,
    requestingUser: RequestingUser,
  ): Promise<PickupRequestResponse> {
    const request = await this.findRawOrThrow(trackingId);
    await this.assertCollectorCanManage(request.collectorId, requestingUser);
    if (request.status !== PickupRequestStatus.SCHEDULED) {
      throw new BadRequestException('Pickup request is not SCHEDULED');
    }

    const updated = await this.prisma.pickupRequest.update({
      where: { trackingId },
      data: {
        status: PickupRequestStatus.COMPLETED,
        completedAt: new Date(),
      },
      include: pickupRequestInclude,
    });

    return new PickupRequestResponse(updated);
  }

  async cancel(
    trackingId: string,
    dto: CancelPickupRequestDto,
    requestingUser: RequestingUser,
  ): Promise<PickupRequestResponse> {
    const request = await this.findRawOrThrow(trackingId);
    await this.assertCanAccess(request, requestingUser);
    if (
      request.status === PickupRequestStatus.COMPLETED ||
      request.status === PickupRequestStatus.CANCELLED
    ) {
      throw new BadRequestException('Pickup request cannot be cancelled');
    }

    const updated = await this.prisma.pickupRequest.update({
      where: { trackingId },
      data: {
        status: PickupRequestStatus.CANCELLED,
        cancellationReason: dto.reason,
      },
      include: pickupRequestInclude,
    });

    return new PickupRequestResponse(updated);
  }

  private async findRawOrThrow(trackingId: string) {
    const request = await this.prisma.pickupRequest.findUnique({
      where: { trackingId },
      include: pickupRequestInclude,
    });
    if (!request) throw new NotFoundException('Pickup request not found');
    return request;
  }

  private async scopeWhere(requestingUser: RequestingUser) {
    if (requestingUser.role === Role.USAGER) {
      const user = await this.prisma.user.findUnique({
        where: { trackingId: requestingUser.trackingId },
      });
      if (!user) throw new NotFoundException('User not found');
      return { userId: user.id };
    }

    if (isCollectorRole(requestingUser.role)) {
      const user = await this.prisma.user.findUnique({
        where: { trackingId: requestingUser.trackingId },
      });
      if (!user?.collectorId) {
        throw new ForbiddenException(
          'You can only access resources for your own collector entity',
        );
      }
      return { collectorId: user.collectorId };
    }

    return {};
  }

  private async assertCanAccess(
    request: { user: { trackingId: string }; collectorId: bigint },
    requestingUser: RequestingUser,
  ): Promise<void> {
    if (requestingUser.role === Role.USAGER) {
      assertUserScope(request.user.trackingId, requestingUser.trackingId);
      return;
    }

    if (isCollectorRole(requestingUser.role)) {
      await this.assertCollectorCanManage(request.collectorId, requestingUser);
    }
  }

  private async assertCollectorCanManage(
    collectorId: bigint,
    requestingUser: RequestingUser,
  ): Promise<void> {
    if (!isCollectorRole(requestingUser.role)) return;

    const user = await this.prisma.user.findUnique({
      where: { trackingId: requestingUser.trackingId },
    });
    assertCollectorScope(user, collectorId);
  }
}
