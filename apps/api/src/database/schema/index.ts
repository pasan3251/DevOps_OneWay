import { relations } from 'drizzle-orm';

export * from './enums';
export * from './depots';
export * from './outlets';
export * from './users';
export * from './vehicles';
export * from './drivers';
export * from './products';
export * from './orders';
export * from './trips';
export * from './proofs';
export * from './discrepancies';
export * from './audit';
export * from './matrix';
export * from './mutations';
export * from './plans';
export * from './loading';
export * from './communications';
export * from './receiving';

import { depots } from './depots';
import { outlets } from './outlets';
import { users } from './users';
import { vehicles } from './vehicles';
import { drivers } from './drivers';
import { products } from './products';
import { orders, orderItems } from './orders';
import { trips, tripStops } from './trips';
import { proofOfDeliveries } from './proofs';
import { discrepancyClaims } from './discrepancies';
import { storeReceipts } from './receiving';
import { deliveryPlans, planVersions } from './plans';
import { loadingManifests, loadingExceptions } from './loading';

export const depotsRelations = relations(depots, ({ many }) => ({
  outlets: many(outlets),
  vehicles: many(vehicles),
  drivers: many(drivers),
  trips: many(trips),
}));

export const outletsRelations = relations(outlets, ({ one, many }) => ({
  depot: one(depots, {
    fields: [outlets.depotId],
    references: [depots.id],
  }),
  orders: many(orders),
  users: many(users),
  tripStops: many(tripStops),
}));

export const usersRelations = relations(users, ({ one }) => ({
  outlet: one(outlets, {
    fields: [users.outletId],
    references: [outlets.id],
  }),
  depot: one(depots, {
    fields: [users.depotId],
    references: [depots.id],
  }),
  driverProfile: one(drivers, {
    fields: [users.id],
    references: [drivers.userId],
  }),
}));

export const vehiclesRelations = relations(vehicles, ({ one, many }) => ({
  depot: one(depots, {
    fields: [vehicles.depotId],
    references: [depots.id],
  }),
  trips: many(trips),
}));

export const driversRelations = relations(drivers, ({ one, many }) => ({
  user: one(users, {
    fields: [drivers.userId],
    references: [users.id],
  }),
  depot: one(depots, {
    fields: [drivers.depotId],
    references: [depots.id],
  }),
  trips: many(trips),
}));

export const productsRelations = relations(products, ({ many }) => ({
  orderItems: many(orderItems),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  outlet: one(outlets, {
    fields: [orders.outletId],
    references: [outlets.id],
  }),
  createdBy: one(users, {
    fields: [orders.createdBy],
    references: [users.id],
  }),
  items: many(orderItems),
  tripStop: one(tripStops, {
    fields: [orders.id],
    references: [tripStops.orderId],
  }),
  discrepancies: many(discrepancyClaims),
  receipts: many(storeReceipts),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  product: one(products, {
    fields: [orderItems.productId],
    references: [products.id],
  }),
}));

export const tripsRelations = relations(trips, ({ one, many }) => ({
  planVersion: one(planVersions, {
    fields: [trips.planVersionId],
    references: [planVersions.id],
  }),
  depot: one(depots, {
    fields: [trips.depotId],
    references: [depots.id],
  }),
  vehicle: one(vehicles, {
    fields: [trips.vehicleId],
    references: [vehicles.id],
  }),
  driver: one(drivers, {
    fields: [trips.driverId],
    references: [drivers.id],
  }),
  gateClearedByUser: one(users, {
    fields: [trips.gateClearedBy],
    references: [users.id],
  }),
  stops: many(tripStops),
  loadingManifests: many(loadingManifests),
}));

export const loadingManifestsRelations = relations(loadingManifests, ({ one, many }) => ({
  trip: one(trips, { fields: [loadingManifests.tripId], references: [trips.id] }),
  exceptions: many(loadingExceptions),
}));

export const loadingExceptionsRelations = relations(loadingExceptions, ({ one }) => ({
  manifest: one(loadingManifests, { fields: [loadingExceptions.manifestId], references: [loadingManifests.id] }),
}));

export const deliveryPlansRelations = relations(deliveryPlans, ({ one, many }) => ({
  depot: one(depots, { fields: [deliveryPlans.depotId], references: [depots.id] }),
  versions: many(planVersions),
}));

export const planVersionsRelations = relations(planVersions, ({ one, many }) => ({
  plan: one(deliveryPlans, { fields: [planVersions.planId], references: [deliveryPlans.id] }),
  trips: many(trips),
}));

export const tripStopsRelations = relations(tripStops, ({ one }) => ({
  trip: one(trips, {
    fields: [tripStops.tripId],
    references: [trips.id],
  }),
  order: one(orders, {
    fields: [tripStops.orderId],
    references: [orders.id],
  }),
  outlet: one(outlets, {
    fields: [tripStops.outletId],
    references: [outlets.id],
  }),
  proofOfDelivery: one(proofOfDeliveries, {
    fields: [tripStops.id],
    references: [proofOfDeliveries.tripStopId],
  }),
  receipt: one(storeReceipts, {
    fields: [tripStops.id],
    references: [storeReceipts.tripStopId],
  }),
}));

export const storeReceiptsRelations = relations(storeReceipts, ({ one }) => ({
  order: one(orders, {
    fields: [storeReceipts.orderId],
    references: [orders.id],
  }),
  tripStop: one(tripStops, {
    fields: [storeReceipts.tripStopId],
    references: [tripStops.id],
  }),
  confirmedByUser: one(users, {
    fields: [storeReceipts.confirmedBy],
    references: [users.id],
  }),
}));

export const proofOfDeliveriesRelations = relations(proofOfDeliveries, ({ one }) => ({
  tripStop: one(tripStops, {
    fields: [proofOfDeliveries.tripStopId],
    references: [tripStops.id],
  }),
  order: one(orders, {
    fields: [proofOfDeliveries.orderId],
    references: [orders.id],
  }),
}));

export const discrepancyClaimsRelations = relations(discrepancyClaims, ({ one }) => ({
  order: one(orders, {
    fields: [discrepancyClaims.orderId],
    references: [orders.id],
  }),
  tripStop: one(tripStops, {
    fields: [discrepancyClaims.tripStopId],
    references: [tripStops.id],
  }),
  outlet: one(outlets, {
    fields: [discrepancyClaims.outletId],
    references: [outlets.id],
  }),
  reportedByUser: one(users, {
    fields: [discrepancyClaims.reportedByUserId],
    references: [users.id],
  }),
}));
