import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsString } from 'class-validator';

export class AssignCollectorsDto {
  @ApiProperty({
    description: 'Tableau des trackingIds des collecteurs à assigner',
  })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty()
  collectorTrackingIds: string[];
}
