import { apiRequest } from "@/lib/api-client";

export type Depot = "Peliyagoda" | "Kandy";
export type Brand = "Fresh" | "Style" | "Tech";
export type Order = {
  id: string;
  orderNumber: string;
  outlet: string;
  depot: Depot;
  depotId: string;
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
  items?: Array<{
    sku: string;
    name: string;
    quantity: number;
    unitWeightKg: number;
    unitVolumeM3: number;
    temp: "Ambient" | "Chilled";
  }>;
};
export type Vehicle = {
  id: string;
  recordId: string;
  driverId?: string;
  depot: Depot;
  depotId: string;
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
  recordId?: string;
  planVersionId?: string;
  status?: string;
  depot: Depot;
  vehicleId: string;
  orderIds: string[];
  departure: number;
};
export type Deferral = { orderId: string; reason: string; note: string };
export type Plan = {
  trips: Trip[];
  deferrals: Deferral[];
  published: Depot[];
  versionIds: Partial<Record<Depot, string>>;
};

export const DEMO_DATE = "2026-10-05";
export const orders: Order[] = [];
export const vehicles: Vehicle[] = [];
export const initialPlan: Plan = { trips: [], deferrals: [], published: [], versionIds: {} };

export const deferralReasons = [
  "No refrigerated vehicle available",
  "No eligible van available",
  "Weight capacity exceeded",
  "Volume capacity exceeded",
  "Delivery window unachievable",
  "Time budget exceeded",
  "Fuel quota exceeded",
  "Vehicle unavailable",
  "Lower priority under capacity pressure",
  "Other operational constraint",
];

function minutes(value: string) {
  const [hours, mins] = value.split(":").map(Number);
  return hours * 60 + mins;
}

function dateMinutes(value?: string | null) {
  if (!value) return 0;
  const date = new Date(value);
  return date.getHours() * 60 + date.getMinutes();
}

function depotName(value: string): Depot {
  return value.toLowerCase().includes("kandy") ? "Kandy" : "Peliyagoda";
}

type BackendOrder = {
  id: string;
  orderNumber: string;
  brand: Brand;
  tempRequirement: "ambient" | "chilled";
  status: string;
  totalWeightKg: string;
  totalVolumeM3: string;
  deferredCount: number;
  deferralReason?: string | null;
  items?: Array<{
    quantityRequested: number;
    unitWeightKg: string;
    unitVolumeM3: string;
    product: { sku: string; name: string; tempRequirement: "ambient" | "chilled" };
  }>;
  outlet: {
    id: string;
    name: string;
    district: string;
    depotId: string;
    isVanOnly: boolean;
    windowStart: string;
    windowEnd: string;
    serviceTimeMinutes?: string;
    depot?: { name: string };
  };
};
type BackendVehicle = {
  id: string;
  registrationNumber: string;
  depotId: string;
  bodyType: "truck" | "van";
  refrigerationType: "reefer" | "ambient";
  maxWeightKg: string;
  maxVolumeM3: string;
  status: "available" | "in_transit" | "maintenance" | "offline";
  fuelEfficiencyKmPerL: string;
  weeklyFuelQuotaL: string;
  weekToDateFuelUsedL: string;
  depot: { name: string };
};
type BackendDriver = { id: string; depotId: string; status: string };
type BackendTrip = {
  id: string;
  tripNumber: string;
  planVersionId?: string | null;
  planVersion?: { versionNumber: number; status: "DRAFT" | "VALIDATED" | "PUBLISHED" | "SUPERSEDED" } | null;
  status: string;
  depotId: string;
  vehicleId: string;
  plannedDepartureTime?: string | null;
  depot: { name: string };
  vehicle: { registrationNumber: string };
  stops: Array<{ orderId: string; stopSequence: number }>;
};
type BackendLoaderManifest = {
  id: string;
  status: "PENDING" | "VERIFIED" | "EXCEPTION" | "RESOLVED" | "CLEARED" | "STALE";
  planVersionId: string;
  trip: BackendTrip & {
    brand: Brand;
    district: string;
    plannedDepartureTime?: string | null;
    driver: { id: string };
    vehicle: BackendVehicle;
    stops: Array<{ orderId: string; stopSequence: number; order: Omit<BackendOrder, "outlet">; outlet: BackendOrder["outlet"] }>;
  };
};

export function tripOrders(trip: Trip) {
  return trip.orderIds.map((id) => orders.find((order) => order.id === id)).filter((order): order is Order => Boolean(order));
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
  return tripOrders(trip).reduce((sum, order) => sum + order.travelMinutes + order.serviceMinutes, 0);
}

export function fuelLitres(trip: Trip) {
  const vehicle = vehicles.find((item) => item.id === trip.vehicleId);
  if (!vehicle) return 0;
  const approximateDistance = tripOrders(trip).reduce((sum, order) => sum + order.travelMinutes * 0.5, 0) + (trip.orderIds.length ? 20 : 0);
  return approximateDistance / vehicle.kmPerL;
}

export function validateTrip(trip: Trip, plan: Plan) {
  const items = tripOrders(trip);
  const vehicle = vehicles.find((item) => item.id === trip.vehicleId);
  const load = totals(trip);
  const issues: string[] = [];
  if (!items.length) issues.push("Add at least one order to this trip.");
  if (!vehicle) return [...issues, "Choose an available vehicle."];
  if (vehicle.workshop) issues.push(`${vehicle.id} is unavailable. Choose an active vehicle.`);
  if (vehicle.depot !== trip.depot || items.some((order) => order.depot !== vehicle.depot)) issues.push("Vehicle and orders must belong to the same depot.");
  if (new Set(items.map((order) => order.brand)).size > 1) issues.push("Keep one brand per trip.");
  if (new Set(items.map((order) => order.district)).size > 1) issues.push("Keep one district per trip.");
  if (items.some((order) => order.chilled) && !vehicle.chilled) issues.push("Chilled orders require a refrigerated vehicle.");
  if (items.some((order) => order.vanOnly) && vehicle.type !== "Van") issues.push("A van-only outlet needs a van.");
  if (load.kg > vehicle.kg) issues.push(`Weight exceeds capacity by ${Math.ceil(load.kg - vehicle.kg)} kg.`);
  if (load.m3 > vehicle.m3) issues.push(`Volume exceeds capacity by ${(load.m3 - vehicle.m3).toFixed(1)} m³.`);
  if (plan.trips.filter((item) => item.vehicleId === vehicle.id).length > 2) issues.push("A vehicle can make at most two trips per day.");
  if (stopTimes(trip).some((stop) => stop.end > stop.order.window[1])) issues.push("A stop finishes after its delivery window.");
  return issues;
}

export function formatTime(value: number) {
  return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
}

function reasonCode(reason: string) {
  if (reason.includes("refrigerated") || reason.includes("capacity")) return "CAPACITY_UNAVAILABLE";
  if (reason.includes("vehicle") || reason.includes("van")) return "VEHICLE_UNAVAILABLE";
  if (reason.includes("window") || reason.includes("Time")) return "DELIVERY_WINDOW";
  if (reason.startsWith("Other")) return "OTHER";
  return "OPERATIONAL_CONSTRAINT";
}

export const planningService = {
  async load(operatingDate: string): Promise<Plan> {
    const [orderResponse, vehicleRows, driverRows, tripResponse] = await Promise.all([
      apiRequest<{ data: BackendOrder[] }>(`/orders?orderDate=${operatingDate}&limit=100`),
      apiRequest<BackendVehicle[]>("/master-data/vehicles"),
      apiRequest<BackendDriver[]>("/master-data/drivers"),
      apiRequest<{ data: BackendTrip[] }>(`/dispatch/trips?operatingDate=${operatingDate}&limit=100`),
    ]);

    const mappedOrders: Order[] = orderResponse.data.map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      outlet: `${order.brand} · ${order.outlet.name}`,
      depot: depotName(order.outlet.depot?.name ?? order.outlet.depotId),
      depotId: order.outlet.depotId,
      brand: order.brand,
      district: order.outlet.district,
      chilled: order.tempRequirement === "chilled",
      vanOnly: order.outlet.isVanOnly,
      kg: Number(order.totalWeightKg),
      m3: Number(order.totalVolumeM3),
      carryOver: order.deferredCount > 0,
      window: [minutes(order.outlet.windowStart), minutes(order.outlet.windowEnd)],
      travelMinutes: 30,
      serviceMinutes: Math.ceil(Number(order.outlet.serviceTimeMinutes ?? 20)),
    }));
    orders.splice(0, orders.length, ...mappedOrders);

    const mappedVehicles: Vehicle[] = vehicleRows.map((vehicle) => ({
      id: vehicle.registrationNumber,
      recordId: vehicle.id,
      driverId: driverRows.find((driver) => driver.depotId === vehicle.depotId && driver.status === "available")?.id,
      depot: depotName(vehicle.depot.name),
      depotId: vehicle.depotId,
      type: vehicle.bodyType === "van" ? "Van" : "Truck",
      chilled: vehicle.refrigerationType === "reefer",
      kg: Number(vehicle.maxWeightKg),
      m3: Number(vehicle.maxVolumeM3),
      workshop: vehicle.status !== "available",
      fuelRemaining: Math.max(0, Number(vehicle.weeklyFuelQuotaL) - Number(vehicle.weekToDateFuelUsedL)),
      kmPerL: Number(vehicle.fuelEfficiencyKmPerL),
    }));
    vehicles.splice(0, vehicles.length, ...mappedVehicles);

    const latestVersionByDepot = new Map<string, number>();
    for (const trip of tripResponse.data) {
      const version = trip.planVersion?.versionNumber ?? 0;
      latestVersionByDepot.set(trip.depotId, Math.max(latestVersionByDepot.get(trip.depotId) ?? 0, version));
    }
    const activeTripRows = tripResponse.data.filter((trip) =>
      (trip.planVersion?.versionNumber ?? 0) === (latestVersionByDepot.get(trip.depotId) ?? 0) && trip.status !== "CANCELLED"
    );
    const trips: Trip[] = activeTripRows.map((trip) => ({
      id: trip.tripNumber,
      recordId: trip.id,
      planVersionId: trip.planVersionId ?? undefined,
      status: trip.status,
      depot: depotName(trip.depot.name),
      vehicleId: trip.vehicle.registrationNumber,
      orderIds: [...trip.stops].sort((a, b) => a.stopSequence - b.stopSequence).map((stop) => stop.orderId),
      departure: dateMinutes(trip.plannedDepartureTime),
    }));
    const deferrals = orderResponse.data
      .filter((order) => order.status === "QUEUED_NEXT_RUN" && order.deferredCount > 0)
      .map((order) => ({ orderId: order.id, reason: order.deferralReason ?? "Operational constraint", note: order.deferralReason ?? "Deferred by dispatch" }));
    const published = [...new Set(activeTripRows.filter((trip) => trip.planVersion?.status === "PUBLISHED").map((trip) => depotName(trip.depot.name)))];
    const versionIds: Partial<Record<Depot, string>> = {};
    for (const trip of trips) if (trip.planVersionId) versionIds[trip.depot] = trip.planVersionId;
    return { trips, deferrals, published, versionIds };
  },

  async loadLoader(): Promise<Plan> {
    const manifests = await apiRequest<BackendLoaderManifest[]>("/loader/manifests");
    const mappedOrders = new Map<string, Order>();
    const mappedVehicles = new Map<string, Vehicle>();
    const trips: Trip[] = [];
    const versionIds: Partial<Record<Depot, string>> = {};
    for (const item of manifests) {
      const trip = item.trip;
      const depot = depotName(trip.depot.name);
      mappedVehicles.set(trip.vehicle.registrationNumber, {
        id: trip.vehicle.registrationNumber,
        recordId: trip.vehicle.id,
        driverId: trip.driver.id,
        depot,
        depotId: trip.vehicle.depotId,
        type: trip.vehicle.bodyType === "van" ? "Van" : "Truck",
        chilled: trip.vehicle.refrigerationType === "reefer",
        kg: Number(trip.vehicle.maxWeightKg),
        m3: Number(trip.vehicle.maxVolumeM3),
        workshop: trip.vehicle.status === "maintenance" || trip.vehicle.status === "offline",
        fuelRemaining: Math.max(0, Number(trip.vehicle.weeklyFuelQuotaL) - Number(trip.vehicle.weekToDateFuelUsedL)),
        kmPerL: Number(trip.vehicle.fuelEfficiencyKmPerL),
      });
      for (const stop of trip.stops) {
        const order = stop.order;
        mappedOrders.set(order.id, {
          id: order.id,
          orderNumber: order.orderNumber,
          outlet: `${order.brand} · ${stop.outlet.name}`,
          depot,
          depotId: stop.outlet.depotId,
          brand: order.brand,
          district: stop.outlet.district,
          chilled: order.tempRequirement === "chilled",
          vanOnly: stop.outlet.isVanOnly,
          kg: Number(order.totalWeightKg),
          m3: Number(order.totalVolumeM3),
          carryOver: order.deferredCount > 0,
          window: [minutes(stop.outlet.windowStart), minutes(stop.outlet.windowEnd)],
          travelMinutes: 30,
          serviceMinutes: Math.ceil(Number(stop.outlet.serviceTimeMinutes ?? 20)),
          items: order.items?.map((item) => ({
            sku: item.product.sku,
            name: item.product.name,
            quantity: item.quantityRequested,
            unitWeightKg: Number(item.unitWeightKg),
            unitVolumeM3: Number(item.unitVolumeM3),
            temp: item.product.tempRequirement === "chilled" ? "Chilled" : "Ambient",
          })),
        });
      }
      trips.push({
        id: trip.tripNumber,
        recordId: trip.id,
        planVersionId: item.planVersionId,
        status: trip.status,
        depot,
        vehicleId: trip.vehicle.registrationNumber,
        orderIds: [...trip.stops].sort((a, b) => a.stopSequence - b.stopSequence).map((stop) => stop.orderId),
        departure: dateMinutes(trip.plannedDepartureTime),
      });
      versionIds[depot] = item.planVersionId;
    }
    orders.splice(0, orders.length, ...mappedOrders.values());
    vehicles.splice(0, vehicles.length, ...mappedVehicles.values());
    return {
      trips,
      deferrals: [],
      published: [...new Set(trips.map((trip) => trip.depot))],
      versionIds,
    };
  },

  async createTrip(input: { depot: Depot; operatingDate: string; vehicleId: string; orderIds: string[]; departure: number }) {
    const vehicle = vehicles.find((candidate) => candidate.id === input.vehicleId);
    const selected = input.orderIds.map((id) => orders.find((order) => order.id === id)).filter((order): order is Order => Boolean(order));
    const first = selected[0];
    if (!vehicle || !vehicle.driverId || !first) throw new Error("Choose orders, an available vehicle, and an available driver.");
    if (selected.some((order) => order.brand !== first.brand || order.district !== first.district)) {
      throw new Error("A trip must contain one brand and one district.");
    }
    const departure = `${input.operatingDate}T${formatTime(input.departure)}:00+05:30`;
    return apiRequest<BackendTrip>("/dispatch/plan", {
      method: "POST",
      body: JSON.stringify({
        depotId: vehicle.depotId,
        vehicleId: vehicle.recordId,
        driverId: vehicle.driverId,
        brand: first.brand,
        district: first.district,
        operatingDate: input.operatingDate,
        plannedDepartureTime: departure,
        orderIds: input.orderIds,
      }),
    });
  },

  updateTrip(trip: Trip, operatingDate: string) {
    if (!trip.recordId) throw new Error("The persisted trip could not be identified.");
    const vehicle = vehicles.find((candidate) => candidate.id === trip.vehicleId);
    if (!vehicle?.driverId) throw new Error("Choose a vehicle with an available driver.");
    return apiRequest(`/dispatch/trips/${trip.recordId}`, {
      method: "PATCH",
      body: JSON.stringify({
        vehicleId: vehicle.recordId,
        driverId: vehicle.driverId,
        plannedDepartureTime: `${operatingDate}T${formatTime(trip.departure)}:00+05:30`,
        orderIds: trip.orderIds,
      }),
    });
  },

  removeTrip(trip: Trip) {
    if (!trip.recordId) throw new Error("The persisted trip could not be identified.");
    return apiRequest(`/dispatch/trips/${trip.recordId}`, { method: "DELETE" });
  },

  defer(orderId: string, reason: string, note: string) {
    return apiRequest("/dispatch/defer", {
      method: "POST",
      body: JSON.stringify({ orderId, reasonCode: reasonCode(reason), deferralReason: note }),
    });
  },

  reinstate(orderId: string) {
    return apiRequest(`/dispatch/defer/${orderId}/reinstate`, { method: "POST" });
  },

  publish(versionId: string) {
    return apiRequest(`/dispatch/plans/${versionId}/publish`, { method: "POST" });
  },

  revise(versionId: string, reason: string) {
    return apiRequest(`/dispatch/plans/${versionId}/revisions`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    });
  },
};
