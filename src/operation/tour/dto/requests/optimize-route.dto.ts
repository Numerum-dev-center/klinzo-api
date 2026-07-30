import { ApiProperty } from '@nestjs/swagger';
import { ArrayNotEmpty, IsArray, IsString } from 'class-validator';

export class OptimizeRouteDto {
  @ApiProperty({ description: 'List of Subscription tracking IDs to optimize' })
  @IsArray()
  @IsString({ each: true })
  @ArrayNotEmpty()
  subscriptionTrackingIds: string[];
}
