import { IsUUID, IsNotEmpty, IsString, IsInt, IsIn, Min, IsOptional, MaxLength } from 'class-validator';

export class VerifyManifestDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class ReportLoadingDiscrepancyDto {
  @IsUUID()
  @IsNotEmpty()
  orderId!: string;

  @IsUUID()
  @IsOptional()
  tripStopId?: string;

  @IsInt()
  @Min(1)
  shortfallQty!: number;

  @IsOptional()
  @IsIn(['SHORTFALL', 'DAMAGE', 'TEMPERATURE', 'OTHER'])
  exceptionType?: 'SHORTFALL' | 'DAMAGE' | 'TEMPERATURE' | 'OTHER';

  @IsOptional()
  @IsString()
  affectedSku?: string;

  @IsOptional()
  @IsString()
  evidenceUrl?: string;

  @IsString()
  @IsNotEmpty()
  notes!: string;
}

export class ResolveLoadingExceptionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  resolution!: string;
}

export class GateClearanceDto {
  @IsString()
  @IsOptional()
  sealNumber?: string;

  @IsString()
  @IsOptional()
  prechillTempConfirmed?: string;
}
