export type Depot = "Peliyagoda" | "Kandy";
export type Brand = "Fresh" | "Style" | "Tech";
export type Order = {
  id: string;
  outlet: string;
  depot: Depot;
  brand: Brand;
  district: string;
  chilled: boolean;
  vanOnly: boolean;
  kg: number;
  m3: number;
  carryOver: boolean;
  window: [number, number];
  travelMinutes: number;
  serviceMinutes: number;
};
export type Vehicle = {
  id: string;
  depot: Depot;
  type: "Truck" | "Van";
  chilled: boolean;
  kg: number;
  m3: number;
  workshop: boolean;
  fuelRemaining: number;
  kmPerL: number;
};
export type Trip = {
  id: string;
  depot: Depot;
  vehicleId: string;
  orderIds: string[];
  departure: number;
};
export const DEMO_DATE = "2026-10-03";
export const orders: Order[] = [
  {
    id: "ORD-1041",
    outlet: "Fresh · Borella",
    depot: "Peliyagoda",
    brand: "Fresh",
    district: "Colombo",
    chilled: true,
    vanOnly: false,
    kg: 420,
    m3: 2.2,
    carryOver: true,
    window: [210, 480],
    travelMinutes: 18,
    serviceMinutes: 15,
  },
  {
    id: "ORD-1042",
    outlet: "Fresh · Nugegoda",
    depot: "Peliyagoda",
    brand: "Fresh",
    district: "Colombo",
    chilled: true,
    vanOnly: false,
    kg: 300,
    m3: 1.8,
    carryOver: false,
    window: [210, 480],
    travelMinutes: 14,
    serviceMinutes: 16,
  },
  {
    id: "ORD-1043",
    outlet: "Fresh · Wellawatte",
    depot: "Peliyagoda",
    brand: "Fresh",
    district: "Colombo",
    chilled: true,
    vanOnly: true,
    kg: 240,
    m3: 1.2,
    carryOver: true,
    window: [210, 480],
    travelMinutes: 16,
    serviceMinutes: 16,
  },
  {
    id: "ORD-1044",
    outlet: "Style · Kollupitiya",
    depot: "Peliyagoda",
    brand: "Style",
    district: "Colombo",
    chilled: false,
    vanOnly: false,
    kg: 560,
    m3: 4.5,
    carryOver: false,
    window: [540, 1020],
    travelMinutes: 22,
    serviceMinutes: 30,
  },
  {
    id: "ORD-1045",
    outlet: "Tech · Dehiwala",
    depot: "Peliyagoda",
    brand: "Tech",
    district: "Colombo",
    chilled: false,
    vanOnly: false,
    kg: 1100,
    m3: 6,
    carryOver: false,
    window: [540, 1020],
    travelMinutes: 25,
    serviceMinutes: 40,
  },
  {
    id: "ORD-1046",
    outlet: "Fresh · Negombo",
    depot: "Peliyagoda",
    brand: "Fresh",
    district: "Gampaha",
    chilled: false,
    vanOnly: false,
    kg: 680,
    m3: 3.4,
    carryOver: false,
    window: [210, 480],
    travelMinutes: 35,
    serviceMinutes: 15,
  },
  {
    id: "ORD-2041",
    outlet: "Fresh · Katugastota",
    depot: "Kandy",
    brand: "Fresh",
    district: "Kandy",
    chilled: true,
    vanOnly: false,
    kg: 380,
    m3: 2,
    carryOver: true,
    window: [210, 480],
    travelMinutes: 20,
    serviceMinutes: 15,
  },
  {
    id: "ORD-2042",
    outlet: "Style · Peradeniya",
    depot: "Kandy",
    brand: "Style",
    district: "Kandy",
    chilled: false,
    vanOnly: true,
    kg: 260,
    m3: 2.4,
    carryOver: false,
    window: [540, 1020],
    travelMinutes: 18,
    serviceMinutes: 30,
  },
];
export const vehicles: Vehicle[] = [
  {
    id: "WP-012",
    depot: "Peliyagoda",
    type: "Truck",
    chilled: true,
    kg: 1800,
    m3: 10,
    workshop: false,
    fuelRemaining: 40,
    kmPerL: 6,
  },
  {
    id: "WP-008",
    depot: "Peliyagoda",
    type: "Van",
    chilled: true,
    kg: 800,
    m3: 4,
    workshop: false,
    fuelRemaining: 25,
    kmPerL: 9,
  },
  {
    id: "WP-021",
    depot: "Peliyagoda",
    type: "Truck",
    chilled: false,
    kg: 2500,
    m3: 14,
    workshop: false,
    fuelRemaining: 48,
    kmPerL: 5,
  },
  {
    id: "WP-027",
    depot: "Peliyagoda",
    type: "Van",
    chilled: false,
    kg: 700,
    m3: 4,
    workshop: true,
    fuelRemaining: 20,
    kmPerL: 9,
  },
  {
    id: "WP-041",
    depot: "Kandy",
    type: "Truck",
    chilled: true,
    kg: 1600,
    m3: 9,
    workshop: false,
    fuelRemaining: 30,
    kmPerL: 6,
  },
  {
    id: "WP-046",
    depot: "Kandy",
    type: "Van",
    chilled: false,
    kg: 750,
    m3: 4,
    workshop: false,
    fuelRemaining: 18,
    kmPerL: 8,
  },
];
export const deferralReasons = [
  "No refrigerated capacity",
  "No eligible van",
  "Weight capacity exhausted",
  "Volume capacity exhausted",
  "Delivery window unachievable",
  "Vehicle in workshop",
];
export type Deferral = { orderId: string; reason: string; note: string };
export type Plan = { trips: Trip[]; deferrals: Deferral[]; published: Depot[] };
export const initialPlan: Plan = {
  trips: [
    {
      id: "TRIP-01",
      depot: "Peliyagoda",
      vehicleId: "WP-012",
      orderIds: ["ORD-1041", "ORD-1042"],
      departure: 300,
    },
  ],
  deferrals: [],
  published: [],
};
export function tripOrders(trip: Trip) {
  return trip.orderIds.map((id) => orders.find((order) => order.id === id)!);
}
export function totals(trip: Trip) {
  return tripOrders(trip).reduce(
    (total, order) => ({ kg: total.kg + order.kg, m3: total.m3 + order.m3 }),
    { kg: 0, m3: 0 },
  );
}
export function stopTimes(trip: Trip) {
  let clock = trip.departure;
  return tripOrders(trip).map((order) => {
    const arrival = clock + order.travelMinutes;
    const start = Math.max(arrival, order.window[0]);
    clock = start + order.serviceMinutes;
    return { order, arrival, start, end: clock };
  });
}
export function tripMinutes(trip: Trip) {
  return tripOrders(trip).reduce(
    (sum, order) => sum + order.travelMinutes + order.serviceMinutes,
    0,
  );
}
// Explicit fixture assumption: 0.5 km per travel minute plus a 20 km depot return.
export function fuelLitres(trip: Trip) {
  const vehicle = vehicles.find((item) => item.id === trip.vehicleId)!;
  return (
    (tripOrders(trip).reduce(
      (sum, order) => sum + order.travelMinutes * 0.5,
      0,
    ) +
      (trip.orderIds.length ? 20 : 0)) /
    vehicle.kmPerL
  );
}
export function validateTrip(trip: Trip, plan: Plan): string[] {
  const items = tripOrders(trip);
  const vehicle = vehicles.find((item) => item.id === trip.vehicleId)!;
  const load = totals(trip);
  const issues: string[] = [];
  if (!items.length) issues.push("Add at least one order to this trip.");
  if (vehicle.workshop)
    issues.push(
      `${vehicle.id} is in the workshop. Choose an available vehicle.`,
    );
  if (
    vehicle.depot !== trip.depot ||
    items.some((order) => order.depot !== vehicle.depot)
  )
    issues.push("Vehicle and orders must belong to the same depot.");
  if (new Set(items.map((order) => order.brand)).size > 1)
    issues.push("Keep one brand per trip. Move the other brand to a new trip.");
  if (new Set(items.map((order) => order.district)).size > 1)
    issues.push("Keep one district per trip. Create a separate district trip.");
  if (items.some((order) => order.chilled) && !vehicle.chilled)
    issues.push("Chilled orders require a refrigerated vehicle.");
  if (items.some((order) => order.vanOnly) && vehicle.type !== "Van")
    issues.push("A van-only outlet needs a van. Choose an eligible vehicle.");
  if (load.kg > vehicle.kg)
    issues.push(`Weight exceeds capacity by ${load.kg - vehicle.kg} kg.`);
  if (load.m3 > vehicle.m3)
    issues.push(
      `Volume exceeds capacity by ${(load.m3 - vehicle.m3).toFixed(1)} m³.`,
    );
  if (plan.trips.filter((item) => item.vehicleId === vehicle.id).length > 2)
    issues.push("A vehicle can make at most two trips per day.");
  const duplicates = items.filter(
    (order) =>
      plan.trips.filter((item) => item.orderIds.includes(order.id)).length > 1,
  );
  if (duplicates.length)
    issues.push("An order cannot be assigned to more than one trip.");
  if (
    items.some((order) =>
      plan.deferrals.some((entry) => entry.orderId === order.id),
    )
  )
    issues.push("Deferred orders cannot also be assigned to a trip.");
  const sameVehicle = plan.trips.filter(
    (item) => item.vehicleId === vehicle.id,
  );
  const fresh = sameVehicle.filter(
    (item) => tripOrders(item)[0]?.brand === "Fresh",
  );
  const commercial = sameVehicle.filter(
    (item) => tripOrders(item)[0] && tripOrders(item)[0].brand !== "Fresh",
  );
  if (fresh.reduce((sum, item) => sum + tripMinutes(item), 0) > 270)
    issues.push("Fresh trips exceed the 270-minute daily budget.");
  if (commercial.reduce((sum, item) => sum + tripMinutes(item), 0) > 480)
    issues.push("Style / Tech trips exceed the 480-minute daily budget.");
  if (
    sameVehicle.reduce((sum, item) => sum + fuelLitres(item), 0) >
    vehicle.fuelRemaining
  )
    issues.push(
      "Trips exceed the vehicle’s remaining weekly fuel. Choose another vehicle.",
    );
  if (stopTimes(trip).some((stop) => stop.end > stop.order.window[1]))
    issues.push(
      "A stop finishes after its delivery window. Change departure or split the trip.",
    );
  const scheduled = sameVehicle.map((item) => ({
    id: item.id,
    start: item.departure,
    end: stopTimes(item).at(-1)?.end ?? item.departure,
  }));
  if (
    scheduled.some((a) =>
      scheduled.some(
        (b) => a.id !== b.id && a.start < b.end + 30 && b.start < a.end + 30,
      ),
    )
  )
    issues.push(
      "Vehicle trips overlap or leave less than the demo 30-minute return / reload allowance.",
    );
  return issues;
}
export function formatTime(minutes: number) {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}
const STORAGE_KEY = "waypoint.demo.dispatch.v1";
function isPlan(value: unknown): value is Plan {
  if (!value || typeof value !== "object") return false;
  const plan = value as Plan;
  return (
    Array.isArray(plan.trips) &&
    Array.isArray(plan.deferrals) &&
    Array.isArray(plan.published) &&
    new Set(plan.trips.map((trip) => trip?.id)).size === plan.trips.length &&
    plan.trips.every(
      (trip) =>
        typeof trip.id === "string" &&
        ["Peliyagoda", "Kandy"].includes(trip.depot) &&
        vehicles.some((v) => v.id === trip.vehicleId) &&
        Array.isArray(trip.orderIds) &&
        new Set(trip.orderIds).size === trip.orderIds.length &&
        trip.orderIds.every((id) => orders.some((o) => o.id === id)) &&
        Number.isInteger(trip.departure) &&
        trip.departure >= 0 &&
        trip.departure < 1440,
    ) &&
    plan.deferrals.every(
      (item) =>
        item &&
        orders.some((order) => order.id === item.orderId) &&
        deferralReasons.includes(item.reason) &&
        typeof item.note === "string",
    ) &&
    plan.published.every((depot) => ["Peliyagoda", "Kandy"].includes(depot))
  );
}
export const planningService = {
  load(): Plan {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(initialPlan);
    const value: unknown = JSON.parse(raw);
    if (!isPlan(value))
      throw new Error(
        "Saved demo plan is invalid. Clear this site’s demo storage to start again.",
      );
    return value;
  },
  save(plan: Plan) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(plan));
  },
};
