import { describe, expect, it, vi } from 'vitest';
import { DispatchService } from '../../src/dispatch/dispatch.service';
import * as schema from '../../src/database/schema';

function setup(status = 'DRIVER_READY', concurrentDeparture = false) {
  const source = { id: 'version-a', planId: 'plan-a', status: 'PUBLISHED', versionNumber: 1 };
  const sourceTrip = { id: 'trip-a', status, tripNumber: 'TRIP-A', driverId: 'driver-a', stops: [] };
  const changes: Array<{ table: unknown; values: Record<string, unknown> }> = [];
  const tx = {
    insert: () => ({ values: (values: Record<string, unknown>) => ({ returning: async () => [{ id: 'revision-a', ...values }] }) }),
    update: (table: unknown) => ({ set: (values: Record<string, unknown>) => {
      changes.push({ table, values });
      return { where: () => ({ returning: async () => concurrentDeparture ? [] : [{ id: sourceTrip.id }] }) };
    } }),
  };
  const transaction = vi.fn(async (callback: (transaction: typeof tx) => Promise<unknown>) => callback(tx));
  const db = { transaction, query: {
    planVersions: { findFirst: async () => source, findMany: async () => [source] },
    trips: { findMany: async () => [sourceTrip] }, deliveryPlans: { findFirst: async () => ({ id: 'plan-a' }) },
  } };
  return { service: new DispatchService(db as never), transaction, changes };
}

describe('Published plan revision safety', () => {
  it('revokes the old departure clearance and readiness together with the stale manifest', async () => {
    const { service, changes } = setup();
    await service.revisePlan('version-a', { reason: 'Reorder stops before departure' });
    expect(changes.find((change) => change.table === schema.trips)?.values).toMatchObject({
      status: 'LOCKED', gatePassToken: null, gateClearedAt: null, gateClearedBy: null,
      driverReadyAt: null, driverChecklist: null,
    });
    expect(changes.find((change) => change.table === schema.loadingManifests)?.values.status).toBe('STALE');
  });

  it.each(['EN_ROUTE', 'RETURNING', 'COMPLETED'])('does not clone %s execution into a fresh draft', async (status) => {
    const { service, transaction } = setup(status);
    await expect(service.revisePlan('version-a', { reason: 'Reorder stops' })).rejects.toThrow('once a trip has departed');
    expect(transaction).not.toHaveBeenCalled();
  });

  it('aborts a revision if departure wins the concurrent state change', async () => {
    const { service } = setup('DRIVER_READY', true);
    await expect(service.revisePlan('version-a', { reason: 'Reorder stops' })).rejects.toThrow('execution changed');
  });
});
