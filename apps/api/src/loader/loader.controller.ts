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
import { LoaderService } from './loader.service';
import { ReportLoadingDiscrepancyDto, GateClearanceDto } from './dto/loader.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RolesGuard } from '../common/guards/roles.guard';

@ApiTags('Warehouse Loading')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller('loader')
export class LoaderController {
  constructor(private readonly loaderService: LoaderService) {}

  @Get('manifests/:tripId')
  @Roles('loader', 'dispatcher', 'admin')
  @ApiOperation({ summary: 'Get physical loading sheet ordered by strict reverse LIFO sequence' })
  async getLoadingManifest(@Param('tripId') tripId: string) {
    return this.loaderService.getLoadingManifest(tripId);
  }

  @Post('manifests/:tripId/discrepancy')
  @Roles('loader', 'dispatcher', 'admin')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Report FAIL-A warehouse floor loading shortfall discrepancy' })
  async reportShortfall(
    @Param('tripId') tripId: string,
    @Body() dto: ReportLoadingDiscrepancyDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.loaderService.reportShortfall(tripId, dto, userId);
  }

  @Post('manifests/:tripId/gate-clear')
  @Roles('loader', 'dispatcher', 'admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Issue L5 physical gate clearance and issue driver departure token' })
  async gateClearance(
    @Param('tripId') tripId: string,
    @Body() dto: GateClearanceDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.loaderService.gateClearance(tripId, dto, userId);
  }
}
