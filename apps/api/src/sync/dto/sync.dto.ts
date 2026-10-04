import {
  IsUUID,
  IsNotEmpty,
  IsString,
  IsArray,
  ValidateNested,
  IsObject,
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
  @IsNotEmpty()
  action!: string;

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
