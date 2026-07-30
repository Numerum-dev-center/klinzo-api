import { PartialType } from '@nestjs/mapped-types';
import { CreateSduiDto } from './create-sdui.dto';

export class UpdateSduiDto extends PartialType(CreateSduiDto) {}
