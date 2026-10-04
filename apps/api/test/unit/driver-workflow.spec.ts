import { afterEach, describe, expect, it, vi } from 'vitest';
import { ConflictException } from '@nestjs/common';
import { DriverService } from '../../src/driver/driver.service';

const driver = {
  id: 'driver-1',
  userId: 'user-1',
  isActive: true,
};

function updateRecorder() {
  const updates: Record<string, unknown>[] = [];
  return {
    updates,
    update: () => ({
      set: (payload: Record<string, unknown>) => {
        updates.push(payload);
        return {
          where: () => ({
            returning: async () => [{ id: 'updated', ...payload }],
          }),
        };
      },
    }),
  };
}

describe('Driver workflow state gates', () => {
  afterEach(() => vi.useRealTimers());

  it('blocks departure until the driver readiness acknowledgement is stored', async () => {
    const db = {
      query: {
        drivers: { findFirst: async () => driver },
        trips: {
          findFirst: async () => ({
            id: 'trip-1',
            driverId: driver.id,
            vehicleId: 'vehicle-1',
            status: 'MANIFEST_ISSUED',
            gateClearedAt: new Date(),
            driverReadyAt: null,
            stops: [],
          }),
        },
      },
    };
    const service = new DriverService(db as never);
    await expect(service.departTrip('trip-1', driver.userId)).rejects.toThrow(
      'Complete the driver readiness check before departure',
    );
  });

  it('uses the outlet/mall intersection and locks an early arrival', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-04T03:30:00.000Z')); // 09:00 Asia/Colombo
    const recorder = updateRecorder();
    const db = {
      ...recorder,
      query: {
        drivers: { findFirst: async () => driver },
        tripStops: {
          findFirst: async () => ({
            id: 'stop-1',
            tripId: 'trip-1',
            status: 'PENDING',
            outlet: {
              windowStart: '08:00',
              windowEnd: '18:00',
              mallWindowStart: '10:00',
              mallWindowEnd: '13:00',
              parkingConstraint: 'mall_dock',
            },
            trip: {
              driverId: driver.id,
              status: 'EN_ROUTE',
              stops: [{ id: 'stop-1', stopSequence: 1, status: 'PENDING' }],
            },
          }),
        },
      },
    };
    const service = new DriverService(db as never);
    const result = await service.arriveAtStop('stop-1', {}, driver.userId);
    expect(result.status).toBe('WAITING_WINDOW');
    expect(result.waitTimeMinutes).toBe(60);
    expect(recorder.updates[0]).toMatchObject({
      status: 'WAITING_WINDOW',
      waitTimeMinutes: 60,
      slaBreach: false,
    });
  });

  it('does not close a returning trip outside the home-depot geofence', async () => {
    const db = {
      query: {
        drivers: { findFirst: async () => driver },
        trips: {
          findFirst: async () => ({
            id: 'trip-1',
            driverId: driver.id,
            vehicleId: 'vehicle-1',
            status: 'RETURNING',
            stops: [{ id: 'stop-1', status: 'DELIVERED' }],
            depot: { latitude: '6.9640000', longitude: '79.8890000' },
          }),
        },
      },
    };
    const service = new DriverService(db as never);
    await expect(
      service.completeTrip(
        'trip-1',
        { latitude: 7.291, longitude: 80.638 },
        driver.userId,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
