import { Controller, Post, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { SyncService } from './sync.service';
import { BatchSyncDto } from './dto/sync.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Offline Synchronization')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('sync')
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  @Post('mutations')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reconcile offline client mutations with server state and idempotency checks',
  })
  @ApiResponse({
    status: 200,
    description: 'Mutation batch processed with committed and deduplicated counts',
  })
  async processSyncBatch(
    @Body() dto: BatchSyncDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.syncService.processSyncBatch(dto, userId);
  }
}
