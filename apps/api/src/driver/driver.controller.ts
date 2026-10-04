import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { DriverService } from './driver.service';
import {
  ArriveAtStopDto,
  SubmitProofOfDeliveryDto,
  FailStopDto,
  UpdateTelematicsDto,
  ConfirmDriverReadinessDto,
  ConfirmDepotReturnDto,
} from './dto/driver.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RolesGuard } from '../common/guards/roles.guard';

@ApiTags('Driver & Route Execution')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller('driver')
export class DriverController {
  constructor(private readonly driverService: DriverService) {}

  @Get('active-trip')
  @Roles('driver', 'admin', 'dispatcher')
  @ApiOperation({ summary: 'Get current assigned active trip and ordered stops for logged in driver' })
  async getActiveTrip(@CurrentUser('id') userId: string) {
    return this.driverService.getActiveTrip(userId);
  }

  @Post('trips/:id/readiness')
  @Roles('driver', 'admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Acknowledge manifest, vehicle, fuel, and thermal readiness before departure' })
  async confirmReadiness(
    @Param('id') tripId: string,
    @Body() dto: ConfirmDriverReadinessDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.driverService.confirmReadiness(tripId, dto, userId);
  }

  @Post('trips/:id/depart')
  @Roles('driver', 'admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirm departure from depot gate after manifest verification' })
  async departTrip(
    @Param('id') tripId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.driverService.departTrip(tripId, userId);
  }

  @Post('stops/:stopId/arrive')
  @Roles('driver', 'admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Record geofenced arrival at delivery stop and compute early-arrival hold time' })
  async arriveAtStop(
    @Param('stopId') stopId: string,
    @Body() dto: ArriveAtStopDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.driverService.arriveAtStop(stopId, dto, userId);
  }

  @Post('stops/:stopId/deliver')
  @Roles('driver', 'admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Submit electronic Proof of Delivery with signature, rep name, and GPS coordinates' })
  async deliverStop(
    @Param('stopId') stopId: string,
    @Body() dto: SubmitProofOfDeliveryDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.driverService.deliverStop(stopId, dto, userId);
  }

  @Post('stops/:stopId/fail')
  @Roles('driver', 'admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Record delivery exception / store rejection with mandatory failure reason' })
  async failStop(
    @Param('stopId') stopId: string,
    @Body() dto: FailStopDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.driverService.failStop(stopId, dto, userId);
  }

  @Post('trips/:id/complete')
  @Roles('driver', 'admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Complete trip and return vehicle and driver to available pool' })
  async completeTrip(
    @Param('id') tripId: string,
    @Body() dto: ConfirmDepotReturnDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.driverService.completeTrip(tripId, dto, userId);
  }

  @Post('telematics')
  @Roles('driver', 'admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Push driver GPS coordinates for live dispatch fleet tracking' })
  async updateTelematics(
    @Body() dto: UpdateTelematicsDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.driverService.updateTelematics(dto, userId);
  }
}
