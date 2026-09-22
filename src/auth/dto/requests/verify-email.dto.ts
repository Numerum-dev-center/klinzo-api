import { IsEmail, Matches } from 'class-validator';

export class VerifyEmailDto {
  @IsEmail()
  email: string;

  @Matches(/^\d{4}$/, { message: 'Le code doit contenir 4 chiffres.' })
  code: string;
}
