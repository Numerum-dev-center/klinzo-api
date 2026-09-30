import { IsEnum, IsOptional } from 'class-validator';
import { FinancialDocumentType } from '@prisma/client';
import { PageOptionsDto } from '../../../../shared/pagination/dto/requests/page-options.dto';

export class FinancialDocumentPageOptionsDto extends PageOptionsDto {
  @IsEnum(FinancialDocumentType)
  @IsOptional()
  readonly type?: FinancialDocumentType;
}
