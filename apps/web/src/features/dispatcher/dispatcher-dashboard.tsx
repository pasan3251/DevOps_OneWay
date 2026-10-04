"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowUp,
  ArrowRight,
  Check,
  CheckCircle2,
  CircleHelp,
  CalendarDays,
  Store,
  MessageSquare,
  ClipboardList,
  Clock3,
  CornerDownRight,
  FileCheck2,
  LayoutDashboard,
  PanelLeftClose,
  PanelLeftOpen,
  Route,
  LoaderCircle,
  LogOut,
  Plus,
  Search,
  ShieldCheck,
  Snowflake,
  Truck,
  Undo2,
  X,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { WaypointLogo } from "@/components/waypoint-logo";
import { authService, type Session } from "@/features/auth/auth-service";
import {
  DEMO_DATE,
  deferralReasons,
  formatTime,
  fuelLitres,
  initialPlan,
  orders,
  planningService,
  stopTimes,
  totals,
  tripMinutes,
  validateTrip,
  vehicles,
  type Depot,
  type Plan,
  type Trip,
} from "./planning";
import "./dispatcher.css";
import { DispatchOverview } from "./dispatch-overview";
import "./overview.css";
import { OrderIntake } from "./order-intake";
import { FleetManager } from "./fleet-manager";
import { RouteSchedule } from "./route-schedule";
import { proposeTrip } from "./dispatch-operations";
import "./operations.css";
import { DeferralRecords, OutletDirectory } from "./workspace-records";
import { WorkspaceCalendar } from "./workspace-calendar";
import { WorkspaceChat } from "./workspace-chat";
import { WorkspaceTools } from "./workspace-tools";
import { RouteMap } from "./route-map";
import { RouteViews } from "./route-views";
import {
  initialWorkspace,
  workspaceService,
  type WorkspaceState,
} from "./workspace-state";
import "./workspace.css";
import "./monochrome.css";

type View =
  | "overview"
  | "planning"
  | "fleet"
  | "routes"
  | "deferrals"
  | "outlets"
  | "calendar"
  | "chat";
type RouteMode = "allocate" | "assign" | "tracking" | "manage";

const dispatcherNavigation = [
  { id: "overview", label: "Overview", Icon: LayoutDashboard },
  { id: "planning", label: "Orders", Icon: ClipboardList },
  { id: "fleet", label: "Fleet", Icon: Truck },
  { id: "routes", label: "Planning & routes", Icon: Route },
  { id: "deferrals", label: "Deferrals", Icon: Undo2 },
  { id: "outlets", label: "Outlets", Icon: Store },
  { id: "calendar", label: "Capacity outlook", Icon: CalendarDays },
  { id: "chat", label: "Messages", Icon: MessageSquare },
] as const;

const routeModes = [
  ["allocate", "Allocate vehicles"],
  ["assign", "Build routes"],
  ["manage", "Published routes"],
  ["tracking", "Live operations"],
] as const;
const NAV_COLLAPSED_KEY = "waypoint.dispatcher.navigation-collapsed.v1";

export function DispatcherDashboard() {
  const router = useRouter();
  const contentRef = useRef<HTMLElement>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [plan, setPlan] = useState<Plan>(initialPlan);
  const [depot, setDepot] = useState<Depot>("Peliyagoda");
  const [date, setDate] = useState(DEMO_DATE);
  const [view, setView] = useState<View>("overview");
  const [workspace, setWorkspace] = useState<WorkspaceState>(initialWorkspace);
  const [routeMode, setRouteMode] = useState<RouteMode>("allocate");
  const [mapOrder, setMapOrder] = useState<string | null>(null);
  const [navCollapsed, setNavCollapsed] = useState(true);
  const [query, setQuery] = useState("");
  const [brand, setBrand] = useState("All brands");
  const [selected, setSelected] = useState<string[]>([]);
  const [tripId, setTripId] = useState("TRIP-01");
  const [message, setMessage] = useState("");
  const [failure, setFailure] = useState("");
  const [assignmentErrors, setAssignmentErrors] = useState<string[]>([]);
  const [modal, setModal] = useState<
    "trip" | "defer" | "publish" | "help" | null
  >(null);
  const [newVehicle, setNewVehicle] = useState("WP-008");
  const [newDeparture, setNewDeparture] = useState("05:00");
  const [reason, setReason] = useState(deferralReasons[0]);
  const [note, setNote] = useState("");
  const [deferralError, setDeferralError] = useState("");

  useEffect(() => {
    const active = authService.getSession();
    if (!active) {
      router.replace("/login");
      return;
    }
    if (active.role !== "dispatcher") {
      router.replace(`/workspace/${active.role}`);
      return;
    }
    const timer = window.setTimeout(() => {
      setSession(active);
      const [destination, routeDestination] = window.location.hash
        .slice(1)
        .split("/");
      if (
        [
          "overview",
          "planning",
          "fleet",
          "routes",
          "deferrals",
          "outlets",
          "calendar",
          "chat",
        ].includes(destination)
      )
        setView(destination as View);
      if (
        destination === "routes" &&
        (["allocate", "assign", "tracking", "manage"] as const).includes(
          routeDestination as RouteMode,
        )
      )
        setRouteMode(routeDestination as RouteMode);
      try {
        setPlan(planningService.load());
      } catch {
        setFailure(
          "Your saved demo plan couldn’t be read. Changes will replace it only when saved successfully.",
        );
      }
      try {
        setWorkspace(workspaceService.load());
      } catch {
        setFailure(
          "Your saved calendar, chat and appearance could not be read. They will be replaced only after a successful local save.",
        );
      }
      try {
        const storedNavigation = window.localStorage.getItem(NAV_COLLAPSED_KEY);
        if (storedNavigation !== null)
          setNavCollapsed(storedNavigation === "true");
      } catch {
        // Navigation remains usable even when browser preference storage fails.
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [router]);

  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0, left: 0 });
  }, [routeMode, view]);

  const isDemoDate = date === DEMO_DATE;
  const depotOrders = isDemoDate
    ? orders.filter((order) => order.depot === depot)
    : [];
  const depotTrips = isDemoDate
    ? plan.trips.filter((trip) => trip.depot === depot)
    : [];
  const activeTrip =
    depotTrips.find((trip) => trip.id === tripId) ?? depotTrips[0];
  const activeVehicle = activeTrip
    ? vehicles.find((vehicle) => vehicle.id === activeTrip.vehicleId)!
    : null;
  const published = isDemoDate && plan.published.includes(depot);
  const deferred = depotOrders.filter((order) =>
    plan.deferrals.some((entry) => entry.orderId === order.id),
  );
  const assigned = depotOrders.filter((order) =>
    depotTrips.some((trip) => trip.orderIds.includes(order.id)),
  );
  const pending = depotOrders.filter(
    (order) => !assigned.includes(order) && !deferred.includes(order),
  );
  const backlog = pending.filter(
    (order) =>
      (brand === "All brands" || order.brand === brand) &&
      `${order.id} ${order.outlet} ${order.district}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  const issues = activeTrip ? validateTrip(activeTrip, plan) : [];
  const load = activeTrip ? totals(activeTrip) : { kg: 0, m3: 0 };
  const invalidTrips = depotTrips.filter(
    (trip) => validateTrip(trip, plan).length,
  );
  const canPublish =
    depotTrips.length > 0 && invalidTrips.length === 0 && pending.length === 0;
  const selectedOrders = pending.filter((order) => selected.includes(order.id));

  function navigateView(value: View) {
    if (value === "routes") setRouteMode("allocate");
    if (value === "planning") {
      setSelected((current) => current.slice(0, 1));
      setAssignmentErrors([]);
    }
    setView(value);
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${value === "overview" ? "" : `#${value}`}`,
    );
  }
  function toggleNavigation() {
    const next = !navCollapsed;
    setNavCollapsed(next);
    try {
      window.localStorage.setItem(NAV_COLLAPSED_KEY, String(next));
    } catch {
      setFailure(
        "The navigation preference could not be saved, but the workspace remains usable.",
      );
    }
  }
  function navigateRouteMode(value: RouteMode) {
    setRouteMode(value);
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}#routes${value === "allocate" ? "" : `/${value}`}`,
    );
  }
  function saveWorkspace(next: WorkspaceState, feedback: string) {
    try {
      workspaceService.save(next);
      setWorkspace(next);
      setFailure("");
      setMessage(feedback);
      return true;
    } catch {
      setFailure(
        "This workspace change could not be saved. Check browser storage and try again; your entries are preserved.",
      );
      return false;
    }
  }
  function inspectOrder(id: string) {
    setQuery(id);
    setBrand("All brands");
    setSelected(id ? [id] : []);
    setAssignmentErrors([]);
    navigateView("planning");
    if (id)
      window.setTimeout(
        () => document.getElementById(`dispatch-order-${id}`)?.focus(),
        0,
      );
  }
  function save(next: Plan, feedback: string) {
    try {
      planningService.save(next);
      setPlan(next);
      setMessage(feedback);
      setFailure("");
      setAssignmentErrors([]);
      return true;
    } catch {
      setFailure(
        "Your browser couldn’t save this change. Your previous plan is intact. Allow site storage and retry.",
      );
      return false;
    }
  }
  function changeDepot(value: Depot) {
    setDepot(value);
    setSelected([]);
    setQuery("");
    setBrand("All brands");
    setAssignmentErrors([]);
    setMessage("");
    setNewVehicle(
      vehicles.find((vehicle) => vehicle.depot === value && !vehicle.workshop)!
        .id,
    );
  }
  function toggleOrder(id: string) {
    setSelected((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
    setAssignmentErrors([]);
  }
  function assign(orderIds?: string[]) {
    const assignmentOrders = orderIds
      ? pending.filter((order) => orderIds.includes(order.id))
      : selectedOrders;
    if (!activeTrip || !assignmentOrders.length || published) return;
    const updated = {
      ...activeTrip,
      orderIds: [
        ...activeTrip.orderIds,
        ...assignmentOrders.map((order) => order.id),
      ],
    };
    const next = {
      ...plan,
      trips: plan.trips.map((trip) =>
        trip.id === updated.id ? updated : trip,
      ),
    };
    const errors = validateTrip(updated, next);
    if (errors.length) {
      setAssignmentErrors(errors);
      return;
    }
    if (
      save(
        next,
        `${assignmentOrders.length} order${assignmentOrders.length === 1 ? "" : "s"} assigned to ${activeTrip.id}.`,
      )
    )
      setSelected([]);
  }
  function updateTrip(trip: Trip) {
    if (!published)
      save(
        {
          ...plan,
          trips: plan.trips.map((item) => (item.id === trip.id ? trip : item)),
        },
        "Trip updated. Review its checks before publishing.",
      );
  }
  function createTrip(event: React.FormEvent) {
    event.preventDefault();
    const [hour, minute] = newDeparture.split(":").map(Number);
    const used = new Set(plan.trips.map((trip) => trip.id));
    let number = 1;
    while (used.has(`TRIP-${String(number).padStart(2, "0")}`)) number++;
    const trip: Trip = {
      id: `TRIP-${String(number).padStart(2, "0")}`,
      depot,
      vehicleId: newVehicle,
      orderIds: [],
      departure: hour * 60 + minute,
    };
    if (
      save(
        { ...plan, trips: [...plan.trips, trip] },
        `${trip.id} created. Select orders to build its stop list.`,
      )
    ) {
      setTripId(trip.id);
      openRoute(trip.id);
      setModal(null);
    }
  }
  function defer(event: React.FormEvent) {
    event.preventDefault();
    if (!note.trim()) {
      setDeferralError(
        "Add a note so the next dispatcher can understand this decision.",
      );
      return;
    }
    if (
      selectedOrders.some((order) => order.carryOver) &&
      note.trim().length < 20
    ) {
      setDeferralError(
        "A repeated deferral needs a justification of at least 20 characters (demo team policy).",
      );
      return;
    }
    if (
      save(
        {
          ...plan,
          deferrals: [
            ...plan.deferrals,
            ...selectedOrders.map((order) => ({
              orderId: order.id,
              reason,
              note: note.trim(),
            })),
          ],
        },
        `${selectedOrders.length} order${selectedOrders.length === 1 ? "" : "s"} deferred with a recorded reason.`,
      )
    ) {
      setSelected([]);
      setModal(null);
      setNote("");
      setDeferralError("");
    }
  }
  function signOut() {
    try {
      authService.signOut();
      router.replace("/login");
    } catch {
      setFailure(
        "Couldn’t clear your demo session. Allow site storage and retry sign-out.",
      );
    }
  }
  function openRoute(id?: string) {
    if (id) setTripId(id);
    navigateView("routes");
    navigateRouteMode("assign");
  }
  function createAssignedTrip(orderId: string, vehicleId: string) {
    if (published) return;
    const order = pending.find((item) => item.id === orderId);
    const vehicle = vehicles.find(
      (item) => item.id === vehicleId && item.depot === depot,
    );
    if (!order || !vehicle) return;
    const proposal = proposeTrip(order, vehicle, plan);
    if (proposal.issues.length) {
      setAssignmentErrors(proposal.issues);
      return;
    }
    if (save(proposal.next, `${order.id} allocated to ${proposal.trip.id}.`)) {
      setSelected([]);
      setTripId(proposal.trip.id);
      openRoute(proposal.trip.id);
    }
  }

  function openTripCreation(vehicleId: string) {
    setNewVehicle(vehicleId);
    setModal("trip");
  }

  function replaceRouteVehicle(vehicleId: string) {
    if (!activeTrip || published) return;
    const updated = { ...activeTrip, vehicleId };
    const next = {
      ...plan,
      trips: plan.trips.map((trip) =>
        trip.id === activeTrip.id ? updated : trip,
      ),
    };
    const checks = validateTrip(updated, next).filter(
      (issue) => issue !== "Add at least one order to this trip.",
    );
    if (checks.length) {
      setFailure(checks.join(" "));
      return;
    }
    if (save(next, "Route vehicle updated.")) openRoute(activeTrip.id);
  }
  if (!session)
    return (
      <main className="workspace-loading">
        <LoaderCircle aria-hidden="true" className="loading-spinner" />
        <p role="status">Opening dispatch planning…</p>
      </main>
    );

  return (
    <div
      data-theme={workspace.theme}
      className={`dispatch-app dispatch-scroll-shell${navCollapsed ? " navigation-collapsed" : ""}${view === "overview" ? " is-overview" : ""}`}
    >
      <aside className="dispatch-sidebar">
        <WaypointLogo light />
        <nav aria-label="Dispatcher navigation">
          {dispatcherNavigation.map(({ id, label, Icon }) => (
            <Tooltip key={id}>
              <TooltipTrigger asChild>
                <button
                  aria-label={label}
                  aria-current={view === id ? "page" : undefined}
                  onClick={() => {
                    navigateView(id);
                    setMessage("");
                  }}
                >
                  <Icon size={19} aria-hidden="true" />
                  <span className="dispatch-nav-label">{label}</span>
                  {id === "deferrals" && deferred.length > 0 && (
                    <span className="nav-count">{deferred.length}</span>
                  )}
                </button>
              </TooltipTrigger>
              {navCollapsed && (
                <TooltipContent side="right" sideOffset={8}>
                  {label}
                </TooltipContent>
              )}
            </Tooltip>
          ))}
          {view === "routes" && (
            <div
              className="dispatch-route-subnav"
              aria-label="Planning and route views"
            >
              {routeModes.map(([id, label]) => (
                <button
                  key={id}
                  aria-current={routeMode === id ? "page" : undefined}
                  onClick={() => navigateRouteMode(id)}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </nav>
        <div className="dispatch-sidebar-note">
          <ShieldCheck size={20} aria-hidden="true" />
          <p>
            One plan.
            <br />
            Every delivery connected.
          </p>
        </div>
        <div className="dispatch-user">
          <span className="user-avatar">DS</span>
          <div>
            <strong>{session.name}</strong>
            <span>Dispatcher · Demo</span>
          </div>
          <button aria-label="Sign out" onClick={signOut}>
            <LogOut size={18} aria-hidden="true" />
          </button>
        </div>
      </aside>
      <div className="dispatch-main">
        <header className="dispatch-topbar">
          <div>
            <button
              className="dispatch-icon-button navigation-toggle"
              aria-label={
                navCollapsed ? "Expand navigation" : "Collapse navigation"
              }
              aria-expanded={!navCollapsed}
              onClick={toggleNavigation}
            >
              {navCollapsed ? (
                <PanelLeftOpen size={20} aria-hidden="true" />
              ) : (
                <PanelLeftClose size={20} aria-hidden="true" />
              )}
            </button>
            <span>Dispatcher workspace</span>
          </div>
          <div>
            <span className="demo-label">Demo data</span>
            <WorkspaceTools
              state={workspace}
              plan={plan}
              depot={depot}
              name={session.name}
              onSave={saveWorkspace}
              onNavigate={navigateView}
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
        <main
          ref={contentRef}
          className="dispatch-content dispatch-content-scrollable"
        >
          <div className="dispatch-heading">
            <div>
              <h1>
                {view === "overview"
                  ? "Today’s plan"
                  : view === "planning"
                    ? "Orders"
                    : view === "fleet"
                      ? "Fleet"
                      : view === "routes"
                        ? "Planning & routes"
                        : view === "deferrals"
                          ? "Deferred orders"
                          : view === "outlets"
                            ? "Outlets"
                            : view === "calendar"
                              ? "Capacity outlook"
                              : "Messages"}
              </h1>
              <p>
                {view === "overview"
                  ? "See decisions, constraints and live operations at a glance."
                  : view === "planning"
                    ? "Review each order and approve it for planning or defer it with a reason."
                    : view === "fleet"
                      ? "Inspect availability, condition and capability across the fleet."
                      : view === "routes"
                        ? "Allocate vehicles, build routes, validate constraints and monitor published work."
                        : view === "deferrals"
                          ? "Keep every unserved order visible, with a reason to act on."
                          : view === "outlets"
                            ? "Know each outlet’s requirements before planning its delivery."
                            : view === "calendar"
                              ? "Compare planned demand, fleet availability and operational events."
                              : "Keep operational conversations organized by role and context."}
              </p>
            </div>
            <Button
              className="dispatch-primary"
              disabled={!isDemoDate}
              onClick={() =>
                published
                  ? save(
                      {
                        ...plan,
                        published: plan.published.filter(
                          (item) => item !== depot,
                        ),
                      },
                      "Demo plan reopened. No real manifests have been changed.",
                    )
                  : setModal("publish")
              }
            >
              {published ? (
                <Undo2 aria-hidden="true" />
              ) : (
                <FileCheck2 aria-hidden="true" />
              )}
              {published ? "Reopen draft" : "Review plan"}
            </Button>
          </div>
          <div className="dispatch-controls">
            <div className="dispatch-context">
              <label>
                Depot
                <select
                  aria-label="Depot"
                  value={depot}
                  onChange={(event) => changeDepot(event.target.value as Depot)}
                >
                  <option>Peliyagoda</option>
                  <option>Kandy</option>
                </select>
              </label>
              <label>
                Operating day
                <input
                  type="date"
                  aria-label="Operating day"
                  value={date}
                  onChange={(event) => {
                    setDate(event.target.value);
                    setSelected([]);
                    setAssignmentErrors([]);
                    setMessage("");
                  }}
                />
              </label>
              <span className="dispatch-timezone">
                <Clock3 size={15} aria-hidden="true" />
                Asia/Colombo
              </span>
            </div>
            <span className={`plan-status ${published ? "is-published" : ""}`}>
              <span />
              {published ? "Published locally" : "Draft plan"}
            </span>
          </div>
          {["planning", "fleet", "routes", "deferrals"].includes(view) && (
            <div className="dispatch-summary" aria-label="Plan summary">
              <span>
                <strong>{depotOrders.length}</strong> orders for this day
              </span>
              <span>
                <strong>{pending.length}</strong> awaiting decision
              </span>
              <span>
                <strong>{assigned.length}</strong> planned across{" "}
                {depotTrips.length} trip{depotTrips.length === 1 ? "" : "s"}
              </span>
              <span>
                <strong>{deferred.length}</strong> deferred
              </span>
            </div>
          )}
          {failure && (
            <div className="dispatch-feedback is-error" role="alert">
              <AlertTriangle size={18} aria-hidden="true" />
              {failure}
            </div>
          )}
          {message && (
            <div className="dispatch-feedback" role="status">
              <CheckCircle2 size={18} aria-hidden="true" />
              {message}
            </div>
          )}
          {published && (
            <div className="dispatch-published">
              <CheckCircle2 size={19} aria-hidden="true" />
              <span>
                This depot’s demo plan is locked. Reopen the draft to make
                changes. Nothing has been sent to loaders, drivers or stores.
              </span>
            </div>
          )}
          {!isDemoDate && !["outlets", "calendar", "chat"].includes(view) ? (
            <section className="dispatch-empty">
              <ClipboardList size={32} aria-hidden="true" />
              <h2>No demo orders for this day</h2>
              <p>
                The sample scenario is available for 3 October 2026. Real
                operating dates will come from the backend.
              </p>
              <Button variant="outline" onClick={() => setDate(DEMO_DATE)}>
                Return to demo day
              </Button>
            </section>
          ) : view === "overview" ? (
            <DispatchOverview
              plan={plan}
              depot={depot}
              date={date}
              onDate={(value) => {
                setDate(value);
                setSelected([]);
                setAssignmentErrors([]);
                setMessage("");
              }}
              onNavigate={(destination, orderId) => {
                if (orderId) {
                  setQuery(orderId);
                  setBrand("All brands");
                  setSelected([orderId]);
                  setAssignmentErrors([]);
                  window.setTimeout(
                    () =>
                      document
                        .getElementById(`dispatch-order-${orderId}`)
                        ?.focus(),
                    0,
                  );
                }
                navigateView(destination);
              }}
            />
          ) : view === "planning" ? (
            <OrderIntake
              plan={plan}
              depot={depot}
              published={published}
              query={query}
              brand={brand}
              selected={selected}
              tripId={activeTrip?.id}
              onQuery={setQuery}
              onBrand={setBrand}
              onSelect={(ids) => {
                setSelected(ids);
                setAssignmentErrors([]);
              }}
              onTrip={(id) => {
                setTripId(id);
                setAssignmentErrors([]);
              }}
              onAssign={(orderId) => assign([orderId])}
              onCreateAssign={createAssignedTrip}
              onDefer={(orderId) => {
                setSelected([orderId]);
                setDeferralError("");
                setModal("defer");
              }}
              onReturn={(orderId) =>
                save(
                  {
                    ...plan,
                    deferrals: plan.deferrals.filter(
                      (entry) => entry.orderId !== orderId,
                    ),
                  },
                  "Order returned to the backlog.",
                )
              }
              onRoute={openRoute}
              errors={assignmentErrors}
            />
          ) : view === "outlets" ? (
            <OutletDirectory
              plan={plan}
              depot={depot}
              onOrder={(id) => {
                setDate(DEMO_DATE);
                inspectOrder(id);
              }}
              onRoute={(id) => {
                setDate(DEMO_DATE);
                openRoute(id);
              }}
            />
          ) : view === "calendar" ? (
            <WorkspaceCalendar
              state={workspace}
              plan={plan}
              depot={depot}
              date={date}
              onSave={saveWorkspace}
              onDate={setDate}
              onRoute={(id) => {
                setDate(DEMO_DATE);
                openRoute(id);
              }}
            />
          ) : view === "chat" ? (
            <WorkspaceChat
              state={workspace}
              depot={depot}
              onSave={saveWorkspace}
            />
          ) : view === "routes" ? (
            <div className="route-planning-workspace">
              <Tabs
                value={routeMode}
                onValueChange={(value) => navigateRouteMode(value as RouteMode)}
                aria-label="Planning and route modes"
              >
                <TabsList className="route-mode-tabs" variant="line">
                  {routeModes.map(([id, label]) => (
                    <TabsTrigger key={id} value={id}>
                      {label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
              {routeMode === "allocate" ? (
                <FleetManager
                  fixedView="capacity"
                  plan={plan}
                  depot={depot}
                  activeTrip={activeTrip}
                  published={published}
                  onRoute={openRoute}
                  onCreate={openTripCreation}
                  onUse={replaceRouteVehicle}
                />
              ) : routeMode !== "assign" ? (
                <RouteViews
                  mode={routeMode}
                  plan={plan}
                  depot={depot}
                  selectedId={activeTrip?.id}
                  onSelect={setTripId}
                  onEdit={(id) => {
                    setTripId(id);
                    navigateRouteMode("assign");
                  }}
                  state={workspace}
                  onSave={saveWorkspace}
                />
              ) : (
                <>
                  <RouteSchedule
                    trips={depotTrips}
                    plan={plan}
                    selectedId={activeTrip?.id}
                    published={published}
                    onSelect={(id) => {
                      setTripId(id);
                      setAssignmentErrors([]);
                    }}
                    onCreate={() => setModal("trip")}
                  />
                  <div className="dispatch-planning-grid">
                    <section
                      className="dispatch-backlog"
                      tabIndex={0}
                      role="region"
                      aria-labelledby="backlog-heading"
                    >
                      <div className="dispatch-section-heading">
                        <div>
                          <h2 id="backlog-heading">
                            Order backlog <span>{pending.length}</span>
                          </h2>
                          <p>Carry-over orders appear first.</p>
                        </div>
                        <span className="small-note">Whole orders only</span>
                      </div>
                      <div className="backlog-filters">
                        <label className="dispatch-search">
                          <Search size={17} aria-hidden="true" />
                          <input
                            aria-label="Search orders"
                            placeholder="Search outlet or order ID"
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                          />
                        </label>
                        <select
                          aria-label="Filter by brand"
                          value={brand}
                          onChange={(event) => setBrand(event.target.value)}
                        >
                          <option>All brands</option>
                          <option>Fresh</option>
                          <option>Style</option>
                          <option>Tech</option>
                        </select>
                      </div>
                      {pending.some((order) => order.carryOver) && (
                        <div className="carry-over-note">
                          <Undo2 size={15} aria-hidden="true" />
                          {
                            pending.filter((order) => order.carryOver).length
                          }{" "}
                          carry-over order
                          {pending.filter((order) => order.carryOver).length ===
                          1
                            ? ""
                            : "s"}{" "}
                          need priority
                        </div>
                      )}
                      {backlog.length ? (
                        <table className="backlog-table">
                          <caption className="sr-only">
                            Unassigned {depot} orders
                          </caption>
                          <thead>
                            <tr>
                              <th className="order-checkbox">
                                <input
                                  type="checkbox"
                                  aria-label="Select all visible orders"
                                  disabled={published}
                                  checked={backlog.every((order) =>
                                    selected.includes(order.id),
                                  )}
                                  onChange={(event) => {
                                    setSelected((current) =>
                                      event.target.checked
                                        ? Array.from(
                                            new Set([
                                              ...current,
                                              ...backlog.map(
                                                (order) => order.id,
                                              ),
                                            ]),
                                          )
                                        : current.filter(
                                            (id) =>
                                              !backlog.some(
                                                (order) => order.id === id,
                                              ),
                                          ),
                                    );
                                    setAssignmentErrors([]);
                                  }}
                                />
                              </th>
                              <th>Order / outlet</th>
                              <th className="payload-cell">Payload</th>
                              <th className="window-cell">Window</th>
                            </tr>
                          </thead>
                          <tbody>
                            {[...backlog]
                              .sort(
                                (a, b) =>
                                  Number(b.carryOver) - Number(a.carryOver),
                              )
                              .map((order) => (
                                <tr
                                  key={order.id}
                                  className={
                                    selected.includes(order.id)
                                      ? "is-selected"
                                      : ""
                                  }
                                >
                                  <td className="order-checkbox">
                                    <input
                                      type="checkbox"
                                      aria-label={`Select ${order.id}`}
                                      id={`dispatch-order-${order.id}`}
                                      checked={selected.includes(order.id)}
                                      disabled={published}
                                      onChange={() => toggleOrder(order.id)}
                                    />
                                  </td>
                                  <td>
                                    <div className="order-id">
                                      {order.id}
                                      {order.carryOver && (
                                        <span className="carry-over-badge">
                                          Carry-over
                                        </span>
                                      )}
                                    </div>
                                    <strong className="outlet-name">
                                      <button
                                        className="route-outlet-link"
                                        onClick={() => setMapOrder(order.id)}
                                      >
                                        {order.outlet}
                                      </button>
                                    </strong>
                                    <div className="order-meta">
                                      <span>{order.district}</span>
                                      {order.chilled && (
                                        <span>
                                          <Snowflake
                                            size={12}
                                            aria-hidden="true"
                                          />
                                          Chilled
                                        </span>
                                      )}
                                      {order.vanOnly && <span>Van only</span>}
                                      <span className="inline-window">
                                        Window: {formatTime(order.window[0])}–
                                        {formatTime(order.window[1])}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="payload-cell">
                                    {order.kg.toLocaleString()} kg
                                    <span>{order.m3.toFixed(1)} m³</span>
                                  </td>
                                  <td className="window-cell">
                                    {formatTime(order.window[0])}
                                    <span>– {formatTime(order.window[1])}</span>
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      ) : (
                        <div className="backlog-empty">
                          <CheckCircle2 size={26} aria-hidden="true" />
                          <h3>
                            {pending.length
                              ? "No matching orders"
                              : "Every order is accounted for"}
                          </h3>
                          <p>
                            {pending.length
                              ? "Try another outlet, order ID or brand."
                              : "Review your trips and recorded deferrals before publishing."}
                          </p>
                          {pending.length > 0 && (
                            <Button
                              variant="outline"
                              onClick={() => {
                                setQuery("");
                                setBrand("All brands");
                              }}
                            >
                              Clear filters
                            </Button>
                          )}
                        </div>
                      )}
                      <div className="backlog-actions">
                        <span>{selectedOrders.length} selected</span>
                        <button
                          className="dispatch-text-button"
                          disabled={!selectedOrders.length || published}
                          onClick={() => {
                            setDeferralError("");
                            setModal("defer");
                          }}
                        >
                          Defer orders
                        </button>
                        <Button
                          className="dispatch-primary"
                          disabled={
                            !selectedOrders.length || !activeTrip || published
                          }
                          onClick={() => assign()}
                        >
                          Assign to trip
                          <ArrowRight size={16} aria-hidden="true" />
                        </Button>
                      </div>
                      {assignmentErrors.length > 0 && (
                        <div className="assignment-error" role="alert">
                          <strong>Assignment blocked</strong>
                          <ul>
                            {assignmentErrors.map((error) => (
                              <li key={error}>{error}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </section>
                    <section
                      className="dispatch-trip"
                      aria-labelledby="trip-heading"
                      tabIndex={0}
                      role="region"
                    >
                      <div className="dispatch-section-heading">
                        <h2 id="trip-heading">Trip workspace</h2>
                        <button
                          className="dispatch-text-button"
                          disabled={published}
                          onClick={() => setModal("trip")}
                        >
                          <Plus size={16} aria-hidden="true" />
                          Add trip
                        </button>
                      </div>
                      {activeTrip && activeVehicle ? (
                        <>
                          <label className="trip-selector">
                            Selected trip
                            <select
                              value={activeTrip.id}
                              onChange={(event) => {
                                setTripId(event.target.value);
                                setAssignmentErrors([]);
                              }}
                            >
                              {depotTrips.map((trip) => (
                                <option key={trip.id} value={trip.id}>
                                  {trip.id} · {trip.vehicleId} ·{" "}
                                  {trip.orderIds.length} stops
                                </option>
                              ))}
                            </select>
                          </label>
                          <div className="trip-vehicle">
                            <span className="vehicle-icon">
                              <Truck size={23} aria-hidden="true" />
                            </span>
                            <div>
                              <strong>{activeVehicle.id}</strong>
                              <p>
                                {activeVehicle.chilled
                                  ? "Refrigerated"
                                  : "Ambient"}{" "}
                                {activeVehicle.type.toLowerCase()} · {depot}
                              </p>
                            </div>
                            <button
                              className="dispatch-text-button"
                              disabled={published}
                              onClick={() => navigateView("fleet")}
                            >
                              Change
                            </button>
                          </div>
                          <label className="trip-departure">
                            Departure
                            <input
                              type="time"
                              aria-label="Trip departure"
                              value={formatTime(activeTrip.departure)}
                              disabled={published}
                              onChange={(event) => {
                                if (event.target.value) {
                                  const [hours, minutes] = event.target.value
                                    .split(":")
                                    .map(Number);
                                  updateTrip({
                                    ...activeTrip,
                                    departure: hours * 60 + minutes,
                                  });
                                }
                              }}
                            />
                          </label>
                          <div className="allocation-map">
                            <h3>Route preview</h3>
                            <RouteMap
                              depot={depot}
                              trips={[activeTrip]}
                              selectedTrip={activeTrip.id}
                              focusedOrder={mapOrder}
                              onOrder={setMapOrder}
                            />
                            <button
                              className="dispatch-text-button"
                              disabled={
                                published || activeTrip.orderIds.length < 2
                              }
                              onClick={() => {
                                const orderIds = [...activeTrip.orderIds].sort(
                                  (a, b) =>
                                    orders.find((o) => o.id === a)!.window[1] -
                                    orders.find((o) => o.id === b)!.window[1],
                                );
                                const candidate = { ...activeTrip, orderIds };
                                const checks = validateTrip(candidate, {
                                  ...plan,
                                  trips: plan.trips.map((t) =>
                                    t.id === candidate.id ? candidate : t,
                                  ),
                                });
                                if (checks.length) {
                                  setAssignmentErrors(checks);
                                  return;
                                }
                                updateTrip(candidate);
                              }}
                            >
                              Suggest window order
                            </button>
                            <p className="workspace-note">
                              Demo suggestion sorts by window close and
                              validates the result. This is not road
                              optimization.
                            </p>
                          </div>
                          <div className="trip-capacity">
                            {[
                              {
                                label: "Weight",
                                value: load.kg,
                                max: activeVehicle.kg,
                                unit: "kg",
                              },
                              {
                                label: "Volume",
                                value: load.m3,
                                max: activeVehicle.m3,
                                unit: "m³",
                              },
                            ].map((metric) => (
                              <div key={metric.label}>
                                <div>
                                  <span>{metric.label}</span>
                                  <strong>
                                    {metric.value.toLocaleString(undefined, {
                                      maximumFractionDigits: 1,
                                    })}{" "}
                                    <span>
                                      / {metric.max.toLocaleString()}{" "}
                                      {metric.unit}
                                    </span>
                                  </strong>
                                </div>
                                <meter
                                  min={0}
                                  max={metric.max}
                                  value={Math.min(metric.value, metric.max)}
                                  aria-label={`${metric.label} used`}
                                />
                                <p>
                                  {Math.round(
                                    (metric.value / metric.max) * 100,
                                  )}
                                  % of vehicle capacity
                                </p>
                              </div>
                            ))}
                          </div>
                          <div className="trip-stops-heading">
                            <h3>Delivery sequence</h3>
                            <span>{activeTrip.orderIds.length} stops</span>
                          </div>
                          {activeTrip.orderIds.length ? (
                            <ol className="trip-stops">
                              {stopTimes(activeTrip).map((stop, index) => (
                                <li key={stop.order.id}>
                                  <span className="stop-number">
                                    {index + 1}
                                  </span>
                                  <div>
                                    <strong>{stop.order.outlet}</strong>
                                    <p>
                                      {stop.order.id} · {stop.order.kg} kg
                                    </p>
                                    <span>
                                      {formatTime(stop.start)} –{" "}
                                      {formatTime(stop.end)}{" "}
                                      <span className="small-note">
                                        demo estimate
                                      </span>
                                    </span>
                                  </div>
                                  <div className="stop-actions">
                                    <button
                                      aria-label={`Move ${stop.order.id} earlier`}
                                      disabled={published || index === 0}
                                      onClick={() => {
                                        const ids = [...activeTrip.orderIds];
                                        [ids[index - 1], ids[index]] = [
                                          ids[index],
                                          ids[index - 1],
                                        ];
                                        updateTrip({
                                          ...activeTrip,
                                          orderIds: ids,
                                        });
                                      }}
                                    >
                                      <ArrowUp size={14} aria-hidden="true" />
                                    </button>
                                    <button
                                      aria-label={`Move ${stop.order.id} later`}
                                      disabled={
                                        published ||
                                        index === activeTrip.orderIds.length - 1
                                      }
                                      onClick={() => {
                                        const ids = [...activeTrip.orderIds];
                                        [ids[index + 1], ids[index]] = [
                                          ids[index],
                                          ids[index + 1],
                                        ];
                                        updateTrip({
                                          ...activeTrip,
                                          orderIds: ids,
                                        });
                                      }}
                                    >
                                      <ArrowDown size={14} aria-hidden="true" />
                                    </button>
                                    <button
                                      aria-label={`Remove ${stop.order.id} from trip`}
                                      disabled={published}
                                      onClick={() =>
                                        updateTrip({
                                          ...activeTrip,
                                          orderIds: activeTrip.orderIds.filter(
                                            (id) => id !== stop.order.id,
                                          ),
                                        })
                                      }
                                    >
                                      <X size={14} aria-hidden="true" />
                                    </button>
                                  </div>
                                </li>
                              ))}
                            </ol>
                          ) : (
                            <div className="trip-empty">
                              <CornerDownRight size={23} aria-hidden="true" />
                              <p>
                                Select backlog orders, then assign them to this
                                trip.
                              </p>
                              <button
                                className="dispatch-text-button"
                                onClick={() =>
                                  save(
                                    {
                                      ...plan,
                                      trips: plan.trips.filter(
                                        (trip) => trip.id !== activeTrip.id,
                                      ),
                                    },
                                    "Empty trip removed.",
                                  )
                                }
                              >
                                Remove empty trip
                              </button>
                            </div>
                          )}
                          <div
                            className={`trip-checks ${issues.length ? "has-issues" : ""}`}
                          >
                            <div>
                              <ShieldCheck size={18} aria-hidden="true" />
                              <strong>
                                {issues.length
                                  ? `${issues.length} check${issues.length === 1 ? "" : "s"} to resolve`
                                  : "Ready for review"}
                              </strong>
                            </div>
                            {issues.length ? (
                              <ul>
                                {issues.map((issue) => (
                                  <li key={issue}>{issue}</li>
                                ))}
                              </ul>
                            ) : (
                              <p>
                                Capacity, temperature, access and schedule
                                checks pass for this demo trip.
                              </p>
                            )}
                          </div>
                          <div className="trip-estimates">
                            <span>
                              {tripMinutes(activeTrip)} min allocation budget
                            </span>
                            <span>
                              {fuelLitres(activeTrip).toFixed(1)} L demo fuel
                            </span>
                          </div>
                        </>
                      ) : (
                        <div className="trip-empty">
                          <Truck size={32} aria-hidden="true" />
                          <h3>Start this depot’s plan</h3>
                          <p>
                            Create a trip, choose an available vehicle, and
                            assign the first orders.
                          </p>
                          <Button
                            className="dispatch-primary"
                            onClick={() => setModal("trip")}
                          >
                            <Plus size={16} aria-hidden="true" />
                            Create first trip
                          </Button>
                        </div>
                      )}
                    </section>
                  </div>
                </>
              )}
            </div>
          ) : view === "fleet" ? (
            <FleetManager
              fixedView="fleet"
              plan={plan}
              depot={depot}
              activeTrip={activeTrip}
              published={published}
              onRoute={openRoute}
              onCreate={openTripCreation}
              onUse={replaceRouteVehicle}
            />
          ) : (
            <DeferralRecords
              plan={plan}
              depot={depot}
              published={published}
              onIntake={inspectOrder}
              onReturn={(orderId) =>
                save(
                  {
                    ...plan,
                    deferrals: plan.deferrals.filter(
                      (entry) => entry.orderId !== orderId,
                    ),
                  },
                  orderId + " returned to the backlog.",
                )
              }
            />
          )}
          <footer className="dispatch-footer">
            <span>
              Sample orders, vehicles and route estimates. Changes stay in this
              browser.
            </span>
            <span>Waypoint Fresh / Style / Tech</span>
          </footer>
        </main>
      </div>
      <Dialog
        open={modal !== null}
        onOpenChange={(open) => {
          if (!open) setModal(null);
        }}
      >
        <DialogContent className="dispatch-dialog" data-theme={workspace.theme}>
          <DialogHeader>
            <DialogTitle>
              {modal === "trip"
                ? "Create a trip"
                : modal === "defer"
                  ? "Record a deferral"
                  : modal === "publish"
                    ? "Review the daily plan"
                    : "About this demo"}
            </DialogTitle>
            <DialogDescription>
              {modal === "trip"
                ? `Choose a ${depot} vehicle and departure time.`
                : modal === "defer"
                  ? `${selectedOrders.length} selected order(s). Record why they cannot be served today.`
                  : modal === "publish"
                    ? `${depot} · 3 October 2026 · Asia/Colombo`
                    : "Frontend planning, ready for backend integration."}
            </DialogDescription>
          </DialogHeader>
          {failure && (
            <p role="alert" className="field-error">
              {failure}
            </p>
          )}
          {modal === "trip" && (
            <form onSubmit={createTrip} className="dispatch-dialog-form">
              <label>
                Vehicle
                <select
                  aria-label="New trip vehicle"
                  value={newVehicle}
                  onChange={(event) => setNewVehicle(event.target.value)}
                >
                  {vehicles
                    .filter((vehicle) => vehicle.depot === depot)
                    .map((vehicle) => (
                      <option
                        key={vehicle.id}
                        value={vehicle.id}
                        disabled={
                          vehicle.workshop ||
                          plan.trips.filter(
                            (trip) => trip.vehicleId === vehicle.id,
                          ).length >= 2
                        }
                      >
                        {vehicle.id} ·{" "}
                        {vehicle.chilled ? "Refrigerated" : "Ambient"}{" "}
                        {vehicle.type}
                        {vehicle.workshop
                          ? " · Workshop"
                          : plan.trips.filter(
                                (trip) => trip.vehicleId === vehicle.id,
                              ).length >= 2
                            ? " · Trip limit reached"
                            : ""}
                      </option>
                    ))}
                </select>
              </label>
              <label>
                Departure
                <input
                  type="time"
                  aria-label="New trip departure"
                  required
                  value={newDeparture}
                  onChange={(event) => setNewDeparture(event.target.value)}
                />
              </label>
              <Button
                className="dispatch-primary"
                type="submit"
                disabled={
                  !newDeparture ||
                  !vehicles.some(
                    (vehicle) =>
                      vehicle.id === newVehicle &&
                      vehicle.depot === depot &&
                      !vehicle.workshop,
                  ) ||
                  plan.trips.filter((trip) => trip.vehicleId === newVehicle)
                    .length >= 2
                }
              >
                Create trip
              </Button>
            </form>
          )}
          {modal === "defer" && (
            <form onSubmit={defer} className="dispatch-dialog-form">
              <label>
                Reason
                <select
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                >
                  {deferralReasons.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </label>
              <label>
                Decision note
                <textarea
                  aria-label="Decision note"
                  aria-invalid={Boolean(deferralError)}
                  aria-describedby={
                    deferralError ? "deferral-error" : undefined
                  }
                  value={note}
                  onChange={(event) => {
                    setNote(event.target.value);
                    setDeferralError("");
                  }}
                  rows={3}
                  placeholder="Explain the constraint and the next action."
                />
              </label>
              {selectedOrders.some((order) => order.carryOver) && (
                <p className="dispatch-dialog-warning">
                  This includes a carry-over order. Explain why another deferral
                  is necessary (at least 20 characters, demo team policy).
                </p>
              )}
              {deferralError && (
                <p id="deferral-error" role="alert" className="field-error">
                  {deferralError}
                </p>
              )}
              <Button className="dispatch-primary" type="submit">
                Save deferral
              </Button>
            </form>
          )}
          {modal === "publish" && (
            <div className="publish-review">
              <dl>
                <div>
                  <dt>Orders on trips</dt>
                  <dd>{assigned.length}</dd>
                </div>
                <div>
                  <dt>Recorded deferrals</dt>
                  <dd>{deferred.length}</dd>
                </div>
                <div>
                  <dt>Still awaiting a decision</dt>
                  <dd>{pending.length}</dd>
                </div>
              </dl>
              {canPublish ? (
                <p className="review-ready">
                  <CheckCircle2 size={19} aria-hidden="true" />
                  Every order is accounted for and all demo trip checks pass.
                </p>
              ) : (
                <div className="dispatch-dialog-warning">
                  <strong>Resolve before publication</strong>
                  <ul>
                    {pending.length > 0 && (
                      <li>
                        Assign or defer {pending.length} remaining order(s).
                      </li>
                    )}
                    {invalidTrips.map((trip) => (
                      <li key={trip.id}>
                        {trip.id}: {validateTrip(trip, plan).join(" ")}
                      </li>
                    ))}
                    {!depotTrips.length && (
                      <li>Create at least one trip with orders.</li>
                    )}
                  </ul>
                </div>
              )}
              <p>
                This saves a local publication preview and locks the demo plan.
                Backend broadcasts and real loading manifests are not connected.
              </p>
              <Button
                className="dispatch-primary"
                disabled={!canPublish || published}
                onClick={() => {
                  if (
                    canPublish &&
                    save(
                      { ...plan, published: [...plan.published, depot] },
                      "Demo plan published locally. No notifications were sent.",
                    )
                  )
                    setModal(null);
                }}
              >
                <Check size={17} aria-hidden="true" />
                Publish demo plan
              </Button>
            </div>
          )}
          {modal === "help" && (
            <div className="demo-help">
              <p>
                These fixtures are independent examples, not the competition
                datasets. Orders, capacities, windows and fuel figures are
                synthetic.
              </p>
              <p>
                Manual checks cover capacity, refrigeration, access, depot,
                brand/district, daily budgets, fuel and duplicate allocation.
                Travel times are illustrative. Fuel assumes 0.5 km per travel
                minute plus a 20 km return; consecutive trips reserve a demo
                30-minute return/reload allowance.
              </p>
              <p>
                Local plan changes survive reload. Real authentication,
                authoritative validation, synchronized manifests and delivery
                monitoring will be connected in the backend phase.
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
