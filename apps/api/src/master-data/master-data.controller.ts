import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { MasterDataService } from './master-data.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Master Data')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('master-data')
export class MasterDataController {
  constructor(private readonly masterDataService: MasterDataService) {}

  @Get('depots')
  @ApiOperation({ summary: 'List active distribution depots' })
  async getDepots() {
    return this.masterDataService.getDepots();
  }

  @Get('outlets')
  @ApiOperation({ summary: 'List retail outlets filtered by brand, district, or depot' })
  @ApiQuery({ name: 'brand', required: false, enum: ['Fresh', 'Style', 'Tech'] })
  @ApiQuery({ name: 'district', required: false, type: String })
  @ApiQuery({ name: 'depotId', required: false, type: String })
  async getOutlets(
    @Query('brand') brand?: 'Fresh' | 'Style' | 'Tech',
    @Query('district') district?: string,
    @Query('depotId') depotId?: string,
  ) {
    return this.masterDataService.getOutlets(brand, district, depotId);
  }

  @Get('vehicles')
  @Roles('dispatcher', 'loader', 'driver', 'admin')
  @ApiOperation({ summary: 'List fleet vehicles filtered by depot and operational status' })
  @ApiQuery({ name: 'depotId', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, type: String })
  async getVehicles(
    @Query('depotId') depotId?: string,
    @Query('status') status?: 'available' | 'in_transit' | 'maintenance' | 'offline',
  ) {
    return this.masterDataService.getVehicles(depotId, status);
  }

  @Get('drivers')
  @Roles('dispatcher', 'loader', 'admin')
  @ApiOperation({ summary: 'List driver profiles filtered by depot and status' })
  @ApiQuery({ name: 'depotId', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, type: String })
  async getDrivers(
    @Query('depotId') depotId?: string,
    @Query('status') status?: 'available' | 'on_trip' | 'off_duty',
  ) {
    return this.masterDataService.getDrivers(depotId, status);
  }

  @Get('products')
  @ApiOperation({ summary: 'List SKU catalog filtered by brand and temperature requirement' })
  @ApiQuery({ name: 'brand', required: false, enum: ['Fresh', 'Style', 'Tech'] })
  @ApiQuery({ name: 'tempRequirement', required: false, enum: ['ambient', 'chilled'] })
  async getProducts(
    @Query('brand') brand?: 'Fresh' | 'Style' | 'Tech',
    @Query('tempRequirement') tempRequirement?: 'ambient' | 'chilled',
  ) {
    return this.masterDataService.getProducts(brand, tempRequirement);
  }
}
