import type {
  DriverRouteData,
  DriverVehicleTelematics,
  CompletedTripSummary,
  OfflineSyncItem,
} from "./driver-types";

export const initialVehicle: DriverVehicleTelematics = {
  id: "WP-012",
  plate: "WP-GA-4892",
  model: "Isuzu Forward FTR 850 (Chilled)",
  depot: "Peliyagoda",
  type: "Truck",
  chilled: true,
  weightCapacityKg: 1800,
  volumeCapacityM3: 10.0,
  fuelRemainingLiters: 40,
  fuelQuotaLiters: 120,
  kmPerLiter: 6.0,
  reeferActive: true,
  reeferTemperatureC: 3.4,
  targetReeferRange: [2.0, 4.0],
  odometerKm: 48210,
  engineStatus: "running",
};

export const initialActiveRoute: DriverRouteData = {
  tripId: "TRIP-01",
  tripNumber: 1,
  depot: "Peliyagoda",
  depotCoordinates: { lat: 6.964, lng: 79.889 },
  vehicle: initialVehicle,
  driver: {
    id: "DRIV001",
    name: "Sunil Rathnayake",
    phone: "+94 77 554 1290",
    employeeId: "DRIV001",
    shiftStartTime: "04:30 AM",
  },
  brand: "Fresh",
  district: "Colombo",
  departurePlannedMin: 300, // 05:00 AM
  departureActualTimestamp: undefined,
  shiftBudgetMinutes: 270, // Fresh daily budget max
  elapsedMinutes: 35,
  shiftStatus: "assigned", // assigned -> in_transit -> at_stop -> returning -> completed
  routeDistanceKm: 28.5,
  returnDistanceKm: 13.8,
  loaderClearance: {
    cleared: true,
    clearedAt: "04:42 AM",
    manifestVersion: "MNF-TRIP-01-R3",
  },
  preTripCompleted: false,
  transitDelayMinutes: 0,
  stops: [
    {
      id: "STOP-01",
      orderIds: ["ORD-1041-C", "ORD-1041-A"],
      sequence: 1,
      lifoPosition: 1, // At rear doors (first out)
      outlet: "Fresh · Borella",
      address: "142 Cotta Road, Borella, Colombo 08",
      coordinates: { lat: 6.915, lng: 79.878 },
      district: "Colombo",
      brand: "Fresh",
      dockType: "rear_dock",
      parkingConstraint: "normal",
      window: [210, 480], // 03:30 - 08:00
      effectiveWindow: [210, 480],
      estimatedArrival: 318, // 05:18 AM
      serviceAllowanceMinutes: 15,
      contact: {
        name: "Kusal Perera",
        phone: "+94 77 341 8920",
        designation: "Store Manager",
      },
      specialInstructions:
        "Access via rear commercial gate on Cotta Lane. Verify seal tag #SL-4029 before unloading chilled crates.",
      orders: [
        {
          id: "ORD-1041-C",
          brand: "Fresh",
          category: "Chilled Dairy & Poultry",
          chilled: true,
          kg: 420,
          m3: 2.2,
          cartons: 28,
          items: [
            {
              sku: "DAIRY-012",
              name: "Highland Fresh Full Cream Milk 1L",
              qty: 120,
              unit: "Pack",
              tempRequirement: "chilled",
            },
            {
              sku: "DAIRY-045",
              name: "Pelwatte Salted Butter 200g",
              qty: 48,
              unit: "Block",
              tempRequirement: "chilled",
            },
            {
              sku: "MEAT-009",
              name: "Prima Chilled Whole Broiler (Grade A)",
              qty: 35,
              unit: "Carton",
              tempRequirement: "chilled",
            },
          ],
        },
        {
          id: "ORD-1041-A",
          brand: "Fresh",
          category: "Ambient Daily Staples",
          chilled: false,
          kg: 180,
          m3: 1.1,
          cartons: 14,
          items: [
            {
              sku: "DRY-101",
              name: "Keeri Samba Rice 5kg Premium",
              qty: 24,
              unit: "Bag",
              tempRequirement: "ambient",
            },
            {
              sku: "DRY-204",
              name: "Ceylon White Sugar 1kg",
              qty: 50,
              unit: "Pack",
              tempRequirement: "ambient",
            },
          ],
        },
      ],
      totalKg: 600,
      totalM3: 3.3,
      totalCartons: 42,
      status: "scheduled",
    },
    {
      id: "STOP-02",
      orderIds: ["ORD-1042"],
      sequence: 2,
      lifoPosition: 2, // Mid cargo section
      outlet: "Fresh · Nugegoda",
      address: "84 High Level Road, Nugegoda",
      coordinates: { lat: 6.869, lng: 79.89 },
      district: "Colombo",
      brand: "Fresh",
      dockType: "street",
      parkingConstraint: "normal",
      window: [210, 480], // 03:30 - 08:00
      effectiveWindow: [210, 480],
      estimatedArrival: 365, // 06:05 AM
      serviceAllowanceMinutes: 16,
      contact: {
        name: "Dilani Jayasuriya",
        phone: "+94 71 882 1435",
        designation: "Receiving Supervisor",
      },
      specialInstructions:
        "Curbside street unloading. Use vehicle hazard flashers and collapsible hand trolley across the pavement.",
      orders: [
        {
          id: "ORD-1042",
          brand: "Fresh",
          category: "Fresh Produce & Cultured Dairy",
          chilled: true,
          kg: 300,
          m3: 1.8,
          cartons: 22,
          items: [
            {
              sku: "PROD-302",
              name: "Upcountry Carrots Washed 10kg Crate",
              qty: 12,
              unit: "Crate",
              tempRequirement: "chilled",
            },
            {
              sku: "DAIRY-088",
              name: "Ambewela Set Yoghurt 80g (Tray of 24)",
              qty: 20,
              unit: "Tray",
              tempRequirement: "chilled",
            },
          ],
        },
      ],
      totalKg: 300,
      totalM3: 1.8,
      totalCartons: 22,
      status: "scheduled",
    },
    {
      id: "STOP-03",
      orderIds: ["ORD-1043"],
      sequence: 3,
      lifoPosition: 3, // Front bulkhead (last out)
      outlet: "Fresh · Wellawatte",
      address: "51 Galle Road, Wellawatte, Colombo 06",
      coordinates: { lat: 6.874, lng: 79.861 },
      district: "Colombo",
      brand: "Fresh",
      dockType: "street",
      parkingConstraint: "normal",
      window: [210, 480], // 03:30 - 08:00
      effectiveWindow: [210, 480],
      estimatedArrival: 420, // 07:00 AM
      serviceAllowanceMinutes: 16,
      contact: {
        name: "Rohan Fernando",
        phone: "+94 76 991 3204",
        designation: "Assistant Store Manager",
      },
      specialInstructions:
        "Busy morning commuter road. Unload before 07:30 AM before peak traffic police restrictions begin.",
      orders: [
        {
          id: "ORD-1043",
          brand: "Fresh",
          category: "Delicatessen & Frozen Meats",
          chilled: true,
          kg: 240,
          m3: 1.2,
          cartons: 18,
          items: [
            {
              sku: "COLD-401",
              name: "Bairaha Chicken Sausages 500g",
              qty: 40,
              unit: "Pack",
              tempRequirement: "chilled",
            },
            {
              sku: "CHSE-105",
              name: "Kotmale Processed Cheddar 1kg Block",
              qty: 15,
              unit: "Block",
              tempRequirement: "chilled",
            },
          ],
        },
      ],
      totalKg: 240,
      totalM3: 1.2,
      totalCartons: 18,
      status: "scheduled",
    },
  ],
  nextTrip: {
    tripId: "TRIP-02",
    brand: "Style",
    district: "Colombo",
    plannedDepartureMin: 600,
    releaseStatus: "awaiting_return",
  },
};

export const sampleHistoryTrips: CompletedTripSummary[] = [
  {
    tripId: "TRIP-98",
    date: "2026-10-02",
    brand: "Fresh",
    district: "Colombo",
    vehicleId: "WP-012",
    stopsCount: 3,
    deliveredCount: 3,
    exceptionCount: 0,
    totalKg: 1080,
    totalCartons: 78,
    durationMinutes: 135,
    completedAt: "07:45 AM",
  },
  {
    tripId: "TRIP-92",
    date: "2026-10-01",
    brand: "Fresh",
    district: "Colombo",
    vehicleId: "WP-012",
    stopsCount: 4,
    deliveredCount: 3,
    exceptionCount: 1,
    totalKg: 1350,
    totalCartons: 94,
    durationMinutes: 165,
    completedAt: "07:55 AM",
  },
  {
    tripId: "TRIP-86",
    date: "2026-09-30",
    brand: "Style",
    district: "Colombo",
    vehicleId: "WP-021",
    stopsCount: 2,
    deliveredCount: 2,
    exceptionCount: 0,
    totalKg: 950,
    totalCartons: 64,
    durationMinutes: 210,
    completedAt: "02:30 PM",
  },
];

export const sampleInitialSyncQueue: OfflineSyncItem[] = [
  {
    id: "SYNC-001",
    type: "pretrip",
    timestamp: "2026-10-03T04:45:00+05:30",
    description: "Pre-departure checklist verified: Tires, LIFO seal, Reefer 3.4°C",
    payload: { checklistCompleted: true, inspector: "DRIV001" },
    synced: true,
    syncState: "synced",
    retryCount: 0,
  },
];

export const formatMinutesToTime = (minutes: number): string => {
  const normalized = ((minutes % 1440) + 1440) % 1440;
  const hours = Math.floor(normalized / 60);
  const mins = normalized % 60;
  const period = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 === 0 ? 12 : hours % 12;
  return `${String(displayHours).padStart(2, "0")}:${String(mins).padStart(2, "0")} ${period}`;
};

export const formatMinutesDuration = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}m`;
  return `${hours}h ${mins}m`;
};
