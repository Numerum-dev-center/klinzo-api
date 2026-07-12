import { IsString, IsEmail, IsEnum, IsNotEmpty, IsOptional } from 'class-validator';
import { CollectorType } from '../../entities/enums/collector-type.enum';

export class CreateCollectorDto {
  @IsString()
  @IsNotEmpty()
  companyName: string;

  @IsString()
  @IsNotEmpty()
  registrationNumber: string;

  @IsEmail()
  @IsNotEmpty()
  contactEmail: string;

  @IsString()
  @IsNotEmpty()
  contactPhone: string;

  @IsEnum(CollectorType)
  @IsNotEmpty()
  type: CollectorType;

  @IsString()
  @IsNotEmpty()
  adresse: string;

  @IsString()
  @IsOptional()
  payoutAccount?: string;
}
