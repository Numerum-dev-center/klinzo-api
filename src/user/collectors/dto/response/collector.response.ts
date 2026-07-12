import { CollectorEntity } from '../../entities/collector.entity';

export class CollectorResponse extends CollectorEntity {
  // L'entité gère déjà le filtrage de l'ID via le ClassSerializerInterceptor
  // On peut ajouter ici des champs virtuels si besoin dans le futur
}
