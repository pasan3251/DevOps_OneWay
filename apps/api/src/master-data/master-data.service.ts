import { Injectable, Inject } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import { DRIZZLE_ORM, DrizzleDb } from '../database/database.module';
import * as schema from '../database/schema';

@Injectable()
export class MasterDataService {
  constructor(@Inject(DRIZZLE_ORM) private readonly db: DrizzleDb) {}

  async getDepots() {
    return this.db.query.depots.findMany({
      where: eq(schema.depots.isActive, true),
    });
  }

  async getOutlets(brand?: 'Fresh' | 'Style' | 'Tech', district?: string, depotId?: string) {
    const conditions = [eq(schema.outlets.isActive, true)];
    if (brand) conditions.push(eq(schema.outlets.brand, brand));
    if (district) conditions.push(eq(schema.outlets.district, district));
    if (depotId) conditions.push(eq(schema.outlets.depotId, depotId));

    return this.db.query.outlets.findMany({
      where: and(...conditions),
      with: {
        depot: true,
      },
    });
  }

  async getVehicles(depotId?: string, status?: 'available' | 'in_transit' | 'maintenance' | 'offline') {
    const conditions = [eq(schema.vehicles.isActive, true)];
    if (depotId) conditions.push(eq(schema.vehicles.depotId, depotId));
    if (status) conditions.push(eq(schema.vehicles.status, status));

    return this.db.query.vehicles.findMany({
      where: and(...conditions),
      with: {
        depot: true,
      },
    });
  }

  async getDrivers(depotId?: string, status?: 'available' | 'on_trip' | 'off_duty') {
    const conditions = [eq(schema.drivers.isActive, true)];
    if (depotId) conditions.push(eq(schema.drivers.depotId, depotId));
    if (status) conditions.push(eq(schema.drivers.status, status));

    const drivers = await this.db.query.drivers.findMany({
      where: and(...conditions),
      with: {
        user: true,
        depot: true,
      },
    });
    return drivers.map((driver) => ({
      ...driver,
      user: driver.user ? {
        id: driver.user.id,
        firstName: driver.user.firstName,
        lastName: driver.user.lastName,
        role: driver.user.role,
        phone: driver.user.phone,
        depotId: driver.user.depotId,
        isActive: driver.user.isActive,
      } : null,
    }));
  }

  async getProducts(brand?: 'Fresh' | 'Style' | 'Tech', tempRequirement?: 'ambient' | 'chilled') {
    const conditions = [eq(schema.products.isActive, true)];
    if (brand) conditions.push(eq(schema.products.brand, brand));
    if (tempRequirement) conditions.push(eq(schema.products.tempRequirement, tempRequirement));

    return this.db.query.products.findMany({
      where: and(...conditions),
    });
  }
}
