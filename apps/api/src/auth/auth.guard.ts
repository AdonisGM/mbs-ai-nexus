import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common'
import type { Request } from 'express'
import { AUTH_CONFIG, type AuthConfig } from '../config/auth-config'
import { SessionService } from './session.service'
import type { Session, User } from '../db/schema'

export type AuthedRequest = Request & { user?: User; session?: Session }

/** Rejects any request without a valid session, and hangs the account off the
 *  request so guards and controllers downstream do not look it up again. */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly sessions: SessionService,
    @Inject(AUTH_CONFIG) private readonly config: AuthConfig,
  ) {}

  async canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<AuthedRequest>()
    const cookies = req.cookies as Record<string, string> | undefined
    const found = await this.sessions.resolve(cookies?.[this.config.cookieName])
    if (!found) throw new UnauthorizedException('not_authenticated')
    req.user = found.user
    req.session = found.session
    return true
  }
}
