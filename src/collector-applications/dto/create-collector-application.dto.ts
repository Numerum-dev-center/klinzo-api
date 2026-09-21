import { IsEmail, IsEnum, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { CollectorType } from '@prisma/client';

export class CreateCollectorApplicationDto {
  @IsString() @IsNotEmpty() @MaxLength(150) companyName: string;
  @IsString() @IsNotEmpty() @MaxLength(100) registrationNumber: string;
  @IsEnum(CollectorType) type: CollectorType;
  @IsString() @IsNotEmpty() @MaxLength(255) adresse: string;
  @IsString() @IsNotEmpty() @MaxLength(100) firstName: string;
  @IsString() @IsNotEmpty() @MaxLength(100) lastName: string;
  @IsEmail() contactEmail: string;
  @IsString() @IsNotEmpty() @MaxLength(40) contactPhone: string;
}
