import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { DispatchService } from './dispatch.service';
import { CreatePlanDto, PlanTripDto, DeferOrderDto, RevisePlanDto, TripFilterDto, UpdateTripDto } from './dto/dispatch.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, RequestUser } from '../common/decorators/current-user.decorator';
import { RolesGuard } from '../common/guards/roles.guard';

@ApiTags('Dispatch')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller('dispatch')
export class DispatchController {
  constructor(private readonly dispatchService: DispatchService) {}

  @Post('plans')
  @Roles('dispatcher', 'admin')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create or retrieve the editable plan version for a depot and day' })
  createPlan(@Body() dto: CreatePlanDto, @CurrentUser('id') userId: string) {
    return this.dispatchService.createPlan(dto, userId);
  }

  @Post('plans/:id/validate')
  @Roles('dispatcher', 'admin')
  @ApiOperation({ summary: 'Validate a draft plan before publication' })
  validatePlan(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.dispatchService.validatePlan(id, userId);
  }

  @Post('plans/:id/publish')
  @Roles('dispatcher', 'admin')
  @ApiOperation({ summary: 'Publish an authoritative plan version and release manifests' })
  publishPlan(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.dispatchService.publishPlan(id, userId);
  }

  @Post('plans/:id/revisions')
  @Roles('dispatcher', 'admin')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a traceable revision from a published plan' })
  revisePlan(
    @Param('id') id: string,
    @Body() dto: RevisePlanDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.dispatchService.revisePlan(id, dto, userId);
  }

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

  @Post('defer/:orderId/reinstate')
  @Roles('dispatcher', 'admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Return a deferred order to the planning backlog' })
  reinstateOrder(
    @Param('orderId') orderId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.dispatchService.reinstateOrder(orderId, userId);
  }

  @Get('trips')
  @Roles('dispatcher', 'admin', 'loader')
  @ApiOperation({ summary: 'List and filter planned trips with stops and vehicles' })
  async listTrips(@Query() filter: TripFilterDto, @CurrentUser() user: RequestUser) {
    return this.dispatchService.listTrips(filter, user);
  }

  @Get('trips/:id')
  @Roles('dispatcher', 'admin', 'loader', 'driver')
  @ApiOperation({ summary: 'Get comprehensive trip manifest and stops details' })
  async getTripById(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.dispatchService.getTripById(id, user);
  }

  @Patch('trips/:id')
  @Roles('dispatcher', 'admin')
  @ApiOperation({ summary: 'Update an editable plan trip and recalculate its authoritative route estimates' })
  updateTrip(
    @Param('id') id: string,
    @Body() dto: UpdateTripDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.dispatchService.updateTrip(id, dto, userId);
  }

  @Delete('trips/:id')
  @Roles('dispatcher', 'admin')
  @ApiOperation({ summary: 'Remove an editable draft trip and return its orders to the backlog' })
  removeTrip(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.dispatchService.removeTrip(id, userId);
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
