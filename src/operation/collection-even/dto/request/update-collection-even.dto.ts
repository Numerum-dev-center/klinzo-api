import { PartialType } from '@nestjs/swagger';
import { CreateCollectionEvenDto } from './create-collection-even.dto';

export class UpdateCollectionEvenDto extends PartialType(CreateCollectionEvenDto) {}
