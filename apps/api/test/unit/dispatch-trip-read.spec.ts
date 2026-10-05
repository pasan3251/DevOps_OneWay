import { describe, expect, it, vi } from 'vitest';
import { ForbiddenException } from '@nestjs/common';
import { DispatchService } from '../../src/dispatch/dispatch.service';
import { TripFilterDto } from '../../src/dispatch/dto/dispatch.dto';
import type { RequestUser } from '../../src/common/decorators/current-user.decorator';

const loader: RequestUser = { id: 'loader-user', email: 'loader@test.local', role: 'loader', depotId: 'depot-a' };
const dispatcher: RequestUser = { id: 'dispatch-user', email: 'dispatcher@test.local', role: 'dispatcher' };
const driver: RequestUser = { id: 'driver-user', email: 'driver@test.local', role: 'driver' };

function tripFixture() {
  return {
    id: 'trip-a', depotId: 'depot-a', status: 'COMPLETED',
    driver: { userId: driver.id, user: { id: driver.id, firstName: 'Sunil', lastName: 'Fernando', passwordHash: 'private-hash' } },
    loadingManifests: [{ manifestVersion: 1, status: 'CLEARED', exceptions: [{ id: 'exception-a', status: 'RESOLVED' }] }],
    stops: [{ id: 'stop-a', status: 'DELIVERED', proofOfDelivery: { deliveredCartons: 10 }, receipt: { status: 'CONFIRMED' } }],
  };
}

describe('Persisted dispatch trip monitoring and scope', () => {
  it('rejects a loader without an assigned depot before reading any trip records', async () => {
    const findMany = vi.fn();
    const service = new DispatchService({ query: { trips: { findMany } } } as never);
    await expect(service.listTrips(new TripFilterDto(), { ...loader, depotId: null })).rejects.toThrow(ForbiddenException);
    expect(findMany).not.toHaveBeenCalled();
  });

  it('rejects trip details from a different loader depot', async () => {
    const service = new DispatchService({ query: { trips: { findFirst: async () => tripFixture() } } } as never);
    await expect(service.getTripById('trip-a', { ...loader, depotId: 'depot-b' })).rejects.toThrow(ForbiddenException);
  });

  it('rejects trip details assigned to a different driver', async () => {
    const service = new DispatchService({ query: { trips: { findFirst: async () => tripFixture() } } } as never);
    await expect(service.getTripById('trip-a', { ...driver, id: 'other-driver' })).rejects.toThrow(ForbiddenException);
  });

  it('returns loading, POD and receipt state while excluding driver credentials', async () => {
    const service = new DispatchService({ query: { trips: { findFirst: async () => tripFixture() } } } as never);
    const result = await service.getTripById('trip-a', dispatcher);
    expect(result.status).toBe('COMPLETED');
    expect(result.loadingManifests[0].exceptions[0].status).toBe('RESOLVED');
    expect(result.stops[0].proofOfDelivery?.deliveredCartons).toBe(10);
    expect(result.stops[0].receipt?.status).toBe('CONFIRMED');
    expect(result.driver.user).not.toHaveProperty('passwordHash');
    expect(result.driver.user?.firstName).toBe('Sunil');
  });
});
