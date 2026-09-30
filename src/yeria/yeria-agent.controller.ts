import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Res,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { UserEntity } from '../user/users/entities/user.entity';
import { YeriaService } from './yeria.service';
import { YeriaAgentGuard } from './yeria-agent.guard';
import { GetYeriaUser } from './get-yeria-user.decorator';
import { GetAgentCollector } from './get-agent-collector.decorator';
import { YeriaContractInterceptor } from './yeria-contract.interceptor';

@ApiTags('Yeria Agent Terrain')
@Controller(['api/v1/yeria/agent', 'yeria/agent'])
@UseInterceptors(YeriaContractInterceptor)
@UseGuards(YeriaAgentGuard)
export class YeriaAgentController {
  constructor(private readonly yeriaService: YeriaService) {}

  // 1. Dashboard Opérations Terrain & KPIs
  @ApiOperation({ summary: 'Dashboard agent terrain' })
  @Get()
  getDashboard(
    @GetYeriaUser() user: UserEntity,
    @GetAgentCollector() collector: any,
  ) {
    return this.yeriaService.getAgentDashboard(user, collector);
  }

  // 2. Menu d'actions rapides
  @ApiOperation({ summary: "Menu d'actions agent terrain" })
  @Get('menu')
  getMenu(@GetAgentCollector() collector: any) {
    return this.yeriaService.getAgentMenu(collector);
  }

  // 3. Tournées : Liste des tournées assignées
  @ApiOperation({ summary: 'Liste des tournées terrain' })
  @Get('tours')
  getTours(@GetAgentCollector() collector: any) {
    return this.yeriaService.getAgentTours(collector);
  }

  // 3b. Tournées : Détail d'une tournée
  @ApiOperation({ summary: "Détail d'une tournée" })
  @Get('tours/:id')
  getTourDetail(@Param('id') id: string, @GetAgentCollector() collector: any) {
    return this.yeriaService.getAgentTourDetail(id, collector);
  }

  // 3c. Tournées : Démarrer la tournée
  @ApiOperation({ summary: 'Démarrer une tournée' })
  @Post('tours/:id/start')
  startTour(@Param('id') id: string, @GetAgentCollector() collector: any) {
    return this.yeriaService.startTour(id, collector);
  }

  // 3d. Tournées : Clôturer la tournée
  @ApiOperation({ summary: 'Clôturer une tournée' })
  @Post('tours/:id/complete')
  completeTour(@Param('id') id: string, @GetAgentCollector() collector: any) {
    return this.yeriaService.completeTour(id, collector);
  }

  // 4. Scanner QR Bac : Sélection de tournée
  @ApiOperation({ summary: 'Sélection de la tournée pour scanner les bacs' })
  @Get('scan')
  getScanSelectTour(@GetAgentCollector() collector: any) {
    return this.yeriaService.getScanSelectTour(collector);
  }

  // 4b. Scanner QR Bac : Ouverture du viseur caméra
  @ApiOperation({ summary: 'Ouverture du scanner QR camera' })
  @Post('scan')
  openScanner(
    @Body() body: { tourTrackingId?: string },
    @GetAgentCollector() collector: any,
  ) {
    return this.yeriaService.openAgentScanner(body, collector);
  }

  // 4c. Scanner QR Bac : Validation du scan sur place
  @ApiOperation({
    summary: 'Validation du ramassage avec scan QR du bac et géolocalisation',
  })
  @Post('scan/:tourTrackingId')
  validateScannedQR(
    @Param('tourTrackingId') tourTrackingId: string,
    @Body()
    body: {
      qrData: string;
      gpsLat?: number;
      gpsLng?: number;
      photoUrl?: string;
    },
    @GetYeriaUser() user?: UserEntity,
    @GetAgentCollector() collector?: any,
  ) {
    return this.yeriaService.validateAgentScannedQR(
      tourTrackingId,
      body,
      user,
      collector,
    );
  }

  // 5. Historique des ramassages effectués
  @ApiOperation({ summary: 'Historique des ramassages' })
  @Get('history')
  getCollectionHistory(@GetAgentCollector() collector: any) {
    return this.yeriaService.getAgentCollectionHistory(collector);
  }

  // 5b. Détail d'un événement de collecte (GAP-09)
  @ApiOperation({ summary: "Détail d'un événement de collecte" })
  @Get('history/:id')
  getCollectionEventDetail(
    @Param('id') id: string,
    @GetAgentCollector() collector: any,
  ) {
    return this.yeriaService.getAgentCollectionEventDetail(id, collector);
  }

  // GAP-23: Confirmation de collecte avec statut (VALIDATED / CANCELLED)
  @ApiOperation({ summary: 'Confirmer le statut de collecte après scan' })
  @Get('scan/:tourTrackingId/confirm')
  getConfirmCollectionForm(
    @Param('tourTrackingId') tourTrackingId: string,
    @Body() body: { qrData?: string },
  ) {
    return this.yeriaService.getConfirmCollectionForm(tourTrackingId, body.qrData || '');
  }

  @ApiOperation({ summary: 'Enregistrer le résultat de la collecte' })
  @Post('scan/:tourTrackingId/confirm')
  confirmCollection(
    @Param('tourTrackingId') tourTrackingId: string,
    @Body() body: { collectionStatus?: string; notes?: string; qrData?: string; gpsLat?: number; gpsLng?: number; photoUrl?: string },
    @GetYeriaUser() user: UserEntity,
    @GetAgentCollector() collector: any,
  ) {
    return this.yeriaService.confirmAgentCollection(tourTrackingId, body, user, collector);
  }

  // GAP-24: Signalement d'incident terrain
  @ApiOperation({ summary: "Formulaire de signalement d'incident" })
  @Get('incident')
  getIncidentForm() {
    return this.yeriaService.getAgentIncidentForm();
  }

  @ApiOperation({ summary: "Soumettre un incident" })
  @Post('incident')
  submitIncident(
    @Body() body: { incidentType?: string; description?: string; location?: string },
    @GetYeriaUser() user: UserEntity,
    @GetAgentCollector() collector: any,
  ) {
    return this.yeriaService.submitAgentIncident(body, user, collector);
  }

  // 6. Service d'images direct sous /yeria/agent/:filename pour le mobile Yeria
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
