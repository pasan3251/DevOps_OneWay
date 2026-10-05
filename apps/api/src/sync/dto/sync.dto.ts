import {
  IsUUID,
  IsNotEmpty,
  IsString,
  IsArray,
  ValidateNested,
  IsObject,
  IsIn,
  IsISO8601,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ClientMutationDto {
  @IsUUID()
  @IsNotEmpty()
  clientMutationId!: string;

  @IsString()
  @IsNotEmpty()
  entity!: string;

  @IsString()
  @IsIn([
    'confirm_readiness',
    'depart_trip',
    'arrive_stop',
    'deliver_stop',
    'fail_stop',
    'report_delay',
    'complete_trip',
  ])
  action!: string;

  @IsISO8601()
  occurredAt!: string;

  @IsOptional()
  @IsISO8601()
  baseUpdatedAt?: string;

  @IsObject()
  @IsNotEmpty()
  payload!: {
    tripId?: string;
    stopId?: string;
    vehicleRoadworthy?: boolean;
    manifestAndSealMatched?: boolean;
    fuelConfirmed?: boolean;
    reeferTemperatureConfirmed?: boolean;
    currentLatitude?: number;
    currentLongitude?: number;
    storeRepName?: string;
    storeRepDesignation?: string;
    outcome?: 'FULL' | 'PARTIAL';
    expectedCartons?: number;
    deliveredCartons?: number;
    storeRepSignatureUrl?: string;
    photoEvidenceUrl?: string;
    driverNotes?: string;
    geoLatitude?: number;
    geoLongitude?: number;
    clientCapturedAt?: string;
    failureReason?: 'STORE_CLOSED_UNAVAILABLE' | 'DELIVERY_REJECTED' | 'DAMAGED_GOODS' | 'ACCESS_BLOCKED';
    affectedCartons?: number;
    delayMinutes?: number;
    reason?: string;
    latitude?: number;
    longitude?: number;
  };
}

export class BatchSyncDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ClientMutationDto)
  mutations!: ClientMutationDto[];
}
