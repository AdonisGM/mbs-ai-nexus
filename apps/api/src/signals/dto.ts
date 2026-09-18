import { Transform, Type } from 'class-transformer'
import { IsIn, IsInt, IsISO8601, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator'
import { SIGNAL_TYPES } from '../db/schema'

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value

export class ListSignalsDto {
  @IsOptional()
  @IsIn(SIGNAL_TYPES)
  type?: string

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number
}

export class CreateSignalDto {
  @IsIn(SIGNAL_TYPES, { message: 'type_invalid' })
  type!: string

  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'content_required' })
  @MaxLength(1000)
  content!: string

  /** When it was observed, which is not when it was typed up. A meeting on
   *  Friday entered on Monday has to sort by the Friday. Defaults to now. */
  @IsOptional()
  @IsISO8601({}, { message: 'observed_at_invalid' })
  observedAt?: string

  /** The salesperson's own sentence, kept verbatim as the evidence behind
   *  anything inferred from it later. */
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(4000)
  rawNote?: string
}
