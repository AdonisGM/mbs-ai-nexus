import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common'
import { AuthGuard, type AuthedRequest } from '../auth/auth.guard'
import { Roles, RolesGuard } from '../auth/roles.guard'
import { ActDto, CreateOpportunityDto, ListOpportunitiesDto, UpdateOpportunityDto } from './dto'
import { OpportunitiesService } from './opportunities.service'
import type { ActionName } from './transitions'

@Controller('opportunities')
@UseGuards(AuthGuard, RolesGuard)
export class OpportunitiesController {
  constructor(private readonly opportunities: OpportunitiesService) {}

  /** `?view=reporting` widens a branch manager's list to everything that feeds
   *  the totals. Everyone else gets the same rows either way. */
  @Get()
  list(
    @Req() req: AuthedRequest,
    @Query() query: ListOpportunitiesDto,
    @Query('view') view?: string,
  ) {
    return this.opportunities.list(
      req.user!,
      query,
      view === 'reporting' ? 'reporting' : 'actionable',
    )
  }

  /** Opening a deal is what marks it seen, so this is a POST rather than the
   *  GET: it writes. The screen calls it once on open. */
  @Post(':id/open')
  @HttpCode(200)
  open(@Req() req: AuthedRequest, @Param('id') id: string) {
    return this.opportunities.markViewed(req.user!, id)
  }

  @Get(':id')
  get(@Req() req: AuthedRequest, @Param('id') id: string) {
    return this.opportunities.get(req.user!, id)
  }

  @Get(':id/history')
  history(@Req() req: AuthedRequest, @Param('id') id: string) {
    return this.opportunities.history(req.user!, id)
  }

  @Post()
  @Roles('sale', 'team_lead')
  create(@Req() req: AuthedRequest, @Body() body: CreateOpportunityDto) {
    return this.opportunities.create(req.user!, body)
  }

  @Patch(':id')
  @Roles('sale', 'team_lead')
  update(
    @Req() req: AuthedRequest,
    @Param('id') id: string,
    @Body() body: UpdateOpportunityDto,
  ) {
    return this.opportunities.update(req.user!, id, body)
  }

  /** One endpoint for every button.
   *
   *  The alternative — a route per action — would put the rules in the routing
   *  table as well as in the transition table, and the two would drift. Here
   *  the action is data and the table is the only thing that decides. */
  @Post(':id/actions/:action')
  @HttpCode(200)
  act(
    @Req() req: AuthedRequest,
    @Param('id') id: string,
    @Param('action') action: string,
    @Body() body: ActDto,
  ) {
    return this.opportunities.act(req.user!, id, action as ActionName, body)
  }
}
