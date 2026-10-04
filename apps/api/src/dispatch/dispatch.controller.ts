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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { DispatchService } from './dispatch.service';
import { PlanTripDto, DeferOrderDto, TripFilterDto } from './dto/dispatch.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RolesGuard } from '../common/guards/roles.guard';

@ApiTags('Dispatch')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller('dispatch')
export class DispatchController {
  constructor(private readonly dispatchService: DispatchService) {}

  @Post('plan')
  @Roles('dispatcher', 'admin')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Plan and create route trip with feasibility assertions' })
  @ApiResponse({ status: 201, description: 'Trip created and orders assigned' })
  @ApiResponse({ status: 400, description: 'Feasibility violation (brand, district, refrigeration, capacity, or budget)' })
  async planTrip(
    @Body() dto: PlanTripDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.dispatchService.planTrip(dto, userId);
  }

  @Post('defer')
  @Roles('dispatcher', 'admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Record order deferral reason and increment starvation counter' })
  async deferOrder(
    @Body() dto: DeferOrderDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.dispatchService.deferOrder(dto, userId);
  }

  @Get('trips')
  @Roles('dispatcher', 'admin', 'loader')
  @ApiOperation({ summary: 'List and filter planned trips with stops and vehicles' })
  async listTrips(@Query() filter: TripFilterDto) {
    return this.dispatchService.listTrips(filter);
  }

  @Get('trips/:id')
  @Roles('dispatcher', 'admin', 'loader', 'driver')
  @ApiOperation({ summary: 'Get comprehensive trip manifest and stops details' })
  async getTripById(@Param('id') id: string) {
    return this.dispatchService.getTripById(id);
  }

  @Post('trips/:id/lock')
  @Roles('dispatcher', 'admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Lock trip manifest before staging and warehouse loading' })
  async lockTrip(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.dispatchService.lockTrip(id, userId);
  }
}
