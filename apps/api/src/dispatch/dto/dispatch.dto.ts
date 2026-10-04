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
} from 'class-validator';
import { Type } from 'class-transformer';

export class PlanTripDto {
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

  @IsInt()
  @Min(1)
  plannedDurationMin!: number;

  @IsArray()
  @IsUUID('4', { each: true })
  @IsNotEmpty()
  orderIds!: string[];
}

export class DeferOrderDto {
  @IsUUID()
  @IsNotEmpty()
  orderId!: string;

  @IsString()
  @IsNotEmpty()
  deferralReason!: string;
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
