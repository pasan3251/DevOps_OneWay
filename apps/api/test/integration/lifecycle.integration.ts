import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { beforeAll, beforeEach, afterAll, afterEach, describe, expect, it, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe, type Type } from '@nestjs/common';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { eq, inArray } from 'drizzle-orm';
import * as argon2 from 'argon2';
import * as schema from '../../src/database/schema';
import type { DrizzleDb } from '../../src/database/database.module';

type Role = 'dispatcher' | 'loader' | 'driver' | 'store_manager';
type Fixture = {
  depotId: string; outletId: string; vehicleId: string; driverId: string;
  productIds: { ambient: string; chilled: string };
  userIds: Record<Role, string>; tokens: Record<Role, string>;
};
type Trip = { id: string; planVersionId: string; status: string; stops: Array<{ id: string; orderId: string; stopSequence: number; loadingSequence: number }> };
type SyncResult = { results: Array<{ clientMutationId: string; status: string }>; deduplicatedCount: number; conflictCount: number };

const operatingDate = '2026-10-06';
const password = 'IntegrationTestOnly123!';
let app: NestFastifyApplication;
let pool: Pool;
let db: DrizzleDb;
let passwordHash: string;

async function request<T>(fixture: Fixture, role: Role, method: 'GET' | 'POST' | 'PATCH', endpoint: string,
  payload?: Record<string, unknown>, status = 200): Promise<T> {
  const response = await app.inject({ method, url: `/api/v1${endpoint}`, payload,
    headers: { authorization: `Bearer ${fixture.tokens[role]}` } });
  expect(response.statusCode, response.body).toBe(status);
  return response.json() as T;
}

async function fixture(): Promise<Fixture> {
  const tag = randomUUID().slice(0, 8);
  const [depot] = await db.insert(schema.depots).values({ code: `IT-DEP-${tag}`, name: `Peliyagoda test ${tag}`,
    province: 'Western', latitude: '6.9667000', longitude: '79.9167000', operatingHoursOpen: '03:30', operatingHoursClose: '22:00' }).returning();
  const [outlet] = await db.insert(schema.outlets).values({ code: `IT-OUT-${tag}`, name: `Fresh test ${tag}`, brand: 'Fresh', district: 'Colombo',
    depotId: depot.id, latitude: '6.9680000', longitude: '79.9180000', address: 'Test receiving dock', contactPhone: '+94110000000',
    windowStart: '06:00', windowEnd: '08:00', dockType: 'rear_dock', serviceTimeMinutes: '15.00' }).returning();
  const roles: Role[] = ['dispatcher', 'loader', 'driver', 'store_manager'];
  const users = await db.insert(schema.users).values(roles.map((role) => ({ email: `${role}.${tag}@integration.test`,
    passwordHash, firstName: role, lastName: 'Operator', role, depotId: role === 'store_manager' ? null : depot.id,
    outletId: role === 'store_manager' ? outlet.id : null }))).returning();
  const driverUser = users.find((user) => user.role === 'driver')!;
  const [driver] = await db.insert(schema.drivers).values({ userId: driverUser.id, depotId: depot.id,
    licenseNumber: `IT-LIC-${tag}`, phone: '+94110000001' }).returning();
  const [vehicle] = await db.insert(schema.vehicles).values({ registrationNumber: `IT-VAN-${tag}`, depotId: depot.id,
    vehicleType: 'van_reefer', bodyType: 'van', refrigerationType: 'reefer', maxWeightKg: '1000.00', maxVolumeM3: '5.00',
    fuelEfficiencyKmPerL: '7.00', weeklyFuelQuotaL: '120.00' }).returning();
  const products = await db.insert(schema.products).values((['ambient', 'chilled'] as const).map((temperature) => ({
    sku: `IT-${temperature}-${tag}`, name: `${temperature} integration item`, brand: 'Fresh' as const, category: 'Test',
    tempRequirement: temperature, unitWeightKg: '1.000', unitVolumeM3: '0.0100', unitPrice: '100.00',
  }))).returning();
  const result: Fixture = { depotId: depot.id, outletId: outlet.id, driverId: driver.id, vehicleId: vehicle.id,
    productIds: { ambient: products[0].id, chilled: products[1].id }, userIds: {} as Record<Role, string>, tokens: {} as Record<Role, string> };
  for (const user of users) {
    const response = await app.inject({ method: 'POST', url: '/api/v1/auth/login', payload: { email: user.email, password } });
    expect(response.statusCode, response.body).toBe(200);
    const body = response.json() as { accessToken: string; user: Record<string, unknown> };
    expect(body.user).not.toHaveProperty('passwordHash');
    result.tokens[user.role as Role] = body.accessToken;
    result.userIds[user.role as Role] = user.id;
  }
  return result;
}

async function createOrder(context: Fixture, temperature: 'ambient' | 'chilled' = 'ambient') {
  return request<{ id: string; status: string }>(context, 'store_manager', 'POST', '/orders', {
    outletId: context.outletId, brand: 'Fresh', tempRequirement: temperature, orderDate: operatingDate,
    items: [{ productId: context.productIds[temperature], quantity: 10 }],
  }, 201);
}

async function publishTrip(context: Fixture, orderIds: string[]): Promise<Trip> {
  const trip = await request<Trip>(context, 'dispatcher', 'POST', '/dispatch/plan', {
    depotId: context.depotId, vehicleId: context.vehicleId, driverId: context.driverId, brand: 'Fresh', district: 'Colombo',
    operatingDate, plannedDepartureTime: `${operatingDate}T05:30:00+05:30`, orderIds,
  }, 201);
  await request(context, 'dispatcher', 'POST', `/dispatch/plans/${trip.planVersionId}/validate`, {}, 201);
  await request(context, 'dispatcher', 'POST', `/dispatch/plans/${trip.planVersionId}/publish`, {}, 201);
  return trip;
}

async function clear(context: Fixture, tripId: string) {
  await request(context, 'loader', 'POST', `/loader/manifests/${tripId}/verify`, { notes: 'SKU and LIFO checks complete' });
  await request(context, 'loader', 'POST', `/loader/manifests/${tripId}/gate-clear`, { sealNumber: 'TEST-SEAL' });
}

const readiness = { vehicleRoadworthy: true, manifestAndSealMatched: true, fuelConfirmed: true, reeferTemperatureConfirmed: true };
function pod(deliveredCartons = 10) {
  return { storeRepName: 'Receiving Representative', outcome: deliveredCartons === 10 ? 'FULL' : 'PARTIAL', expectedCartons: 10,
    deliveredCartons, storeRepSignatureUrl: 'data:image/png;base64,aW50ZWdyYXRpb24tdGVzdA==',
    geoLatitude: 6.968, geoLongitude: 79.918, driverNotes: deliveredCartons < 10 ? 'Two cartons missing at handover' : 'Count matched' };
}

describe('Database-backed cross-role logistics lifecycle', () => {
  beforeAll(async () => {
    const testUrl = process.env.TEST_DATABASE_URL;
    if (!testUrl) throw new Error('TEST_DATABASE_URL is required; use a disposable local waypoint_integration_test database.');
    const target = new URL(testUrl);
    if (!['localhost', '127.0.0.1'].includes(target.hostname) || target.pathname !== '/waypoint_integration_test') {
      throw new Error('Integration tests only accept the dedicated local waypoint_integration_test database.');
    }
    pool = new Pool({ connectionString: testUrl });
    db = drizzle(pool, { schema });
    await migrate(db, { migrationsFolder: path.resolve('src/database/migrations') });
    passwordHash = await argon2.hash(password);
    // The compiled module retains the same Nest dependency metadata as production.
    const { AppModule } = require(path.resolve('dist/app.module.js')) as { AppModule: Type<unknown> };
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider('PG_POOL').useValue(pool)
      .overrideProvider('DRIZZLE_ORM').useValue(db)
      .overrideProvider(ConfigService).useValue(new ConfigService({ JWT_SECRET: 'integration-only-access-secret',
        JWT_REFRESH_SECRET: 'integration-only-refresh-secret', JWT_EXPIRES_IN: '7d' }))
      .compile();
    app = module.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true,
      transformOptions: { enableImplicitConversion: true } }));
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });
  beforeEach(() => { vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date('2026-10-05T05:00:00Z')); });
  afterEach(() => vi.useRealTimers());
  afterAll(async () => { if (app) await app.close(); if (pool && !pool.ending) await pool.end(); });

  it('persists order, publication, loading, readiness, POD, receipt, notifications and audit across all four roles', async () => {
    const context = await fixture();
    const order = await createOrder(context);
    expect(order.status).toBe('ORDER_RECORDED');
    const backlog = await request<{ data: Array<{ id: string; outlet: { depot: { id: string } } }> }>(context, 'dispatcher', 'GET', `/orders?orderDate=${operatingDate}&limit=100`);
    expect(backlog.data.find((item) => item.id === order.id)?.outlet.depot.id).toBe(context.depotId);
    const trip = await publishTrip(context, [order.id]);
    await request(context, 'dispatcher', 'POST', `/dispatch/plans/${trip.planVersionId}/publish`, {}, 201);
    expect(await db.query.loadingManifests.findMany({ where: eq(schema.loadingManifests.tripId, trip.id) })).toHaveLength(1);
    await request(context, 'loader', 'POST', `/loader/manifests/${trip.id}/gate-clear`, {}, 409);
    await clear(context, trip.id);
    const active = await request<Trip>(context, 'driver', 'GET', '/driver/active-trip');
    expect(active.id).toBe(trip.id);
    await request(context, 'driver', 'POST', `/driver/trips/${trip.id}/depart`, {}, 409);
    await request(context, 'driver', 'POST', `/driver/trips/${trip.id}/readiness`, readiness);
    vi.setSystemTime(new Date(`${operatingDate}T05:30:00+05:30`));
    await request(context, 'driver', 'POST', `/driver/trips/${trip.id}/depart`, {});
    const stopId = trip.stops[0].id;
    vi.setSystemTime(new Date(`${operatingDate}T05:40:00+05:30`));
    const arrival = await request<{ status: string }>(context, 'driver', 'POST', `/driver/stops/${stopId}/arrive`, { currentLatitude: 6.968, currentLongitude: 79.918 });
    expect(arrival.status).toBe('WAITING_WINDOW');
    await request(context, 'driver', 'POST', `/driver/stops/${stopId}/deliver`, pod(), 409);
    vi.setSystemTime(new Date(`${operatingDate}T06:05:00+05:30`));
    await request(context, 'driver', 'POST', `/driver/stops/${stopId}/deliver`, pod());
    const inbound = await request<Array<{ orderId: string; proofOfDelivery: unknown }>>(context, 'store_manager', 'GET', '/store/deliveries');
    expect(inbound.find((delivery) => delivery.orderId === order.id)?.proofOfDelivery).toBeTruthy();
    await request(context, 'store_manager', 'POST', '/store/receipts', { orderId: order.id, tripStopId: stopId }, 201);
    await request(context, 'driver', 'POST', `/driver/trips/${trip.id}/complete`, { latitude: 6.9667, longitude: 79.9167 });
    expect((await db.query.orders.findFirst({ where: eq(schema.orders.id, order.id) }))?.status).toBe('RECEIVED');
    expect((await db.query.trips.findFirst({ where: eq(schema.trips.id, trip.id) }))?.status).toBe('COMPLETED');
    const monitoring = await request<{ stops: Array<{ receipt: { status: string }; proofOfDelivery: { deliveredCartons: number } }> }>(context, 'dispatcher', 'GET', `/dispatch/trips/${trip.id}`);
    expect(monitoring.stops[0].receipt.status).toBe('CONFIRMED');
    expect(monitoring.stops[0].proofOfDelivery.deliveredCartons).toBe(10);
    const events = await db.query.auditLogs.findMany({ where: inArray(schema.auditLogs.entityId, [order.id, trip.id, trip.planVersionId, stopId]) });
    expect(events.map((event) => event.action)).toEqual(expect.arrayContaining(['order.created', 'plan.published', 'departure.cleared', 'driver.ready', 'trip.departed', 'trip.arrived', 'delivery.completed']));
    const notices = await request<Array<{ type: string }>>(context, 'store_manager', 'GET', '/notifications');
    expect(notices.map((notice) => notice.type)).toEqual(expect.arrayContaining(['PLAN_PUBLISHED', 'TRIP_DEPARTED', 'DELIVERY_COMPLETED']));
  });

  it('blocks open loading exceptions and invalidates departure clearance during a controlled revision', async () => {
    const context = await fixture();
    const order = await createOrder(context);
    const trip = await publishTrip(context, [order.id]);
    const exception = await request<{ id: string }>(context, 'loader', 'POST', `/loader/manifests/${trip.id}/discrepancy`, {
      orderId: order.id, shortfallQty: 2, affectedSku: 'missing-cartons', exceptionType: 'DAMAGE', notes: 'Damaged cartons before loading',
    }, 201);
    await request(context, 'loader', 'POST', `/loader/manifests/${trip.id}/verify`, {}, 409);
    await request(context, 'dispatcher', 'POST', `/loader/exceptions/${exception.id}/resolve`, { resolution: 'Replacement cartons inspected; quantity restored before clearance' });
    await clear(context, trip.id);
    await request(context, 'driver', 'POST', `/driver/trips/${trip.id}/readiness`, readiness);
    const revision = await request<{ id: string }>(context, 'dispatcher', 'POST', `/dispatch/plans/${trip.planVersionId}/revisions`, { reason: 'Vehicle loading sequence requires re-verification' }, 201);
    expect((await db.query.loadingManifests.findFirst({ where: eq(schema.loadingManifests.tripId, trip.id) }))?.status).toBe('STALE');
    await request(context, 'driver', 'POST', `/driver/trips/${trip.id}/depart`, {}, 409);
    await request(context, 'dispatcher', 'POST', `/dispatch/plans/${revision.id}/publish`, {}, 201);
    const revisedTrip = await db.query.trips.findFirst({ where: eq(schema.trips.planVersionId, revision.id) });
    expect(revisedTrip).toBeTruthy();
    await request(context, 'loader', 'POST', `/loader/manifests/${revisedTrip!.id}/gate-clear`, {}, 409);
    await clear(context, revisedTrip!.id);
  });

  it('replays offline events chronologically, deduplicates them, preserves timestamps and persists rejected conflicts', async () => {
    const context = await fixture();
    const ambient = await createOrder(context);
    const chilled = await createOrder(context, 'chilled');
    const trip = await publishTrip(context, [ambient.id, chilled.id]);
    expect(trip.stops.map((stop) => stop.loadingSequence)).toEqual([2, 1]);
    await clear(context, trip.id);
    const first = trip.stops[0].id;
    const second = trip.stops[1].id;
    const event = (action: string, time: string, payload: Record<string, unknown>) => ({ clientMutationId: randomUUID(), entity: payload.stopId ? 'trip_stop' : 'trip', action,
      occurredAt: `${operatingDate}T${time}:00+05:30`, payload });
    const mutations = [
      event('confirm_readiness', '05:25', { tripId: trip.id, ...readiness }),
      event('depart_trip', '05:30', { tripId: trip.id }),
      event('arrive_stop', '06:05', { stopId: first, currentLatitude: 6.968, currentLongitude: 79.918 }),
      event('report_delay', '06:06', { stopId: first, delayMinutes: 20, reason: 'Receiving queue' }),
      event('deliver_stop', '06:10', { stopId: first, ...pod(8) }),
      event('fail_stop', '06:20', { stopId: second, failureReason: 'DELIVERY_REJECTED', driverNotes: 'Receiving staff refused chilled goods', affectedCartons: 10, photoEvidenceUrl: 'test-evidence.jpg' }),
      event('complete_trip', '06:45', { tripId: trip.id, latitude: 6.9667, longitude: 79.9167 }),
    ];
    vi.setSystemTime(new Date(`${operatingDate}T07:00:00+05:30`));
    const synced = await request<SyncResult>(context, 'driver', 'POST', '/sync/mutations', { mutations: [...mutations].reverse() });
    expect(synced.results.map((result) => result.status)).toEqual(mutations.map(() => 'COMMITTED'));
    expect((await db.query.proofOfDeliveries.findFirst({ where: eq(schema.proofOfDeliveries.tripStopId, first) }))?.capturedAt.toISOString()).toBe(new Date(mutations[4].occurredAt).toISOString());
    const failed = await db.query.tripStops.findFirst({ where: eq(schema.tripStops.id, second) });
    expect(failed?.status).toBe('FAILED');
    expect(failed?.failurePhotoUrl).toBe('test-evidence.jpg');
    expect(failed?.actualDepartureTime?.toISOString()).toBe(new Date(mutations[5].occurredAt).toISOString());
    const replayed = await request<SyncResult>(context, 'driver', 'POST', '/sync/mutations', { mutations });
    expect(replayed.deduplicatedCount).toBe(7);
    expect(await db.query.proofOfDeliveries.findMany({ where: eq(schema.proofOfDeliveries.tripStopId, first) })).toHaveLength(1);
    const invalid = event('arrive_stop', '07:05', { stopId: second });
    const conflict = await request<SyncResult>(context, 'driver', 'POST', '/sync/mutations', { mutations: [invalid] });
    expect(conflict.conflictCount).toBe(1);
    expect((await db.query.syncConflicts.findFirst({ where: eq(schema.syncConflicts.clientMutationId, invalid.clientMutationId) }))?.status).toBe('OPEN');
    await request(context, 'store_manager', 'POST', '/store/discrepancies', { orderId: ambient.id, tripStopId: first, discrepancyType: 'STORE_SHORTFALL', shortfallQty: 2, notes: 'Count differed at physical receiving' }, 201);
    expect((await db.query.orders.findFirst({ where: eq(schema.orders.id, ambient.id) }))?.status).toBe('DISPUTED');
  });

  it('shares persisted messages and profile data while enforcing account and outlet scope', async () => {
    const context = await fixture();
    const other = await fixture();
    const created = await request<{ conversation: { id: string } }>(context, 'dispatcher', 'POST', '/messages/conversations', {
      participantIds: [context.userIds.loader], initialMessage: 'Please confirm the loading sequence',
    }, 201);
    const history = await request<Array<{ content: string }>>(context, 'loader', 'GET', `/messages/conversations/${created.conversation.id}`);
    expect(history[0].content).toBe('Please confirm the loading sequence');
    await request(context, 'driver', 'GET', `/messages/conversations/${created.conversation.id}`, undefined, 403);
    await request(context, 'loader', 'POST', `/messages/conversations/${created.conversation.id}/read`, {}, 201);
    expect(await db.query.messageReadStates.findMany({ where: eq(schema.messageReadStates.userId, context.userIds.loader) })).toHaveLength(1);
    await request(context, 'loader', 'PATCH', '/auth/me', { phone: '+94112345678' });
    expect((await request<{ phone: string }>(context, 'loader', 'GET', '/auth/me')).phone).toBe('+94112345678');
    const otherOrder = await createOrder(other);
    await request(context, 'store_manager', 'GET', `/orders/${otherOrder.id}`, undefined, 403);
    await request(context, 'driver', 'GET', '/orders', undefined, 403);
    await db.update(schema.users).set({ isActive: false }).where(eq(schema.users.id, context.userIds.loader));
    await request(context, 'loader', 'GET', '/auth/me', undefined, 401);
  });
});
