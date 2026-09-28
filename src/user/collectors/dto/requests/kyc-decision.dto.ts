import { IsIn, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { KycStatus } from '../../entities/enums/kyc-status.enum';

export class KycDecisionDto {
  @IsIn([KycStatus.APPROVED, KycStatus.REJECTED])
  status: KycStatus.APPROVED | KycStatus.REJECTED;

  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  reason: string;
}
