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

  get pageNumber(): number {
    return this.toPositiveInteger(this.page, 1);
  }

  get take(): number {
    return this.toPositiveInteger(this.size, 10);
  }

  get skip(): number {
    return (this.pageNumber - 1) * this.take;
  }

  private toPositiveInteger(value: unknown, fallback: number): number {
    const numberValue = Number(value ?? fallback);
    return Number.isInteger(numberValue) && numberValue > 0
      ? numberValue
      : fallback;
  }
}
