import { describe, expect, it } from 'vitest';
import { NotificationsService } from '../../src/communications/notifications.service';

const users = [
  { id: 'dispatch', role: 'dispatcher', depotId: 'depot-a' },
  { id: 'loader-a', role: 'loader', depotId: 'depot-a' },
  { id: 'loader-b', role: 'loader', depotId: 'depot-b' },
  { id: 'store-a', role: 'store_manager', depotId: null, outletId: 'outlet-a', outlet: { depotId: 'depot-a' } },
  { id: 'store-b', role: 'store_manager', depotId: null, outletId: 'outlet-b', outlet: { depotId: 'depot-b' } },
];
const service = new NotificationsService({ query: { users: { findMany: async () => users } } } as never);

describe('Notification recipient scope', () => {
  it('includes the affected store account without requiring a warehouse depot assignment', async () => {
    expect(await service.usersForRoles(['dispatcher', 'loader', 'store_manager'], {
      depotId: 'depot-b', outletIds: ['outlet-b'],
    })).toEqual(['dispatch', 'loader-b', 'store-b']);
  });
  it('does not notify unrelated stores when an event has no affected outlets', async () => {
    const scoped = new NotificationsService({ query: { users: { findMany: async () => users.filter((user) => user.role !== 'dispatcher') } } } as never);
    expect(await scoped.usersForRoles(['loader', 'store_manager'], { depotId: 'depot-a', outletIds: [] }))
      .toEqual(['loader-a']);
  });
  it('resolves depot-only store scope through the assigned outlet', async () => {
    expect(await service.usersForRoles(['dispatcher', 'loader', 'store_manager'], { depotId: 'depot-a' }))
      .toEqual(['dispatch', 'loader-a', 'store-a']);
  });
});
