import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { StoreController } from '../../src/store/store.controller';
import { StoreService } from '../../src/store/store.service';
import { OrdersController } from '../../src/orders/orders.controller';
import { OrdersService } from '../../src/orders/orders.service';
import { DRIZZLE_ORM, PG_POOL } from '../../src/database/database.module';
import { GlobalExceptionFilter } from '../../src/common/filters/global-exception.filter';
import { RolesGuard } from '../../src/common/guards/roles.guard';
import { ResourceScopeGuard } from '../../src/common/guards/resource-scope.guard';

describe('Store Manager Domain & Operational Integration', () => {
  let app: NestFastifyApplication;

  const mockOutletId = 'c1a11111-1111-4111-8111-111111111101';
  const otherOutletId = 'c2a22222-2222-4222-8222-222222222202';
  const mockOrderId = 'e1a11111-1111-4111-8111-111111111111';

  const mockOutlet = {
    id: mockOutletId,
    code: 'F-COL-01',
    name: 'Cargills Food City - Kollupitiya',
    brand: 'Fresh',
    district: 'Colombo',
    address: '123 Galle Road, Kollupitiya',
    contactPhone: '+94 11 234 5678',
    windowStart: '08:00',
    windowEnd: '18:00',
    isActive: true,
    depot: { id: 'd1', name: 'Peliyagoda Central Hub' },
  };

  const mockOrders = [
    {
      id: mockOrderId,
      orderNumber: 'ORD-2026-10-05-FR-1001',
      outletId: mockOutletId,
      brand: 'Fresh',
      tempRequirement: 'chilled',
      orderDate: '2026-10-05',
      status: 'ORDER_RECORDED',
      totalItemsCount: 45,
      totalWeightKg: '320.50',
      totalVolumeM3: '1.25',
      isCutoffLocked: false,
      submissionTime: new Date(),
    },
    {
      id: 'e2a22222-2222-4222-8222-222222222222',
      orderNumber: 'ORD-2026-10-05-FR-1002',
      outletId: mockOutletId,
      brand: 'Fresh',
      tempRequirement: 'ambient',
      orderDate: '2026-10-05',
      status: 'ORDER_RECORDED',
      totalItemsCount: 80,
      totalWeightKg: '650.00',
      totalVolumeM3: '2.80',
      isCutoffLocked: false,
      submissionTime: new Date(),
    },
  ];

  const mockStops = [
    {
      id: 's1',
      tripId: 't1',
      orderId: mockOrderId,
      outletId: mockOutletId,
      stopSequence: 1,
      status: 'DELIVERED',
      plannedArrivalTime: new Date('2026-10-05T09:30:00Z'),
      actualArrivalTime: new Date('2026-10-05T09:28:00Z'),
      actualDepartureTime: new Date('2026-10-05T09:55:00Z'),
      trip: {
        tripNumber: 'TRIP-20261005-01',
        operatingDate: '2026-10-05',
        status: 'EN_ROUTE',
        vehicle: { registrationNumber: 'WP-CAD-1029', vehicleType: 'truck_reefer', maxWeightKg: '5000' },
        driver: { user: { firstName: 'Sunil', lastName: 'Perera', phone: '+94 77 123 4567' } },
      },
      order: mockOrders[0],
      proofOfDelivery: {
        id: 'pod-1',
        storeRepName: 'Nimal Silva (Store Mgr)',
        storeRepSignatureUrl: 'data:image/svg+xml;base64,mockSign',
        photoEvidenceUrl: 'https://storage.local/pod/photo-1.jpg',
        geoLatitude: '6.89745',
        geoLongitude: '79.85612',
        capturedAt: new Date(),
      },
    },
    {
      id: 's2',
      tripId: 't2',
      orderId: 'e2a22222-2222-4222-8222-222222222222',
      outletId: mockOutletId,
      stopSequence: 2,
      status: 'ARRIVED',
      plannedArrivalTime: new Date('2026-10-05T11:15:00Z'),
      actualArrivalTime: new Date('2026-10-05T11:12:00Z'),
      actualDepartureTime: null,
      trip: {
        tripNumber: 'TRIP-20261005-02',
        operatingDate: '2026-10-05',
        status: 'EN_ROUTE',
        vehicle: { registrationNumber: 'WP-DAA-4481', vehicleType: 'truck_ambient', maxWeightKg: '8000' },
        driver: { user: { firstName: 'Kamal', lastName: 'Fernando', phone: '+94 71 987 6543' } },
      },
      order: mockOrders[1],
      proofOfDelivery: null,
    },
  ];

  let mockOrderLookupShouldFail = false;

  const mockDb = {
    query: {
      outlets: {
        findFirst: async () => mockOutlet,
      },
      orders: {
        findMany: async () => mockOrders,
        findFirst: async () => {
          if (mockOrderLookupShouldFail) {
            return null;
          }
          return mockOrders[0];
        },
      },
      tripStops: {
        findMany: async () => mockStops,
      },
      discrepancyClaims: {
        findMany: async () => [],
      },
    },
    insert: () => ({
      values: (val: any) => ({
        returning: async () => [
          {
            id: 'clm-uuid-1',
            claimNumber: val.claimNumber,
            orderId: val.orderId,
            outletId: val.outletId,
            status: 'LOGGED',
            discrepancyType: val.discrepancyType,
            shortfallQty: val.shortfallQty,
            notes: val.notes,
            createdAt: new Date(),
          },
        ],
      }),
    }),
  };

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [StoreController],
      providers: [
        StoreService,
        {
          provide: DRIZZLE_ORM,
          useValue: mockDb,
        },
        {
          provide: PG_POOL,
          useValue: { query: async () => ({ rows: [] }) },
        },
      ],
    })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(ResourceScopeGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    app.setGlobalPrefix('api/v1');
    app.useGlobalFilters(new GlobalExceptionFilter());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );

    await app.init();
    await app.listen(0);
  }, 30000);

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('Store Operational Overview (SM-1, ALT-1)', () => {
    it('GET /api/v1/store/overview should return store profile, cutoff info, and inbound deliveries', async () => {
      // Mocking request where queryOutletId is supplied (admin simulation)
      const res = await request(app.getHttpServer())
        .get(`/api/v1/store/overview?outletId=${mockOutletId}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('outlet');
      expect(res.body.outlet.code).toBe('F-COL-01');
      expect(res.body.outlet.brand).toBe('Fresh');
      expect(res.body.outlet.deliveryWindow).toBe('08:00 - 18:00');

      // Cutoff verification
      expect(res.body).toHaveProperty('cutoff');
      expect(res.body.cutoff.cutoffTime).toBe('16:00:00');
      expect(typeof res.body.cutoff.isPastCutoff).toBe('boolean');

      // Inbound Deliveries - Verify Split Deliveries for Fresh stores (ALT-1)
      expect(res.body.inboundDeliveries).toBeInstanceOf(Array);
      expect(res.body.inboundDeliveries.length).toBe(2);

      const chilledDelivery = res.body.inboundDeliveries.find((d: any) => d.tempRequirement === 'chilled');
      const ambientDelivery = res.body.inboundDeliveries.find((d: any) => d.tempRequirement === 'ambient');

      expect(chilledDelivery).toBeDefined();
      expect(chilledDelivery.vehiclePlate).toBe('WP-CAD-1029');
      expect(chilledDelivery.driverName).toBe('Sunil Perera');
      expect(chilledDelivery.hasPod).toBe(true);

      expect(ambientDelivery).toBeDefined();
      expect(ambientDelivery.vehiclePlate).toBe('WP-DAA-4481');
      expect(ambientDelivery.driverName).toBe('Kamal Fernando');
    });
  });

  describe('Delivery Tracking & Receiving Handover (SM-3, SM-POD-001)', () => {
    it('GET /api/v1/store/deliveries should return delivery records with proof of delivery', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/store/deliveries?outletId=${mockOutletId}`);

      expect(res.status).toBe(200);
      expect(res.body).toBeInstanceOf(Array);
      expect(res.body.length).toBe(2);

      const deliveredStop = res.body.find((s: any) => s.status === 'DELIVERED');
      expect(deliveredStop).toBeDefined();
      expect(deliveredStop.proofOfDelivery).toBeDefined();
      expect(deliveredStop.proofOfDelivery.storeRepName).toBe('Nimal Silva (Store Mgr)');
      expect(deliveredStop.proofOfDelivery.geoLatitude).toBe('6.89745');
    });
  });

  describe('Receiving Discrepancy Claims (SM-DISC-001, SM-3)', () => {
    it('POST /api/v1/store/discrepancies should validate input and log claim', async () => {
      // Create user context simulation
      const payload = {
        orderId: mockOrderId,
        discrepancyType: 'DAMAGE_IN_TRANSIT',
        shortfallQty: 3,
        notes: '3 units crushed during transit due to improper pallet restraint',
      };

      // In real runtime, CurrentUser is populated from JWT
      // Since unit test tests the controller/service integration:
      const service = app.get(StoreService);
      const claim = await service.createDiscrepancyClaim(payload as any, {
        id: 'u1',
        email: 'mgr@cargills.lk',
        role: 'store_manager',
        outletId: mockOutletId,
      });

      expect(claim).toHaveProperty('id');
      expect(claim.claimNumber).toMatch(/^CLM-\d{8}-\d{4}$/);
      expect(claim.status).toBe('LOGGED');
      expect(claim.discrepancyType).toBe('DAMAGE_IN_TRANSIT');
      expect(claim.shortfallQty).toBe(3);
    });

    it('should reject discrepancy claim for an order belonging to another outlet (SM-SEC-001)', async () => {
      mockOrderLookupShouldFail = true;
      try {
        const service = app.get(StoreService);
        const payload = {
          orderId: 'foreign-order-id',
          discrepancyType: 'STORE_SHORTFALL',
          shortfallQty: 1,
        };

        await expect(
          service.createDiscrepancyClaim(payload as any, {
            id: 'u1',
            email: 'mgr@cargills.lk',
            role: 'store_manager',
            outletId: otherOutletId,
          }),
        ).rejects.toThrow();
      } finally {
        mockOrderLookupShouldFail = false;
      }
    });
  });
});
