"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  CircleHelp,
  Layers,
  LoaderCircle,
  LogOut,
  MessageSquare,
  PanelLeftClose,
  PanelLeftOpen,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
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
  initialPlan,
  orders,
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
import { SharedAccountTools } from "@/features/shared/account-tools";
import { LoaderOverview } from "./loader-overview";
import {
  LoaderManifest,
  type ClearanceRecord,
  type DiscrepancyRecord,
  type ManifestVerification,
} from "./loader-manifest";
import { LoaderDiscrepancies } from "./loader-discrepancies";
import { loaderApi, type LoadingExceptionRecord } from "./loader-api";

import "@/features/dispatcher/dispatcher.css";
import "@/features/dispatcher/workspace.css";
import "@/features/dispatcher/overview.css";
import "@/features/dispatcher/operations.css";
import "@/features/dispatcher/monochrome.css";
import "./loader.css";

type LoaderView = "overview" | "manifest" | "discrepancies" | "chat";

function exceptionType(type: LoadingExceptionRecord["type"]): DiscrepancyRecord["type"] {
  if (type === "DAMAGE") return "damaged";
  if (type === "TEMPERATURE") return "temperature_breach";
  return "missing";
}

function resolution(value?: string | null): DiscrepancyRecord["resolution"] {
  const normalized = value?.toLowerCase().replaceAll(" ", "_");
  if (normalized === "ship_partial") return "ship_partial";
  if (normalized === "hold_replacement") return "hold_replacement";
  if (normalized === "emergency_defer") return "emergency_defer";
  return "pending";
}

export function LoaderDashboard() {
  const router = useRouter();
  const contentRef = useRef<HTMLElement>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [plan, setPlan] = useState<Plan>(initialPlan);
  const [depot, setDepot] = useState<Depot>("Peliyagoda");
  const [view, setView] = useState<LoaderView>("overview");
  const [navCollapsed, setNavCollapsed] = useState(false);
  const [selectedTripId, setSelectedTripId] = useState<string>("");
  const [workspace, setWorkspace] = useState<WorkspaceState>(initialWorkspace);
  const [clearedTrips, setClearedTrips] = useState<Record<string, ClearanceRecord>>({});
  const [verifications, setVerifications] = useState<Record<string, ManifestVerification>>({});
  const [message, setMessage] = useState("");
  const [failure, setFailure] = useState("");
  const [modal, setModal] = useState<"help" | null>(null);
  const [discrepancies, setDiscrepancies] = useState<DiscrepancyRecord[]>([]);

  const reloadLoader = useCallback(async () => {
    const loaded = await planningService.loadLoader();
    setPlan(loaded);
    setSelectedTripId((current) =>
      loaded.trips.some((trip) => trip.id === current) ? current : (loaded.trips[0]?.id ?? "")
    );

    const details = await Promise.all(
      loaded.trips
        .filter((trip) => trip.recordId)
        .map(async (trip) => ({ trip, detail: await loaderApi.getManifest(trip.recordId!) }))
    );
    const nextClearances: Record<string, ClearanceRecord> = {};
    const nextDiscrepancies: DiscrepancyRecord[] = [];
    for (const { trip, detail } of details) {
      if (["CLEARED", "DRIVER_READY", "EN_ROUTE", "RETURNING", "COMPLETED"].includes(trip.status ?? "")) {
        nextClearances[trip.id] = {
          tripId: trip.id,
          vehicleId: trip.vehicleId,
          clearedAt: detail.manifest.clearedAt
            ? new Date(detail.manifest.clearedAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
            : "Recorded",
          clearedBy: "Warehouse loading team",
          totalStops: trip.orderIds.length,
          finalKg: 0,
          finalM3: 0,
          exceptionsCount: detail.loadingExceptions.length,
        };
      }
      for (const item of detail.loadingExceptions) {
        const order = orders.find((candidate) => candidate.id === item.orderId);
        nextDiscrepancies.push({
          id: item.id,
          tripId: trip.id,
          orderId: item.orderId,
          outlet: order?.outlet ?? "Published stop",
          depot: trip.depot,
          vehicleId: trip.vehicleId,
          type: exceptionType(item.type),
          quantity: item.affectedQuantity,
          itemDescription: item.affectedSku ?? "Manifest item",
          skuCode: item.affectedSku ?? undefined,
          kgImpact: 0,
          m3Impact: 0,
          notes: item.notes,
          reportedBy: "Warehouse loading team",
          timestamp: new Date(item.createdAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
          resolution: item.status === "OPEN" ? "pending" : resolution(item.resolution),
          resolutionNotes: item.resolution ?? undefined,
          resolvedAt: item.resolvedAt
            ? new Date(item.resolvedAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
            : undefined,
        });
      }
    }
    setClearedTrips(nextClearances);
    setDiscrepancies(nextDiscrepancies);
  }, []);

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
        setWorkspace(workspaceService.load());
      } catch {
        setFailure("Workspace preferences could not be loaded.");
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, [router]);

  useEffect(() => {
    if (!session) return;
    const timer = window.setTimeout(() => {
      void reloadLoader().catch((error: unknown) => {
        setFailure(error instanceof Error ? error.message : "Published manifests could not be loaded.");
      });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [reloadLoader, session]);

  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0, left: 0 });
    window.scrollTo({ top: 0, left: 0 });
  }, [depot, view]);

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

  async function handleAddDiscrepancy(record: DiscrepancyRecord) {
    const tripId = plan.trips.find((trip) => trip.id === record.tripId)?.recordId;
    if (!tripId) {
      setFailure("The published trip could not be found.");
      return;
    }
    try {
      const created = await loaderApi.reportException(tripId, record);
      await reloadLoader();
      setFailure("");
      setMessage(`Exception ${created.id} was recorded and Dispatch was notified.`);
    } catch (error) {
      setFailure(error instanceof Error ? error.message : "The loading exception could not be recorded.");
    }
  }

  async function handleClearDeparture(tripId: string) {
    const recordId = plan.trips.find((trip) => trip.id === tripId)?.recordId;
    if (!recordId) {
      setFailure("The published trip could not be found.");
      return;
    }
    try {
      await loaderApi.verifyManifest(recordId);
      await loaderApi.clearDeparture(recordId);
      await reloadLoader();
      setFailure("");
      setMessage(`Trip ${tripId} is cleared. The driver was notified to complete readiness.`);
      setView("overview");
    } catch (error) {
      setFailure(error instanceof Error ? error.message : "Departure clearance could not be issued.");
    }
  }

  function handleVerificationChange(tripId: string, next: ManifestVerification) {
    setVerifications((current) => ({ ...current, [tripId]: next }));
  }

  function signOut() {
    try {
      authService.signOut();
      router.replace("/login");
    } catch {
      setFailure("Could not sign out.");
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
              { id: "discrepancies", label: "Exception log", Icon: ShieldAlert },
              { id: "chat", label: "Comms", Icon: MessageSquare },
            ] as const
          ).map(({ id, label, Icon }) => (
            <button
              key={id}
              aria-label={label}
              title={navCollapsed ? label : undefined}
              aria-current={
                (id === "overview" && (view === "overview" || view === "manifest")) ||
                  view === id
                  ? "page"
                  : undefined
              }
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
            <span>Loader · {session.location}</span>
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
            <span className="demo-label">Live operations</span>
            <SharedAccountTools session={session} />
            <WorkspaceTools
              state={workspace}
              onSave={saveWorkspace}
            />
            <button
              className="dispatch-icon-button"
              aria-label="Workspace guide"
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

        <main ref={contentRef} className="dispatch-content dispatch-content-scrollable loader-content">
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
                    const nextDepot = e.target.value as Depot;
                    setDepot(nextDepot);
                    setSelectedTripId(
                      plan.trips.find((trip) => trip.depot === nextDepot)?.id ?? ""
                    );
                    if (view === "manifest") setView("overview");
                    setMessage(`Switched to ${nextDepot} warehouse staging.`);
                  }}
                >
                  <option value="Peliyagoda">Peliyagoda</option>
                  <option value="Kandy">Kandy</option>
                </select>
              </label>

              <label>
                Selected trip date
                <input type="date" value={plan.trips.find((trip) => trip.id === selectedTripId)?.operatingDate ?? ""} readOnly disabled />
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
              verification={verifications[selectedTripId] ?? { checkedStops: [], checkedSkus: {} }}
              onVerificationChange={(next) => handleVerificationChange(selectedTripId, next)}
              isCleared={!!clearedTrips[selectedTripId]}
            />
          )}

          {view === "discrepancies" && (
            <LoaderDiscrepancies
              discrepancies={activeDepotDiscrepancies}
              onOpenTrip={(tripId) => {
                setSelectedTripId(tripId);
                setView("manifest");
              }}
            />
          )}

          {view === "chat" && (
            <WorkspaceChat />
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
