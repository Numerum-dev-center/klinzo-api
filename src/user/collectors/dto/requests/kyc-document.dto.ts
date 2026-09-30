import { KycDocumentType } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class KycDocumentDto {
  @IsEnum(KycDocumentType)
  type: KycDocumentType;
}
