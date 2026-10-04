import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { CreateOrderDto, OrderFilterDto } from './dto/order.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, RequestUser } from '../common/decorators/current-user.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { ResourceScopeGuard } from '../common/guards/resource-scope.guard';

@ApiTags('Orders')
@ApiBearerAuth()
@UseGuards(RolesGuard, ResourceScopeGuard)
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @Roles('store_manager', 'dispatcher', 'admin')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Submit retail store replenishment order' })
  @ApiResponse({ status: 201, description: 'Order created and validated successfully' })
  @ApiResponse({ status: 400, description: 'Validation error or product incompatibility' })
  @ApiResponse({ status: 409, description: 'Duplicate order violates Fresh dual-order rule' })
  async createOrder(
    @Body() dto: CreateOrderDto,
    @CurrentUser() user: RequestUser,
  ) {
    // If store manager, automatically bind to user's assigned outlet
    if (user.role === 'store_manager') {
      if (!user.outletId) {
        throw new ForbiddenException('Store Manager must be assigned to an active outlet');
      }
      dto.outletId = user.outletId;
    }
    return this.ordersService.createOrder(dto, user.id);
  }

  @Get()
  @Roles('store_manager', 'dispatcher', 'admin')
  @ApiOperation({ summary: 'List and filter replenishment orders with pagination' })
  async listOrders(
    @Query() filter: OrderFilterDto,
    @CurrentUser() user: RequestUser,
  ) {
    if (user.role === 'store_manager') {
      if (!user.outletId) {
        throw new ForbiddenException('Store Manager must be assigned to an active outlet');
      }
      filter.outletId = user.outletId;
    }
    return this.ordersService.listOrders(filter);
  }

  @Get(':id')
  @Roles('store_manager', 'dispatcher', 'admin', 'loader', 'driver')
  @ApiOperation({ summary: 'Get complete order details by ID' })
  async getOrderById(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.ordersService.getOrderById(id, user);
  }

  @Post(':id/cancel')
  @Roles('store_manager', 'dispatcher', 'admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel unassigned replenishment order' })
  async cancelOrder(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.ordersService.cancelOrder(id, user);
  }
}
