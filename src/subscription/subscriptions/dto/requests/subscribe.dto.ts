import {
  IsDateString,
  IsLatitude,
  IsLongitude,
  IsNotEmpty,
  IsNumber,
  IsString,
  IsUUID,
} from 'class-validator';

export class SubscribeDto {
  @IsUUID()
  offerTrackingId: string;

  @IsString()
  @IsNotEmpty()
  addressText: string;

  @IsNumber()
  @IsLatitude()
  latitude: number;

  @IsNumber()
  @IsLongitude()
  longitude: number;

  @IsDateString()
  startDate: string;
}
