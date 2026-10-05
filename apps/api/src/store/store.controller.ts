import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Inject } from '@nestjs/common';
import { StoreService } from './store.service';
import { ConfirmReceiptDto, CreateDiscrepancyClaimDto, StoreDeliveryFilterDto } from './dto/store.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, RequestUser } from '../common/decorators/current-user.decorator';
import { RolesGuard } from '../common/guards/roles.guard';

@ApiTags('Store Operations')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller('store')
export class StoreController {
  constructor(@Inject(StoreService) private readonly storeService: StoreService) {}

  private resolveOutletId(user?: RequestUser, queryOutletId?: string): string {
    if (user && user.role === 'store_manager') {
      if (!user.outletId) {
        throw new ForbiddenException('Store Manager must be assigned to an active outlet');
      }
      return user.outletId;
    }
    // Admin, dispatcher, or query-based simulation
    const targetOutletId = queryOutletId || user?.outletId;
    if (!targetOutletId) {
      throw new ForbiddenException('Target outlet ID is required');
    }
    return targetOutletId;
  }

  @Get('overview')
  @Roles('store_manager', 'admin', 'dispatcher')
  @ApiOperation({ summary: 'Get operational store overview: store status, 16:00 cutoff clock, inbound deliveries, and active orders' })
  @ApiResponse({ status: 200, description: 'Store operational context retrieved' })
  @ApiResponse({ status: 403, description: 'Unauthorized store access' })
  async getStoreOverview(
    @CurrentUser() user: RequestUser,
    @Query('outletId') queryOutletId?: string,
  ) {
    const outletId = this.resolveOutletId(user, queryOutletId);
    return this.storeService.getStoreOverview(outletId);
  }

  @Get('deliveries')
  @Roles('store_manager', 'admin', 'dispatcher')
  @ApiOperation({ summary: 'List inbound deliveries for the store including split vehicle ETAs and proof of deliveries' })
  @ApiResponse({ status: 200, description: 'Delivery list retrieved successfully' })
  async getStoreDeliveries(
    @CurrentUser() user: RequestUser,
    @Query() filter: StoreDeliveryFilterDto,
    @Query('outletId') queryOutletId?: string,
  ) {
    const outletId = this.resolveOutletId(user, queryOutletId);
    return this.storeService.getStoreDeliveries(outletId, filter);
  }

  @Post('discrepancies')
  @Roles('store_manager', 'admin')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Submit receiving discrepancy claim upon physical unloading at store dock (SM-3, SM-DISC-001)' })
  @ApiResponse({ status: 201, description: 'Discrepancy claim logged successfully' })
  @ApiResponse({ status: 400, description: 'Invalid discrepancy parameters or order not eligible' })
  async createDiscrepancy(
    @Body() dto: CreateDiscrepancyClaimDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.storeService.createDiscrepancyClaim(dto, user);
  }

  @Post('receipts')
  @Roles('store_manager', 'admin')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Confirm correct physical receipt after proof of delivery' })
  async confirmReceipt(
    @Body() dto: ConfirmReceiptDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.storeService.confirmReceipt(dto, user);
  }

  @Get('discrepancies')
  @Roles('store_manager', 'admin', 'dispatcher')
  @ApiOperation({ summary: 'List discrepancy claims filed for the retail store' })
  async getStoreDiscrepancies(
    @CurrentUser() user: RequestUser,
    @Query('outletId') queryOutletId?: string,
  ) {
    const outletId = this.resolveOutletId(user, queryOutletId);
    return this.storeService.getStoreDiscrepancies(outletId);
  }
}
