import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateTourDto {
  @ApiProperty({ description: 'Tracking ID of the vehicle' })
  @IsString()
  @IsNotEmpty()
  vehicleTrackingId: string;

  @ApiProperty({ description: 'Scheduled date of the tour in ISO format' })
  @IsDateString()
  @IsNotEmpty()
  scheduledDate: string;

  @ApiPropertyOptional({
    description: 'Reference for the tour. If omitted, will be auto-generated.',
  })
  @IsString()
  @IsOptional()
  reference?: string;
}
