import 'dotenv/config';
import {
  PrismaClient,
  Role,
  KycStatus,
  CollectorType,
  SubscriptionStatus,
  TourStatus,
  CollectionStatus,
  PickupRequestStatus,
  FinancialDocumentType,
  FinancialDocumentStatus,
  CommunicationChannel,
  CommunicationCampaignStatus,
  BankStatementLineStatus,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Démarrage de l’enrichissement complet de la base de données...');

  const defaultPassword = 'Password123!';
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(defaultPassword, salt);

  const adminEmail = process.env.SUPER_ADMIN_EMAIL || 'admin@votre-saas.com';
  const adminPassword = process.env.SUPER_ADMIN_PASSWORD || 'MotDePasseTresSecurise123!';
  const hashedAdminPassword = await bcrypt.hash(adminPassword, salt);

  // 1. Super Admin & Gestionnaires SaaS
  const superAdmin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      password: hashedAdminPassword,
      role: Role.SUPER_ADMIN_SAAS,
      isActive: true,
      emailVerified: true,
    },
    create: {
      firstName: 'Super',
      lastName: 'Admin',
      email: adminEmail,
      phone: '+2250700000001',
      password: hashedAdminPassword,
      role: Role.SUPER_ADMIN_SAAS,
      emailVerified: true,
      isActive: true,
    },
  });

  const gestionnaire = await prisma.user.upsert({
    where: { email: 'gestionnaire@klinzo.ci' },
    update: { role: Role.GESTIONNAIRE_SAAS, isActive: true },
    create: {
      firstName: 'Awa',
      lastName: 'Diabaté',
      email: 'gestionnaire@klinzo.ci',
      phone: '+2250700000002',
      password: hashedPassword,
      role: Role.GESTIONNAIRE_SAAS,
      emailVerified: true,
      isActive: true,
    },
  });

  console.log('✅ Administrateurs SaaS configurés.');

  // 2. Collecteurs (Entreprises & Associations de collecte)
  const collector1 = await prisma.collector.upsert({
    where: { trackingId: '11111111-1111-4111-8111-111111111111' },
    update: {
      companyName: 'Eco-Propre Abidjan',
      kycStatus: KycStatus.APPROVED,
      ratingAverage: 4.8,
      isActive: true,
    },
    create: {
      trackingId: '11111111-1111-4111-8111-111111111111',
      companyName: 'Eco-Propre Abidjan',
      registrationNumber: 'CI-ABJ-2024-B-1289',
      contactEmail: 'contact@ecopropre.ci',
      contactPhone: '+2250708091011',
      type: CollectorType.COMPANY,
      adresse: 'Cocody Vallon, Rue des Jardins, Abidjan',
      kycStatus: KycStatus.APPROVED,
      ratingAverage: 4.8,
      payoutAccount: 'CI092 01001 02345678901 22',
      isActive: true,
    },
  });

  const collector2 = await prisma.collector.upsert({
    where: { trackingId: '22222222-2222-4222-8222-222222222222' },
    update: {
      companyName: 'Klinzo Express Services',
      kycStatus: KycStatus.APPROVED,
      ratingAverage: 4.5,
      isActive: true,
    },
    create: {
      trackingId: '22222222-2222-4222-8222-222222222222',
      companyName: 'Klinzo Express Services',
      registrationNumber: 'CI-ABJ-2023-B-8762',
      contactEmail: 'direction@klinzo-express.ci',
      contactPhone: '+2250505123456',
      type: CollectorType.COMPANY,
      adresse: 'Marcory Zone 4C, Boulevard de Marseille',
      kycStatus: KycStatus.APPROVED,
      ratingAverage: 4.5,
      payoutAccount: 'CI092 01002 09876543210 44',
      isActive: true,
    },
  });

  const collector3Pending = await prisma.collector.upsert({
    where: { trackingId: '33333333-3333-4333-8333-333333333333' },
    update: {
      kycStatus: KycStatus.PENDING_REVIEW,
    },
    create: {
      trackingId: '33333333-3333-4333-8333-333333333333',
      companyName: 'BioRecycle Yopougon',
      registrationNumber: 'CI-YOP-2025-A-4431',
      contactEmail: 'contact@biorecycle-yop.ci',
      contactPhone: '+2250102030405',
      type: CollectorType.ASSOCIATION,
      adresse: 'Yopougon Selmer, Abidjan',
      kycStatus: KycStatus.PENDING_REVIEW,
      ratingAverage: 0.0,
      payoutAccount: 'CI092 01003 01122334455 66',
      isActive: true,
    },
  });

  console.log('✅ Collecteurs créés.');

  // 3. Utilisateurs Collecteurs (Admin collecteur et Agents de terrain)
  const adminCollecteur1 = await prisma.user.upsert({
    where: { email: 'admin@ecopropre.ci' },
    update: { collectorId: collector1.id, role: Role.ADMIN_COLLECTEUR },
    create: {
      firstName: 'Koffi',
      lastName: 'Yao',
      email: 'admin@ecopropre.ci',
      phone: '+2250708091011',
      password: hashedPassword,
      role: Role.ADMIN_COLLECTEUR,
      collectorId: collector1.id,
      emailVerified: true,
      isActive: true,
    },
  });

  const agentTerrain1 = await prisma.user.upsert({
    where: { email: 'agent1@klinzo.ci' },
    update: { collectorId: collector1.id, role: Role.AGENT_COLLECTEUR },
    create: {
      firstName: 'Bakary',
      lastName: 'Koné',
      email: 'agent1@klinzo.ci',
      phone: '+2250707778899',
      password: hashedPassword,
      role: Role.AGENT_COLLECTEUR,
      collectorId: collector1.id,
      emailVerified: true,
      isActive: true,
    },
  });

  console.log('✅ Comptes équipes collecteurs créés.');

  // 4. Véhicules de collecte
  const vehicle1 = await prisma.vehicle.upsert({
    where: { matricule: 'CAM-001-CI' },
    update: { collectorId: collector1.id, isActive: true },
    create: {
      matricule: 'CAM-001-CI',
      licensePlate: '1245-HA-01',
      type: 'Benne tasseuse 16m3',
      capacity: 16,
      collectorId: collector1.id,
      isActive: true,
    },
  });

  const vehicle2 = await prisma.vehicle.upsert({
    where: { matricule: 'TRIC-002-CI' },
    update: { collectorId: collector1.id, isActive: true },
    create: {
      matricule: 'TRIC-002-CI',
      licensePlate: '8832-JG-01',
      type: 'Tricycle motorisé 2m3',
      capacity: 2,
      collectorId: collector1.id,
      isActive: true,
    },
  });

  const vehicle3 = await prisma.vehicle.upsert({
    where: { matricule: 'CAM-003-CI' },
    update: { collectorId: collector2.id, isActive: true },
    create: {
      matricule: 'CAM-003-CI',
      licensePlate: '6574-KK-01',
      type: 'Camion benne 10m3',
      capacity: 10,
      collectorId: collector2.id,
      isActive: true,
    },
  });

  console.log('✅ Véhicules créés.');

  // 5. Zones géographiques avec polygones PostGIS
  // Zone 1: Cocody
  const existingZoneCocody = await prisma.zone.findFirst({ where: { name: 'Zone Cocody - Riviera' } });
  let zoneCocodyId: bigint;
  if (!existingZoneCocody) {
    const res = await prisma.$queryRaw<any[]>`
      INSERT INTO "Zone" ("trackingId", name, city, "updatedAt", "polygonPostgis")
      VALUES (
        gen_random_uuid(),
        'Zone Cocody - Riviera',
        'Abidjan',
        NOW(),
        ST_SetSRID(ST_GeomFromGeoJSON('{"type":"Polygon","coordinates":[[[-4.00,5.33],[-3.95,5.33],[-3.95,5.38],[-4.00,5.38],[-4.00,5.33]]]}'), 4326)
      ) RETURNING id;
    `;
    zoneCocodyId = res[0].id;
  } else {
    zoneCocodyId = existingZoneCocody.id;
  }

  // Zone 2: Marcory
  const existingZoneMarcory = await prisma.zone.findFirst({ where: { name: 'Zone Marcory - Biétry' } });
  let zoneMarcoryId: bigint;
  if (!existingZoneMarcory) {
    const res = await prisma.$queryRaw<any[]>`
      INSERT INTO "Zone" ("trackingId", name, city, "updatedAt", "polygonPostgis")
      VALUES (
        gen_random_uuid(),
        'Zone Marcory - Biétry',
        'Abidjan',
        NOW(),
        ST_SetSRID(ST_GeomFromGeoJSON('{"type":"Polygon","coordinates":[[[-4.02,5.28],[-3.97,5.28],[-3.97,5.31],[-4.02,5.31],[-4.02,5.28]]]}'), 4326)
      ) RETURNING id;
    `;
    zoneMarcoryId = res[0].id;
  } else {
    zoneMarcoryId = existingZoneMarcory.id;
  }

  // Assignation Collecteur <-> Zones
  await prisma.collectorZone.upsert({
    where: { collectorId_zoneId: { collectorId: collector1.id, zoneId: zoneCocodyId } },
    update: {},
    create: { collectorId: collector1.id, zoneId: zoneCocodyId },
  });

  await prisma.collectorZone.upsert({
    where: { collectorId_zoneId: { collectorId: collector2.id, zoneId: zoneMarcoryId } },
    update: {},
    create: { collectorId: collector2.id, zoneId: zoneMarcoryId },
  });

  console.log('✅ Zones géographiques PostGIS et assignations créées.');

  // 6. Offres d'abonnement
  const offer1 = await prisma.offer.upsert({
    where: { trackingId: '44444444-4444-4444-8444-444444444444' },
    update: { price: 15000, isActive: true },
    create: {
      trackingId: '44444444-4444-4444-8444-444444444444',
      name: 'Abonnement Résidentiel Standard (3x / sem)',
      price: 15000,
      frequency: '3_FOIS_PAR_SEMAINE',
      wasteType: 'MENAGER',
      collectorId: collector1.id,
      zoneId: zoneCocodyId,
      isActive: true,
    },
  });

  const offer2 = await prisma.offer.upsert({
    where: { trackingId: '55555555-5555-4555-8555-555555555555' },
    update: { price: 35000, isActive: true },
    create: {
      trackingId: '55555555-5555-4555-8555-555555555555',
      name: 'Abonnement Premium Restauration & Commerce',
      price: 35000,
      frequency: 'QUOTIDIEN',
      wasteType: 'COMMERCIAL_ET_ORGANIQUE',
      collectorId: collector1.id,
      zoneId: zoneCocodyId,
      isActive: true,
    },
  });

  const offer3 = await prisma.offer.upsert({
    where: { trackingId: '66666666-6666-4666-8666-666666666666' },
    update: { price: 12000, isActive: true },
    create: {
      trackingId: '66666666-6666-4666-8666-666666666666',
      name: 'Pack Éco Famille Marcory (2x / sem)',
      price: 12000,
      frequency: '2_FOIS_PAR_SEMAINE',
      wasteType: 'MENAGER',
      collectorId: collector2.id,
      zoneId: zoneMarcoryId,
      isActive: true,
    },
  });

  console.log('✅ Catalogue des offres configuré.');

  // 7. Usagers (Ménages & Entreprises clientes)
  const usager1 = await prisma.user.upsert({
    where: { email: 'jean.kouassi@test.ci' },
    update: { password: hashedPassword, role: Role.USAGER, isActive: true },
    create: {
      firstName: 'Jean',
      lastName: 'Kouassi',
      email: 'jean.kouassi@test.ci',
      phone: '+2250709887766',
      password: hashedPassword,
      role: Role.USAGER,
      emailVerified: true,
      isActive: true,
    },
  });

  const usager2 = await prisma.user.upsert({
    where: { email: 'marie.bamba@test.ci' },
    update: { password: hashedPassword, role: Role.USAGER, isActive: true },
    create: {
      firstName: 'Marie',
      lastName: 'Bamba',
      email: 'marie.bamba@test.ci',
      phone: '+2250504332211',
      password: hashedPassword,
      role: Role.USAGER,
      emailVerified: true,
      isActive: true,
    },
  });

  const usager3 = await prisma.user.upsert({
    where: { email: 'restaurant.lagune@abidjan.ci' },
    update: { password: hashedPassword, role: Role.USAGER, isActive: true },
    create: {
      firstName: 'Paul',
      lastName: 'Touré',
      email: 'restaurant.lagune@abidjan.ci',
      phone: '+2250102998877',
      password: hashedPassword,
      role: Role.USAGER,
      emailVerified: true,
      isActive: true,
    },
  });

  console.log('✅ Usagers clients créés.');

  // 8. Souscriptions actives avec localisation PostGIS (ST_MakePoint)
  const existingSub1 = await prisma.subscription.findFirst({ where: { qrCodeId: 'QR-KLINZO-COC-001' } });
  let sub1Id: bigint;
  if (!existingSub1) {
    const res = await prisma.$queryRaw<any[]>`
      INSERT INTO "Subscription" (
        "trackingId", "qrCodeId", "gpsLocation", "addressText", "status",
        "startDate", "nextBillingDate", "userId", "offerId", "createdAt", "updatedAt"
      ) VALUES (
        gen_random_uuid(),
        'QR-KLINZO-COC-001',
        ST_SetSRID(ST_MakePoint(-3.9782, 5.3564), 4326)::geography,
        'Villa 42, Riviera Bonoumin, Cocody',
        'ACTIVE'::"SubscriptionStatus",
        NOW() - INTERVAL '30 days',
        NOW() + INTERVAL '30 days',
        ${usager1.id},
        ${offer1.id},
        NOW() - INTERVAL '30 days',
        NOW()
      ) RETURNING id;
    `;
    sub1Id = res[0].id;
  } else {
    sub1Id = existingSub1.id;
  }

  const existingSub2 = await prisma.subscription.findFirst({ where: { qrCodeId: 'QR-KLINZO-COC-002' } });
  let sub2Id: bigint;
  if (!existingSub2) {
    const res = await prisma.$queryRaw<any[]>`
      INSERT INTO "Subscription" (
        "trackingId", "qrCodeId", "gpsLocation", "addressText", "status",
        "startDate", "nextBillingDate", "userId", "offerId", "createdAt", "updatedAt"
      ) VALUES (
        gen_random_uuid(),
        'QR-KLINZO-COC-002',
        ST_SetSRID(ST_MakePoint(-3.9850, 5.3620), 4326)::geography,
        'Résidence Les Palmiers, Riviera 3, Cocody',
        'ACTIVE'::"SubscriptionStatus",
        NOW() - INTERVAL '15 days',
        NOW() + INTERVAL '15 days',
        ${usager2.id},
        ${offer1.id},
        NOW() - INTERVAL '15 days',
        NOW()
      ) RETURNING id;
    `;
    sub2Id = res[0].id;
  } else {
    sub2Id = existingSub2.id;
  }

  const existingSub3 = await prisma.subscription.findFirst({ where: { qrCodeId: 'QR-KLINZO-MAR-003' } });
  let sub3Id: bigint;
  if (!existingSub3) {
    const res = await prisma.$queryRaw<any[]>`
      INSERT INTO "Subscription" (
        "trackingId", "qrCodeId", "gpsLocation", "addressText", "status",
        "startDate", "nextBillingDate", "userId", "offerId", "createdAt", "updatedAt"
      ) VALUES (
        gen_random_uuid(),
        'QR-KLINZO-MAR-003',
        ST_SetSRID(ST_MakePoint(-3.9912, 5.2954), 4326)::geography,
        'Restaurant La Lagune, Zone 4C, Marcory',
        'ACTIVE'::"SubscriptionStatus",
        NOW() - INTERVAL '60 days',
        NOW() + INTERVAL '30 days',
        ${usager3.id},
        ${offer3.id},
        NOW() - INTERVAL '60 days',
        NOW()
      ) RETURNING id;
    `;
    sub3Id = res[0].id;
  } else {
    sub3Id = existingSub3.id;
  }

  console.log('✅ Souscriptions et localisations GPS créées.');

  // 9. Tournées de collecte (Tours)
  const tourAujourdhui = await prisma.tour.upsert({
    where: { reference: 'TRN-2026-0909-01' },
    update: { status: TourStatus.IN_PROGRESS },
    create: {
      reference: 'TRN-2026-0909-01',
      scheduledDate: new Date(),
      actualStartTime: new Date(Date.now() - 2 * 3600 * 1000),
      status: TourStatus.IN_PROGRESS,
      vehicleId: vehicle1.id,
    },
  });

  const tourHier = await prisma.tour.upsert({
    where: { reference: 'TRN-2026-0908-01' },
    update: { status: TourStatus.COMPLETED },
    create: {
      reference: 'TRN-2026-0908-01',
      scheduledDate: new Date(Date.now() - 24 * 3600 * 1000),
      actualStartTime: new Date(Date.now() - 26 * 3600 * 1000),
      actualEndTime: new Date(Date.now() - 22 * 3600 * 1000),
      status: TourStatus.COMPLETED,
      vehicleId: vehicle1.id,
    },
  });

  console.log('✅ Tournées de collecte créées.');

  // 10. Événements de collecte (Passages avec preuve QR code et validation)
  const existingEventsCount = await prisma.collectionEvent.count();
  let event1Id: bigint;
  if (existingEventsCount === 0) {
    const res1 = await prisma.$queryRaw<any[]>`
      INSERT INTO "CollectionEvent" (
        "trackingId", "createdAt", "updatedAt", "status", "executedAt",
        "qrScanData", "autoValidationDeadline", "tourId", "subscriptionId", "gpsProof"
      ) VALUES (
        gen_random_uuid(),
        NOW() - INTERVAL '1 day',
        NOW() - INTERVAL '1 day',
        'VALIDATED'::"CollectionStatus",
        NOW() - INTERVAL '1 day',
        'QR-KLINZO-COC-001',
        NOW() + INTERVAL '1 day',
        ${tourHier.id},
        ${sub1Id},
        ST_SetSRID(ST_MakePoint(-3.9782, 5.3564), 4326)
      ) RETURNING id;
    `;
    event1Id = res1[0].id;

    await prisma.$queryRaw<any[]>`
      INSERT INTO "CollectionEvent" (
        "trackingId", "createdAt", "updatedAt", "status", "executedAt",
        "qrScanData", "autoValidationDeadline", "tourId", "subscriptionId", "gpsProof"
      ) VALUES (
        gen_random_uuid(),
        NOW() - INTERVAL '1 hour',
        NOW() - INTERVAL '1 hour',
        'PENDING'::"CollectionStatus",
        NOW() - INTERVAL '1 hour',
        'QR-KLINZO-COC-002',
        NOW() + INTERVAL '47 hours',
        ${tourAujourdhui.id},
        ${sub2Id},
        ST_SetSRID(ST_MakePoint(-3.9850, 5.3620), 4326)
      );
    `;

    // Avis / Notation
    await prisma.rating.create({
      data: {
        score: 5,
        comment: 'Collecte ponctuelle, bac bien nettoyé et remis en place.',
        collectorId: collector1.id,
        userId: usager1.id,
        collectionEventId: event1Id,
      },
    });
  }

  console.log('✅ Événements de collecte et notations créés.');

  // 11. Demandes d'enlèvements ponctuels (Encombrants, déchets verts, gravats)
  await prisma.pickupRequest.upsert({
    where: { trackingId: '77777777-7777-4777-8777-777777777777' },
    update: { status: PickupRequestStatus.SCHEDULED },
    create: {
      trackingId: '77777777-7777-4777-8777-777777777777',
      wasteType: 'ENCOMBRANTS_ELECTROMENAGER',
      addressText: 'Rue des Jardins, Immeuble Horizon 3ème étage, Cocody',
      latitude: 5.3589,
      longitude: -3.9812,
      preferredDate: new Date(Date.now() + 48 * 3600 * 1000),
      scheduledDate: new Date(Date.now() + 48 * 3600 * 1000),
      estimatedPrice: 20000,
      finalPrice: 20000,
      notes: 'Ancien réfrigérateur et machine à laver à évacuer.',
      status: PickupRequestStatus.SCHEDULED,
      userId: usager1.id,
      collectorId: collector1.id,
    },
  });

  await prisma.pickupRequest.upsert({
    where: { trackingId: '88888888-8888-4888-8888-888888888888' },
    update: {},
    create: {
      trackingId: '88888888-8888-4888-8888-888888888888',
      wasteType: 'DECHETS_VERTS_ELAGAGE',
      addressText: 'Boulevard de Marseille, Zone 4C, Marcory',
      latitude: 5.2921,
      longitude: -3.9901,
      preferredDate: new Date(Date.now() + 24 * 3600 * 1000),
      estimatedPrice: 25000,
      notes: 'Branchages issus de l élagage des palmiers du jardin.',
      status: PickupRequestStatus.NEW,
      userId: usager3.id,
      collectorId: collector2.id,
    },
  });

  console.log('✅ Demandes d’enlèvement ponctuels créées.');

  // 12. Documents financiers & Relevés bancaires
  const financialDoc1 = await prisma.financialDocument.upsert({
    where: { trackingId: '99999999-9999-4999-8999-999999999999' },
    update: { status: FinancialDocumentStatus.PAID },
    create: {
      trackingId: '99999999-9999-4999-8999-999999999999',
      type: FinancialDocumentType.PAYOUT,
      status: FinancialDocumentStatus.PAID,
      collectorId: collector1.id,
      periodStart: new Date(Date.now() - 30 * 24 * 3600 * 1000),
      periodEnd: new Date(),
      amount: 450000,
      dueDate: new Date(),
      settledAt: new Date(),
      metadata: { period: 'Août 2026', totalCollections: 142, commissionRate: 0.1 },
    },
  });

  // Transaction de paiement
  const trans1 = await prisma.transaction.upsert({
    where: { trackingId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' },
    update: { status: 'SUCCESS' },
    create: {
      trackingId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      amount: 15000,
      platformCommission: 1500,
      paymentGatewayRef: 'PAY-CI-WAVE-98762',
      status: 'SUCCESS',
      subscriptionId: sub1Id,
      financialDocumentId: financialDoc1.id,
    },
  });

  // Ligne de relevé bancaire pour le module de réconciliation
  await prisma.bankStatementLine.upsert({
    where: { trackingId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' },
    update: { status: BankStatementLineStatus.MATCHED },
    create: {
      trackingId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      statementDate: new Date(),
      label: 'VIR WAVE RETRAIT CLIENT REF PAY-CI-WAVE-98762',
      amount: 15000,
      reference: 'PAY-CI-WAVE-98762',
      source: 'WAVE_BUSINESS_CI',
      status: BankStatementLineStatus.MATCHED,
      transactionId: trans1.id,
      matchedAt: new Date(),
    },
  });

  await prisma.bankStatementLine.upsert({
    where: { trackingId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc' },
    update: {},
    create: {
      trackingId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
      statementDate: new Date(),
      label: 'VIR ORANGE MONEY CI 0709887766 SOUSCRIPTION',
      amount: 12000,
      reference: 'OM-CI-2026-44321',
      source: 'ORANGE_MONEY',
      status: BankStatementLineStatus.UNMATCHED,
    },
  });

  console.log('✅ Transactions, finances et réconciliation bancaire créées.');

  // 13. Campagnes de communication & Modèles
  const template = await prisma.messageTemplate.upsert({
    where: { trackingId: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd' },
    update: {},
    create: {
      trackingId: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
      name: 'Rappel Passage de Collecte',
      channel: CommunicationChannel.SMS,
      language: 'fr',
      content: 'Bonjour {prenom}, votre passage de collecte Klinzo est prévu demain entre 07h et 11h. Merci de sortir vos bacs.',
      isActive: true,
    },
  });

  await prisma.communicationCampaign.upsert({
    where: { trackingId: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee' },
    update: {},
    create: {
      trackingId: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
      name: 'Rappel Collecte Semaine 37 - Cocody',
      channel: CommunicationChannel.SMS,
      audience: 'Abonnés actifs Cocody',
      status: CommunicationCampaignStatus.SENT,
      sentAt: new Date(),
      templateId: template.id,
      messageSnapshot: template.content,
    },
  });

  console.log('✅ Modèles et campagnes de communication créés.');
  console.log('🎉 Base de données remplie avec succès !');
}

main()
  .catch((e) => {
    console.error('❌ Erreur lors du peuplement de la base :', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
