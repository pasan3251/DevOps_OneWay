import { IsUUID, IsNotEmpty, IsString, IsInt, Min, IsOptional } from 'class-validator';

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

  @IsString()
  @IsNotEmpty()
  notes!: string;
}

export class GateClearanceDto {
  @IsString()
  @IsOptional()
  sealNumber?: string;

  @IsString()
  @IsOptional()
  prechillTempConfirmed?: string;
}
