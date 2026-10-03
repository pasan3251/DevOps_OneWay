import assert from "node:assert/strict";
import { initialPlan, orders, vehicles, totals, validateTrip, stopTimes, tripMinutes, fuelLitres } from "../apps/web/src/features/dispatcher/planning.ts";

const plan = structuredClone(initialPlan);
const trip = plan.trips[0];
const vehicle = vehicles.find(item => item.id === trip.vehicleId);
const has = (candidate, phrase, scenario = { ...plan, trips: [candidate] }) => validateTrip(candidate,scenario).some(issue => issue.includes(phrase));
assert.deepEqual(validateTrip(trip,plan), []);
assert.deepEqual(totals(trip), { kg: 720, m3: 4 });
assert.equal(tripMinutes(trip), 63);
assert.equal(stopTimes(trip)[1].end, 363);
const originalVehicle = { ...vehicle };
try {
  vehicle.kg = 720; vehicle.m3 = 4;
  assert.deepEqual(validateTrip(trip,plan), [], "Exact capacity must be allowed");
  vehicle.kg = 719; assert(has(trip,"Weight exceeds"));
  vehicle.kg = 720; vehicle.m3 = 3.9; assert(has(trip,"Volume exceeds"));
  Object.assign(vehicle, originalVehicle);
  vehicle.fuelRemaining = fuelLitres(trip); assert.deepEqual(validateTrip(trip,plan), []);
  vehicle.fuelRemaining -= 0.01; assert(has(trip,"remaining weekly fuel"));
} finally { Object.assign(vehicle, originalVehicle); }
assert(has({ ...trip, vehicleId: "WP-021" }, "Chilled orders"));
assert(has({ ...trip, orderIds: [...trip.orderIds,"ORD-1043"] }, "van-only"));
assert(has({ ...trip, orderIds: [...trip.orderIds,"ORD-1044"] }, "one brand"));
assert(has({ ...trip, orderIds: [...trip.orderIds,"ORD-1046"] }, "one district"));
assert(has({ ...trip, vehicleId: "WP-041" }, "same depot"));
assert(has({ ...trip, vehicleId: "WP-027" }, "workshop"));
assert(has({ ...trip, departure: 470 }, "delivery window"));
const duplicate = { ...trip, id: "DUPLICATE" };
assert(has(trip, "more than one trip", { ...plan, trips: [trip,duplicate] }));
assert(has(trip, "overlap", { ...plan, trips: [trip,duplicate] }));
assert(has(trip, "at most two trips", { ...plan, trips: [trip,duplicate,{ ...trip,id: "THIRD" }] }));
assert(has(trip, "Deferred orders", { ...plan, deferrals: [{ orderId: trip.orderIds[0], reason: "No refrigerated capacity", note: "Demo note" }] }));
const first = orders[0]; const originalTravel = first.travelMinutes;
try { first.travelMinutes = 271; assert(has(trip,"270-minute")); } finally { first.travelMinutes = originalTravel; }
assert(has({ ...trip, orderIds: [] }, "at least one order"));
console.log("Passed: capacity boundaries, fuel boundaries, temperature/access, depot/brand/district, workshop, windows, duplicate allocation, trip count/overlap, deferral exclusivity, Fresh time budget, empty trips.");
