import { DEMO_DATE, type Depot } from "./planning";

export type Contact = {
  id: string;
  name: string;
  role: "Dispatcher" | "Loader" | "Driver" | "Store manager";
  depot: Depot;
  context: string;
};
export const contacts: Contact[] = [
  {
    id: "dispatch-desk",
    name: "Planning desk",
    role: "Dispatcher",
    depot: "Peliyagoda",
    context: "Demo dispatcher conversation",
  },
  {
    id: "loader-peliyagoda",
    name: "Peliyagoda loading team",
    role: "Loader",
    depot: "Peliyagoda",
    context: "Demo warehouse conversation",
  },
  {
    id: "driver-wp012",
    name: "WP-012 driver",
    role: "Driver",
    depot: "Peliyagoda",
    context: "Demo vehicle conversation",
  },
  {
    id: "store-borella",
    name: "Fresh · Borella",
    role: "Store manager",
    depot: "Peliyagoda",
    context: "Demo outlet conversation",
  },
  {
    id: "loader-kandy",
    name: "Kandy loading team",
    role: "Loader",
    depot: "Kandy",
    context: "Demo warehouse conversation",
  },
  {
    id: "driver-wp041",
    name: "WP-041 driver",
    role: "Driver",
    depot: "Kandy",
    context: "Demo vehicle conversation",
  },
  {
    id: "store-katugastota",
    name: "Fresh · Katugastota",
    role: "Store manager",
    depot: "Kandy",
    context: "Demo outlet conversation",
  },
];
export type CalendarEvent = {
  id: string;
  title: string;
  date: string;
  time: string;
  kind: "Planning" | "Fleet" | "Meeting";
};
export type Message = {
  id: string;
  contactId: string;
  text: string;
  outgoing: boolean;
  at: string;
};
export type WorkspaceState = {
  events: CalendarEvent[];
  messages: Message[];
  progress: Record<string, { route: string; completed: number }>;
  read: string[];
  theme: "light" | "dark";
};
export const WORKSPACE_KEY = "waypoint.demo.workspace.v1";
export const initialWorkspace: WorkspaceState = {
  events: [
    {
      id: "event-review",
      title: "Demo dispatch review",
      date: DEMO_DATE,
      time: "04:45",
      kind: "Planning",
    },
  ],
  messages: [
    {
      id: "message-loader",
      contactId: "loader-peliyagoda",
      text: "Sample message: confirm the stop sequence before preparing the loading plan.",
      outgoing: false,
      at: `${DEMO_DATE}T04:30:00+05:30`,
    },
    {
      id: "message-driver",
      contactId: "driver-wp012",
      text: "Sample message: please share the reviewed route when the plan is ready.",
      outgoing: false,
      at: `${DEMO_DATE}T04:40:00+05:30`,
    },
  ],
  progress: {},
  read: [],
  theme: "light",
};
function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}
export function validDate(value: string) {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(value)) &&
    new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value
  );
}
export function isWorkspace(value: unknown): value is WorkspaceState {
  if (
    !isRecord(value) ||
    !Array.isArray(value.events) ||
    !Array.isArray(value.messages) ||
    !Array.isArray(value.read) ||
    !isRecord(value.progress) ||
    (value.theme !== "light" && value.theme !== "dark")
  )
    return false;
  return (
    value.events.length <= 1000 &&
    value.messages.length <= 5000 &&
    value.read.length <= 1000 &&
    new Set(value.events.map(e => isRecord(e) ? e.id : undefined)).size === value.events.length &&
    new Set(value.messages.map(m => isRecord(m) ? m.id : undefined)).size === value.messages.length &&
    value.events.every(
      (e) =>
        isRecord(e) &&
        typeof e.id === "string" &&
        e.id.length > 0 && e.id.length <= 120 &&
        typeof e.title === "string" &&
        e.title.length > 0 &&
        e.title.length <= 80 &&
        typeof e.date === "string" &&
        validDate(e.date) &&
        typeof e.time === "string" &&
        /^([01]\d|2[0-3]):[0-5]\d$/.test(e.time) &&
        typeof e.kind === "string" && ["Planning", "Fleet", "Meeting"].includes(e.kind),
    ) &&
    value.messages.every(
      (m) =>
        isRecord(m) &&
        typeof m.id === "string" &&
        m.id.length > 0 && m.id.length <= 120 &&
        contacts.some((c) => c.id === m.contactId) &&
        typeof m.text === "string" &&
        m.text.length > 0 &&
        m.text.length <= 2000 &&
        typeof m.outgoing === "boolean" &&
        typeof m.at === "string" &&
        Number.isFinite(Date.parse(m.at)),
    ) &&
    Object.entries(value.progress).every(
      ([id, progress]) =>
        /^TRIP-\d+$/.test(id) &&
        isRecord(progress) && typeof progress.route === "string" && progress.route.length <= 5000 &&
        Number.isInteger(progress.completed) &&
        Number(progress.completed) >= 0 &&
        Number(progress.completed) <= 120,
    ) &&
    value.read.every((id) => typeof id === "string" && id.length <= 120)
  );
}
export const workspaceService = {
  load(): WorkspaceState {
    const raw = localStorage.getItem(WORKSPACE_KEY);
    if (!raw) return structuredClone(initialWorkspace);
    const parsed: unknown = JSON.parse(raw);
    if (!isWorkspace(parsed))
      throw new Error("Saved workspace data is invalid.");
    return parsed;
  },
  save(value: WorkspaceState) {
    if (!isWorkspace(value))
      throw new Error("Workspace data could not be saved.");
    localStorage.setItem(WORKSPACE_KEY, JSON.stringify(value));
  },
};
