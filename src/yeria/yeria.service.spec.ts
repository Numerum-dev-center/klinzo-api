import { KycStatus } from '@prisma/client';
import { YeriaService } from './yeria.service';
import { PrismaService } from '../shared/prisma/prisma.service';

jest.mock('@numerum-tech/yeriasdk', () => {
  const createView = () => ({
    addAction: jest.fn().mockReturnThis(),
    addEmailField: jest.fn().mockReturnThis(),
    addTextField: jest.fn().mockReturnThis(),
    injectData: jest.fn().mockReturnThis(),
    setIntro: jest.fn().mockReturnThis(),
    submitButton: jest.fn().mockReturnThis(),
  });

  return {
    YeriaUI: {
      createActionGridView: jest.fn(createView),
      createActionListView: jest.fn(createView),
      createCardView: jest.fn(createView),
      createFormView: jest.fn(createView),
      createMessageView: jest.fn(createView),
      createQRDisplayView: jest.fn(createView),
      createQRScanView: jest.fn(createView),
    },
  };
});

jest.mock('./yeria.config', () => ({
  getYeriaPublicApp: () => ({ serve: jest.fn((view: unknown) => view) }),
  getYeriaAgentApp: () => ({ serve: jest.fn((view: unknown) => view) }),
  getYeriaAbsoluteAssetUrl: (filename: string) => `/yeria-assets/${filename}`,
}));

describe('YeriaService', () => {
  let service: YeriaService;

  const prismaServiceMock = {
    offer: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new YeriaService(prismaServiceMock as unknown as PrismaService);
  });

  it('lists only subscribable offers in public Yeria views', async () => {
    prismaServiceMock.offer.findMany.mockResolvedValue([]);

    await service.getOffersList();

    expect(prismaServiceMock.offer.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          isActive: true,
          collector: {
            isActive: true,
            kycStatus: KycStatus.APPROVED,
          },
        },
      }),
    );
  });

  it('requires a subscribable offer for the subscription form', async () => {
    prismaServiceMock.offer.findFirst.mockResolvedValue(null);

    await expect(service.getSubscribeForm('offer-1')).rejects.toThrow(
      'Offre de collecte indisponible',
    );
    expect(prismaServiceMock.offer.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          trackingId: 'offer-1',
          isActive: true,
          collector: {
            isActive: true,
            kycStatus: KycStatus.APPROVED,
          },
        },
      }),
    );
  });
});
