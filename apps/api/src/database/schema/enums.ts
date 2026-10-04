import { pgEnum } from 'drizzle-orm/pg-core';

export const userRoleEnum = pgEnum('user_role', [
  'admin',
  'dispatcher',
  'store_manager',
  'loader',
  'driver',
]);

export const brandEnum = pgEnum('brand_type', [
  'Fresh',
  'Style',
  'Tech',
]);

export const tempRequirementEnum = pgEnum('temp_requirement', [
  'ambient',
  'chilled',
]);

export const vehicleTypeEnum = pgEnum('vehicle_type', [
  'truck_reefer',
  'truck_ambient',
  'van_reefer',
  'van_ambient',
]);

export const bodyTypeEnum = pgEnum('body_type', [
  'truck',
  'van',
]);

export const refrigerationTypeEnum = pgEnum('refrigeration_type', [
  'reefer',
  'ambient',
]);

export const vehicleStatusEnum = pgEnum('vehicle_status', [
  'available',
  'in_transit',
  'maintenance',
  'offline',
]);

export const driverStatusEnum = pgEnum('driver_status', [
  'available',
  'on_trip',
  'off_duty',
]);

export const orderStatusEnum = pgEnum('order_status', [
  'QUEUED_NEXT_RUN',
  'ORDER_RECORDED',
  'DISPATCH_PENDING',
  'ASSIGNED',
  'IN_TRANSIT',
  'DELIVERED',
  'DEFICIT_PENDING',
  'CANCELLED',
]);

export const tripStatusEnum = pgEnum('trip_status', [
  'PLANNED',
  'LOCKED',
  'LOADING',
  'MANIFEST_ISSUED',
  'EN_ROUTE',
  'COMPLETED',
  'CANCELLED',
]);

export const tripStopStatusEnum = pgEnum('trip_stop_status', [
  'PENDING',
  'ARRIVED',
  'UNLOADING',
  'DELIVERED',
  'DISCREPANCY_FLAGGED',
  'FAILED',
]);

export const discrepancyStatusEnum = pgEnum('discrepancy_status', [
  'LOGGED',
  'INVESTIGATING',
  'DEFICIT_ORDER_CREATED',
  'CREDITED',
  'REJECTED',
]);

export const discrepancyTypeEnum = pgEnum('discrepancy_type', [
  'FAIL_A_LOADING_SHORTFALL',
  'DAMAGE_IN_TRANSIT',
  'REJECTED_TEMPERATURE',
  'STORE_SHORTFALL',
]);
