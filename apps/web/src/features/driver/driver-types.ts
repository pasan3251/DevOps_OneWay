import type { Brand, Depot } from "../dispatcher/planning";

export type ShiftStatus =
  | "assigned"
  | "in_transit"
  | "at_stop"
  | "returning"
  | "completed";

export type StopStatus =
  | "scheduled"
  | "en_route"
  | "arrived"
  | "waiting_window"
  | "unloading"
  | "delivered"
  | "partial"
  | "exception";

export type DeliveryOutcome = "full" | "partial";

export type DeliveryWindowState = "on_time" | "watch" | "breach";

export type ExceptionReasonCode =
  | "STORE_CLOSED_UNAVAILABLE"
  | "DELIVERY_REJECTED"
  | "DAMAGED_GOODS"
  | "SHORTAGE_PARTIAL"
  | "ACCESS_BLOCKED"
  | "VEHICLE_BREAKDOWN"
  | "ROAD_WEATHER_DELAY";

export interface SKUItem {
  sku: string;
  name: string;
  qty: number;
  unit: string;
  tempRequirement: "ambient" | "chilled";
}

export interface StopOrderLine {
  id: string;
  brand: Brand;
  category: string;
  chilled: boolean;
  kg: number;
  m3: number;
  cartons: number;
  items: SKUItem[];
}

export interface ProofOfDeliveryRecord {
  recipientName: string;
  recipientDesignation: string;
  deliveredCartons: number;
  expectedCartons: number;
  outcome: DeliveryOutcome;
  signatureDataUrl?: string;
  photoDataUrl?: string;
  notes?: string;
  timestamp: string;
  geoCoordinates?: { lat: number; lng: number };
}

export interface StopExceptionRecord {
  code: ExceptionReasonCode;
  category: "delivery" | "incident";
  reasonLabel: string;
  notes: string;
  affectedCartons?: number;
  photoDataUrl?: string;
  reportedAt: string;
  geoCoordinates?: { lat: number; lng: number };
}

export interface StopItem {
  id: string;
  orderIds: string[];
  sequence: number;
  lifoPosition: number; // 1 = at rear doors (first out)
  outlet: string;
  address: string;
  coordinates: { lat: number; lng: number };
  district: string;
  brand: Brand;
  dockType: "rear_dock" | "street" | "mall_bay";
  parkingConstraint: "normal" | "van_only" | "mall_dock";
  window: [number, number]; // [openMin, closeMin] from midnight
  mallWindow?: [number, number];
  effectiveWindow: [number, number];
  estimatedArrival: number; // minutes from midnight
  serviceAllowanceMinutes: number;
  contact: {
    name: string;
    phone: string;
    designation: string;
  };
  specialInstructions?: string;
  orders: StopOrderLine[];
  totalKg: number;
  totalM3: number;
  totalCartons: number;
  status: StopStatus;
  actualArrivalTimestamp?: string;
  actualCompletionTimestamp?: string;
  holdingRemainingMinutes?: number;
  deliveryWindowState?: DeliveryWindowState;
  lateByMinutes?: number;
  pod?: ProofOfDeliveryRecord;
  exception?: StopExceptionRecord;
}

export interface DriverVehicleTelematics {
  id: string;
  plate: string;
  model: string;
  depot: Depot;
  type: "Truck" | "Van";
  chilled: boolean;
  weightCapacityKg: number;
  volumeCapacityM3: number;
  fuelRemainingLiters: number;
  fuelQuotaLiters: number;
  kmPerLiter: number;
  reeferActive: boolean;
  reeferTemperatureC: number;
  targetReeferRange: [number, number]; // e.g. [2, 4]
  odometerKm: number;
  engineStatus: "running" | "idle" | "stopped";
}

export interface DriverRouteData {
  tripId: string;
  tripNumber: 1 | 2;
  depot: Depot;
  depotCoordinates: { lat: number; lng: number };
  vehicle: DriverVehicleTelematics;
  driver: {
    id: string;
    name: string;
    phone: string;
    employeeId: string;
    shiftStartTime: string;
  };
  brand: Brand;
  district: string;
  departurePlannedMin: number;
  departureActualTimestamp?: string;
  shiftBudgetMinutes: number;
  elapsedMinutes: number;
  shiftStatus: ShiftStatus;
  stops: StopItem[];
  routeDistanceKm: number;
  returnDistanceKm: number;
  loaderClearance: {
    cleared: boolean;
    clearedAt?: string;
    manifestVersion: string;
  };
  preTripCompleted: boolean;
  transitDelayMinutes: number;
  delayNotice?: {
    reason: string;
    minutes: number;
    timestamp: string;
  };
  nextTrip?: {
    tripId: string;
    brand: Brand;
    district: string;
    plannedDepartureMin: number;
    releaseStatus: "awaiting_return" | "awaiting_loader" | "ready";
  };
}

export interface PreTripChecklist {
  tiresOk: boolean;
  mirrorsAndLightsOk: boolean;
  lifoSealsVerified: boolean;
  reeferTempVerified: boolean;
  fuelLevelConfirmed: boolean;
  timestamp?: string;
}

export interface OfflineSyncItem {
  id: string;
  type:
    | "departure"
    | "arrival"
    | "pod"
    | "exception"
    | "delay"
    | "trip_complete"
    | "pretrip";
  timestamp: string;
  stopId?: string;
  description: string;
  payload: Record<string, unknown>;
  synced: boolean;
  retryCount: number;
  syncState?: "pending" | "synced" | "conflict";
  error?: string;
}

export interface CompletedTripSummary {
  tripId: string;
  date: string;
  brand: Brand;
  district: string;
  vehicleId: string;
  stopsCount: number;
  deliveredCount: number;
  exceptionCount: number;
  totalKg: number;
  totalCartons: number;
  durationMinutes: number;
  completedAt: string;
}
