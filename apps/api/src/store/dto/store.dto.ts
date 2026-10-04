import { IsUUID, IsNotEmpty, IsEnum, IsOptional, IsInt, Min, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateDiscrepancyClaimDto {
  @ApiProperty({ description: 'ID of the delivered order with discrepancy' })
  @IsUUID()
  @IsNotEmpty()
  orderId!: string;

  @ApiPropertyOptional({ description: 'Optional associated trip stop ID' })
  @IsUUID()
  @IsOptional()
  tripStopId?: string;

  @ApiProperty({
    enum: ['DAMAGE_IN_TRANSIT', 'STORE_SHORTFALL', 'REJECTED_TEMPERATURE'],
    description: 'Category of the receiving discrepancy',
  })
  @IsEnum(['DAMAGE_IN_TRANSIT', 'STORE_SHORTFALL', 'REJECTED_TEMPERATURE'])
  @IsNotEmpty()
  discrepancyType!: 'DAMAGE_IN_TRANSIT' | 'STORE_SHORTFALL' | 'REJECTED_TEMPERATURE';

  @ApiPropertyOptional({ description: 'Number of units short or damaged', default: 0 })
  @IsInt()
  @Min(0)
  @IsOptional()
  shortfallQty?: number;

  @ApiPropertyOptional({ description: 'Store manager operational remarks or notes' })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class StoreDeliveryFilterDto {
  @ApiPropertyOptional({ description: 'Filter deliveries by operating date (YYYY-MM-DD)' })
  @IsString()
  @IsOptional()
  date?: string;

  @ApiPropertyOptional({ description: 'Filter by stop status (PENDING, ARRIVED, COMPLETED, FAILED)' })
  @IsString()
  @IsOptional()
  status?: string;
}
