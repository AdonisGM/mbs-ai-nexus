import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { TargetsController } from './targets.controller'
import { TargetsService } from './targets.service'

@Module({
  imports: [AuthModule],
  controllers: [TargetsController],
  providers: [TargetsService],
  exports: [TargetsService],
})
export class TargetsModule {}
