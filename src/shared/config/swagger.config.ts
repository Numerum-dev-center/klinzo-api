import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export function setupSwagger(app: INestApplication): void {
  const options = new DocumentBuilder()
    .setTitle('SaaS Déchets API')
    .setDescription(
      `Cette API est le cœur d'une plateforme SaaS multi-tenant conçue pour structurer, digitaliser et professionnaliser le secteur de la collecte des déchets en milieu urbain. Développée selon les principes du Domain-Driven Design (DDD), elle connecte les usagers, les entreprises de collecte (collecteurs) et les agents de terrain.

Le système agit comme un intermédiaire de confiance garantissant la solvabilité (paiement mobile money intégré), la traçabilité (géolocalisation PostGIS, scan de QR codes) et la transparence (système de notation des collecteurs).`,
    )
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, options);
  SwaggerModule.setup('api/docs', app, document);
}
