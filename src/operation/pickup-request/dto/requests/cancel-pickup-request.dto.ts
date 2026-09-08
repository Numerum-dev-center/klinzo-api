import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CancelPickupRequestDto {
  @ApiPropertyOptional({ description: "Motif d'annulation" })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
