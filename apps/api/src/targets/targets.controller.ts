import { Body, Controller, Delete, Get, HttpCode, Param, Put, Query, Req, UseGuards } from '@nestjs/common'
import { AuthGuard, type AuthedRequest } from '../auth/auth.guard'
import { Roles, RolesGuard } from '../auth/roles.guard'
import { ListTargetsDto, SetTargetDto } from './dto'
import { TargetsService } from './targets.service'

@Controller('targets')
@UseGuards(AuthGuard, RolesGuard)
export class TargetsController {
  constructor(private readonly targets: TargetsService) {}

  /** Open to everyone: a salesperson reads their own number here, and the
   *  unit's, which is the context that makes their share mean anything. */
  @Get()
  list(@Req() req: AuthedRequest, @Query() query: ListTargetsDto) {
    return this.targets.list(req.user!, query)
  }

  /** PUT rather than POST: setting a quarter is idempotent, and allocating is
   *  an iterative conversation that revises the same number. */
  @Put()
  @Roles('bm')
  set(@Req() req: AuthedRequest, @Body() body: SetTargetDto) {
    return this.targets.set(req.user!, body)
  }

  @Delete(':id')
  @Roles('bm')
  @HttpCode(204)
  remove(@Req() req: AuthedRequest, @Param('id') id: string) {
    return this.targets.remove(req.user!, id)
  }
}
