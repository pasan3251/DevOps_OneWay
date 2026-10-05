export type CalendarEvent = {
  id: string;
  title: string;
  date: string;
  time: string;
  kind: "Planning" | "Fleet" | "Meeting";
};

// Browser persistence is limited to personal calendar notes and appearance.
export type WorkspaceState = {
  events: CalendarEvent[];
  theme: "light" | "dark";
};

export const WORKSPACE_KEY = "waypoint.workspace.preferences.v2";
const LEGACY_WORKSPACE_KEY = "waypoint.demo.workspace.v1";
export const initialWorkspace: WorkspaceState = { events: [], theme: "light" };

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

export function validDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) &&
    new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
}

export function isWorkspace(value: unknown): value is WorkspaceState {
  if (!isRecord(value) || !Array.isArray(value.events) ||
      (value.theme !== "light" && value.theme !== "dark")) return false;
  return value.events.length <= 1000 &&
    new Set(value.events.map((event) => isRecord(event) ? event.id : undefined)).size === value.events.length &&
    value.events.every((event) => isRecord(event) &&
      typeof event.id === "string" && event.id.length > 0 && event.id.length <= 120 &&
      typeof event.title === "string" && event.title.length > 0 && event.title.length <= 80 &&
      typeof event.date === "string" && validDate(event.date) &&
      typeof event.time === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(event.time) &&
      typeof event.kind === "string" && ["Planning", "Fleet", "Meeting"].includes(event.kind));
}

export const workspaceService = {
  load(): WorkspaceState {
    const current = localStorage.getItem(WORKSPACE_KEY);
    const raw = current ?? localStorage.getItem(LEGACY_WORKSPACE_KEY);
    if (!raw) return structuredClone(initialWorkspace);
    const parsed: unknown = JSON.parse(raw);
    if (!isWorkspace(parsed)) throw new Error("Saved workspace preferences are invalid.");
    return {
      theme: parsed.theme,
      events: current ? parsed.events : parsed.events.filter((event) => event.id !== "event-review"),
    };
  },
  save(value: WorkspaceState) {
    if (!isWorkspace(value)) throw new Error("Workspace preferences could not be saved.");
    localStorage.setItem(WORKSPACE_KEY, JSON.stringify({ events: value.events, theme: value.theme }));
  },
};
