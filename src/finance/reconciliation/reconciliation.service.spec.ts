import { BadRequestException } from '@nestjs/common';
import { BankStatementLineStatus } from '@prisma/client';
import { ReconciliationService } from './reconciliation.service';

const prismaServiceMock = {
  bankStatementLine: {
    create: jest.fn(),
    count: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  transaction: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
  },
};

describe('ReconciliationService', () => {
  let service: ReconciliationService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ReconciliationService(prismaServiceMock as any);
  });

  it('automatically matches statement lines by amount and provider reference', async () => {
    prismaServiceMock.bankStatementLine.findMany.mockResolvedValue([
      {
        id: BigInt(1),
        amount: 5000,
        reference: 'PAY-001',
        status: BankStatementLineStatus.UNMATCHED,
      },
    ]);
    prismaServiceMock.transaction.findFirst.mockResolvedValue({
      id: BigInt(9),
      amount: 5000,
      paymentGatewayRef: 'PAY-001',
    });

    await expect(service.autoMatch()).resolves.toEqual({ matched: 1 });
    expect(prismaServiceMock.bankStatementLine.update).toHaveBeenCalledWith({
      where: { id: BigInt(1) },
      data: expect.objectContaining({
        status: BankStatementLineStatus.MATCHED,
        transactionId: BigInt(9),
      }),
    });
  });

  it('rejects manual matching of a line that is already matched', async () => {
    prismaServiceMock.bankStatementLine.findUnique.mockResolvedValue({
      trackingId: 'line-1',
      status: BankStatementLineStatus.MATCHED,
    });
    prismaServiceMock.transaction.findUnique.mockResolvedValue({
      id: BigInt(2),
      trackingId: 'tx-1',
    });

    await expect(
      service.matchLine('line-1', { transactionTrackingId: 'tx-1' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
