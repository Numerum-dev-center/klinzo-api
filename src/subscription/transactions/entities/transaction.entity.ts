export class TransactionEntity {
  id: bigint;
  trackingId: string;
  createdAt: Date;
  updatedAt: Date;
  amount: number;
  platformCommission: number;
  paymentGatewayRef: string | null;
  status: string;
  invoicePdfUrl: string | null;
  timestamp: Date;
  subscriptionId: number;
  financialDocumentId: bigint | null;

  constructor(partial: Partial<TransactionEntity>) {
    Object.assign(this, partial);
  }
}
