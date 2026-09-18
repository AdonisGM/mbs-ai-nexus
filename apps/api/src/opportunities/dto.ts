import { Transform, Type } from 'class-transformer'
import {
  IsArray,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator'
import { APPROVAL_STATUSES, BLOCKER_CODES, SEGMENTS, STAGES } from '../db/schema'

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value

export class ListOpportunitiesDto {
  @IsOptional()
  @IsIn(SEGMENTS)
  segment?: string

  @IsOptional()
  @IsIn(STAGES)
  stage?: string

  @IsOptional()
  @IsIn(APPROVAL_STATUSES)
  approvalStatus?: string

  @IsOptional()
  @IsString()
  ownerId?: string

  @IsOptional()
  @IsString()
  customerId?: string

  /** Only what is waiting on the caller, for "today's priorities". */
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  mine?: boolean

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number
}

export class CreateOpportunityDto {
  @IsString()
  @IsNotEmpty({ message: 'customer_required' })
  customerId!: string

  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'product_required' })
  @MaxLength(200)
  product!: string

  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'need_required' })
  @MaxLength(500)
  need!: string

  @Type(() => Number)
  @IsInt()
  @Min(1, { message: 'value_must_be_positive' })
  value!: number

  @IsOptional()
  @IsIn(STAGES)
  stage?: string

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  winProbability?: number

  /** YYYY-MM-DD. A deadline is a day, not an instant. */
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'due_date_invalid' })
  dueDate?: string

  @IsOptional()
  @IsIn(BLOCKER_CODES)
  blockerCode?: string

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(1000)
  blockerNote?: string

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(1000)
  nextAction?: string

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(1000)
  supportNeeded?: string

  @IsOptional()
  @IsObject()
  confirmedData?: Record<string, unknown>

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  missingInfo?: string[]
}

/** Editing never changes the customer or the approval status: the first would
 *  move a deal into another pipeline mid-approval, and the second is only ever
 *  a consequence of pressing a button. */
export class UpdateOpportunityDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  product?: string

  @IsOptional()
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  need?: string

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1, { message: 'value_must_be_positive' })
  value?: number

  @IsOptional()
  @IsIn(STAGES)
  stage?: string

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  winProbability?: number

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'due_date_invalid' })
  dueDate?: string

  @IsOptional()
  @IsIn(BLOCKER_CODES)
  blockerCode?: string

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(1000)
  blockerNote?: string

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(1000)
  nextAction?: string

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(1000)
  supportNeeded?: string

  @IsOptional()
  @IsObject()
  confirmedData?: Record<string, unknown>

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  missingInfo?: string[]

  /** Why the edit was made. Optional here — the approval moves are where a
   *  reason is compulsory. */
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(1000)
  reason?: string
}

/** The body behind a button. Which fields matter depends on the button, and
 *  the service says so rather than the shape: `send_back` needs a reason and
 *  usually `missingInfo`, `decide` carries what the branch manager granted. */
export class ActDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(1000)
  reason?: string

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  missingInfo?: string[]

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(1000)
  nextAction?: string

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'due_date_invalid' })
  dueDate?: string

  /** What the branch manager granted, e.g. a rate concession. */
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(1000)
  bmDecision?: string

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  winProbability?: number
}
