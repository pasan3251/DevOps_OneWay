"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Boxes,
  CheckCircle2,
  CircleHelp,
  Clock3,
  Layers,
  LayoutDashboard,
  LoaderCircle,
  LogOut,
  MessageSquare,
  PanelLeftClose,
  PanelLeftOpen,
  ShieldAlert,
  ShieldCheck,
  Truck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { WaypointLogo } from "@/components/waypoint-logo";
import { authService, type Session } from "@/features/auth/auth-service";
import {
  DEMO_DATE,
  initialPlan,
  planningService,
  type Depot,
  type Plan,
} from "@/features/dispatcher/planning";
import {
  initialWorkspace,
  workspaceService,
  type WorkspaceState,
} from "@/features/dispatcher/workspace-state";
import { WorkspaceChat } from "@/features/dispatcher/workspace-chat";
import { WorkspaceTools } from "@/features/dispatcher/workspace-tools";
import { LoaderOverview } from "./loader-overview";
import {
  LoaderManifest,
  type ClearanceRecord,
  type DiscrepancyRecord,
  type DiscrepancyResolution,
} from "./loader-manifest";
import { LoaderDiscrepancies } from "./loader-discrepancies";

import "@/features/dispatcher/dispatcher.css";
import "@/features/dispatcher/workspace.css";
import "@/features/dispatcher/overview.css";
import "@/features/dispatcher/operations.css";
import "./loader.css";

type LoaderView = "overview" | "manifest" | "discrepancies" | "chat";

const LOADER_DISCREPANCIES_KEY = "waypoint.demo.loader.discrepancies.v1";
const LOADER_CLEARANCES_KEY = "waypoint.demo.loader.clearances.v1";

export function LoaderDashboard() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [plan, setPlan] = useState<Plan>(initialPlan);
  const [depot, setDepot] = useState<Depot>("Peliyagoda");
  const [view, setView] = useState<LoaderView>("overview");
  const [navCollapsed, setNavCollapsed] = useState(false);
  const [selectedTripId, setSelectedTripId] = useState<string>("TRIP-01");
  const [workspace, setWorkspace] = useState<WorkspaceState>(initialWorkspace);
  const [clearedTrips, setClearedTrips] = useState<Record<string, ClearanceRecord>>({});
  const [message, setMessage] = useState("");
  const [failure, setFailure] = useState("");
  const [modal, setModal] = useState<"help" | null>(null);
  const [discrepancies, setDiscrepancies] = useState<DiscrepancyRecord[]>([
    {
      id: "DISC-INIT-1",
      tripId: "TRIP-01",
      orderId: "ORD-1041",
      outlet: "Fresh · Borella",
      depot: "Peliyagoda",
      vehicleId: "WP-012",
      type: "damaged",
      quantity: 2,
      itemDescription: "Chilled Dairy Crates",
      skuCode: "SKU-CHL-01",
      kgImpact: 20,
      m3Impact: 0.1,
      notes: "Crushed during forklift pallet transfer",
      reportedBy: "LOAD001 (Warehouse Dock)",
      timestamp: "04:15",
      resolution: "pending",
    },
  ]);

  // Auth & state hydration
  useEffect(() => {
    const active = authService.getSession();
    if (!active) {
      router.replace("/login");
      return;
    }
    if (active.role !== "loader") {
      router.replace(`/workspace/${active.role}`);
      return;
    }

    const timer = window.setTimeout(() => {
      setSession(active);
      try {
        setPlan(planningService.load());
      } catch {
        setFailure("Your saved demo plan couldn't be loaded.");
      }
      try {
        setWorkspace(workspaceService.load());
      } catch {
        setFailure("Workspace preferences could not be loaded.");
      }
      try {
        const storedDisc = localStorage.getItem(LOADER_DISCREPANCIES_KEY);
        if (storedDisc) {
          setDiscrepancies(JSON.parse(storedDisc));
        }
      } catch {
        // use initial
      }
      try {
        const storedClearances = localStorage.getItem(LOADER_CLEARANCES_KEY);
        if (storedClearances) {
          const records: ClearanceRecord[] = JSON.parse(storedClearances);
          const map: Record<string, ClearanceRecord> = {};
          records.forEach((r) => { map[r.tripId] = r; });
          setClearedTrips(map);
        }
      } catch {
        // use initial
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, [router]);

  function saveWorkspace(next: WorkspaceState, feedback: string) {
    try {
      workspaceService.save(next);
      setWorkspace(next);
      setFailure("");
      setMessage(feedback);
      return true;
    } catch {
      setFailure("Workspace state could not be saved.");
      return false;
    }
  }

  function handleAddDiscrepancy(record: DiscrepancyRecord) {
    const updated = [record, ...discrepancies];
    setDiscrepancies(updated);
    try {
      localStorage.setItem(LOADER_DISCREPANCIES_KEY, JSON.stringify(updated));
      setMessage(`FAIL-A Exception ${record.id} logged. Transmitted to Dispatch desk.`);

      // Also append simulated message to planning desk in workspace.chat
      const chatMsg = {
        id: crypto.randomUUID(),
        contactId: "dispatch-desk",
        text: `[FAIL-A EXCEPTION] ${record.id}: ${record.quantity}x ${record.itemDescription} (${record.type}) at ${record.outlet} on ${record.tripId}. Impact: -${record.kgImpact}kg, -${record.m3Impact}m³. Awaiting dispatch resolution.`,
        outgoing: true,
        at: new Date().toISOString(),
      };
      saveWorkspace(
        {
          ...workspace,
          messages: [...workspace.messages, chatMsg],
        },
        `Exception ${record.id} reported to Dispatch desk.`
      );
    } catch {
      // storage fallback
    }
  }

  function handleUpdateResolution(
    id: string,
    resolution: DiscrepancyResolution,
    resolutionNotes: string
  ) {
    const updated = discrepancies.map((d) =>
      d.id === id
        ? {
            ...d,
            resolution,
            resolutionNotes,
            resolvedAt: new Date().toLocaleTimeString("en-GB", {
              timeZone: "Asia/Colombo",
              hour: "2-digit",
              minute: "2-digit",
            }),
          }
        : d
    );
    setDiscrepancies(updated);
    try {
      localStorage.setItem(LOADER_DISCREPANCIES_KEY, JSON.stringify(updated));
      setMessage(`Discrepancy ${id} resolution updated: ${resolution.replace("_", " ")}.`);
    } catch {
      // storage fallback
    }
  }

  function handleResolveDiscrepancy(id: string) {
    const updated = discrepancies.filter((d) => d.id !== id);
    setDiscrepancies(updated);
    try {
      localStorage.setItem(LOADER_DISCREPANCIES_KEY, JSON.stringify(updated));
      setMessage("Discrepancy record dismissed.");
    } catch {
      // storage fallback
    }
  }

  function handleClearDeparture(tripId: string, clearance: ClearanceRecord) {
    const updated = { ...clearedTrips, [tripId]: clearance };
    setClearedTrips(updated);
    try {
      // Persist the full clearance record (array) for auditability
      const records = Object.values(updated);
      localStorage.setItem(LOADER_CLEARANCES_KEY, JSON.stringify(records));
    } catch {
      // storage fallback
    }
    // Notify Dispatch desk via workspace chat
    const chatMsg = {
      id: crypto.randomUUID(),
      contactId: "dispatch-desk",
      text: `[DEPARTURE CLEARED] Trip ${tripId} | Vehicle ${clearance.vehicleId} | ${clearance.totalStops} stops | Payload: ${clearance.finalKg} kg / ${clearance.finalM3} m³ | Exceptions: ${clearance.exceptionsCount} | Cleared by: ${clearance.clearedBy} at ${clearance.clearedAt}`,
      outgoing: true,
      at: new Date().toISOString(),
    };
    saveWorkspace(
      { ...workspace, messages: [...workspace.messages, chatMsg] },
      `Trip ${tripId} cleared for departure. Manifest transmitted to driver client.`
    );
    setView("overview");
  }

  function signOut() {
    try {
      authService.signOut();
      router.replace("/login");
    } catch {
      setFailure("Could not sign out. Please check local storage.");
    }
  }

  if (!session) {
    return (
      <main className="workspace-loading">
        <LoaderCircle aria-hidden="true" className="loading-spinner" />
        <p role="status">Opening warehouse loader workspace…</p>
      </main>
    );
  }

  const activeDepotDiscrepancies = discrepancies.filter((d) => d.depot === depot);

  return (
    <div
      className={`dispatch-app dispatch-scroll-shell${navCollapsed ? " navigation-collapsed" : ""}${view === "overview" ? " is-overview" : ""}`}
    >
      {/* Sidebar matching Dispatcher */}
      <aside className="dispatch-sidebar">
        <WaypointLogo light />
        <nav aria-label="Loader navigation">
          {(
            [
            { id: "overview", label: "Staging queue", Icon: Layers },
              { id: "manifest", label: "Loading checklist", Icon: Truck },
              { id: "discrepancies", label: "Exception log", Icon: ShieldAlert },
              { id: "chat", label: "Comms", Icon: MessageSquare },
            ] as const
          ).map(({ id, label, Icon }) => (
            <button
              key={id}
              aria-label={label}
              title={navCollapsed ? label : undefined}
              aria-current={view === id ? "page" : undefined}
              onClick={() => {
                setView(id);
                setMessage("");
              }}
            >
              <Icon size={19} aria-hidden="true" />
              <span className="dispatch-nav-label">{label}</span>
              {id === "discrepancies" && activeDepotDiscrepancies.length > 0 && (
                <span className="nav-count">{activeDepotDiscrepancies.length}</span>
              )}
            </button>
          ))}
        </nav>

        <div className="dispatch-sidebar-note">
          <ShieldCheck size={20} aria-hidden="true" />
          <p>Staging &amp; departure clearance.</p>
        </div>

        <div className="dispatch-user">
          <span className="user-avatar">LD</span>
          <div>
            <strong>{session.name}</strong>
            <span>Loader · Demo</span>
          </div>
          <button aria-label="Sign out" onClick={signOut}>
            <LogOut size={18} aria-hidden="true" />
          </button>
        </div>
      </aside>

      {/* Main Container */}
      <div className="dispatch-main">
        <header className="dispatch-topbar">
          <div>
            <button
              className="dispatch-icon-button navigation-toggle"
              aria-label={navCollapsed ? "Expand navigation" : "Collapse navigation"}
              aria-expanded={!navCollapsed}
              onClick={() => setNavCollapsed(!navCollapsed)}
            >
              {navCollapsed ? (
                <PanelLeftOpen size={20} aria-hidden="true" />
              ) : (
                <PanelLeftClose size={20} aria-hidden="true" />
              )}
            </button>
            <span>Loader workspace</span>
          </div>

          <div>
            <span className="demo-label">Demo data</span>
            <WorkspaceTools
              state={workspace}
              plan={plan}
              depot={depot}
              name={session.name}
              onSave={saveWorkspace}
              onNavigate={(dest) => {
                if (dest === "chat") setView("chat");
                else setView("overview");
              }}
              onSignOut={signOut}
            />
            <button
              className="dispatch-icon-button"
              aria-label="About this demo"
              onClick={() => setModal("help")}
            >
              <CircleHelp size={20} aria-hidden="true" />
            </button>
            <button
              className="dispatch-icon-button dispatch-mobile-signout"
              aria-label="Sign out"
              onClick={signOut}
            >
              <LogOut size={18} aria-hidden="true" />
            </button>
          </div>
        </header>

        <main className="dispatch-content">
          {/* Header Bar & Depot Switcher */}
          <div className="dispatch-heading">
            <div>
              <h1>
                {view === "overview"
                  ? "Staging queue"
                  : view === "manifest"
                    ? "Loading checklist"
                    : view === "discrepancies"
                      ? "Exception log"
                      : "Comms"}
              </h1>
              <p>
                {view === "overview"
                  ? "Vehicle staging queue for this depot. Select a vehicle to open its loading checklist."
                  : view === "manifest"
                    ? "Staged cargo checklist. Verify each stop and clear the vehicle for departure."
                    : view === "discrepancies"
                      ? "Staging exceptions that need a dispatch resolution before departure."
                      : "Direct communication with the planning desk and drivers."}
              </p>
            </div>

            <div className="dispatch-context">
              <label>
                Depot
                <select
                  value={depot}
                  onChange={(e) => {
                    setDepot(e.target.value as Depot);
                    setMessage(`Switched to ${e.target.value} warehouse staging.`);
                  }}
                >
                  <option value="Peliyagoda">Peliyagoda</option>
                  <option value="Kandy">Kandy</option>
                </select>
              </label>

              <label>
                Operating date
                <input type="date" value={DEMO_DATE} readOnly disabled />
              </label>
            </div>
          </div>

          {/* User Feedback */}
          {message && (
            <div className="dispatch-feedback mb-4 p-3 bg-secondary border border-border rounded-md text-xs font-medium flex items-center justify-between">
              <span className="flex items-center gap-2 text-primary">
                <CheckCircle2 size={15} />
                {message}
              </span>
              <button
                type="button"
                className="text-xs underline"
                onClick={() => setMessage("")}
              >
                Dismiss
              </button>
            </div>
          )}

          {failure && (
            <div className="dispatch-feedback mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-xs font-medium text-destructive flex items-center justify-between">
              <span className="flex items-center gap-2">
                <AlertTriangle size={15} />
                {failure}
              </span>
              <button
                type="button"
                className="text-xs underline"
                onClick={() => setFailure("")}
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Sub-Views */}
          {view === "overview" && (
            <LoaderOverview
              plan={plan}
              depot={depot}
              discrepancies={discrepancies}
              clearedTrips={clearedTrips}
              onSelectTrip={(id) => {
                setSelectedTripId(id);
                setView("manifest");
              }}
            />
          )}

          {view === "manifest" && (
            <LoaderManifest
              plan={plan}
              depot={depot}
              selectedTripId={selectedTripId}
              onBack={() => setView("overview")}
              discrepancies={discrepancies}
              onAddDiscrepancy={handleAddDiscrepancy}
              onClearDeparture={handleClearDeparture}
              isCleared={!!clearedTrips[selectedTripId]}
            />
          )}

          {view === "discrepancies" && (
            <LoaderDiscrepancies
              discrepancies={activeDepotDiscrepancies}
              onResolve={handleResolveDiscrepancy}
              onUpdateResolution={handleUpdateResolution}
            />
          )}

          {view === "chat" && (
            <WorkspaceChat
              state={workspace}
              depot={depot}
              onSave={saveWorkspace}
            />
          )}
        </main>
      </div>

      {/* Help Dialog */}
      <Dialog open={modal === "help"} onOpenChange={(open) => !open && setModal(null)}>
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle>Loader workspace guide</DialogTitle>
            <DialogDescription>
              Standard operating procedures for warehouse staging and vehicle release.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs text-foreground/90">
            <p>
              <strong>1. Loading order:</strong> Trucks are loaded in reverse stop sequence — the last delivery stop is packed first at the front of the vehicle, and the first stop goes in last at the rear door.
            </p>
            <p>
              <strong>2. Staging exceptions:</strong> Flag any damaged or missing items before the vehicle departs. Dispatch will authorise whether to ship partial, hold for replacement, or defer the order.
            </p>
            <p>
              <strong>3. Departure clearance:</strong> Once all stops are verified and any exceptions are acknowledged, clear the vehicle to release the manifest to the driver.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
