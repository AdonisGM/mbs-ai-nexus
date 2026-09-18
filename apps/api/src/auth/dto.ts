import { IsNotEmpty, IsString, MaxLength } from 'class-validator'
import { Transform } from 'class-transformer'

export class LoginDto {
  /** Account handle such as SALE-RB-01. Upper-cased on the way in so nobody
   *  fails to log in over a lowercase keyboard. */
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @IsString()
  @IsNotEmpty({ message: 'code_required' })
  @MaxLength(40)
  code!: string

  @IsString()
  @IsNotEmpty({ message: 'password_required' })
  @MaxLength(200)
  password!: string
}
