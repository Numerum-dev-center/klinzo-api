import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class DisputeCollectionEventDto {
  @ApiProperty({ description: 'Reason for the dispute' })
  @IsString()
  @IsNotEmpty()
  disputeReason: string;
}
