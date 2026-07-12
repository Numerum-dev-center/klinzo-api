import { PartialType } from '@nestjs/mapped-types';
import { CreateCollectorDto } from './create-collector.dto';
import { IsEnum, IsOptional, IsBoolean } from 'class-validator';
import { KycStatus } from '../../entities/enums/kyc-status.enum';

export class UpdateCollectorDto extends PartialType(CreateCollectorDto) {
  @IsEnum(KycStatus)
  @IsOptional()
  kycStatus?: KycStatus;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
