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
  'LOADED',
  'IN_TRANSIT',
  'DELIVERED',
  'FAILED',
  'RECEIVED',
  'DISPUTED',
  'DEFICIT_PENDING',
  'CANCELLED',
]);

export const tripStatusEnum = pgEnum('trip_status', [
  'PLANNED',
  'LOCKED',
  'LOADING',
  'MANIFEST_ISSUED',
  'CLEARED',
  'DRIVER_READY',
  'EN_ROUTE',
  'RETURNING',
  'COMPLETED',
  'CANCELLED',
]);

export const tripStopStatusEnum = pgEnum('trip_stop_status', [
  'PENDING',
  'ARRIVED',
  'WAITING_WINDOW',
  'UNLOADING',
  'DELIVERED',
  'DISCREPANCY_FLAGGED',
  'FAILED',
]);

export const deliveryOutcomeEnum = pgEnum('delivery_outcome', [
  'FULL',
  'PARTIAL',
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

export const planStatusEnum = pgEnum('plan_status', [
  'DRAFT',
  'VALIDATED',
  'PUBLISHED',
  'SUPERSEDED',
]);

export const manifestStatusEnum = pgEnum('manifest_status', [
  'PENDING',
  'VERIFIED',
  'EXCEPTION',
  'RESOLVED',
  'CLEARED',
  'STALE',
]);

export const loadingExceptionTypeEnum = pgEnum('loading_exception_type', [
  'SHORTFALL',
  'DAMAGE',
  'TEMPERATURE',
  'OTHER',
]);

export const exceptionResolutionEnum = pgEnum('exception_resolution', ['OPEN', 'RESOLVED']);
export const receiptStatusEnum = pgEnum('receipt_status', ['CONFIRMED', 'DISCREPANCY']);
export const messageTypeEnum = pgEnum('message_type', ['TEXT', 'IMAGE', 'SYSTEM']);
export const notificationTypeEnum = pgEnum('notification_type', [
  'ORDER_CREATED',
  'PLAN_PUBLISHED',
  'PLAN_REVISED',
  'LOADING_EXCEPTION',
  'LOADING_EXCEPTION_RESOLVED',
  'DEPARTURE_CLEARED',
  'DRIVER_READY',
  'TRIP_DEPARTED',
  'LATE_RISK',
  'DELIVERY_COMPLETED',
  'DELIVERY_EXCEPTION',
  'ORDER_DEFERRED',
  'RECEIPT_CONFIRMED',
  'RECEIVING_DISCREPANCY',
  'SYNC_CONFLICT',
]);
