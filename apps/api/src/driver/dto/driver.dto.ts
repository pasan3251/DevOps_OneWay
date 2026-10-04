import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  Min,
  Max,
} from 'class-validator';

export class ArriveAtStopDto {
  @IsOptional()
  @IsNumber()
  currentLatitude?: number;

  @IsOptional()
  @IsNumber()
  currentLongitude?: number;
}

export class SubmitProofOfDeliveryDto {
  @IsString()
  @IsNotEmpty()
  storeRepName!: string;

  @IsString()
  @IsNotEmpty()
  storeRepSignatureUrl!: string;

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
}

export class FailStopDto {
  @IsString()
  @IsNotEmpty()
  failureReason!: string;

  @IsOptional()
  @IsString()
  driverNotes?: string;
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
