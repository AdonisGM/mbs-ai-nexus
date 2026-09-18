import { Module } from '@nestjs/common'
import { AUTH_CONFIG, loadAuthConfig } from '../config/auth-config'
import { AuthController } from './auth.controller'
import { AuthGuard } from './auth.guard'
import { AuthService } from './auth.service'
import { RolesGuard } from './roles.guard'
import { SessionService } from './session.service'
import { SessionsController } from './sessions.controller'

@Module({
  controllers: [AuthController, SessionsController],
  providers: [
    { provide: AUTH_CONFIG, useFactory: loadAuthConfig },
    AuthService,
    SessionService,
    AuthGuard,
    RolesGuard,
  ],
  exports: [AUTH_CONFIG, AuthService, SessionService, AuthGuard, RolesGuard],
})
export class AuthModule {}
