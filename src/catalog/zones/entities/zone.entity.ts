export class ZoneCollectorSummary {
  trackingId: string;
  companyName: string;
}

export class ZoneEntity {
  trackingId: string;
  name: string;
  city: string;
  geojson: Record<string, any>;
  isActive: boolean;
  collectors?: ZoneCollectorSummary[];
  createdAt: Date;
  updatedAt: Date;

  constructor(partial: Partial<ZoneEntity>) {
    Object.assign(this, partial);
  }
}
