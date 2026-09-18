import { CanActivate, ExecutionContext, ForbiddenException, Injectable, SetMetadata } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import type { Role } from '../db/schema'
import type { AuthedRequest } from './auth.guard'

export const ROLES_KEY = 'roles'

/** Declares which roles may reach a handler or a whole controller.
 *
 *  This is the coarse gate — "may a team lead open this screen at all". It is
 *  not the same thing as row scoping, which decides *whose* records come back
 *  and lives in the query layer. Keeping the two apart is deliberate: a guard
 *  that also filters rows ends up duplicated in every service. */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles)

/** Always list this after AuthGuard in @UseGuards — it reads the account that
 *  AuthGuard attached. */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext) {
    const allowed = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ])
    if (!allowed || allowed.length === 0) return true

    const req = context.switchToHttp().getRequest<AuthedRequest>()
    const role = req.user?.role as Role | undefined

    /** An admin is a technical account and passes every role gate. It still
     *  shows up in the audit trail like anyone else. */
    if (role === 'admin') return true

    if (!role || !allowed.includes(role)) throw new ForbiddenException('forbidden')
    return true
  }
}
