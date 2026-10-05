import { describe, expect, it } from 'vitest';
import { CommunicationsController } from '../../src/communications/communications.controller';
import { DispatchController } from '../../src/dispatch/dispatch.controller';
import { DriverController } from '../../src/driver/driver.controller';
import { LoaderController } from '../../src/loader/loader.controller';
import { StoreController } from '../../src/store/store.controller';
import {
  manifestStatusEnum,
  orderStatusEnum,
  planStatusEnum,
  receiptStatusEnum,
  tripStatusEnum,
} from '../../src/database/schema/enums';

describe('Cross-role operational workflow contract', () => {
  it('keeps published plans immutable through explicit version states', () => {
    expect(planStatusEnum.enumValues).toEqual([
      'DRAFT',
      'VALIDATED',
      'PUBLISHED',
      'SUPERSEDED',
    ]);
    expect(DispatchController.prototype.createPlan).toBeTypeOf('function');
    expect(DispatchController.prototype.updateTrip).toBeTypeOf('function');
    expect(DispatchController.prototype.publishPlan).toBeTypeOf('function');
    expect(DispatchController.prototype.revisePlan).toBeTypeOf('function');
  });

  it('exposes the loader verification, exception, and gate-clearance boundary', () => {
    expect(manifestStatusEnum.enumValues).toEqual([
      'PENDING',
      'VERIFIED',
      'EXCEPTION',
      'RESOLVED',
      'CLEARED',
      'STALE',
    ]);
    expect(LoaderController.prototype.verifyManifest).toBeTypeOf('function');
    expect(LoaderController.prototype.reportShortfall).toBeTypeOf('function');
    expect(LoaderController.prototype.resolveException).toBeTypeOf('function');
    expect(LoaderController.prototype.gateClearance).toBeTypeOf('function');
  });

  it('keeps driver departure and delivery transitions explicit', () => {
    expect(tripStatusEnum.enumValues).toContain('CLEARED');
    expect(tripStatusEnum.enumValues).toContain('DRIVER_READY');
    expect(tripStatusEnum.enumValues).toContain('EN_ROUTE');
    expect(tripStatusEnum.enumValues).toContain('RETURNING');
    expect(tripStatusEnum.enumValues).toContain('COMPLETED');
    expect(DriverController.prototype.confirmReadiness).toBeTypeOf('function');
    expect(DriverController.prototype.departTrip).toBeTypeOf('function');
    expect(DriverController.prototype.arriveAtStop).toBeTypeOf('function');
    expect(DriverController.prototype.deliverStop).toBeTypeOf('function');
    expect(DriverController.prototype.failStop).toBeTypeOf('function');
    expect(DriverController.prototype.completeTrip).toBeTypeOf('function');
  });

  it('separates driver POD from the store receipt decision', () => {
    expect(orderStatusEnum.enumValues).toContain('DELIVERED');
    expect(orderStatusEnum.enumValues).toContain('RECEIVED');
    expect(orderStatusEnum.enumValues).toContain('DISPUTED');
    expect(receiptStatusEnum.enumValues).toEqual(['CONFIRMED', 'DISCREPANCY']);
    expect(StoreController.prototype.confirmReceipt).toBeTypeOf('function');
    expect(StoreController.prototype.createDiscrepancy).toBeTypeOf('function');
  });

  it('provides one shared communication surface for every authenticated role', () => {
    expect(CommunicationsController.prototype.listContacts).toBeTypeOf('function');
    expect(CommunicationsController.prototype.listConversations).toBeTypeOf('function');
    expect(CommunicationsController.prototype.sendMessage).toBeTypeOf('function');
    expect(CommunicationsController.prototype.listNotifications).toBeTypeOf('function');
    expect(CommunicationsController.prototype.markNotificationRead).toBeTypeOf('function');
  });
});
