import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { InitiateTransactionDto } from './dto/requests/initiate-transaction.dto';
import { ConfirmTransactionDto } from './dto/requests/confirm-transaction.dto';
import { TransactionResponse } from './dto/responses/transaction.response';
import { PageOptionsDto } from '../../shared/pagination/dto/requests/page-options.dto';
import { PageDto } from '../../shared/pagination/dto/requests/page.dto';
import { PageMetaDto } from '../../shared/pagination/dto/requests/page-meta.dto';
import { Role, SubscriptionStatus } from '@prisma/client';
import {
  assertCollectorScope,
  assertUserScope,
  isCollectorRole,
  RequestingUser,
} from '../../shared/security/requesting-user';

@Injectable()
export class TransactionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async initiate(
    dto: InitiateTransactionDto,
    requestingUserTrackingId: string,
  ): Promise<TransactionResponse> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { trackingId: dto.subscriptionTrackingId },
      include: {
        user: true,
        offer: true,
      },
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    if (subscription.user.trackingId !== requestingUserTrackingId) {
      throw new ForbiddenException(
        'You can only initiate payment for your own subscription',
      );
    }

    const amount = Number(subscription.offer.price);
    const platformCommission =
      amount * this.getNumberConfig('PLATFORM_COMMISSION_RATE', 0.15);

    const transaction = await this.prisma.transaction.create({
      data: {
        amount,
        platformCommission,
        status: 'PENDING',
        paymentGatewayRef: null,
        timestamp: new Date(),
        subscriptionId: subscription.id,
      },
    });

    return new TransactionResponse({
      trackingId: transaction.trackingId,
      amount: transaction.amount,
      platformCommission: transaction.platformCommission,
      paymentGatewayRef: transaction.paymentGatewayRef || undefined,
      status: transaction.status,
      invoicePdfUrl: transaction.invoicePdfUrl || undefined,
      timestamp: transaction.timestamp,
      createdAt: transaction.createdAt,
      updatedAt: transaction.updatedAt,
    });
  }

  async confirm(
    trackingId: string,
    dto: ConfirmTransactionDto,
  ): Promise<TransactionResponse> {
    const transaction = await this.prisma.transaction.findUnique({
      where: { trackingId },
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    // IDEMPOTENCE : si la transaction est déjà dans un état terminal (SUCCESS ou FAILED),
    // on ne fait rien et on la retourne telle quelle pour ne pas écraser un état déjà final
    // (exigence d'idempotence du §11.6 du TDR).
    if (transaction.status === 'SUCCESS' || transaction.status === 'FAILED') {
      return new TransactionResponse({
        trackingId: transaction.trackingId,
        amount: transaction.amount,
        platformCommission: transaction.platformCommission,
        paymentGatewayRef: transaction.paymentGatewayRef || undefined,
        status: transaction.status,
        invoicePdfUrl: transaction.invoicePdfUrl || undefined,
        timestamp: transaction.timestamp,
        createdAt: transaction.createdAt,
        updatedAt: transaction.updatedAt,
      });
    }

    const updatedTransaction = await this.prisma.transaction.update({
      where: { id: transaction.id },
      data: {
        paymentGatewayRef: dto.paymentGatewayRef,
        status: dto.status,
      },
    });

    if (dto.status === 'SUCCESS') {
      await this.prisma.subscription.update({
        where: { id: transaction.subscriptionId },
        data: { status: SubscriptionStatus.ACTIVE },
      });
    }

    // Confirmation manuelle réservée aux rôles SaaS. L'intégration d'un
    // agrégateur de paiement devra passer par un endpoint webhook dédié avec
    // vérification de signature propre au fournisseur retenu.

    return new TransactionResponse({
      trackingId: updatedTransaction.trackingId,
      amount: updatedTransaction.amount,
      platformCommission: updatedTransaction.platformCommission,
      paymentGatewayRef: updatedTransaction.paymentGatewayRef || undefined,
      status: updatedTransaction.status,
      invoicePdfUrl: updatedTransaction.invoicePdfUrl || undefined,
      timestamp: updatedTransaction.timestamp,
      createdAt: updatedTransaction.createdAt,
      updatedAt: updatedTransaction.updatedAt,
    });
  }

  async findAll(
    pageOptionsDto: PageOptionsDto,
  ): Promise<PageDto<TransactionResponse>> {
    const itemCount = await this.prisma.transaction.count();
    const transactions = await this.prisma.transaction.findMany({
      skip: pageOptionsDto.skip,
      take: pageOptionsDto.take,
      orderBy: { createdAt: 'desc' },
    });

    const pageMetaDto = new PageMetaDto({ itemCount, pageOptionsDto });
    const entities = transactions.map(
      (t) =>
        new TransactionResponse({
          trackingId: t.trackingId,
          amount: t.amount,
          platformCommission: t.platformCommission,
          paymentGatewayRef: t.paymentGatewayRef || undefined,
          status: t.status,
          invoicePdfUrl: t.invoicePdfUrl || undefined,
          timestamp: t.timestamp,
          createdAt: t.createdAt,
          updatedAt: t.updatedAt,
        }),
    );
    return new PageDto(entities, pageMetaDto);
  }

  async findAllBySubscription(
    subscriptionTrackingId: string,
    pageOptionsDto: PageOptionsDto,
    requestingUser: RequestingUser,
  ): Promise<PageDto<TransactionResponse>> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { trackingId: subscriptionTrackingId },
      include: { user: true, offer: true },
    });

    if (!subscription) throw new NotFoundException('Subscription not found');
    await this.assertCanAccessSubscription(subscription, requestingUser);

    const where = { subscriptionId: subscription.id };
    const itemCount = await this.prisma.transaction.count({ where });
    const transactions = await this.prisma.transaction.findMany({
      where,
      skip: pageOptionsDto.skip,
      take: pageOptionsDto.take,
      orderBy: { createdAt: 'desc' },
    });

    const pageMetaDto = new PageMetaDto({ itemCount, pageOptionsDto });
    const entities = transactions.map(
      (t) =>
        new TransactionResponse({
          trackingId: t.trackingId,
          amount: t.amount,
          platformCommission: t.platformCommission,
          paymentGatewayRef: t.paymentGatewayRef || undefined,
          status: t.status,
          invoicePdfUrl: t.invoicePdfUrl || undefined,
          timestamp: t.timestamp,
          createdAt: t.createdAt,
          updatedAt: t.updatedAt,
        }),
    );
    return new PageDto(entities, pageMetaDto);
  }

  async findOne(
    trackingId: string,
    requestingUser: RequestingUser,
  ): Promise<TransactionResponse> {
    const transaction = await this.prisma.transaction.findUnique({
      where: { trackingId },
      include: {
        subscription: {
          include: { user: true, offer: true },
        },
      },
    });
    if (!transaction) throw new NotFoundException('Transaction not found');
    await this.assertCanAccessSubscription(
      transaction.subscription,
      requestingUser,
    );

    return new TransactionResponse({
      trackingId: transaction.trackingId,
      amount: transaction.amount,
      platformCommission: transaction.platformCommission,
      paymentGatewayRef: transaction.paymentGatewayRef || undefined,
      status: transaction.status,
      invoicePdfUrl: transaction.invoicePdfUrl || undefined,
      timestamp: transaction.timestamp,
      createdAt: transaction.createdAt,
      updatedAt: transaction.updatedAt,
    });
  }

  private async assertCanAccessSubscription(
    subscription: {
      user: { trackingId: string };
      offer?: { collectorId: bigint };
    },
    requestingUser: RequestingUser,
  ): Promise<void> {
    if (requestingUser.role === Role.USAGER) {
      assertUserScope(
        subscription.user.trackingId,
        requestingUser.trackingId,
        'You can only access transactions for your own subscription',
      );
      return;
    }

    if (isCollectorRole(requestingUser.role)) {
      if (!subscription.offer) {
        throw new NotFoundException('Subscription offer not found');
      }
      await this.assertCanAccessCollector(
        subscription.offer.collectorId,
        requestingUser,
      );
    }
  }

  private async assertCanAccessCollector(
    collectorId: bigint,
    requestingUser: RequestingUser,
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { trackingId: requestingUser.trackingId },
      select: { collectorId: true },
    });
    assertCollectorScope(
      user,
      collectorId,
      'You can only access transactions for your own collector entity',
    );
  }

  private getNumberConfig(key: string, fallback: number): number {
    const value = Number(this.configService.get<string>(key) ?? fallback);
    return Number.isFinite(value) ? value : fallback;
  }
}
