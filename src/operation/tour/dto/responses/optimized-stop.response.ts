import { ApiProperty } from '@nestjs/swagger';

export class OptimizedStopResponse {
  @ApiProperty()
  subscriptionTrackingId: string;

  @ApiProperty()
  addressText: string;

  @ApiProperty()
  order: number;

  constructor(partial: Partial<OptimizedStopResponse>) {
    Object.assign(this, partial);
  }
}
