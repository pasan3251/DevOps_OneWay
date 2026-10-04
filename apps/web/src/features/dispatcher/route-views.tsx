"use client";

import { useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Pencil,
  Play,
  RotateCcw,
  Search,
  Truck,
} from "lucide-react";
import { RouteMap } from "./route-map";
import {
  formatTime,
  fuelLitres,
  stopTimes,
  totals,
  validateTrip,
  vehicles,
  type Depot,
  type Plan,
  type Trip,
} from "./planning";
import { type WorkspaceState } from "./workspace-state";

type Props = {
  plan: Plan;
  depot: Depot;
  selectedId?: string;
  onSelect: (id: string) => void;
  onEdit: (id: string) => void;
  state: WorkspaceState;
  onSave: (value: WorkspaceState, feedback: string) => boolean;
};
export function RouteViews({
  mode,
  ...props
}: Props & { mode: "tracking" | "manage" }) {
  const { plan, depot, state, onSave, onSelect, onEdit } = props;
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState<string | null>(null);
  const trips = plan.trips.filter(
    (t) => t.depot === depot && t.orderIds.length,
  );
  const matching = trips.filter((t) =>
    `${t.id} ${t.vehicleId}`.toLowerCase().includes(query.toLowerCase()),
  );
  const selected =
    matching.find((t) => t.id === props.selectedId) ?? matching[0];
  const vehicle = vehicles.find((v) => v.id === selected?.vehicleId);
  const stops = selected ? stopTimes(selected) : [];
  const routeVersion = selected ? JSON.stringify([selected.vehicleId, selected.departure, selected.orderIds]) : "";
  const arrived = selected && state.progress[selected.id]?.route === routeVersion
    ? Math.min(state.progress[selected.id].completed, stops.length) : 0;
  const load = selected ? totals(selected) : { kg: 0, m3: 0 };
  const issues = selected ? validateTrip(selected, plan) : [];
  function advance(trip: Trip) {
    onSave(
      {
        ...state,
        progress: {
          ...state.progress,
          [trip.id]: { route: routeVersion, completed: Math.min(arrived + 1, trip.orderIds.length) },
        },
      },
      "Simulated stop arrival saved locally. No real delivery was recorded.",
    );
  }
  return (
    <div className="route-view-workspace">
      <div className="route-view-toolbar">
        <label className="dispatch-search">
          <Search size={16} />
          <input
            aria-label="Search assigned routes"
            placeholder="Search vehicle or trip"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <select
          aria-label="Selected assigned route"
          value={selected?.id ?? ""}
          onChange={(e) => {
            setFocused(null);
            onSelect(e.target.value);
          }}
        >
          {matching.length ? (
            matching.map((t) => (
              <option key={t.id} value={t.id}>
                {t.id} · {t.vehicleId}
              </option>
            ))
          ) : (
            <option value="">No matching routes</option>
          )}
        </select>
        <span className="workspace-note">
          {trips.length} assigned route{trips.length === 1 ? "" : "s"} · {depot}
        </span>
      </div>
      <div className="route-view-grid">
        <section className="workspace-panel route-map-workspace">
          <div className="workspace-panel-heading">
            <h2>
              {mode === "tracking" ? "Delivery map preview" : "Current route"}
            </h2>
            <span>{selected?.id ?? "No route selected"}</span>
          </div>
          <RouteMap
            depot={depot}
            trips={mode === "tracking" ? matching : selected ? [selected] : []}
            selectedTrip={selected?.id}
            focusedOrder={focused}
            onTrip={onSelect}
            onOrder={setFocused}
          />
          {selected && vehicle && (
            <div className="route-vehicle-summary">
              <Truck size={25} />
              <div>
                <strong>
                  {vehicle.id} · {vehicle.chilled ? "Refrigerated" : "Ambient"}{" "}
                  {vehicle.type.toLowerCase()}
                </strong>
                <span>
                  {load.kg} / {vehicle.kg} kg · {load.m3} / {vehicle.m3} m³ ·{" "}
                  {plan.trips.filter((t) => t.vehicleId === vehicle.id).length}{" "}
                  / 2 trips
                </span>
                <span>
                  Driver account not connected · estimated fuel{" "}
                  {fuelLitres(selected).toFixed(1)} L
                </span>
              </div>
            </div>
          )}
        </section>
        <section className="workspace-panel route-status-workspace">
          <div className="workspace-panel-heading">
            <h2>
              {mode === "tracking" ? "Current progress" : "Stop sequence"}
            </h2>
          </div>
          {selected ? (
            <div
              className="route-status-scroll"
              tabIndex={0}
              aria-label="Route details"
            >
              {mode === "tracking" ? (
                <>
                  <div className="tracking-status">
                    <span className="operation-status">Simulation only</span>
                    <h3>
                      {arrived === stops.length
                        ? "Demo route completed"
                        : arrived
                          ? "Demo route in transit"
                          : "Ready for a demo preview"}
                    </h3>
                    <progress
                      aria-label="Simulated delivery progress"
                      max={stops.length}
                      value={arrived}
                    />
                    <p>
                      {arrived} of {stops.length} stops marked arrived in this
                      local simulation.
                    </p>
                    <div className="workspace-form-row">
                      <button
                        className="workspace-action"
                        disabled={arrived === stops.length}
                        onClick={() => advance(selected)}
                      >
                        <Play size={15} /> Advance demo stop
                      </button>
                      <button
                        className="dispatch-text-button"
                        disabled={!arrived}
                        onClick={() =>
                          onSave(
                            {
                              ...state,
                              progress: { ...state.progress, [selected.id]: { route: routeVersion, completed: 0 } },
                            },
                            "Demo tracking reset locally.",
                          )
                        }
                      >
                        <RotateCcw size={15} /> Reset
                      </button>
                    </div>
                  </div>
                  <dl className="workspace-facts route-next-stop">
                    <div>
                      <dt>Next stop</dt>
                      <dd>
                        {stops[arrived]?.order.outlet ??
                          "All demo stops arrived"}
                      </dd>
                    </div>
                    <div>
                      <dt>Planned arrival</dt>
                      <dd>
                        {stops[arrived]
                          ? formatTime(stops[arrived].arrival)
                          : "—"}
                      </dd>
                    </div>
                    <div>
                      <dt>Actual ETA / road distance</dt>
                      <dd>Live location service not connected</dd>
                    </div>
                  </dl>
                </>
              ) : (
                <div className="workspace-detail-body">
                  <h3>
                    {selected.vehicleId} · {selected.id}
                  </h3>
                  <p className="workspace-note">
                    Stops follow the saved plan. Edit to add, remove or reorder
                    whole orders.
                  </p>
                  <button
                    className="workspace-action"
                    onClick={() => onEdit(selected.id)}
                  >
                    <Pencil size={16} /> Edit route
                  </button>
                </div>
              )}
              <table className="workspace-table">
                <caption>
                  {mode === "tracking"
                    ? "Arrived stops — local simulation"
                    : "Saved stop sequence"}
                </caption>
                <thead>
                  <tr>
                    <th>Stop</th>
                    <th>Time</th>
                    <th>{mode === "tracking" ? "Demo status" : "Payload"}</th>
                  </tr>
                </thead>
                <tbody>
                  {stops.map((stop, index) => (
                    <tr key={stop.order.id}>
                      <td>
                        <button
                          className="dispatch-text-button"
                          onClick={() => setFocused(stop.order.id)}
                        >
                          {index + 1}. {stop.order.outlet}
                        </button>
                        <small>{stop.order.id}</small>
                      </td>
                      <td>
                        {formatTime(stop.arrival)}
                        <small>Planned</small>
                      </td>
                      <td>
                        {mode === "tracking"
                          ? index < arrived
                            ? "Simulated arrival"
                            : "Awaiting preview"
                          : `${stop.order.kg} kg · ${stop.order.m3} m³`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="workspace-detail-body">
                <h3>
                  {mode === "tracking" ? "Delivery updates" : "Route checks"}
                </h3>
                {mode === "tracking" ? (
                  <p className="workspace-note">
                    Loader reports, driver proof of delivery and store
                    confirmations will appear here after backend integration.
                    Advancing this preview does not create those records.
                  </p>
                ) : issues.length ? (
                  <ul className="route-validation-list">
                    {issues.map((issue) => (
                      <li key={issue}>{issue}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="route-check-pass">
                    <CheckCircle2 size={17} /> Capacity and schedule checks
                    pass.
                  </p>
                )}
                <button
                  className="dispatch-text-button"
                  onClick={() => onEdit(selected.id)}
                >
                  Open allocation editor <ArrowRight size={15} />
                </button>
              </div>
            </div>
          ) : (
            <div className="workspace-empty">
              <Truck size={28} />
              <h3>
                {trips.length
                  ? "No matching assigned routes"
                  : "No assigned routes yet"}
              </h3>
              <p>
                {trips.length
                  ? "Change your search to select a route."
                  : "Allocate an order before previewing delivery progress."}
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
