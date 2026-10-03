export const roles = [
  "dispatcher",
  "loader",
  "driver",
  "store-manager",
] as const;
export type Role = (typeof roles)[number];

export const demoAccounts = [
  {
    role: "dispatcher",
    label: "Dispatcher",
    name: "Dispatch team",
    employeeId: "DISP001",
    email: "dispatcher@waypoint.demo",
    context: "Planning office",
    location: "Peliyagoda",
    description: "Plan deliveries, allocate the fleet, and manage exceptions.",
  },
  {
    role: "loader",
    label: "Loader",
    name: "Warehouse team",
    employeeId: "LOAD001",
    email: "loader@waypoint.demo",
    context: "Warehouse dock",
    location: "Peliyagoda",
    description:
      "Verify loading lists, report shortfalls, and clear departures.",
  },
  {
    role: "driver",
    label: "Driver",
    name: "Delivery team",
    employeeId: "DRIV001",
    email: "driver@waypoint.demo",
    context: "On the road",
    location: "Assigned route",
    description: "Follow your trip and record delivery outcomes and proof.",
  },
  {
    role: "store-manager",
    label: "Store manager",
    name: "Store team",
    employeeId: "STORE001",
    email: "store@waypoint.demo",
    context: "Retail outlet",
    location: "Assigned outlet",
    description: "Place orders, review arrival times, and confirm receipt.",
  },
] as const satisfies ReadonlyArray<{
  role: Role;
  label: string;
  name: string;
  employeeId: string;
  email: string;
  context: string;
  location: string;
  description: string;
}>;

export const DEMO_PASSWORD = "waypoint-demo";

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && roles.includes(value as Role);
}
