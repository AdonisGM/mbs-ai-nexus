import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common'
import { AuthGuard, type AuthedRequest } from '../auth/auth.guard'
import { Roles, RolesGuard } from '../auth/roles.guard'
import { CreateSignalDto, ListSignalsDto } from './dto'
import { SignalsService } from './signals.service'

/** Nested under the customer, because a signal has no meaning apart from the
 *  file it belongs to — and routing it this way makes the scope obvious.
 *
 *  There is no PATCH and no DELETE. Correcting an observation means recording
 *  a newer one; see the service. */
@Controller('customers/:customerId/signals')
@UseGuards(AuthGuard, RolesGuard)
export class SignalsController {
  constructor(private readonly signals: SignalsService) {}

  @Get()
  list(
    @Req() req: AuthedRequest,
    @Param('customerId') customerId: string,
    @Query() query: ListSignalsDto,
  ) {
    return this.signals.list(req.user!, customerId, query)
  }

  @Post()
  @Roles('sale', 'team_lead')
  create(
    @Req() req: AuthedRequest,
    @Param('customerId') customerId: string,
    @Body() body: CreateSignalDto,
  ) {
    return this.signals.create(req.user!, customerId, body)
  }
}
