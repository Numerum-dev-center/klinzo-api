import { YeriaUI, BaseView } from '@numerum-tech/yeriasdk';

export function createAgentScanSelectTourPage(tours: any[]): BaseView {
  const form = YeriaUI.createFormView(
    'scan-select-tour',
    'Collecte Déchets — Sélection de Tournée',
  ).setIntro(
    'Sélectionnez la tournée active pour enregistrer le ramassage des bacs.',
  );

  if (tours.length > 0) {
    form.addSelectField(
      'tourTrackingId',
      'Tournée active',
      true,
      tours.map((t) => ({
        label: `${t.reference} (${t.status}) • Véhicule : ${t.vehicle?.matricule || 'N/A'}`,
        value: t.trackingId,
      })),
    );
  } else {
    form.addTextField(
      'tourTrackingId',
      'Aucune tournée en cours (création automatique)',
      false,
    );
  }

  form.addTextField(
    'agentGps',
    'Coordonnées GPS Agent (ex: 5.35995, -4.00826)',
    false,
  );
  form.submitButton('Ouvrir le Scanner de Bac', 'POST', '/scan');

  return form;
}

export function createAgentQRScannerPage(
  tourTrackingId: string,
  tourRef?: string,
): BaseView {
  return YeriaUI.createQRScanView(
    `scan-session-${tourTrackingId}`,
    `Scan Bac : ${tourRef || 'Collecte'}`,
  ).setIntro(
    "Pointez l'appareil photo vers le QR code officiel fixé sur le bac à ordures de l'abonné.",
  );
}

export function createAgentScanResultPage(
  isSuccess: boolean,
  message: string,
  scanInfo?: {
    qrCodeId?: string;
    clientNom?: string;
    adresse?: string;
    formule?: string;
    statut?: string;
  },
): BaseView {
  const view = YeriaUI.createMessageView(
    'scan-result',
    isSuccess ? 'Collecte Enregistrée' : 'Échec du Scan',
  )
    .setSeverity(isSuccess ? 'success' : 'error')
    .setIntro(
      isSuccess
        ? 'Le ramassage du bac a été validé avec succès.'
        : 'Erreur lors de la prise en charge.',
    )
    .setBody(
      scanInfo
        ? `${message}\n\n• Code Bac : ${scanInfo.qrCodeId || 'N/A'}\n• Abonné : ${scanInfo.clientNom || 'Client Klinzo'}\n• Formule : ${scanInfo.formule || 'Standard'}\n• Adresse : ${scanInfo.adresse || 'N/A'}\n• Statut collecte : ${scanInfo.statut || 'VALIDÉ'}`
        : message,
    )
    .setPrimaryAction('Scanner un autre bac', 'POST');

  return view;
}
