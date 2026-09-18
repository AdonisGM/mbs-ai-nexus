import { Transform, Type } from 'class-transformer'
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator'
import { SEGMENTS, TARGET_SCOPES } from '../db/schema'

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value

/** `2026-Q3`. A label rather than a date range: everyone says "quý ba", and a
 *  label groups and sorts correctly as it stands. */
const PERIOD = /^\d{4}-Q[1-4]$/

export class ListTargetsDto {
  @IsOptional()
  @Matches(PERIOD, { message: 'period_invalid' })
  period?: string

  @IsOptional()
  @IsIn(TARGET_SCOPES)
  scope?: string
}

export class SetTargetDto {
  @IsIn(TARGET_SCOPES, { message: 'scope_invalid' })
  scope!: string

  /** Required for a personal target, forbidden on a unit one — a unit number
   *  that also named a person would be counted twice. */
  @IsOptional()
  @IsString()
  ownerId?: string

  /** Narrows a unit target to one segment, so the two teams can be compared.
   *  Omitted means the whole unit. */
  @IsOptional()
  @IsIn(SEGMENTS)
  segment?: string

  @Matches(PERIOD, { message: 'period_invalid' })
  period!: string

  /** Whole đồng. */
  @Type(() => Number)
  @IsInt()
  @Min(1, { message: 'amount_must_be_positive' })
  amount!: number

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(500)
  note?: string
}
