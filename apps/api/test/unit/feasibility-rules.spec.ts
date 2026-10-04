import { describe, it, expect } from 'vitest';
import { FeasibilityRulesEngine } from '../../src/dispatch/rules/feasibility.rules';
import { Vehicle, Outlet, Order } from '../../src/database/schema';

describe('FeasibilityRulesEngine (7 Core Logistics Invariants)', () => {
  const mockDepotId = 'depot-peliyagoda-uuid';

  const mockReeferTruck: Vehicle = {
    id: 'veh-reefer-truck',
    registrationNumber: 'WP-DAA-1001',
    depotId: mockDepotId,
    vehicleType: 'truck_reefer',
    bodyType: 'truck',
    refrigerationType: 'reefer',
    maxWeightKg: '5000.00',
    maxVolumeM3: '22.00',
    status: 'available',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockAmbientTruck: Vehicle = {
    ...mockReeferTruck,
    id: 'veh-ambient-truck',
    registrationNumber: 'WP-CAB-2001',
    vehicleType: 'truck_ambient',
    refrigerationType: 'ambient',
  };

  const mockReeferVan: Vehicle = {
    ...mockReeferTruck,
    id: 'veh-reefer-van',
    registrationNumber: 'WP-DAA-1002',
    vehicleType: 'van_reefer',
    bodyType: 'van',
    maxWeightKg: '1500.00',
    maxVolumeM3: '8.50',
  };

  const mockOutletA: Outlet = {
    id: 'outlet-a',
    code: 'OUT-FRESH-001',
    name: 'Peliyagoda Fresh Main',
    brand: 'Fresh',
    district: 'Gampaha',
    depotId: mockDepotId,
    latitude: '6.9680000',
    longitude: '79.9180000',
    address: 'Peliyagoda',
    contactPhone: '+94 11 291 0001',
    windowStart: '08:00',
    windowEnd: '12:00',
    isVanOnly: false,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockOutletVanOnly: Outlet = {
    ...mockOutletA,
    id: 'outlet-van-only',
    code: 'OUT-FRESH-002',
    name: 'Negombo Fresh Alley',
    isVanOnly: true,
  };

  const mockOutletOtherDistrict: Outlet = {
    ...mockOutletA,
    id: 'outlet-colombo',
    code: 'OUT-FRESH-003',
    name: 'Colombo Fresh Mart',
    district: 'Colombo',
  };

  const mockOutletOtherDepot: Outlet = {
    ...mockOutletA,
    id: 'outlet-kandy',
    code: 'OUT-FRESH-K01',
    name: 'Kandy Fresh Hub',
    district: 'Kandy',
    depotId: 'depot-kandy-uuid',
  };

  const mockOrderAmbient: Order = {
    id: 'order-1',
    orderNumber: 'ORD-2026-001',
    outletId: mockOutletA.id,
    brand: 'Fresh',
    tempRequirement: 'ambient',
    orderDate: '2026-10-05',
    submissionTime: new Date(),
    status: 'ORDER_RECORDED',
    totalWeightKg: '500.00',
    totalVolumeM3: '2.50',
    totalItemsCount: 50,
    isCutoffLocked: false,
    deferredCount: 0,
    lastDeferredDate: null,
    deferralReason: null,
    createdBy: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockOrderChilled: Order = {
    ...mockOrderAmbient,
    id: 'order-2',
    orderNumber: 'ORD-2026-002',
    tempRequirement: 'chilled',
    totalWeightKg: '600.00',
    totalVolumeM3: '3.00',
  };

  it('Rule 1: should PASS when all orders have identical brand and identical district', () => {
    const result = FeasibilityRulesEngine.validate({
      vehicle: mockReeferTruck,
      driverId: 'driver-1',
      brand: 'Fresh',
      district: 'Gampaha',
      operatingDate: '2026-10-05',
      ordersWithOutlets: [
        { order: mockOrderAmbient, outlet: mockOutletA },
        { order: mockOrderChilled, outlet: mockOutletA },
      ],
      plannedDurationMin: 120,
    });

    expect(result.isValid).toBe(true);
    expect(result.violations).toHaveLength(0);
  });

  it('Rule 1: should REJECT when an outlet is in a different district', () => {
    const result = FeasibilityRulesEngine.validate({
      vehicle: mockReeferTruck,
      driverId: 'driver-1',
      brand: 'Fresh',
      district: 'Gampaha',
      operatingDate: '2026-10-05',
      ordersWithOutlets: [
        { order: mockOrderAmbient, outlet: mockOutletA },
        { order: mockOrderChilled, outlet: mockOutletOtherDistrict },
      ],
      plannedDurationMin: 120,
    });

    expect(result.isValid).toBe(false);
    expect(result.violations.some((v) => v.ruleCode === 'BR-TRIP-001B')).toBe(true);
  });

  it('Rule 2: should REJECT chilled cargo on ambient-only vehicle', () => {
    const result = FeasibilityRulesEngine.validate({
      vehicle: mockAmbientTruck,
      driverId: 'driver-1',
      brand: 'Fresh',
      district: 'Gampaha',
      operatingDate: '2026-10-05',
      ordersWithOutlets: [
        { order: mockOrderChilled, outlet: mockOutletA },
      ],
      plannedDurationMin: 90,
    });

    expect(result.isValid).toBe(false);
    expect(result.violations.some((v) => v.ruleCode === 'BR-VEH-002')).toBe(true);
  });

  it('Rule 2: should ALLOW ambient goods on reefer vehicle (overflow capability)', () => {
    const result = FeasibilityRulesEngine.validate({
      vehicle: mockReeferTruck,
      driverId: 'driver-1',
      brand: 'Fresh',
      district: 'Gampaha',
      operatingDate: '2026-10-05',
      ordersWithOutlets: [
        { order: mockOrderAmbient, outlet: mockOutletA },
      ],
      plannedDurationMin: 90,
    });

    expect(result.isValid).toBe(true);
  });

  it('Rule 3: should REJECT truck vehicle when serving van-only outlet', () => {
    const result = FeasibilityRulesEngine.validate({
      vehicle: mockReeferTruck, // truck body type
      driverId: 'driver-1',
      brand: 'Fresh',
      district: 'Gampaha',
      operatingDate: '2026-10-05',
      ordersWithOutlets: [
        { order: mockOrderChilled, outlet: mockOutletVanOnly },
      ],
      plannedDurationMin: 90,
    });

    expect(result.isValid).toBe(false);
    expect(result.violations.some((v) => v.ruleCode === 'BR-OUT-003')).toBe(true);
  });

  it('Rule 3: should ALLOW van vehicle for van-only outlet', () => {
    const result = FeasibilityRulesEngine.validate({
      vehicle: mockReeferVan, // van body type
      driverId: 'driver-1',
      brand: 'Fresh',
      district: 'Gampaha',
      operatingDate: '2026-10-05',
      ordersWithOutlets: [
        { order: mockOrderChilled, outlet: mockOutletVanOnly },
      ],
      plannedDurationMin: 90,
    });

    expect(result.isValid).toBe(true);
  });

  it('Rule 4: should REJECT when outlet home depot differs from vehicle home depot', () => {
    const result = FeasibilityRulesEngine.validate({
      vehicle: mockReeferTruck, // Peliyagoda depot
      driverId: 'driver-1',
      brand: 'Fresh',
      district: 'Kandy',
      operatingDate: '2026-10-05',
      ordersWithOutlets: [
        { order: mockOrderAmbient, outlet: mockOutletOtherDepot }, // Kandy depot
      ],
      plannedDurationMin: 90,
    });

    expect(result.isValid).toBe(false);
    expect(result.violations.some((v) => v.ruleCode === 'BR-DEP-004')).toBe(true);
  });

  it('Rule 6: should REJECT when manifest total weight exceeds vehicle capacity', () => {
    const overweightOrder: Order = {
      ...mockOrderAmbient,
      totalWeightKg: '6500.00', // Exceeds 5000kg maxWeightKg
    };

    const result = FeasibilityRulesEngine.validate({
      vehicle: mockReeferTruck,
      driverId: 'driver-1',
      brand: 'Fresh',
      district: 'Gampaha',
      operatingDate: '2026-10-05',
      ordersWithOutlets: [
        { order: overweightOrder, outlet: mockOutletA },
      ],
      plannedDurationMin: 90,
    });

    expect(result.isValid).toBe(false);
    expect(result.violations.some((v) => v.ruleCode === 'BR-CAP-006A')).toBe(true);
  });

  it('Rule 6: should REJECT when manifest total volume exceeds vehicle capacity', () => {
    const cubeoutOrder: Order = {
      ...mockOrderAmbient,
      totalVolumeM3: '28.00', // Exceeds 22m3 maxVolumeM3
    };

    const result = FeasibilityRulesEngine.validate({
      vehicle: mockReeferTruck,
      driverId: 'driver-1',
      brand: 'Fresh',
      district: 'Gampaha',
      operatingDate: '2026-10-05',
      ordersWithOutlets: [
        { order: cubeoutOrder, outlet: mockOutletA },
      ],
      plannedDurationMin: 90,
    });

    expect(result.isValid).toBe(false);
    expect(result.violations.some((v) => v.ruleCode === 'BR-CAP-006B')).toBe(true);
  });

  it('Rule 7: should REJECT assigning a 3rd trip to the same vehicle on the same day', () => {
    const result = FeasibilityRulesEngine.validate({
      vehicle: mockReeferTruck,
      driverId: 'driver-1',
      brand: 'Fresh',
      district: 'Gampaha',
      operatingDate: '2026-10-05',
      ordersWithOutlets: [
        { order: mockOrderAmbient, outlet: mockOutletA },
      ],
      plannedDurationMin: 60,
      priorTripsForVehicleToday: 2, // Already did 2 trips
    });

    expect(result.isValid).toBe(false);
    expect(result.violations.some((v) => v.ruleCode === 'BR-BUD-007A')).toBe(true);
  });

  it('Rule 7: should REJECT when driving time exceeds Fresh daily 270 min budget', () => {
    const result = FeasibilityRulesEngine.validate({
      vehicle: mockReeferTruck,
      driverId: 'driver-1',
      brand: 'Fresh',
      district: 'Gampaha',
      operatingDate: '2026-10-05',
      ordersWithOutlets: [
        { order: mockOrderAmbient, outlet: mockOutletA },
      ],
      plannedDurationMin: 100,
      priorTripsForVehicleToday: 1,
      priorDrivingMinutesForVehicleToday: 200, // 200 + 100 = 300 > 270 min
    });

    expect(result.isValid).toBe(false);
    expect(result.violations.some((v) => v.ruleCode === 'BR-BUD-007B')).toBe(true);
  });
});
