import { YeriaUI, BaseView } from '@numerum-tech/yeriasdk';
import { UserEntity } from '../../user/users/entities/user.entity';

export function createSubscribeFormPage(
  offer: any,
  user?: UserEntity,
): BaseView {
  const form = YeriaUI.createFormView(
    `subscribe-${offer.trackingId}`,
    `Souscrire : ${offer.name}`,
  );

  const priceStr = Number(offer.price || 0).toLocaleString('fr-FR');

  if (user) {
    const userName =
      [user.firstName, user.lastName].filter(Boolean).join(' ') || 'Client';
    form.setIntro(
      `Bonjour ${userName} ! Vos informations de profil Yeria sont automatiquement pré-remplies. Renseignez simplement l'adresse de votre bac pour planifier les collectes.\nTarif : ${priceStr} FCFA (${offer.frequency}).`,
    );

    form.addTextField('subscriberName', 'Nom du souscripteur', true);
    form.addEmailField('subscriberEmail', 'Adresse Email', true);
    form.addTextField('subscriberPhone', 'Numéro de téléphone', true);
    form.addTextField('addressText', 'Adresse exacte du domicile / bac', true);
    form.addTextField(
      'latitude',
      'Latitude GPS (optionnel, ex: 5.35995)',
      false,
    );
    form.addTextField(
      'longitude',
      'Longitude GPS (optionnel, ex: -4.00826)',
      false,
    );

    form.submitButton(
      'Confirmer la souscription',
      'POST',
      `/offers/${offer.trackingId}/subscribe`,
    );

    form.injectData({
      subscriberName: userName,
      subscriberEmail: user.email,
      subscriberPhone: user.phone || '',
      latitude: '5.35995',
      longitude: '-4.00826',
    });
  } else {
    form.setIntro(
      `Remplissez les informations ci-dessous pour activer votre formule de ramassage de déchets (${priceStr} FCFA / ${offer.frequency}).`,
    );

    form.addTextField('subscriberName', 'Nom complet', true);
    form.addEmailField('subscriberEmail', 'Adresse Email', true);
    form.addTextField('subscriberPhone', 'Numéro de téléphone', true);
    form.addTextField('addressText', 'Adresse exacte du domicile / bac', true);
    form.addTextField('latitude', 'Latitude GPS (ex: 5.35995)', false);
    form.addTextField('longitude', 'Longitude GPS (ex: -4.00826)', false);

    form.submitButton(
      'Confirmer la souscription',
      'POST',
      `/offers/${offer.trackingId}/subscribe`,
    );

    form.injectData({
      latitude: '5.35995',
      longitude: '-4.00826',
    });
  }

  return form;
}
