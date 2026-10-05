"use client";

import { useEffect, useState } from "react";
import { ArrowRight, CheckCircle2, Pencil, RefreshCw, Search, Truck } from "lucide-react";
import { apiRequest } from "@/lib/api-client";
import { RouteMap } from "./route-map";
import { formatTime, fuelLitres, stopTimes, totals, validateTrip, vehicles, type Depot, type Plan } from "./planning";

type TripDetails = {
  id: string;
  status: string;
  gateClearedAt: string | null;
  driverReadyAt: string | null;
  actualDepartureTime: string | null;
  actualReturnTime: string | null;
  driver: {
    phone: string;
    currentLatitude: string | null;
    currentLongitude: string | null;
    lastTelematicsAt: string | null;
    user: { firstName: string; lastName: string };
  };
  loadingManifests: Array<{
    manifestVersion: number; status: string; verifiedAt: string | null;
    exceptions: Array<{ id: string; type: string; status: string; notes: string; resolution: string | null }>;
  }>;
  stops: Array<{
    id: string; orderId: string; stopSequence: number; status: string;
    plannedArrivalTime: string | null; actualArrivalTime: string | null; actualDepartureTime: string | null;
    slaBreach: boolean; reportedDelayMinutes: number; windowHoldUntil: string | null;
    failureReason: string | null; failureNotes: string | null;
    outlet: { name: string };
    proofOfDelivery: { outcome: string; deliveredCartons: number; expectedCartons: number; capturedAt: string } | null;
    receipt: { status: string; confirmedAt: string } | null;
  }>;
};

type Props = {
  plan: Plan; depot: Depot; selectedId?: string;
  onSelect: (id: string) => void; onEdit: (id: string) => void;
};

function timestamp(value?: string | null) {
  return value ? new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Colombo" }).format(new Date(value)) : "—";
}

function statusLabel(value?: string) {
  return ({ PLANNED: "Draft route", LOCKED: "Awaiting loading", LOADING: "Loading",
    CLEARED: "Departure cleared", DRIVER_READY: "Driver ready", EN_ROUTE: "In transit",
    RETURNING: "Returning to depot", COMPLETED: "Completed", PENDING: "Pending",
    ARRIVED: "Arrived", WAITING_WINDOW: "Waiting for receiving window", UNLOADING: "Unloading",
    DELIVERED: "Delivered", DISCREPANCY_FLAGGED: "Partial handover",
    FAILED: "Delivery exception" } as Record<string, string>)[value ?? ""] ?? value?.replaceAll("_", " ") ?? "Pending";
}

export function RouteViews({ mode, plan, depot, selectedId, onSelect, onEdit }: Props & { mode: "tracking" | "manage" }) {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState<string | null>(null);
  const [details, setDetails] = useState<TripDetails | null>(null);
  const [error, setError] = useState<{ tripId: string; message: string } | null>(null);
  const [refresh, setRefresh] = useState(0);
  const [refreshedAt, setRefreshedAt] = useState("");
  const trips = plan.trips.filter((trip) => trip.depot === depot && trip.orderIds.length);
  const matching = trips.filter((trip) => `${trip.id} ${trip.vehicleId}`.toLowerCase().includes(query.toLowerCase()));
  const selected = matching.find((trip) => trip.id === selectedId) ?? matching[0];
  const recordId = selected?.recordId;

  useEffect(() => {
    if (!recordId) return;
    let disposed = false;
    let pending = false;
    const controller = new AbortController();
    const load = async () => {
      if (pending || disposed || document.hidden) return;
      pending = true;
      try {
        const result = await apiRequest<TripDetails>(`/dispatch/trips/${recordId}`, { signal: controller.signal });
        if (!disposed) {
          setDetails(result);
          setError(null);
          setRefreshedAt(new Date().toISOString());
        }
      } catch (cause) {
        if (!disposed) setError({ tripId: recordId, message: cause instanceof Error ? cause.message : "Route progress could not be loaded." });
      } finally { pending = false; }
    };
    const initial = window.setTimeout(() => void load(), 0);
    const interval = window.setInterval(() => void load(), 15_000);
    const visible = () => { if (!document.hidden) void load(); };
    document.addEventListener("visibilitychange", visible);
    return () => {
      disposed = true; controller.abort();
      window.clearTimeout(initial); window.clearInterval(interval);
      document.removeEventListener("visibilitychange", visible);
    };
  }, [recordId, refresh]);

  const current = details?.id === recordId ? details : null;
  const currentError = error && error.tripId === recordId ? error.message : "";
  const vehicle = vehicles.find((item) => item.id === selected?.vehicleId);
  const stops = selected ? stopTimes(selected) : [];
  const recordedStops = current ? [...current.stops].sort((a, b) => a.stopSequence - b.stopSequence) : [];
  const terminal = recordedStops.filter((stop) => ["DELIVERED", "DISCREPANCY_FLAGGED", "FAILED"].includes(stop.status)).length;
  const next = recordedStops.find((stop) => !["DELIVERED", "DISCREPANCY_FLAGGED", "FAILED"].includes(stop.status));
  const manifest = current ? [...current.loadingManifests].sort((a, b) => b.manifestVersion - a.manifestVersion)[0] : undefined;
  const load = selected ? totals(selected) : { kg: 0, m3: 0 };
  const issues = selected ? validateTrip(selected, plan) : [];
  const location = current?.driver.lastTelematicsAt && current.driver.currentLatitude && current.driver.currentLongitude
    ? { coordinates: [Number(current.driver.currentLatitude), Number(current.driver.currentLongitude)] as [number, number], recordedAt: current.driver.lastTelematicsAt } : null;

  return <div className="route-view-workspace">
    <div className="route-view-toolbar">
      <label className="dispatch-search"><Search size={16} />
        <input aria-label="Search assigned routes" placeholder="Search vehicle or trip" value={query} onChange={(event) => setQuery(event.target.value)} />
      </label>
      <select aria-label="Selected assigned route" value={selected?.id ?? ""} onChange={(event) => { setFocused(null); onSelect(event.target.value); }}>
        {matching.length ? matching.map((trip) => <option key={trip.id} value={trip.id}>{trip.id} · {trip.vehicleId}</option>) : <option value="">No matching routes</option>}
      </select>
      <span className="workspace-note">{trips.length} assigned route{trips.length === 1 ? "" : "s"} · {depot}</span>
    </div>
    <div className="route-view-grid">
      <section className="workspace-panel route-map-workspace">
        <div className="workspace-panel-heading"><h2>{mode === "tracking" ? "Delivery progress map" : "Current route"}</h2><span>{selected?.id ?? "No route selected"}</span></div>
        <RouteMap depot={depot} trips={mode === "tracking" ? matching : selected ? [selected] : []}
          selectedTrip={selected?.id} focusedOrder={focused} currentLocation={mode === "tracking" ? location : null}
          onTrip={onSelect} onOrder={setFocused} />
        {selected && vehicle && <div className="route-vehicle-summary">
          <Truck size={25} /><div>
            <strong>{vehicle.id} · {vehicle.chilled ? "Refrigerated" : "Ambient"} {vehicle.type.toLowerCase()}</strong>
            <span>{load.kg} / {vehicle.kg} kg · {load.m3} / {vehicle.m3} m³ · {plan.trips.filter((trip) => trip.vehicleId === vehicle.id).length} / 2 trips</span>
            <span>{current ? `Driver: ${current.driver.user.firstName} ${current.driver.user.lastName}` : "Loading driver details…"} · estimated fuel {fuelLitres(selected).toFixed(1)} L</span>
          </div>
        </div>}
      </section>
      <section className="workspace-panel route-status-workspace">
        <div className="workspace-panel-heading"><h2>{mode === "tracking" ? "Current progress" : "Stop sequence"}</h2>
          {recordId && <button className="dispatch-text-button" onClick={() => setRefresh((value) => value + 1)}><RefreshCw size={15} />Refresh</button>}
        </div>
        {selected ? <div className="route-status-scroll" tabIndex={0} aria-label="Route details">
          {currentError && <p role="alert" className="workspace-form-error">{currentError}{current ? " Showing the last received update." : ""}</p>}
          {mode === "tracking" ? current ? <>
            <div className="tracking-status">
              <span className="operation-status">{statusLabel(current.status)}</span>
              <h3>{current.status === "COMPLETED" ? "Route completed" : `${terminal} of ${recordedStops.length} stops completed`}</h3>
              <progress aria-label="Persisted delivery progress" max={Math.max(1, recordedStops.length)} value={terminal} />
              <p>Updated {timestamp(refreshedAt)} · refreshes every 15 seconds</p>
            </div>
            <dl className="workspace-facts route-next-stop">
              <div><dt>Next stop</dt><dd>{next?.outlet.name ?? "All stops completed"}</dd></div>
              <div><dt>Planned arrival</dt><dd>{timestamp(next?.plannedArrivalTime)}</dd></div>
              <div><dt>Driver location</dt><dd>{location ? `Last recorded at ${timestamp(location.recordedAt)}` : "No location update recorded"}</dd></div>
            </dl>
            <table className="workspace-table">
              <caption>Recorded stop progress</caption>
              <thead><tr><th>Stop</th><th>Arrival</th><th>Status / receiving</th></tr></thead>
              <tbody>{recordedStops.map((stop) => <tr key={stop.id}>
                <td><button className="dispatch-text-button" onClick={() => setFocused(stop.orderId)}>{stop.stopSequence}. {stop.outlet.name}</button></td>
                <td>{timestamp(stop.actualArrivalTime)}<small>Planned {timestamp(stop.plannedArrivalTime)}</small></td>
                <td>{statusLabel(stop.status)}
                  {stop.slaBreach && <small>Delivery window breached</small>}
                  {stop.windowHoldUntil && stop.status === "WAITING_WINDOW" && <small>Hold until {timestamp(stop.windowHoldUntil)}</small>}
                  {stop.reportedDelayMinutes > 0 && <small>{stop.reportedDelayMinutes} min reported delay</small>}
                  {stop.proofOfDelivery && <small>POD: {stop.proofOfDelivery.deliveredCartons}/{stop.proofOfDelivery.expectedCartons} · {timestamp(stop.proofOfDelivery.capturedAt)}</small>}
                  {stop.proofOfDelivery && <small>{stop.receipt ? stop.receipt.status === "CONFIRMED" ? "Receipt confirmed" : "Receiving discrepancy" : "Awaiting store receipt"}</small>}
                  {stop.failureReason && <small>{stop.failureReason.replaceAll("_", " ")}{stop.failureNotes ? ` · ${stop.failureNotes}` : ""}</small>}
                </td>
              </tr>)}</tbody>
            </table>
            <div className="workspace-detail-body"><h3>Workflow confirmations</h3>
              <dl className="workspace-facts">
                <div><dt>Manifest</dt><dd>{manifest ? `Version ${manifest.manifestVersion} · ${statusLabel(manifest.status)}` : "Awaiting publication"}</dd></div>
                <div><dt>Load verified</dt><dd>{timestamp(manifest?.verifiedAt)}</dd></div>
                <div><dt>Departure clearance</dt><dd>{timestamp(current.gateClearedAt)}</dd></div>
                <div><dt>Driver readiness</dt><dd>{timestamp(current.driverReadyAt)}</dd></div>
                <div><dt>Departed / returned</dt><dd>{timestamp(current.actualDepartureTime)} / {timestamp(current.actualReturnTime)}</dd></div>
              </dl>
              {manifest?.exceptions.map((exception) => <p className="workspace-note" key={exception.id}>
                {exception.type.replaceAll("_", " ")} · {exception.status.toLowerCase()}: {exception.notes}
                {exception.resolution ? ` · ${exception.resolution}` : ""}
              </p>)}
            </div>
          </> : !currentError ? <p role="status" className="workspace-note">Loading recorded route progress…</p> : null : <>
            <div className="workspace-detail-body"><h3>{selected.vehicleId} · {selected.id}</h3>
              <p className="workspace-note">{plan.published.includes(depot) ? "Create a plan revision before changing a published route." : "Edit to add, remove or reorder whole orders."}</p>
              <button className="workspace-action" onClick={() => onEdit(selected.id)}><Pencil size={16} />{plan.published.includes(depot) ? "Review allocation" : "Edit route"}</button>
            </div>
            <table className="workspace-table"><caption>Saved stop sequence</caption>
              <thead><tr><th>Stop</th><th>Planned arrival</th><th>Payload</th></tr></thead>
              <tbody>{stops.map((stop, index) => <tr key={stop.order.id}>
                <td><button className="dispatch-text-button" onClick={() => setFocused(stop.order.id)}>{index + 1}. {stop.order.outlet}</button><small>{stop.order.orderNumber}</small></td>
                <td>{formatTime(stop.arrival)}</td><td>{stop.order.kg} kg · {stop.order.m3} m³</td>
              </tr>)}</tbody>
            </table>
            <div className="workspace-detail-body"><h3>Route checks</h3>
              {issues.length ? <ul className="route-validation-list">{issues.map((issue) => <li key={issue}>{issue}</li>)}</ul> :
                <p className="route-check-pass"><CheckCircle2 size={17} />Local capacity checks pass. The server validates publication.</p>}
              <button className="dispatch-text-button" onClick={() => onEdit(selected.id)}>Open allocation editor <ArrowRight size={15} /></button>
            </div>
          </>}
        </div> : <div className="workspace-empty"><Truck size={28} />
          <h3>{trips.length ? "No matching assigned routes" : "No assigned routes yet"}</h3>
          <p>{trips.length ? "Change your search to select a route." : "Allocate an order to create a route."}</p>
        </div>}
      </section>
    </div>
  </div>;
}
