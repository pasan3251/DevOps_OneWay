import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsIn,
  IsInt,
  IsISO8601,
  Min,
  Max,
} from 'class-validator';

export class ConfirmDriverReadinessDto {
  @IsBoolean()
  vehicleRoadworthy!: boolean;

  @IsBoolean()
  manifestAndSealMatched!: boolean;

  @IsBoolean()
  fuelConfirmed!: boolean;

  @IsBoolean()
  reeferTemperatureConfirmed!: boolean;
}

export class ArriveAtStopDto {
  @IsOptional()
  @IsNumber()
  currentLatitude?: number;

  @IsOptional()
  @IsNumber()
  currentLongitude?: number;

  @IsOptional()
  @IsISO8601()
  occurredAt?: string;
}

export class SubmitProofOfDeliveryDto {
  @IsString()
  @IsNotEmpty()
  storeRepName!: string;

  @IsOptional()
  @IsString()
  storeRepDesignation?: string;

  @IsIn(['FULL', 'PARTIAL'])
  outcome!: 'FULL' | 'PARTIAL';

  @IsInt()
  @Min(1)
  expectedCartons!: number;

  @IsInt()
  @Min(1)
  deliveredCartons!: number;

  @IsOptional()
  @IsString()
  storeRepSignatureUrl?: string;

  @IsOptional()
  @IsString()
  photoEvidenceUrl?: string;

  @IsOptional()
  @IsString()
  driverNotes?: string;

  @IsNumber()
  @Min(-90)
  @Max(90)
  geoLatitude!: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  geoLongitude!: number;

  @IsOptional()
  @IsISO8601()
  clientCapturedAt?: string;
}

export class FailStopDto {
  @IsString()
  @IsIn([
    'STORE_CLOSED_UNAVAILABLE',
    'DELIVERY_REJECTED',
    'DAMAGED_GOODS',
    'ACCESS_BLOCKED',
  ])
  failureReason!: string;

  @IsOptional()
  @IsString()
  driverNotes?: string;

  @IsOptional()
  @IsString()
  photoEvidenceUrl?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  affectedCartons?: number;

  @IsOptional()
  @IsISO8601()
  occurredAt?: string;
}

export class ReportDelayDto {
  @IsInt()
  @Min(1)
  @Max(720)
  delayMinutes!: number;

  @IsString()
  @IsNotEmpty()
  reason!: string;

  @IsOptional()
  @IsISO8601()
  occurredAt?: string;
}

export class ConfirmDepotReturnDto {
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude!: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude!: number;
}

export class UpdateTelematicsDto {
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude!: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude!: number;
}
