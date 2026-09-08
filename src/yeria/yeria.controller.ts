import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { UserEntity } from '../user/users/entities/user.entity';
import { YeriaService } from './yeria.service';
import { YeriaOptionalAuthGuard } from './yeria-optional-auth.guard';
import { GetYeriaUser } from './get-yeria-user.decorator';

@ApiTags('Yeria Client')
@Controller('yeria')
@UseGuards(YeriaOptionalAuthGuard)
export class YeriaPublicController {
  constructor(private readonly yeriaService: YeriaService) {}

  // 1. Point d'entrée Yeria Public (Home) — Personnalisé avec le profil usager si présent
  @ApiOperation({ summary: "Point d'entrée Yeria SDUI pour les clients" })
  @Get()
  getHome(@GetYeriaUser() user?: UserEntity) {
    return this.yeriaService.getHome(user);
  }

  // 2. Offres de collecte disponibles
  @ApiOperation({ summary: 'Catalogue des offres de collecte de déchets' })
  @Get('offers')
  getOffersList(@Query('zone') zone?: string) {
    return this.yeriaService.getOffersList(zone);
  }

  // 3. Détail d'une offre
  @ApiOperation({ summary: "Détail d'une formule de collecte" })
  @Get('offers/:id')
  getOfferDetail(@Param('id') id: string) {
    return this.yeriaService.getOfferDetail(id);
  }

  // 4. Formulaire de souscription pour une offre
  // Si l'usager est connecté sous Yeria, ses coordonnées sont automatiquement pré-remplies
  @ApiOperation({ summary: 'Formulaire de souscription à une offre' })
  @Get('offers/:id/subscribe')
  getSubscribeForm(@Param('id') id: string, @GetYeriaUser() user?: UserEntity) {
    return this.yeriaService.getSubscribeForm(id, user);
  }

  // 4b. Soumission de souscription -> Utilise les données du compte Yeria automatiquement
  @ApiOperation({
    summary: 'Soumission de souscription et émission de QR code bac',
  })
  @Post('offers/:id/subscribe')
  submitSubscription(
    @Param('id') id: string,
    @Body()
    body: {
      subscriberName?: string;
      subscriberEmail?: string;
      subscriberPhone?: string;
      addressText?: string;
      latitude?: string | number;
      longitude?: string | number;
    },
    @GetYeriaUser() user?: UserEntity,
  ) {
    return this.yeriaService.submitSubscription(id, body, user);
  }

  // 5. Affichage du badge QR Code de bac par identifiant de contrat
  @ApiOperation({ summary: 'Affichage du QR Code officiel de bac' })
  @Get('subscription/:trackingId')
  getSubscriptionQR(@Param('trackingId') trackingId: string) {
    return this.yeriaService.getSubscriptionQR(trackingId);
  }

  // 6. Formulaire de recherche de couverture par zone / commune
  @ApiOperation({ summary: 'Recherche de zones desservies' })
  @Get('search')
  getSearchForm() {
    return this.yeriaService.getSearchForm();
  }

  // 6b. Résultats de recherche
  @ApiOperation({ summary: 'Résultats de recherche par zone / ville' })
  @Post('search')
  executeSearch(@Body() body: { keyword?: string; city?: string }) {
    return this.yeriaService.executeSearch(body);
  }

  // 7. Mes Abonnements (GET) :
  // Si l'usager Yeria est authentifié, affiche directement tous ses abonnements et bacs
  @ApiOperation({ summary: 'Mes abonnements et QR codes de bac' })
  @Get('my-subscriptions')
  getMySubscriptions(@GetYeriaUser() user?: UserEntity) {
    return this.yeriaService.getMySubscriptions(user);
  }

  // 7b. Consultation de ses abonnements par email / ID
  @ApiOperation({ summary: "Recherche de contrats d'abonnement" })
  @Post('my-subscriptions')
  findMySubscriptions(
    @Body() body: { email?: string; subscriptionId?: string },
    @GetYeriaUser() user?: UserEntity,
  ) {
    return this.yeriaService.findMySubscriptions(body, user);
  }

  // 8. Service d'images direct sous /yeria/:filename pour le loader mobile Yeria
  @Get(':filename')
  serveAsset(@Param('filename') filename: string, @Res() res: any) {
    const sanitized = path.basename(filename);
    const assetPath = path.join(
      process.cwd(),
      'public',
      'yeria-assets',
      sanitized,
    );
    if (fs.existsSync(assetPath)) {
      return res.sendFile(assetPath);
    }
    return res.status(404).send('Asset not found');
  }
}
