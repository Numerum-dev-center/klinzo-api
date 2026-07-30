import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsString } from 'class-validator';

export class ConfirmTransactionDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  paymentGatewayRef: string;

  @ApiProperty({ enum: ['SUCCESS', 'FAILED'] })
  @IsString()
  @IsNotEmpty()
  @IsIn(['SUCCESS', 'FAILED'])
  status: string;
}
