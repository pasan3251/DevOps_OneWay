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
import { GateClearanceDto, ReportLoadingDiscrepancyDto, ResolveLoadingExceptionDto, VerifyManifestDto } from './dto/loader.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, RequestUser } from '../common/decorators/current-user.decorator';
import { RolesGuard } from '../common/guards/roles.guard';

@ApiTags('Warehouse Loading')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller('loader')
export class LoaderController {
  constructor(private readonly loaderService: LoaderService) {}

  @Get('manifests')
  @Roles('loader', 'dispatcher', 'admin')
  @ApiOperation({ summary: 'List published manifests available to the current loader' })
  listPublishedManifests(@CurrentUser() user: RequestUser) {
    return this.loaderService.listPublishedManifests(user);
  }

  @Get('manifests/:tripId')
  @Roles('loader', 'dispatcher', 'admin')
  @ApiOperation({ summary: 'Get physical loading sheet ordered by strict reverse LIFO sequence' })
  async getLoadingManifest(@Param('tripId') tripId: string, @CurrentUser() user: RequestUser) {
    return this.loaderService.getLoadingManifest(tripId, user);
  }

  @Post('manifests/:tripId/verify')
  @Roles('loader', 'dispatcher', 'admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify the published loading manifest after physical loading' })
  verifyManifest(
    @Param('tripId') tripId: string,
    @Body() dto: VerifyManifestDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.loaderService.verifyManifest(tripId, dto, user);
  }

  @Post('manifests/:tripId/discrepancy')
  @Roles('loader', 'dispatcher', 'admin')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Report FAIL-A warehouse floor loading shortfall discrepancy' })
  async reportShortfall(
    @Param('tripId') tripId: string,
    @Body() dto: ReportLoadingDiscrepancyDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.loaderService.reportShortfall(tripId, dto, user.id, user);
  }

  @Post('exceptions/:id/resolve')
  @Roles('dispatcher', 'admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resolve a persisted loading exception' })
  resolveException(
    @Param('id') id: string,
    @Body() dto: ResolveLoadingExceptionDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.loaderService.resolveException(id, dto, user);
  }

  @Post('manifests/:tripId/gate-clear')
  @Roles('loader', 'dispatcher', 'admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Issue L5 physical gate clearance and issue driver departure token' })
  async gateClearance(
    @Param('tripId') tripId: string,
    @Body() dto: GateClearanceDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.loaderService.gateClearance(tripId, dto, user.id, user);
  }
}
