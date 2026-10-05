import {
  IsUUID,
  IsNotEmpty,
  IsEnum,
  IsDateString,
  IsArray,
  IsInt,
  Min,
  IsOptional,
  IsString,
  MaxLength,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

export class PlanTripDto {
  @IsOptional()
  @IsUUID()
  planVersionId?: string;

  @IsUUID()
  @IsNotEmpty()
  depotId!: string;

  @IsUUID()
  @IsNotEmpty()
  vehicleId!: string;

  @IsUUID()
  @IsNotEmpty()
  driverId!: string;

  @IsEnum(['Fresh', 'Style', 'Tech'])
  @IsNotEmpty()
  brand!: 'Fresh' | 'Style' | 'Tech';

  @IsString()
  @IsNotEmpty()
  district!: string;

  @IsDateString()
  @IsNotEmpty()
  operatingDate!: string;

  @IsOptional()
  @IsDateString()
  plannedDepartureTime?: string;

  @IsArray()
  @IsUUID('4', { each: true })
  @IsNotEmpty()
  orderIds!: string[];
}

export class DeferOrderDto {
  @IsUUID()
  @IsNotEmpty()
  orderId!: string;

  @IsEnum([
    'CAPACITY_UNAVAILABLE',
    'VEHICLE_UNAVAILABLE',
    'DELIVERY_WINDOW',
    'OPERATIONAL_CONSTRAINT',
    'OTHER',
  ])
  reasonCode!: 'CAPACITY_UNAVAILABLE' | 'VEHICLE_UNAVAILABLE' | 'DELIVERY_WINDOW' | 'OPERATIONAL_CONSTRAINT' | 'OTHER';

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  deferralReason!: string;
}

export class CreatePlanDto {
  @IsUUID()
  depotId!: string;

  @IsDateString()
  operatingDate!: string;
}

export class RevisePlanDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason!: string;
}

export class UpdateTripDto {
  @IsOptional()
  @IsUUID()
  vehicleId?: string;

  @IsOptional()
  @IsUUID()
  driverId?: string;

  @IsOptional()
  @IsDateString()
  plannedDepartureTime?: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  orderIds?: string[];
}

export class TripFilterDto {
  @IsOptional()
  @IsDateString()
  operatingDate?: string;

  @IsOptional()
  @IsEnum(['Fresh', 'Style', 'Tech'])
  brand?: 'Fresh' | 'Style' | 'Tech';

  @IsOptional()
  @IsString()
  district?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsUUID()
  depotId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;

  get offset(): number {
    return ((this.page ?? 1) - 1) * (this.limit ?? 20);
  }
}
