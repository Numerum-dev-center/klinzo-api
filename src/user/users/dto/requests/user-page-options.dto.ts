import { IsEnum, IsOptional, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';
import { Role } from '@prisma/client';
import { PageOptionsDto } from '../../../../shared/pagination/dto/requests/page-options.dto';

export class UserPageOptionsDto extends PageOptionsDto {
  @IsEnum(Role)
  @IsOptional()
  readonly role?: Role;

  @IsOptional()
  readonly search?: string;

  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return undefined;
  })
  @IsBoolean()
  @IsOptional()
  readonly isActive?: boolean;
}
