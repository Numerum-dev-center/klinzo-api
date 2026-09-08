import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PageOptionsDto } from '../../../../shared/pagination/dto/requests/page-options.dto';

export class SearchCollectorDto extends PageOptionsDto {
  @ApiProperty({
    description: 'Mot clé de recherche (nom, email, adresse, etc.)',
  })
  @IsString()
  @IsNotEmpty()
  keyword: string;
}
