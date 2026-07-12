import {
  IsString,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  MinLength,
  IsEnum,
} from 'class-validator';
import { Role } from '@prisma/client';

export class CreateUserByAdminDto {
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsEmail()
  email: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsEnum(Role)
  @IsNotEmpty()
  role: Role;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
