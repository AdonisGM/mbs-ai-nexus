import {
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  NotFoundException,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common'
import { and, desc, eq, ne } from 'drizzle-orm'
import { DB, type Db } from '../db/db.module'
import { sessions } from '../db/schema'
import { AuthGuard, type AuthedRequest } from './auth.guard'

@Controller('auth/sessions')
@UseGuards(AuthGuard)
export class SessionsController {
  constructor(@Inject(DB) private readonly db: Db) {}

  /** Open sessions for the signed-in account. `current` marks the one making
   *  this request, so the screen can stop someone closing themselves out by
   *  mistake. */
  @Get()
  async list(@Req() req: AuthedRequest) {
    const rows = await this.db
      .select()
      .from(sessions)
      .where(eq(sessions.userId, req.user!.id))
      .orderBy(desc(sessions.lastSeenAt))

    return {
      sessions: rows.map((session) => ({
        id: session.id,
        userAgent: session.userAgent,
        ip: session.ip,
        createdAt: session.createdAt,
        lastSeenAt: session.lastSeenAt,
        expiresAt: session.expiresAt,
        current: session.id === req.session!.id,
      })),
    }
  }

  /** Closes every other session, keeping the one in use. */
  @Delete()
  @HttpCode(200)
  async closeOthers(@Req() req: AuthedRequest) {
    const gone = await this.db
      .delete(sessions)
      .where(and(eq(sessions.userId, req.user!.id), ne(sessions.id, req.session!.id)))
      .returning({ id: sessions.id })
    return { closed: gone.length }
  }

  /** Closes one session remotely. The current one has to leave through logout,
   *  which also clears the cookie. */
  @Delete(':id')
  @HttpCode(200)
  async close(@Req() req: AuthedRequest, @Param('id') id: string) {
    if (id === req.session!.id) throw new NotFoundException('use_logout_for_current_session')

    const [gone] = await this.db
      .delete(sessions)
      .where(and(eq(sessions.id, id), eq(sessions.userId, req.user!.id)))
      .returning({ id: sessions.id })

    if (!gone) throw new NotFoundException('session_not_found')
    return { closed: gone.id }
  }
}
