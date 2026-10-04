import { BadRequestException } from '@nestjs/common';
import { Vehicle, Outlet, Order } from '../../database/schema';

export interface TripFeasibilityCandidate {
  vehicle: Vehicle;
  driverId: string;
  brand: 'Fresh' | 'Style' | 'Tech';
  district: string;
  operatingDate: string;
  ordersWithOutlets: {
    order: Order;
    outlet: Outlet;
  }[];
  plannedDurationMin?: number;
  priorTripsForVehicleToday?: number;
  priorDrivingMinutesForVehicleToday?: number;
}

export interface RuleViolation {
  ruleCode: string;
  ruleName: string;
  message: string;
}

export class FeasibilityRulesEngine {
  static validate(candidate: TripFeasibilityCandidate): { isValid: boolean; violations: RuleViolation[] } {
    const violations: RuleViolation[] = [];
    const { vehicle, ordersWithOutlets, brand, district } = candidate;

    if (!ordersWithOutlets || ordersWithOutlets.length === 0) {
      violations.push({
        ruleCode: 'BR-VAL-000',
        ruleName: 'Empty Trip',
        message: 'A trip must contain at least one order.',
      });
      return { isValid: false, violations };
    }

    // Rule 1: Single Brand and Single District
    for (const { order, outlet } of ordersWithOutlets) {
      if (order.brand !== brand) {
        violations.push({
          ruleCode: 'BR-TRIP-001A',
          ruleName: 'Single Brand Invariant',
          message: `Order #${order.orderNumber} brand '${order.brand}' violates trip brand '${brand}'.`,
        });
      }
      if (outlet.district !== district) {
        violations.push({
          ruleCode: 'BR-TRIP-001B',
          ruleName: 'Single District Invariant',
          message: `Outlet '${outlet.name}' in '${outlet.district}' violates trip district '${district}'.`,
        });
      }
    }

    // Rule 2: Refrigeration Feasibility
    const hasChilledOrders = ordersWithOutlets.some(
      ({ order }) => order.tempRequirement === 'chilled',
    );
    if (hasChilledOrders && vehicle.refrigerationType !== 'reefer') {
      violations.push({
        ruleCode: 'BR-VEH-002',
        ruleName: 'Chilled Cargo Refrigeration Invariant',
        message: `Trip contains chilled goods, but vehicle '${vehicle.registrationNumber}' is an ambient vehicle without active refrigeration.`,
      });
    }

    // Rule 3: Van-Only Access Restriction
    const hasVanOnlyOutlet = ordersWithOutlets.some(({ outlet }) => outlet.isVanOnly);
    if (hasVanOnlyOutlet && vehicle.bodyType !== 'van') {
      violations.push({
        ruleCode: 'BR-OUT-003',
        ruleName: 'Physical Outlet Access Restriction',
        message: `Trip serves an outlet with narrow access (van-only), but assigned vehicle '${vehicle.registrationNumber}' is a truck.`,
      });
    }

    // Rule 4: Home Depot Parity
    for (const { outlet } of ordersWithOutlets) {
      if (outlet.depotId !== vehicle.depotId) {
        violations.push({
          ruleCode: 'BR-DEP-004',
          ruleName: 'Home Depot Parity Invariant',
          message: `Outlet '${outlet.name}' is assigned to depot '${outlet.depotId}', but vehicle '${vehicle.registrationNumber}' belongs to depot '${vehicle.depotId}'.`,
        });
      }
    }

    // Rule 5: Whole Order Integrity
    const orderIds = ordersWithOutlets.map(({ order }) => order.id);
    const uniqueOrderIds = new Set(orderIds);
    if (uniqueOrderIds.size !== orderIds.length) {
      violations.push({
        ruleCode: 'BR-ORD-005',
        ruleName: 'Duplicate Order Invariant',
        message: 'Duplicate order assignment detected in candidate trip manifest.',
      });
    }

    // Rule 6: Two-Dimensional Physical Capacity
    let totalWeight = 0;
    let totalVolume = 0;
    for (const { order } of ordersWithOutlets) {
      totalWeight += Number(order.totalWeightKg);
      totalVolume += Number(order.totalVolumeM3);
    }

    const maxWeight = Number(vehicle.maxWeightKg);
    const maxVolume = Number(vehicle.maxVolumeM3);

    if (totalWeight > maxWeight) {
      violations.push({
        ruleCode: 'BR-CAP-006A',
        ruleName: 'Payload Overweight Invariant',
        message: `Manifest payload (${totalWeight.toFixed(1)} kg) exceeds vehicle max capacity (${maxWeight.toFixed(1)} kg) by ${(totalWeight - maxWeight).toFixed(1)} kg.`,
      });
    }

    if (totalVolume > maxVolume) {
      violations.push({
        ruleCode: 'BR-CAP-006B',
        ruleName: 'Volumetric Cubeout Invariant',
        message: `Manifest volume (${totalVolume.toFixed(2)} m³) exceeds vehicle cubic capacity (${maxVolume.toFixed(2)} m³) by ${(totalVolume - maxVolume).toFixed(2)} m³.`,
      });
    }

    // Rule 7: Vehicle Daily Budget and Max 2 Trips per Day
    const priorTrips = candidate.priorTripsForVehicleToday ?? 0;
    if (priorTrips >= 2) {
      violations.push({
        ruleCode: 'BR-BUD-007A',
        ruleName: 'Max Trips Per Vehicle Cap',
        message: `Vehicle '${vehicle.registrationNumber}' has already completed or been assigned 2 trips on ${candidate.operatingDate}. Max daily trip limit reached.`,
      });
    }

    const maxDailyDrivingBudget = brand === 'Fresh' ? 270 : 480;
    const priorMinutes = candidate.priorDrivingMinutesForVehicleToday ?? 0;
    const candidateMinutes = candidate.plannedDurationMin ?? 0;
    if (priorMinutes + candidateMinutes > maxDailyDrivingBudget) {
      violations.push({
        ruleCode: 'BR-BUD-007B',
        ruleName: 'Driver Shift Driving Budget Cap',
        message: `Cumulative daily driving time (${priorMinutes + candidateMinutes} min) exceeds maximum allowed ${brand} budget (${maxDailyDrivingBudget} min).`,
      });
    }

    return {
      isValid: violations.length === 0,
      violations,
    };
  }

  static assertValid(candidate: TripFeasibilityCandidate): void {
    const { isValid, violations } = this.validate(candidate);
    if (!isValid) {
      throw new BadRequestException({
        code: 'FEASIBILITY_RULE_VIOLATION',
        message: 'Trip plan failed logistics feasibility validation',
        details: violations,
      });
    }
  }
}
