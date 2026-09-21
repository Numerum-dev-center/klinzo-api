import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class RejectCollectorApplicationDto {
  @IsString() @IsNotEmpty() @MaxLength(500) reason: string;
}
