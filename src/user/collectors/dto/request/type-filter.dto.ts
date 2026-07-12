import { IsEnum, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PageOptionsDto } from '../../../../shared/pagination/dto/page-options.dto';
import { CollectorType } from '../../entities/enums/collector-type.enum';

export class TypeFilterDto extends PageOptionsDto {
  @ApiProperty({ enum: CollectorType, description: 'Le type de collecteur recherché (ex: COMPANY)' })
  @IsEnum(CollectorType)
  @IsNotEmpty()
  type: CollectorType;
}
