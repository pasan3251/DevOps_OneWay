"use client";

import { useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  PackageCheck,
  Search,
  ShieldAlert,
  Truck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  formatTime,
  orders,
  totals,
  vehicles,
  type Depot,
  type Plan,
} from "@/features/dispatcher/planning";
import type { ClearanceRecord, DiscrepancyRecord } from "./loader-manifest";

type QueueFilter = "all" | "ready" | "blocked" | "cleared";

export function LoaderOverview({
  plan,
  depot,
  discrepancies,
  clearedTrips,
  onSelectTrip,
}: {
  plan: Plan;
  depot: Depot;
  discrepancies: DiscrepancyRecord[];
  clearedTrips: Record<string, ClearanceRecord>;
  onSelectTrip: (tripId: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<QueueFilter>("all");

  const depotTrips = plan.trips.filter((trip) => trip.depot === depot);

  const queue = depotTrips.map((trip) => {
    const vehicle = vehicles.find((item) => item.id === trip.vehicleId);
    const assignedOrders = trip.orderIds
      .map((id) => orders.find((order) => order.id === id))
      .filter((order) => order !== undefined);
    const loadTotals = totals(trip);
    const tripExceptions = discrepancies.filter((item) => item.tripId === trip.id);
    const blockingExceptions = tripExceptions.filter(
      (item) => item.resolution !== "ship_partial"
    );
    const isCleared = Boolean(clearedTrips[trip.id]);
    const capacityValid = Boolean(
      vehicle && loadTotals.kg <= vehicle.kg && loadTotals.m3 <= vehicle.m3
    );
    const temperatureValid = Boolean(
      vehicle && (!assignedOrders.some((order) => order.chilled) || vehicle.chilled)
    );
    const accessValid = Boolean(
      vehicle && (!assignedOrders.some((order) => order.vanOnly) || vehicle.type === "Van")
    );
    const depotValid = Boolean(
      vehicle &&
      vehicle.depot === depot &&
      !vehicle.workshop &&
      assignedOrders.every((order) => order.depot === depot)
    );
    const routeValid =
      new Set(assignedOrders.map((order) => order.brand)).size <= 1 &&
      new Set(assignedOrders.map((order) => order.district)).size <= 1 &&
      new Set(trip.orderIds).size === trip.orderIds.length;
    const constraintsValid =
      capacityValid && temperatureValid && accessValid && depotValid && routeValid;
    const status: Exclude<QueueFilter, "all"> = isCleared
      ? "cleared"
      : blockingExceptions.length > 0 || !constraintsValid
        ? "blocked"
        : "ready";

    return {
      assignedOrders,
      blockingExceptions,
      constraintsValid,
      isCleared,
      loadTotals,
      status,
      trip,
      tripExceptions,
      vehicle,
    };
  });

  const filteredTrips = queue.filter((item) => {
    const normalizedQuery = query.trim().toLowerCase();
    const matchesSearch =
      normalizedQuery.length === 0 ||
      item.trip.id.toLowerCase().includes(normalizedQuery) ||
      item.trip.vehicleId.toLowerCase().includes(normalizedQuery) ||
      item.assignedOrders.some((order) =>
        order.outlet.toLowerCase().includes(normalizedQuery)
      );
    const matchesStatus = statusFilter === "all" || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const readyCount = queue.filter((item) => item.status === "ready").length;
  const blockedCount = queue.filter((item) => item.status === "blocked").length;
  const clearedCount = queue.filter((item) => item.status === "cleared").length;

  return (
    <div className="loader-page-stack">
      <section className="loader-workflow" aria-labelledby="loader-workflow-title">
        <div>
          <span className="loader-eyebrow">Standard loading flow</span>
          <h2 id="loader-workflow-title">One trip, one controlled handoff</h2>
        </div>
        <ol>
          <li><strong>1</strong><span>Open released trip</span></li>
          <li><strong>2</strong><span>Load last stop first</span></li>
          <li><strong>3</strong><span>Report any issue</span></li>
          <li><strong>4</strong><span>Clear departure</span></li>
        </ol>
      </section>

      <section className="loader-summary-strip" aria-label="Staging summary">
        {[
          { label: "Released trips", value: queue.length, Icon: Truck },
          { label: "Ready to load", value: readyCount, Icon: PackageCheck },
          { label: "Waiting on Dispatch", value: blockedCount, Icon: ShieldAlert },
          { label: "Departure cleared", value: clearedCount, Icon: CheckCircle2 },
        ].map(({ label, value, Icon }) => (
          <article className="loader-stat-card" key={label}>
            <span className="loader-stat-icon" aria-hidden="true"><Icon size={19} /></span>
            <span className="loader-stat-body">
              <span className="loader-stat-label">{label}</span>
              <strong className="loader-stat-value">{value}</strong>
            </span>
          </article>
        ))}
      </section>

      <section className="workspace-panel loader-queue-panel" aria-labelledby="loader-queue-title">
        <div className="workspace-panel-heading loader-queue-heading">
          <div>
            <h2 id="loader-queue-title">Vehicle staging queue</h2>
            <span>Only trips released to the selected depot appear here.</span>
          </div>

          <div className="loader-queue-tools">
            <label className="loader-search">
              <Search size={15} aria-hidden="true" />
              <span className="sr-only">Search trips</span>
              <input
                type="search"
                placeholder="Trip, vehicle or outlet"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
            <div className="loader-segmented" aria-label="Filter staging queue">
              {(["all", "ready", "blocked", "cleared"] as QueueFilter[]).map((filter) => (
                <button
                  key={filter}
                  type="button"
                  aria-pressed={statusFilter === filter}
                  onClick={() => setStatusFilter(filter)}
                >
                  {filter === "all"
                    ? "All"
                    : filter === "ready"
                      ? "Ready"
                      : filter === "blocked"
                        ? "Needs attention"
                        : "Cleared"}
                </button>
              ))}
            </div>
          </div>
        </div>

        {filteredTrips.length === 0 ? (
          <div className="loader-empty-state">
            <ClipboardCheck size={30} aria-hidden="true" />
            <strong>No trips match this view</strong>
            <span>Try another filter, search term, or depot.</span>
          </div>
        ) : (
          <div className="loader-queue-grid">
            {filteredTrips.map((item) => {
              const clearance = clearedTrips[item.trip.id];
              const weightPercent = item.vehicle
                ? Math.round((item.loadTotals.kg / item.vehicle.kg) * 100)
                : 0;
              const volumePercent = item.vehicle
                ? Math.round((item.loadTotals.m3 / item.vehicle.m3) * 100)
                : 0;
              const reverseStops = [...item.assignedOrders].reverse();

              return (
                <article className="loader-trip-card" key={item.trip.id}>
                  <header>
                    <div>
                      <span className="loader-eyebrow">{item.trip.id}</span>
                      <h3>{item.trip.vehicleId}</h3>
                      <p>
                        {item.vehicle?.type ?? "Vehicle unavailable"}
                        {item.vehicle?.chilled ? " · Refrigerated" : " · Ambient"}
                      </p>
                    </div>
                    <span className="loader-status-badge" data-status={item.status}>
                      {item.status === "cleared"
                        ? "Departure cleared"
                        : item.status === "blocked"
                          ? "Needs attention"
                          : "Ready to load"}
                    </span>
                  </header>

                  <dl className="loader-trip-facts">
                    <div><dt>Departure</dt><dd>{formatTime(item.trip.departure)}</dd></div>
                    <div><dt>Stops</dt><dd>{item.assignedOrders.length}</dd></div>
                    <div><dt>Route group</dt><dd>{item.assignedOrders[0]?.brand ?? "—"} · {item.assignedOrders[0]?.district ?? "—"}</dd></div>
                  </dl>

                  <div className="loader-capacity-grid" aria-label="Vehicle payload">
                    <div>
                      <span><b>Weight</b><em>{item.loadTotals.kg} / {item.vehicle?.kg ?? 0} kg</em></span>
                      <progress max="100" value={Math.min(weightPercent, 100)} />
                    </div>
                    <div>
                      <span><b>Volume</b><em>{item.loadTotals.m3} / {item.vehicle?.m3 ?? 0} m³</em></span>
                      <progress max="100" value={Math.min(volumePercent, 100)} />
                    </div>
                  </div>

                  <div className="loader-load-order">
                    <span>Load sequence · last delivery first</span>
                    <ol>
                      {reverseStops.map((order, index) => (
                        <li key={order.id}>
                          <strong>{index + 1}</strong>
                          <span>{order.outlet}</span>
                        </li>
                      ))}
                    </ol>
                  </div>

                  {item.blockingExceptions.length > 0 && (
                    <div className="loader-inline-alert" role="status">
                      <AlertTriangle size={16} aria-hidden="true" />
                      <span>
                        {item.blockingExceptions.length} issue{item.blockingExceptions.length === 1 ? "" : "s"} awaiting a dispatch instruction. Departure remains locked.
                      </span>
                    </div>
                  )}

                  {!item.constraintsValid && (
                    <div className="loader-inline-alert" role="alert">
                      <AlertTriangle size={16} aria-hidden="true" />
                      <span>Published trip does not pass depot, route, thermal or capacity checks. Do not load.</span>
                    </div>
                  )}

                  <footer>
                    <span>
                      {item.isCleared
                        ? `Cleared at ${clearance.clearedAt}`
                        : item.tripExceptions.length > 0
                          ? `${item.tripExceptions.length} exception record${item.tripExceptions.length === 1 ? "" : "s"}`
                          : "No exceptions reported"}
                    </span>
                    <Button
                      size="sm"
                      variant={item.isCleared ? "outline" : "default"}
                      onClick={() => onSelectTrip(item.trip.id)}
                      disabled={!item.constraintsValid}
                    >
                      {item.isCleared ? "View cleared manifest" : "Open loading checklist"}
                      <ArrowRight size={15} aria-hidden="true" />
                    </Button>
                  </footer>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
