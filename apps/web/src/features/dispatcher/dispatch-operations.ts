import {
  formatTime,
  fuelLitres,
  orders,
  stopTimes,
  totals,
  validateTrip,
  vehicles,
  type Order,
  type Plan,
  type Trip,
  type Vehicle,
} from "./planning";

export type OrderStatus = "Pending" | "Assigned" | "Deferred";
export function orderStatus(orderId: string, plan: Plan): OrderStatus {
  if (plan.deferrals.some((item) => item.orderId === orderId))
    return "Deferred";
  return plan.trips.some((trip) => trip.orderIds.includes(orderId))
    ? "Assigned"
    : "Pending";
}
export function nextTripId(plan: Plan) {
  let number = 1;
  while (
    plan.trips.some(
      (trip) => trip.id === `TRIP-${String(number).padStart(2, "0")}`,
    )
  )
    number++;
  return `TRIP-${String(number).padStart(2, "0")}`;
}
export function proposeTrip(order: Order, vehicle: Vehicle, plan: Plan) {
  const previousEnd = Math.max(
    0,
    ...plan.trips
      .filter((trip) => trip.vehicleId === vehicle.id)
      .map((trip) => (stopTimes(trip).at(-1)?.end ?? trip.departure) + 30),
  );
  const trip: Trip = {
    id: nextTripId(plan),
    depot: order.depot,
    vehicleId: vehicle.id,
    orderIds: [order.id],
    departure: Math.max(order.window[0], previousEnd),
  };
  const next = { ...plan, trips: [...plan.trips, trip] };
  return { trip, next, issues: validateTrip(trip, next) };
}
export function vehicleUsage(vehicle: Vehicle, plan: Plan) {
  const trips = plan.trips.filter((trip) => trip.vehicleId === vehicle.id);
  const loads = trips.map(totals);
  const plannedFuel = trips.reduce((sum, trip) => sum + fuelLitres(trip), 0);
  return {
    trips,
    kg: Math.max(0, ...loads.map((load) => load.kg)),
    m3: Math.max(0, ...loads.map((load) => load.m3)),
    plannedFuel,
    fuelLeft: vehicle.fuelRemaining - plannedFuel,
  };
}
export function tripDescription(trip: Trip) {
  const first = orders.find((order) => order.id === trip.orderIds[0]);
  return first
    ? `${first.brand} · ${first.district} · ${formatTime(trip.departure)}`
    : `Unallocated · ${formatTime(trip.departure)}`;
}
export function eligibleVehicles(order: Order, plan: Plan) {
  return vehicles.filter(
    (vehicle) =>
      vehicle.depot === order.depot &&
      !proposeTrip(order, vehicle, plan).issues.length,
  );
}
