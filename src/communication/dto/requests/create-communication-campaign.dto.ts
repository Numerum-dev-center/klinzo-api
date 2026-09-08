import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CommunicationChannel } from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateCommunicationCampaignDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name: string;

  @ApiProperty({ enum: CommunicationChannel })
  @IsEnum(CommunicationChannel)
  channel: CommunicationChannel;

  @ApiProperty({
    description: 'Audience cible: ALL_USERS, COLLECTORS, SUBSCRIBERS, etc.',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  audience: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  templateTrackingId?: string;

  @ApiPropertyOptional({
    description: 'Message libre si aucun modèle n’est utilisé',
  })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  message?: string;
}
