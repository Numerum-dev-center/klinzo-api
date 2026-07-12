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

import { ApiPropertyOptional } from '@nestjs/swagger';

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

  @ApiPropertyOptional({ description: 'ID du collecteur (obligatoire pour ADMIN_COLLECTEUR et AGENT_COLLECTEUR)' })
  @IsString()
  @IsOptional()
  collectorTrackingId?: string;
}
