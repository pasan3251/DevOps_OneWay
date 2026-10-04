import {
  IsUUID,
  IsNotEmpty,
  IsEnum,
  IsDateString,
  IsArray,
  ValidateNested,
  IsInt,
  Min,
  IsOptional,
  IsString,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateOrderItemDto {
  @IsUUID()
  @IsNotEmpty()
  productId!: string;

  @IsInt()
  @Min(1)
  quantity!: number;
}

export class CreateOrderDto {
  @IsUUID()
  @IsNotEmpty()
  outletId!: string;

  @IsEnum(['Fresh', 'Style', 'Tech'])
  @IsNotEmpty()
  brand!: 'Fresh' | 'Style' | 'Tech';

  @IsEnum(['ambient', 'chilled'])
  @IsNotEmpty()
  tempRequirement!: 'ambient' | 'chilled';

  @IsDateString()
  @IsNotEmpty()
  orderDate!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items!: CreateOrderItemDto[];
}

export class OrderFilterDto {
  @IsOptional()
  @IsDateString()
  orderDate?: string;

  @IsOptional()
  @IsEnum(['Fresh', 'Style', 'Tech'])
  brand?: 'Fresh' | 'Style' | 'Tech';

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsUUID()
  outletId?: string;

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
