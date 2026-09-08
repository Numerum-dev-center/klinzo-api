import { IsEnum, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PageOptionsDto } from '../../../../shared/pagination/dto/requests/page-options.dto';
import { KycStatus } from '../../entities/enums/kyc-status.enum';

export class KycStatusFilterDto extends PageOptionsDto {
  @ApiProperty({
    enum: KycStatus,
    description: 'Le statut KYC recherché (ex: APPROVED)',
  })
  @IsEnum(KycStatus)
  @IsNotEmpty()
  status: KycStatus;
}
