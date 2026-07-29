import { SubscriptionStatus } from '@prisma/client';
import {
  IsString,
  IsNotEmpty,
  IsLatitude,
  IsLongitude,
  IsEnum,
  IsDateString,
  IsNumber,
} from 'class-validator';
import { IsUUID } from 'class-validator';

export class CreateSubscriptionDto {

  @IsString()
  @IsNotEmpty()
  qrCodeId: string;

  @IsNumber()
  @IsLatitude()
  latitude: number;

  @IsNumber()
  @IsLongitude()
  longitude: number;

  @IsString()
  @IsNotEmpty()
  addressText: string;

  @IsEnum(SubscriptionStatus)
  status: SubscriptionStatus;

  @IsDateString()
  startDate: string;

  @IsDateString()
  nextBillingDate: string;

  @IsUUID()
  userTrackingId: string;


  @IsUUID()
  offerTrackingId: string;
}