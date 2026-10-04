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
  payload!: Record<string, any>;
}

export class BatchSyncDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ClientMutationDto)
  mutations!: ClientMutationDto[];
}
