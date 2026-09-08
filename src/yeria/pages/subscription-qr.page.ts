import { YeriaUI, BaseView } from '@numerum-tech/yeriasdk';
import * as QRCode from 'qrcode';

export async function createSubscriptionQRPage(
  subscription: any,
): Promise<BaseView> {
  const qrCodeId = subscription.qrCodeId || subscription.trackingId;

  let qrDataUrl = '';
  try {
    qrDataUrl = await QRCode.toDataURL(qrCodeId, {
      errorCorrectionLevel: 'H',
      margin: 2,
      width: 320,
    });
  } catch {
    qrDataUrl =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  }

  const offerName = subscription.offer?.name || 'Abonnement Déchets Klinzo';
  const price = subscription.offer?.price
    ? `${Number(subscription.offer.price).toLocaleString('fr-FR')} FCFA`
    : '';
  const status = subscription.status || 'ACTIVE';
  const address = subscription.addressText || 'Adresse déclarée';

  const view = YeriaUI.createQRDisplayView(
    `sub-${subscription.trackingId}`,
    'QR Code Bac & Abonnement',
  )
    .setIntro(
      `Abonnement confirmé ! Collez ou présentez ce QR code sur votre bac à ordures pour chaque passage de collecte des agents Klinzo.`,
    )
    .setQRCode(
      qrDataUrl,
      `${offerName} — Statut: ${status}`,
      `Code Bac : ${qrCodeId}\nAdresse : ${address}\nTarif : ${price}`,
    )
    .submitButton('Enregistrer le QR Code', 'POST');

  return view;
}
