import { FinancialDocumentType, FinancialDocumentStatus } from '@prisma/client';

export class FinancialDocumentEntity {
  id: bigint;
  trackingId: string;
  createdAt: Date;
  updatedAt: Date;
  type: FinancialDocumentType;
  status: FinancialDocumentStatus;
  collectorId: bigint;
  periodStart: Date | null;
  periodEnd: Date | null;
  amount: number;
  documentUrl: string | null;
  dueDate: Date | null;
  settledAt: Date | null;
  metadata: any;

  constructor(partial: Partial<FinancialDocumentEntity>) {
    Object.assign(this, partial);
  }
}
