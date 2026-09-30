import { IsEmail, MaxLength } from 'class-validator';

export class UpdateCollectorApplicationEmailDto {
  @IsEmail()
  @MaxLength(254)
  email: string;
}
