import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';

export class PageOptionsDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  readonly page?: number = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  readonly size?: number = 10;

  get skip(): number {
    return (this.page! - 1) * this.size!;
  }
}
