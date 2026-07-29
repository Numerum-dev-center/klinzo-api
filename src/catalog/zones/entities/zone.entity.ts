export class ZoneEntity {
  trackingId: string;
  name: string;
  city: string;
  geojson: Record<string, any>;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;

  constructor(partial: Partial<ZoneEntity>) {
    Object.assign(this, partial);
  }
}
