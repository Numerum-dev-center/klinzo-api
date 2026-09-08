import { Injectable } from '@nestjs/common';
import {
  CollectionStatus,
  FinancialDocumentStatus,
  FinancialDocumentType,
  KycStatus,
  Role,
  SubscriptionStatus,
} from '@prisma/client';
import { PrismaService } from '../shared/prisma/prisma.service';

export type CountMap = Record<string, number>;

export interface MonthlyBucket {
  month: string;
  subscriptions: number;
  collectionEvents: number;
  validatedCollections: number;
  revenue: number;
  platformCommission: number;
}

@Injectable()
export class ReportingService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview(): Promise<{
    generatedAt: string;
    collectors: {
      total: number;
      active: number;
      inactive: number;
      byKycStatus: CountMap;
    };
    users: {
      total: number;
      active: number;
      usagers: number;
      byRole: CountMap;
    };
    subscriptions: {
      total: number;
      active: number;
      byStatus: CountMap;
    };
    collections: {
      total: number;
      validated: number;
      disputed: number;
      validationRate: number;
      disputeRate: number;
      byStatus: CountMap;
    };
    finance: {
      transactions: {
        total: number;
        successful: number;
        recoveryRate: number;
        byStatus: CountMap;
      };
      revenue: number;
      platformCommission: number;
      grossTransactionVolume: number;
      grossCommissionVolume: number;
      pendingPayoutAmount: number;
      paidPayoutAmount: number;
    };
    geography: {
      zonesTotal: number;
      zonesActive: number;
      coveredActiveZones: number;
      coverageRate: number;
      byCity: Array<{ city: string; zones: number }>;
    };
    quality: {
      averageRating: number;
      ratingsCount: number;
    };
    monthlyActivity: MonthlyBucket[];
  }> {
    const since = this.firstDayOfMonthOffset(-5);

    const [
      collectorsTotal,
      collectorsActive,
      collectorsByKyc,
      usersTotal,
      usagersTotal,
      usersActive,
      usersByRole,
      zonesTotal,
      zonesActive,
      coveredActiveZones,
      zonesByCity,
      subscriptionsTotal,
      subscriptionsByStatus,
      collectionEventsTotal,
      collectionEventsByStatus,
      transactionsTotal,
      transactionsByStatus,
      successfulTransactions,
      allTransactions,
      payoutPending,
      payoutPaid,
      ratings,
      monthlySubscriptions,
      monthlyCollectionEvents,
      monthlyTransactions,
    ] = await Promise.all([
      this.prisma.collector.count(),
      this.prisma.collector.count({ where: { isActive: true } }),
      this.prisma.collector.groupBy({
        by: ['kycStatus'],
        _count: { _all: true },
      }),
      this.prisma.user.count(),
      this.prisma.user.count({ where: { role: Role.USAGER } }),
      this.prisma.user.count({ where: { isActive: true } }),
      this.prisma.user.groupBy({ by: ['role'], _count: { _all: true } }),
      this.prisma.zone.count(),
      this.prisma.zone.count({ where: { isActive: true } }),
      this.prisma.zone.count({
        where: { isActive: true, collectorZones: { some: {} } },
      }),
      this.prisma.zone.groupBy({
        by: ['city'],
        _count: { _all: true },
        orderBy: { city: 'asc' },
      }),
      this.prisma.subscription.count(),
      this.prisma.subscription.groupBy({
        by: ['status'],
        _count: { _all: true },
      }),
      this.prisma.collectionEvent.count(),
      this.prisma.collectionEvent.groupBy({
        by: ['status'],
        _count: { _all: true },
      }),
      this.prisma.transaction.count(),
      this.prisma.transaction.groupBy({
        by: ['status'],
        _count: { _all: true },
      }),
      this.prisma.transaction.aggregate({
        where: { status: 'SUCCESS' },
        _count: true,
        _sum: { amount: true, platformCommission: true },
      }),
      this.prisma.transaction.aggregate({
        _sum: { amount: true, platformCommission: true },
      }),
      this.prisma.financialDocument.aggregate({
        where: {
          type: FinancialDocumentType.PAYOUT,
          status: FinancialDocumentStatus.PENDING,
        },
        _sum: { amount: true },
      }),
      this.prisma.financialDocument.aggregate({
        where: {
          type: FinancialDocumentType.PAYOUT,
          status: FinancialDocumentStatus.PAID,
        },
        _sum: { amount: true },
      }),
      this.prisma.rating.aggregate({
        _avg: { score: true },
        _count: true,
      }),
      this.prisma.subscription.findMany({
        where: { createdAt: { gte: since } },
        select: { createdAt: true },
      }),
      this.prisma.collectionEvent.findMany({
        where: { createdAt: { gte: since } },
        select: { createdAt: true, status: true },
      }),
      this.prisma.transaction.findMany({
        where: { createdAt: { gte: since } },
        select: {
          createdAt: true,
          status: true,
          amount: true,
          platformCommission: true,
        },
      }),
    ]);

    const subscriptionCounts = this.toCountMap(subscriptionsByStatus, 'status');
    const collectionCounts = this.toCountMap(
      collectionEventsByStatus,
      'status',
    );
    const transactionCounts = this.toCountMap(transactionsByStatus, 'status');
    const kycCounts = this.toCountMap(collectorsByKyc, 'kycStatus');
    const roleCounts = this.toCountMap(usersByRole, 'role');
    const validatedCollections =
      collectionCounts[CollectionStatus.VALIDATED] ?? 0;
    const disputedCollections =
      collectionCounts[CollectionStatus.DISPUTED] ?? 0;
    const successfulTransactionCount = Number(
      successfulTransactions._count ?? 0,
    );

    return {
      generatedAt: new Date().toISOString(),
      collectors: {
        total: collectorsTotal,
        active: collectorsActive,
        inactive: collectorsTotal - collectorsActive,
        byKycStatus: this.completeCounts(kycCounts, Object.values(KycStatus)),
      },
      users: {
        total: usersTotal,
        active: usersActive,
        usagers: usagersTotal,
        byRole: this.completeCounts(roleCounts, Object.values(Role)),
      },
      subscriptions: {
        total: subscriptionsTotal,
        active: subscriptionCounts[SubscriptionStatus.ACTIVE] ?? 0,
        byStatus: this.completeCounts(
          subscriptionCounts,
          Object.values(SubscriptionStatus),
        ),
      },
      collections: {
        total: collectionEventsTotal,
        validated: validatedCollections,
        disputed: disputedCollections,
        validationRate: this.percentage(
          validatedCollections,
          collectionEventsTotal,
        ),
        disputeRate: this.percentage(
          disputedCollections,
          collectionEventsTotal,
        ),
        byStatus: this.completeCounts(
          collectionCounts,
          Object.values(CollectionStatus),
        ),
      },
      finance: {
        transactions: {
          total: transactionsTotal,
          successful: successfulTransactionCount,
          recoveryRate: this.percentage(
            successfulTransactionCount,
            transactionsTotal,
          ),
          byStatus: transactionCounts,
        },
        revenue: Number(successfulTransactions._sum.amount ?? 0),
        platformCommission: Number(
          successfulTransactions._sum.platformCommission ?? 0,
        ),
        grossTransactionVolume: Number(allTransactions._sum.amount ?? 0),
        grossCommissionVolume: Number(
          allTransactions._sum.platformCommission ?? 0,
        ),
        pendingPayoutAmount: Number(payoutPending._sum.amount ?? 0),
        paidPayoutAmount: Number(payoutPaid._sum.amount ?? 0),
      },
      geography: {
        zonesTotal,
        zonesActive,
        coveredActiveZones,
        coverageRate: this.percentage(coveredActiveZones, zonesActive),
        byCity: zonesByCity.map((row: any) => ({
          city: row.city,
          zones: Number(row._count._all ?? 0),
        })),
      },
      quality: {
        averageRating: this.roundOneDecimal(Number(ratings._avg.score ?? 0)),
        ratingsCount: Number(ratings._count ?? 0),
      },
      monthlyActivity: this.buildMonthlyActivity(
        since,
        monthlySubscriptions,
        monthlyCollectionEvents,
        monthlyTransactions,
      ),
    };
  }

  async exportOverviewCsv(): Promise<string> {
    const overview = await this.getOverview();
    const rows: Array<Array<string | number>> = [
      ['generated_at', overview.generatedAt],
      ['collectors_total', overview.collectors.total],
      ['collectors_active', overview.collectors.active],
      ['users_total', overview.users.total],
      ['users_usagers', overview.users.usagers],
      ['subscriptions_total', overview.subscriptions.total],
      ['subscriptions_active', overview.subscriptions.active],
      ['collection_events_total', overview.collections.total],
      ['collection_validation_rate', overview.collections.validationRate],
      ['transaction_recovery_rate', overview.finance.transactions.recoveryRate],
      ['revenue_success', overview.finance.revenue],
      ['platform_commission_success', overview.finance.platformCommission],
      ['zones_total', overview.geography.zonesTotal],
      ['zones_active', overview.geography.zonesActive],
      ['coverage_rate', overview.geography.coverageRate],
      ['average_rating', overview.quality.averageRating],
      ['ratings_count', overview.quality.ratingsCount],
    ];

    return this.toCsv([
      ['metric', 'value'],
      ...rows,
      [],
      [
        'month',
        'subscriptions',
        'collections',
        'validated_collections',
        'revenue',
      ],
      ...overview.monthlyActivity.map((row) => [
        row.month,
        row.subscriptions,
        row.collectionEvents,
        row.validatedCollections,
        row.revenue,
      ]),
    ]);
  }

  private buildMonthlyActivity(
    since: Date,
    subscriptions: Array<{ createdAt: Date }>,
    collectionEvents: Array<{ createdAt: Date; status: CollectionStatus }>,
    transactions: Array<{
      createdAt: Date;
      status: string;
      amount: number;
      platformCommission: number;
    }>,
  ): MonthlyBucket[] {
    const buckets = this.createMonthlyBuckets(since);
    const byMonth = new Map(buckets.map((bucket) => [bucket.month, bucket]));

    for (const subscription of subscriptions) {
      const bucket = byMonth.get(this.monthKey(subscription.createdAt));
      if (bucket) bucket.subscriptions += 1;
    }

    for (const event of collectionEvents) {
      const bucket = byMonth.get(this.monthKey(event.createdAt));
      if (!bucket) continue;
      bucket.collectionEvents += 1;
      if (event.status === CollectionStatus.VALIDATED) {
        bucket.validatedCollections += 1;
      }
    }

    for (const transaction of transactions) {
      if (transaction.status !== 'SUCCESS') continue;
      const bucket = byMonth.get(this.monthKey(transaction.createdAt));
      if (!bucket) continue;
      bucket.revenue += Number(transaction.amount);
      bucket.platformCommission += Number(transaction.platformCommission);
    }

    return buckets.map((bucket) => ({
      ...bucket,
      revenue: this.roundCurrency(bucket.revenue),
      platformCommission: this.roundCurrency(bucket.platformCommission),
    }));
  }

  private createMonthlyBuckets(since: Date): MonthlyBucket[] {
    return Array.from({ length: 6 }, (_, index) => {
      const date = new Date(since);
      date.setMonth(since.getMonth() + index);
      return {
        month: this.monthKey(date),
        subscriptions: 0,
        collectionEvents: 0,
        validatedCollections: 0,
        revenue: 0,
        platformCommission: 0,
      };
    });
  }

  private firstDayOfMonthOffset(offset: number): Date {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + offset, 1);
  }

  private monthKey(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }

  private toCountMap(rows: any[], key: string): CountMap {
    return rows.reduce<CountMap>((acc, row) => {
      acc[String(row[key])] = Number(row._count?._all ?? 0);
      return acc;
    }, {});
  }

  private completeCounts(keys: CountMap, expectedKeys: string[]): CountMap {
    return expectedKeys.reduce<CountMap>((acc, key) => {
      acc[key] = keys[key] ?? 0;
      return acc;
    }, {});
  }

  private percentage(value: number, total: number): number {
    if (total <= 0) return 0;
    return this.roundOneDecimal((value / total) * 100);
  }

  private roundOneDecimal(value: number): number {
    return Math.round(value * 10) / 10;
  }

  private roundCurrency(value: number): number {
    return Math.round(value * 100) / 100;
  }

  private toCsv(rows: Array<Array<string | number>>): string {
    const body = rows
      .map((row) =>
        row
          .map((value) => {
            const text = String(value ?? '');
            return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
          })
          .join(','),
      )
      .join('\n');

    return `\uFEFF${body}\n`;
  }
}
