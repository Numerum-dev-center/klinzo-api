import { IsEmail, IsString, Matches, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @IsEmail()
  email: string;

  @Matches(/^\d{6}$/, { message: 'Le code doit contenir 6 chiffres.' })
  code: string;

  @IsString()
  @MinLength(8)
  password: string;
}
