"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  CircleHelp,
  ClipboardList,
  Clock3,
  LayoutDashboard,
  LoaderCircle,
  LogOut,
  PackageCheck,
  PanelLeftClose,
  PanelLeftOpen,
  RefreshCw,
  ShieldCheck,
  Truck,
  MessageSquare,
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
import { SharedAccountTools } from "@/features/shared/account-tools";
import { WorkspaceChat } from "@/features/dispatcher/workspace-chat";
import { DeliveriesView } from "./components/deliveries-view";
import { NewOrderView } from "./components/new-order-view";
import { OrdersView } from "./components/orders-view";
import { OverviewView } from "./components/overview-view";
import {
  storeApi,
  type StoreOrder,
  type StoreOverviewData,
} from "./store-manager-api";

import "@/features/dispatcher/dispatcher.css";
import "@/features/dispatcher/workspace.css";
import "@/features/dispatcher/monochrome.css";
import "./store-manager.css";

type StoreView = "today" | "orders" | "new-order" | "receiving" | "messages";

const storeNavigation = [
  { id: "today", label: "Today", Icon: LayoutDashboard },
  { id: "orders", label: "Orders", Icon: ClipboardList },
  { id: "receiving", label: "Receiving", Icon: Truck },
  { id: "messages", label: "Messages", Icon: MessageSquare },
] as const;

const NAV_COLLAPSED_KEY = "waypoint.store.navigation-collapsed.v1";

export function StoreManagerDashboard() {
  const router = useRouter();
  const contentRef = useRef<HTMLElement>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [view, setView] = useState<StoreView>("today");
  const [data, setData] = useState<StoreOverviewData | null>(null);
  const [orders, setOrders] = useState<StoreOrder[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<StoreOrder | null>(null);
  const [navCollapsed, setNavCollapsed] = useState(true);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState("");
  const [failure, setFailure] = useState("");
  const [helpOpen, setHelpOpen] = useState(false);

  const loadData = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    try {
      const [overview, orderList] = await Promise.all([
        storeApi.getOverview(),
        storeApi.getOrders(),
      ]);
      setData(overview);
      setOrders(orderList);
      setFailure("");
      if (showRefresh) setMessage("Store status refreshed.");
    } catch {
      setFailure("Store data could not be loaded. Try refreshing the workspace.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const active = authService.getSession();
    if (!active) {
      router.replace("/login");
      return;
    }
    if (active.role !== "store-manager") {
      router.replace(`/workspace/${active.role}`);
      return;
    }

    const timer = window.setTimeout(() => {
      setSession(active);
      const destination = window.location.hash.slice(1);
      if (["today", "orders", "new-order", "receiving", "messages"].includes(destination)) {
        setView(destination as StoreView);
      }
      try {
        const stored = window.localStorage.getItem(NAV_COLLAPSED_KEY);
        if (stored !== null) setNavCollapsed(stored === "true");
      } catch {
        // Keep the default navigation state when preferences are unavailable.
      }
      void loadData();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadData, router]);

  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0, left: 0 });
    window.scrollTo({ top: 0, left: 0 });
  }, [view]);

  function navigate(next: StoreView) {
    setSelectedOrder(null);
    setView(next);
    setMessage("");
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${next === "today" ? "" : `#${next}`}`,
    );
  }

  function toggleNavigation() {
    const next = !navCollapsed;
    setNavCollapsed(next);
    try {
      window.localStorage.setItem(NAV_COLLAPSED_KEY, String(next));
    } catch {
      setFailure("Navigation preference could not be saved.");
    }
  }

  function signOut() {
    authService.signOut();
    router.replace("/login");
  }

  if (!session || loading || !data) {
    return (
      <main className="workspace-loading">
        <LoaderCircle aria-hidden="true" className="loading-spinner" />
        <p role="status">Opening store operations workspace…</p>
      </main>
    );
  }

  const outlet = data.outlet;
  const activeOrders = orders.filter(
    (order) => !["DELIVERED", "CANCELLED"].includes(order.status),
  ).length;
  const inbound = data.inboundDeliveries.filter(
    (delivery) => !["DELIVERED", "FAILED"].includes(delivery.status),
  ).length;
  const heading =
    view === "today"
      ? ["Today", "Orders, delivery changes and receiving work for your outlet."]
      : view === "orders"
        ? ["Orders", "Place replenishment orders and follow each Dispatch decision."]
        : view === "new-order"
          ? ["Create order", "Build one whole ambient or chilled order for the selected delivery day."]
          : view === "receiving"
            ? ["Receiving", "Track incoming vehicles, review proof and report physical differences."]
            : ["Messages", "Coordinate operational questions with Dispatch, drivers and warehouse teams."];

  return (
    <div className={`dispatch-app store-app${navCollapsed ? " navigation-collapsed" : ""}`}>
      <aside className="dispatch-sidebar">
        <WaypointLogo light />
        <nav aria-label="Store manager navigation">
          {storeNavigation.map(({ id, label, Icon }) => {
            const active = id === "orders" ? view === "orders" || view === "new-order" : view === id;
            return (
              <button
                key={id}
                aria-label={label}
                title={navCollapsed ? label : undefined}
                aria-current={active ? "page" : undefined}
                onClick={() => navigate(id)}
              >
                <Icon size={19} aria-hidden="true" />
                <span className="dispatch-nav-label">{label}</span>
                {id === "orders" && activeOrders > 0 && <span className="nav-count">{activeOrders}</span>}
                {id === "receiving" && inbound > 0 && <span className="nav-count">{inbound}</span>}
              </button>
            );
          })}
        </nav>

        <div className="dispatch-sidebar-note">
          <ShieldCheck size={20} aria-hidden="true" />
          <p>Order, receive and report.</p>
        </div>

        <div className="dispatch-user">
          <span className="user-avatar">SM</span>
          <div>
            <strong>{session.name}</strong>
            <span>Store manager · {session.location}</span>
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
              aria-label={navCollapsed ? "Expand navigation" : "Collapse navigation"}
              aria-expanded={!navCollapsed}
              onClick={toggleNavigation}
            >
              {navCollapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
            </button>
            <span>Store operations</span>
          </div>
          <div>
            <span className="demo-label">Live operations</span>
            <SharedAccountTools session={session} />
            <span className="store-clock" aria-label="Current time in Asia Colombo">
              <Clock3 size={15} aria-hidden="true" />
              {data.cutoff.currentColomboTime}
              <small>Colombo · Cutoff 16:00</small>
            </span>
            <button
              className="dispatch-icon-button"
              aria-label="Refresh store data"
              disabled={refreshing}
              onClick={() => void loadData(true)}
            >
              <RefreshCw size={18} className={refreshing ? "is-spinning" : undefined} />
            </button>
            <button className="dispatch-icon-button" aria-label="Store workspace guide" onClick={() => setHelpOpen(true)}>
              <CircleHelp size={20} aria-hidden="true" />
            </button>
            <button className="dispatch-icon-button dispatch-mobile-signout" aria-label="Sign out" onClick={signOut}>
              <LogOut size={18} aria-hidden="true" />
            </button>
          </div>
        </header>

        <main ref={contentRef} className="dispatch-content dispatch-content-scrollable store-content">
          <div className="dispatch-heading store-heading">
            <div>
              <h1>{heading[0]}</h1>
              <p>{heading[1]}</p>
            </div>
            <div className="store-outlet-context" aria-label="Assigned outlet">
              <span>Assigned outlet</span>
              <strong>{outlet.name}</strong>
              <small>{outlet.code} · {outlet.brand} · {outlet.district}</small>
            </div>
          </div>

          {message && (
            <div className="store-feedback" role="status">
              <CheckCircle2 size={16} aria-hidden="true" />
              <span>{message}</span>
              <button type="button" onClick={() => setMessage("")}>Dismiss</button>
            </div>
          )}
          {failure && (
            <div className="store-feedback is-error" role="alert">
              <AlertTriangle size={16} aria-hidden="true" />
              <span>{failure}</span>
              <button type="button" onClick={() => setFailure("")}>Dismiss</button>
            </div>
          )}

          {view === "today" && (
            <OverviewView
              data={data}
              onNavigateToNewOrder={() => navigate("new-order")}
              onNavigateToOrders={() => navigate("orders")}
              onNavigateToReceiving={() => navigate("receiving")}
            />
          )}

          {view === "orders" && (
            <OrdersView
              orders={orders}
              cutoff={data.cutoff}
              selectedOrder={selectedOrder}
              onSelectOrder={setSelectedOrder}
              onRefresh={() => void loadData(true)}
              onNavigateToNewOrder={() => navigate("new-order")}
            />
          )}

          {view === "new-order" && (
            <NewOrderView
              outlet={outlet}
              cutoff={data.cutoff}
              existingOrders={orders}
              onOrderCreated={() => {
                void loadData(true);
                navigate("orders");
                setMessage("Order submitted and routed to the correct planning cycle.");
              }}
              onCancel={() => navigate("orders")}
            />
          )}

          {view === "receiving" && (
            <DeliveriesView
              deliveries={data.inboundDeliveries}
              outletWindow={outlet.deliveryWindow}
              onRefresh={() => void loadData(true)}
            />
          )}

          {view === "messages" && <WorkspaceChat />}
        </main>
      </div>

      <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
        <DialogContent className="sm:max-w-[480px] store-dialog">
          <DialogHeader>
            <DialogTitle>Store workflow guide</DialogTitle>
            <DialogDescription>One controlled path from demand to receipt.</DialogDescription>
          </DialogHeader>
          <ol className="store-guide-list">
            <li><PackageCheck size={18} /><span><strong>Place the order.</strong> Submit one whole ambient or chilled order. Fresh outlets may submit one of each for the same day.</span></li>
            <li><ClipboardList size={18} /><span><strong>Wait for Dispatch.</strong> The order becomes planned with an ETA, or deferred with a formal reason and next-run priority.</span></li>
            <li><Truck size={18} /><span><strong>Prepare to receive.</strong> Revised ETAs and partial-manifest notices appear in Receiving.</span></li>
            <li><CheckCircle2 size={18} /><span><strong>Check the handover.</strong> Review the driver’s POD and report damage, shortages or a temperature rejection against that delivery.</span></li>
          </ol>
        </DialogContent>
      </Dialog>
    </div>
  );
}
