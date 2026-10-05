"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { authService } from "@/features/auth/auth-service";
import { apiRequest } from "@/lib/api-client";
import type {
  CompletedTripSummary,
  DriverRouteData,
  OfflineSyncItem,
  PreTripChecklist,
  ProofOfDeliveryRecord,
  StopExceptionRecord,
  StopItem,
} from "./driver-types";

const ROUTE_CACHE_KEY = "waypoint.driver.offline-route.v1";
const SYNC_STORAGE_KEY = "waypoint.driver.sync.v4";
const OFFLINE_OVERRIDE_KEY = "waypoint.driver.offline_override.v1";

type BackendItem = {
  quantityRequested: number;
  product: { sku: string; name: string; category: string; tempRequirement: "ambient" | "chilled" };
};

type BackendStop = {
  id: string;
  orderId: string;
  stopSequence: number;
  loadingSequence: number;
  plannedArrivalTime?: string | null;
  actualArrivalTime?: string | null;
  actualDepartureTime?: string | null;
  windowHoldUntil?: string | null;
  slaBreach: boolean;
  slaBreachMinutes: number;
  status: string;
  failureReason?: string | null;
  failureNotes?: string | null;
  failurePhotoUrl?: string | null;
  affectedCartons: number;
  reportedDelayMinutes: number;
  delayReason?: string | null;
  proofOfDelivery?: {
    storeRepName: string;
    storeRepDesignation?: string | null;
    outcome: "FULL" | "PARTIAL";
    expectedCartons: number;
    deliveredCartons: number;
    storeRepSignatureUrl?: string | null;
    photoEvidenceUrl?: string | null;
    driverNotes?: string | null;
    geoLatitude: string;
    geoLongitude: string;
    capturedAt: string;
  } | null;
  outlet: {
    name: string;
    address: string;
    district: string;
    brand: "Fresh" | "Style" | "Tech";
    latitude: string;
    longitude: string;
    contactPhone: string;
    windowStart: string;
    windowEnd: string;
    mallWindowStart?: string | null;
    mallWindowEnd?: string | null;
    parkingConstraint: string;
    dockType: string;
    isVanOnly: boolean;
    serviceTimeMinutes: string;
  };
  order: {
    id: string;
    brand: "Fresh" | "Style" | "Tech";
    tempRequirement: "ambient" | "chilled";
    totalWeightKg: string;
    totalVolumeM3: string;
    totalItemsCount: number;
    items: BackendItem[];
  };
};

type BackendTrip = {
  id: string;
  tripNumber: string;
  tripSequenceInDay: number;
  status: string;
  brand: "Fresh" | "Style" | "Tech";
  district: string;
  operatingDate: string;
  plannedDepartureTime?: string | null;
  actualDepartureTime?: string | null;
  actualReturnTime?: string | null;
  gateClearedAt?: string | null;
  driverReadyAt?: string | null;
  plannedDurationMin: number;
  plannedDistanceKm: string;
  vehicle: {
    registrationNumber: string;
    bodyType: "truck" | "van";
    refrigerationType: "reefer" | "ambient";
    maxWeightKg: string;
    maxVolumeM3: string;
    fuelEfficiencyKmPerL: string;
    weeklyFuelQuotaL: string;
    weekToDateFuelUsedL: string;
  };
  depot: { name: string; latitude: string; longitude: string; operatingHoursOpen: string };
  stops: BackendStop[];
};

type SyncResult = {
  clientMutationId: string;
  status: "COMMITTED" | "ALREADY_COMMITTED" | "CONFLICT" | "FAILED";
  error?: string;
};

type SyncResponse = { results: SyncResult[] };

function storedValue<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function minutes(value?: string | null) {
  if (!value) return 0;
  if (value.includes("T")) {
    const date = new Date(value);
    return date.getHours() * 60 + date.getMinutes();
  }
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
}

function timeLabel(value?: string | null) {
  return value
    ? new Date(value).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Colombo" })
    : undefined;
}

function depotName(name: string): "Peliyagoda" | "Kandy" {
  return name.toLowerCase().includes("kandy") ? "Kandy" : "Peliyagoda";
}

function stopStatus(status: string): StopItem["status"] {
  if (status === "ARRIVED") return "arrived";
  if (status === "WAITING_WINDOW") return "waiting_window";
  if (status === "UNLOADING") return "unloading";
  if (status === "DELIVERED") return "delivered";
  if (status === "DISCREPANCY_FLAGGED") return "partial";
  if (status === "FAILED") return "exception";
  return "scheduled";
}

function mapRoute(trip: BackendTrip): DriverRouteData {
  const session = authService.getSession();
  const firstPendingIndex = trip.stops.findIndex((stop) => !["DELIVERED", "DISCREPANCY_FLAGGED", "FAILED"].includes(stop.status));
  const mappedStops: StopItem[] = trip.stops.map((stop, index) => {
    let status = stopStatus(stop.status);
    if (trip.status === "EN_ROUTE" && index === firstPendingIndex && status === "scheduled") status = "en_route";
    const outletOpen = minutes(stop.outlet.windowStart);
    const outletClose = minutes(stop.outlet.windowEnd);
    const mallOpen = stop.outlet.mallWindowStart ? minutes(stop.outlet.mallWindowStart) : outletOpen;
    const mallClose = stop.outlet.mallWindowEnd ? minutes(stop.outlet.mallWindowEnd) : outletClose;
    const effectiveWindow: [number, number] = [Math.max(outletOpen, mallOpen), Math.min(outletClose, mallClose)];
    const proof = stop.proofOfDelivery;
    return {
      id: stop.id,
      orderIds: [stop.orderId],
      sequence: stop.stopSequence,
      lifoPosition: stop.loadingSequence,
      outlet: `${stop.outlet.brand} · ${stop.outlet.name}`,
      address: stop.outlet.address,
      coordinates: { lat: Number(stop.outlet.latitude), lng: Number(stop.outlet.longitude) },
      district: stop.outlet.district,
      brand: stop.order.brand,
      dockType: stop.outlet.dockType === "rear_dock" || stop.outlet.dockType === "mall_bay" ? stop.outlet.dockType : "street",
      parkingConstraint: stop.outlet.isVanOnly ? "van_only" : stop.outlet.parkingConstraint === "mall_dock" ? "mall_dock" : "normal",
      window: [outletOpen, outletClose],
      mallWindow: stop.outlet.mallWindowStart && stop.outlet.mallWindowEnd ? [mallOpen, mallClose] : undefined,
      effectiveWindow,
      estimatedArrival: minutes(stop.plannedArrivalTime),
      serviceAllowanceMinutes: Number(stop.outlet.serviceTimeMinutes),
      contact: { name: stop.outlet.name, phone: stop.outlet.contactPhone, designation: "Store receiving" },
      orders: [{
        id: stop.order.id,
        brand: stop.order.brand,
        category: stop.order.items[0]?.product.category ?? "Order items",
        chilled: stop.order.tempRequirement === "chilled",
        kg: Number(stop.order.totalWeightKg),
        m3: Number(stop.order.totalVolumeM3),
        cartons: stop.order.totalItemsCount,
        items: stop.order.items.map((item) => ({
          sku: item.product.sku,
          name: item.product.name,
          qty: item.quantityRequested,
          unit: item.quantityRequested === 1 ? "unit" : "units",
          tempRequirement: item.product.tempRequirement,
        })),
      }],
      totalKg: Number(stop.order.totalWeightKg),
      totalM3: Number(stop.order.totalVolumeM3),
      totalCartons: stop.order.totalItemsCount,
      status,
      actualArrivalTimestamp: timeLabel(stop.actualArrivalTime),
      actualCompletionTimestamp: timeLabel(stop.actualDepartureTime),
      holdingRemainingMinutes: stop.windowHoldUntil ? Math.max(0, Math.ceil((new Date(stop.windowHoldUntil).getTime() - Date.now()) / 60_000)) : 0,
      deliveryWindowState: stop.slaBreach ? "breach" : "on_time",
      lateByMinutes: stop.slaBreachMinutes,
      pod: proof ? {
        recipientName: proof.storeRepName,
        recipientDesignation: proof.storeRepDesignation ?? "Store receiving",
        deliveredCartons: proof.deliveredCartons,
        expectedCartons: proof.expectedCartons,
        outcome: proof.outcome === "FULL" ? "full" : "partial",
        signatureDataUrl: proof.storeRepSignatureUrl ?? undefined,
        photoDataUrl: proof.photoEvidenceUrl ?? undefined,
        notes: proof.driverNotes ?? undefined,
        timestamp: proof.capturedAt,
        geoCoordinates: { lat: Number(proof.geoLatitude), lng: Number(proof.geoLongitude) },
      } : undefined,
      exception: stop.status === "FAILED" ? {
        code: (stop.failureReason ?? "ACCESS_BLOCKED") as StopExceptionRecord["code"],
        category: "delivery",
        reasonLabel: (stop.failureReason ?? "Delivery exception").replaceAll("_", " "),
        notes: stop.failureNotes ?? "Delivery exception recorded",
        affectedCartons: stop.affectedCartons,
        photoDataUrl: stop.failurePhotoUrl ?? undefined,
        reportedAt: stop.actualDepartureTime ?? new Date().toISOString(),
      } : undefined,
    };
  });
  const terminal = mappedStops.filter((stop) => ["delivered", "partial", "exception"].includes(stop.status));
  return {
    tripId: trip.id,
    tripNumber: trip.tripSequenceInDay === 2 ? 2 : 1,
    depot: depotName(trip.depot.name),
    depotCoordinates: { lat: Number(trip.depot.latitude), lng: Number(trip.depot.longitude) },
    vehicle: {
      id: trip.vehicle.registrationNumber,
      plate: trip.vehicle.registrationNumber,
      model: `${trip.vehicle.bodyType === "van" ? "Van" : "Truck"} · ${trip.vehicle.refrigerationType === "reefer" ? "Refrigerated" : "Ambient"}`,
      depot: depotName(trip.depot.name),
      type: trip.vehicle.bodyType === "van" ? "Van" : "Truck",
      chilled: trip.vehicle.refrigerationType === "reefer",
      weightCapacityKg: Number(trip.vehicle.maxWeightKg),
      volumeCapacityM3: Number(trip.vehicle.maxVolumeM3),
      fuelRemainingLiters: Math.max(0, Number(trip.vehicle.weeklyFuelQuotaL) - Number(trip.vehicle.weekToDateFuelUsedL)),
      fuelQuotaLiters: Number(trip.vehicle.weeklyFuelQuotaL),
      kmPerLiter: Number(trip.vehicle.fuelEfficiencyKmPerL),
      reeferActive: trip.vehicle.refrigerationType === "reefer",
      reeferTemperatureC: null,
      targetReeferRange: [2, 4],
      engineStatus: trip.status === "EN_ROUTE" ? "running" : "stopped",
    },
    driver: {
      id: session?.userId ?? "driver",
      name: session?.name ?? "Assigned driver",
      phone: session?.phone ?? "",
      employeeId: session?.email ?? "",
      shiftStartTime: trip.depot.operatingHoursOpen,
    },
    brand: trip.brand,
    district: trip.district,
    departurePlannedMin: minutes(trip.plannedDepartureTime),
    departureActualTimestamp: timeLabel(trip.actualDepartureTime),
    shiftBudgetMinutes: trip.plannedDurationMin,
    elapsedMinutes: 0,
    shiftStatus: trip.status === "RETURNING" ? "returning" : trip.status === "EN_ROUTE" ? (terminal.length === mappedStops.length ? "returning" : "in_transit") : "assigned",
    stops: mappedStops,
    routeDistanceKm: Number(trip.plannedDistanceKm),
    returnDistanceKm: null,
    loaderClearance: { cleared: Boolean(trip.gateClearedAt), clearedAt: timeLabel(trip.gateClearedAt), manifestVersion: "Published manifest" },
    preTripCompleted: Boolean(trip.driverReadyAt),
    transitDelayMinutes: trip.stops.reduce((sum, stop) => sum + stop.reportedDelayMinutes, 0),
  };
}

function mutationFor(item: OfflineSyncItem) {
  const action = {
    pretrip: "confirm_readiness",
    departure: "depart_trip",
    arrival: "arrive_stop",
    pod: "deliver_stop",
    exception: "fail_stop",
    delay: "report_delay",
    trip_complete: "complete_trip",
  }[item.type];
  return { clientMutationId: item.id, entity: item.stopId ? "trip_stop" : "trip", action, occurredAt: item.timestamp, payload: item.payload };
}

export function useDriverState() {
  const [route, setRoute] = useState<DriverRouteData | null>(() => storedValue(ROUTE_CACHE_KEY, null));
  const [syncQueue, setSyncQueue] = useState<OfflineSyncItem[]>(() => storedValue(SYNC_STORAGE_KEY, []));
  const [history, setHistory] = useState<CompletedTripSummary[]>([]);
  const [isSimulatedOffline, setIsSimulatedOffline] = useState(() => storedValue(OFFLINE_OVERRIDE_KEY, false));
  const [isBrowserOnline, setIsBrowserOnline] = useState(() => typeof navigator === "undefined" || navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const effectiveOnline = isBrowserOnline && !isSimulatedOffline;

  const reload = useCallback(async () => {
    if (!effectiveOnline) return;
    const [active, completed] = await Promise.all([
      apiRequest<BackendTrip | null>("/driver/active-trip"),
      apiRequest<BackendTrip[]>("/driver/trips/history"),
    ]);
    const mapped = active ? mapRoute(active) : null;
    setRoute(mapped);
    if (mapped) window.localStorage.setItem(ROUTE_CACHE_KEY, JSON.stringify(mapped));
    else window.localStorage.removeItem(ROUTE_CACHE_KEY);
    setHistory(completed.map((trip) => ({
      tripId: trip.tripNumber,
      date: trip.operatingDate,
      brand: trip.brand,
      district: trip.district,
      vehicleId: trip.vehicle.registrationNumber,
      stopsCount: trip.stops.length,
      deliveredCount: trip.stops.filter((stop) => ["DELIVERED", "DISCREPANCY_FLAGGED"].includes(stop.status)).length,
      exceptionCount: trip.stops.filter((stop) => stop.status === "FAILED").length,
      totalKg: trip.stops.filter((stop) => stop.status !== "FAILED").reduce((sum, stop) => sum + Number(stop.order.totalWeightKg), 0),
      totalCartons: trip.stops.reduce((sum, stop) => sum + (stop.proofOfDelivery?.deliveredCartons ?? 0), 0),
      durationMinutes: trip.plannedDurationMin,
      completedAt: timeLabel(trip.actualReturnTime) ?? "Completed",
    })));
    setError("");
  }, [effectiveOnline]);

  useEffect(() => {
    const online = () => setIsBrowserOnline(true);
    const offline = () => setIsBrowserOnline(false);
    window.addEventListener("online", online);
    window.addEventListener("offline", offline);
    return () => { window.removeEventListener("online", online); window.removeEventListener("offline", offline); };
  }, []);

  useEffect(() => {
    void reload().catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "The assigned route could not be loaded.")).finally(() => setIsLoading(false));
  }, [reload]);

  useEffect(() => { window.localStorage.setItem(SYNC_STORAGE_KEY, JSON.stringify(syncQueue)); }, [syncQueue]);
  useEffect(() => { window.localStorage.setItem(OFFLINE_OVERRIDE_KEY, JSON.stringify(isSimulatedOffline)); }, [isSimulatedOffline]);
  useEffect(() => { if (!effectiveOnline && route) window.localStorage.setItem(ROUTE_CACHE_KEY, JSON.stringify(route)); }, [effectiveOnline, route]);

  const enqueue = useCallback((type: OfflineSyncItem["type"], description: string, payload: Record<string, unknown>, stopId?: string) => {
    setSyncQueue((current) => [...current, {
      id: crypto.randomUUID(), type, timestamp: new Date().toISOString(), stopId, description, payload,
      synced: false, syncState: "pending", retryCount: 0,
    }]);
  }, []);

  const triggerSync = useCallback(async () => {
    if (!effectiveOnline || isSyncing) return;
    const pending = syncQueue.filter((item) => !item.synced && item.syncState !== "conflict");
    if (!pending.length) return;
    setIsSyncing(true);
    try {
      const response = await apiRequest<SyncResponse>("/sync/mutations", {
        method: "POST",
        body: JSON.stringify({ mutations: pending.map(mutationFor) }),
      });
      const byId = new Map(response.results.map((result) => [result.clientMutationId, result]));
      setSyncQueue((current) => current.map((item) => {
        const result = byId.get(item.id);
        if (!result) return item;
        const synced = result.status === "COMMITTED" || result.status === "ALREADY_COMMITTED";
        return { ...item, synced, syncState: synced ? "synced" : "conflict", error: result.error, retryCount: item.retryCount + (synced ? 0 : 1) };
      }));
      await reload();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Field records could not be synchronized.");
      setSyncQueue((current) => current.map((item) => pending.some((pendingItem) => pendingItem.id === item.id) ? { ...item, retryCount: item.retryCount + 1 } : item));
    } finally {
      setIsSyncing(false);
    }
  }, [effectiveOnline, isSyncing, reload, syncQueue]);

  useEffect(() => {
    if (!effectiveOnline || isSyncing || !syncQueue.some((item) => !item.synced && item.syncState !== "conflict")) return;
    const timer = window.setTimeout(() => void triggerSync(), 250);
    return () => window.clearTimeout(timer);
  }, [effectiveOnline, isSyncing, syncQueue, triggerSync]);

  const completePreTrip = useCallback((checklist: PreTripChecklist) => {
    if (!route) return;
    setRoute((current) => current ? { ...current, preTripCompleted: true } : current);
    enqueue("pretrip", `Readiness confirmed for ${route.vehicle.id}`, {
      tripId: route.tripId,
      vehicleRoadworthy: checklist.tiresOk && checklist.mirrorsAndLightsOk,
      manifestAndSealMatched: checklist.lifoSealsVerified,
      fuelConfirmed: checklist.fuelLevelConfirmed,
      reeferTemperatureConfirmed: checklist.reeferTempVerified,
    });
  }, [enqueue, route]);

  const startRoute = useCallback(() => {
    if (!route?.loaderClearance.cleared || !route.preTripCompleted) return;
    setRoute((current) => current ? { ...current, shiftStatus: "in_transit", departureActualTimestamp: timeLabel(new Date().toISOString()), stops: current.stops.map((stop, index) => index === 0 ? { ...stop, status: "en_route" } : stop) } : current);
    enqueue("departure", `Departed ${route.depot} depot`, { tripId: route.tripId });
  }, [enqueue, route]);

  const arriveAtStop = useCallback((stopId: string) => {
    if (!route) return;
    const stop = route.stops.find((candidate) => candidate.id === stopId);
    if (!stop || stop.status !== "en_route") return;
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    setRoute((current) => current ? { ...current, shiftStatus: "at_stop", stops: current.stops.map((item) => item.id === stopId ? { ...item, status: currentMinutes < item.effectiveWindow[0] ? "waiting_window" : "arrived", holdingRemainingMinutes: Math.max(0, item.effectiveWindow[0] - currentMinutes), actualArrivalTimestamp: timeLabel(now.toISOString()) } : item) } : current);
    enqueue("arrival", `Arrived at ${stop.outlet}`, { stopId, currentLatitude: stop.coordinates.lat, currentLongitude: stop.coordinates.lng }, stopId);
  }, [enqueue, route]);

  const unlockWindowHold = useCallback((stopId: string) => {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    setRoute((current) => current ? { ...current, stops: current.stops.map((stop) => stop.id === stopId && currentMinutes >= stop.effectiveWindow[0] ? { ...stop, status: "arrived", holdingRemainingMinutes: 0 } : stop) } : current);
  }, []);

  const completeDelivery = useCallback((stopId: string, pod: ProofOfDeliveryRecord) => {
    if (!route) return;
    setRoute((current) => {
      if (!current) return current;
      const stops = current.stops.map((stop) => stop.id === stopId ? { ...stop, status: pod.outcome === "full" ? "delivered" as const : "partial" as const, pod, actualCompletionTimestamp: timeLabel(pod.timestamp) } : stop);
      const index = stops.findIndex((stop) => stop.id === stopId);
      if (stops[index + 1]?.status === "scheduled") stops[index + 1] = { ...stops[index + 1], status: "en_route" };
      return { ...current, stops, shiftStatus: stops.every((stop) => ["delivered", "partial", "exception"].includes(stop.status)) ? "returning" : "in_transit" };
    });
    enqueue("pod", `Proof of delivery recorded for ${stopId}`, {
      stopId,
      storeRepName: pod.recipientName,
      storeRepDesignation: pod.recipientDesignation,
      outcome: pod.outcome.toUpperCase(),
      expectedCartons: pod.expectedCartons,
      deliveredCartons: pod.deliveredCartons,
      storeRepSignatureUrl: pod.signatureDataUrl,
      photoEvidenceUrl: pod.photoDataUrl,
      driverNotes: pod.notes,
      geoLatitude: pod.geoCoordinates?.lat ?? route.stops.find((stop) => stop.id === stopId)?.coordinates.lat,
      geoLongitude: pod.geoCoordinates?.lng ?? route.stops.find((stop) => stop.id === stopId)?.coordinates.lng,
      clientCapturedAt: pod.timestamp,
    }, stopId);
  }, [enqueue, route]);

  const reportException = useCallback((stopId: string, exception: StopExceptionRecord) => {
    if (!route) return;
    setRoute((current) => {
      if (!current) return current;
      const stops = current.stops.map((stop) => stop.id === stopId ? { ...stop, status: "exception" as const, exception, actualCompletionTimestamp: timeLabel(exception.reportedAt) } : stop);
      const index = stops.findIndex((stop) => stop.id === stopId);
      if (stops[index + 1]?.status === "scheduled") stops[index + 1] = { ...stops[index + 1], status: "en_route" };
      return { ...current, stops, shiftStatus: stops.every((stop) => ["delivered", "partial", "exception"].includes(stop.status)) ? "returning" : "in_transit" };
    });
    enqueue("exception", `Exception recorded for ${stopId}`, { stopId, failureReason: exception.code, driverNotes: exception.notes, photoEvidenceUrl: exception.photoDataUrl, affectedCartons: exception.affectedCartons }, stopId);
  }, [enqueue, route]);

  const reportTransitDelay = useCallback((reason: string, delayMinutes: number) => {
    if (!route) return;
    const stop = route.stops.find((candidate) => ["en_route", "arrived", "waiting_window", "unloading", "scheduled"].includes(candidate.status));
    if (!stop) return;
    setRoute((current) => current ? { ...current, transitDelayMinutes: current.transitDelayMinutes + delayMinutes, delayNotice: { reason, minutes: delayMinutes, timestamp: timeLabel(new Date().toISOString()) ?? "" }, stops: current.stops.map((item) => ["scheduled", "en_route"].includes(item.status) ? { ...item, estimatedArrival: item.estimatedArrival + delayMinutes } : item) } : current);
    enqueue("delay", `${delayMinutes} minute delay: ${reason}`, { stopId: stop.id, delayMinutes, reason }, stop.id);
  }, [enqueue, route]);

  const completeRouteAndReturn = useCallback(() => {
    if (!route || route.shiftStatus !== "returning") return;
    enqueue("trip_complete", `Returned to ${route.depot} depot`, { tripId: route.tripId, latitude: route.depotCoordinates.lat, longitude: route.depotCoordinates.lng });
    setRoute((current) => current ? { ...current, shiftStatus: "completed" } : current);
  }, [enqueue, route]);

  const activeStop = useMemo(() => route?.stops.find((stop) => ["en_route", "arrived", "waiting_window", "unloading"].includes(stop.status)) ?? route?.stops.find((stop) => stop.status === "scheduled"), [route]);
  const completedCount = route?.stops.filter((stop) => ["delivered", "partial", "exception"].includes(stop.status)).length ?? 0;
  const unsyncedCount = syncQueue.filter((item) => !item.synced).length;

  return {
    route, syncQueue, history, effectiveOnline, isSimulatedOffline, isSyncing, isLoading, error,
    activeStop, completedCount, unsyncedCount, startRoute, arriveAtStop, unlockWindowHold,
    completeDelivery, reportException, reportTransitDelay, completePreTrip, completeRouteAndReturn,
    triggerSync, toggleSimulatedOffline: () => setIsSimulatedOffline((current) => !current), reload,
  };
}
