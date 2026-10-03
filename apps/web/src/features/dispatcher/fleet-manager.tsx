"use client";

import { useRef, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Search,
  Snowflake,
  Truck,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Donut } from "./dispatch-overview";
import { vehicleUsage, tripDescription } from "./dispatch-operations";
import {
  formatTime,
  stopTimes,
  totals,
  validateTrip,
  vehicles,
  type Depot,
  type Plan,
  type Trip,
} from "./planning";

type Props = {
  plan: Plan;
  depot: Depot;
  activeTrip?: Trip;
  published: boolean;
  onUse: (vehicleId: string) => void;
  onRoute: (tripId?: string) => void;
  onCreate: (vehicleId: string) => void;
};
export function FleetManager({
  plan,
  depot,
  activeTrip,
  published,
  onUse,
  onRoute,
  onCreate,
}: Props) {
  const [tab, setTab] = useState("Current fleet");
  const [query, setQuery] = useState("");
  const [type, setType] = useState("All types");
  const [status, setStatus] = useState("All statuses");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const inspectorRef = useRef<HTMLElement>(null);
  const fleet = vehicles.filter((vehicle) => vehicle.depot === depot);
  const used = fleet.filter(
    (vehicle) => vehicleUsage(vehicle, plan).trips.length,
  );
  const workshop = fleet.filter((vehicle) => vehicle.workshop);
  const filtered = fleet.filter(
    (vehicle) =>
      vehicle.id.toLowerCase().includes(query.toLowerCase()) &&
      (type === "All types" ||
        (type === "Refrigerated" ? vehicle.chilled : vehicle.type === type)) &&
      (status === "All statuses" ||
        (status === "Workshop"
          ? vehicle.workshop
          : status === "Allocated"
            ? !vehicle.workshop && vehicleUsage(vehicle, plan).trips.length > 0
            : !vehicle.workshop &&
              vehicleUsage(vehicle, plan).trips.length === 0)),
  );
  const selected =
    fleet.find((vehicle) => vehicle.id === selectedId) ?? filtered[0];
  const usage = selected ? vehicleUsage(selected, plan) : undefined;
  const replacementIssues =
    selected && activeTrip
      ? validateTrip(
          { ...activeTrip, vehicleId: selected.id },
          {
            ...plan,
            trips: plan.trips.map((trip) =>
              trip.id === activeTrip.id
                ? { ...trip, vehicleId: selected.id }
                : trip,
            ),
          },
        ).filter((issue) => issue !== "Add at least one order to this trip.")
      : [];
  return (
    <div className="fleet-workspace">
      <div className="operations-tabs fleet-tabs" aria-label="Fleet views">
        {["Current fleet", "Managed capacities"].map((value) => (
          <button
            key={value}
            aria-pressed={tab === value}
            onClick={() => setTab(value)}
          >
            {value}
          </button>
        ))}
      </div>
      <div
        className="fleet-workspace-scroll"
        tabIndex={0}
        role="region"
        aria-label="Fleet analysis and vehicles"
      >
        <div className="fleet-summary-strip">
          <div>
            <span>Vehicles allocated</span>
            <strong>
              {used.length} / {fleet.length}
            </strong>
          </div>
          <div>
            <span>Available to plan</span>
            <strong>{fleet.length - workshop.length}</strong>
          </div>
          <div>
            <span>Refrigerated</span>
            <strong>{fleet.filter((vehicle) => vehicle.chilled).length}</strong>
          </div>
          <div>
            <span>In workshop</span>
            <strong>{workshop.length}</strong>
          </div>
        </div>
        {tab === "Current fleet" ? (
          <div className="fleet-operating-layout">
            <section className="operations-panel">
              <div className="operations-panel-heading">
                <div>
                  <h2>{depot} vehicles</h2>
                  <p>
                    Choose a vehicle to inspect its capacity and planned trips.
                  </p>
                </div>
                <span className="small-note">
                  {filtered.length} of {fleet.length}
                </span>
              </div>
              <div className="operations-filters">
                <label className="dispatch-search">
                  <Search size={17} aria-hidden="true" />
                  <input
                    aria-label="Search vehicles"
                    placeholder="Vehicle ID"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                  />
                </label>
                <select
                  aria-label="Vehicle type"
                  value={type}
                  onChange={(event) => setType(event.target.value)}
                >
                  {["All types", "Truck", "Van", "Refrigerated"].map(
                    (value) => (
                      <option key={value}>{value}</option>
                    ),
                  )}
                </select>
                <select
                  aria-label="Vehicle status"
                  value={status}
                  onChange={(event) => setStatus(event.target.value)}
                >
                  {["All statuses", "Unallocated", "Allocated", "Workshop"].map(
                    (value) => (
                      <option key={value}>{value}</option>
                    ),
                  )}
                </select>
              </div>
              <div className="fleet-vehicle-list">
                {filtered.map((vehicle) => {
                  const item = vehicleUsage(vehicle, plan);
                  return (
                    <article
                      className={`fleet-vehicle-card${selected?.id === vehicle.id ? " is-selected" : ""}`}
                      key={vehicle.id}
                    >
                      <div className="fleet-vehicle-heading">
                        <span className="vehicle-icon">
                          {vehicle.workshop ? (
                            <Wrench size={24} />
                          ) : vehicle.chilled ? (
                            <Snowflake size={24} />
                          ) : (
                            <Truck size={24} />
                          )}
                        </span>
                        <div>
                          <h3>{vehicle.id}</h3>
                          <p>
                            {vehicle.chilled ? "Refrigerated" : "Ambient"}{" "}
                            {vehicle.type.toLowerCase()} · {depot}
                          </p>
                        </div>
                        <span
                          className={`operation-status ${vehicle.workshop ? "status-deferred" : item.trips.length ? "status-assigned" : "status-pending"}`}
                        >
                          {vehicle.workshop
                            ? "Workshop"
                            : item.trips.length
                              ? "Allocated"
                              : "Unallocated"}
                        </span>
                      </div>
                      <div className="fleet-vehicle-metrics">
                        <div>
                          <span>Peak weight</span>
                          <strong>
                            {Math.round((item.kg / vehicle.kg) * 100)}%
                          </strong>
                          <meter
                            aria-label={`${vehicle.id} peak weight`}
                            min={0}
                            max={vehicle.kg}
                            value={Math.min(item.kg, vehicle.kg)}
                          />
                        </div>
                        <div>
                          <span>Peak volume</span>
                          <strong>
                            {Math.round((item.m3 / vehicle.m3) * 100)}%
                          </strong>
                          <meter
                            aria-label={`${vehicle.id} peak volume`}
                            min={0}
                            max={vehicle.m3}
                            value={Math.min(item.m3, vehicle.m3)}
                          />
                        </div>
                        <div>
                          <span>Daily trips</span>
                          <strong>{item.trips.length} / 2</strong>
                          <small>
                            {Math.max(0, item.fuelLeft).toFixed(1)} L fuel after
                            plan
                          </small>
                        </div>
                      </div>
                      <div className="fleet-card-actions">
                        <span>
                          {vehicle.kg.toLocaleString()} kg / {vehicle.m3} m³
                        </span>
                        <button
                          className="dispatch-text-button"
                          aria-label={`Inspect ${vehicle.id}`}
                          onClick={() => {
                            setSelectedId(vehicle.id);
                            if (window.innerWidth <= 900)
                              window.requestAnimationFrame(() => {
                                inspectorRef.current?.focus({
                                  preventScroll: true,
                                });
                                inspectorRef.current?.scrollIntoView({
                                  block: "start",
                                });
                              });
                          }}
                        >
                          Inspect <ArrowRight size={15} />
                        </button>
                      </div>
                    </article>
                  );
                })}
                {!filtered.length && (
                  <div className="operations-empty">
                    <Truck size={28} />
                    <h3>No matching vehicles</h3>
                    <p>Clear the vehicle ID, type and status filters.</p>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setQuery("");
                        setType("All types");
                        setStatus("All statuses");
                      }}
                    >
                      Clear vehicle filters
                    </Button>
                  </div>
                )}
              </div>
            </section>
            <aside
              ref={inspectorRef}
              tabIndex={-1}
              className="operations-panel fleet-inspector"
              aria-label="Vehicle details"
            >
              <div className="operations-panel-heading">
                <h2>Vehicle details</h2>
                <Truck size={20} />
              </div>
              {selected && usage ? (
                <div className="fleet-inspector-body">
                  <h3>{selected.id}</h3>
                  <p>
                    {selected.chilled ? "Refrigerated" : "Ambient"}{" "}
                    {selected.type.toLowerCase()}
                  </p>
                  <dl className="operation-facts">
                    <div>
                      <dt>Home depot</dt>
                      <dd>{selected.depot}</dd>
                    </div>
                    <div>
                      <dt>Weight capacity</dt>
                      <dd>{selected.kg.toLocaleString()} kg</dd>
                    </div>
                    <div>
                      <dt>Volume capacity</dt>
                      <dd>{selected.m3} m³</dd>
                    </div>
                    <div>
                      <dt>Daily trip limit</dt>
                      <dd>{usage.trips.length} / 2</dd>
                    </div>
                    <div>
                      <dt>Fuel before plan</dt>
                      <dd>{selected.fuelRemaining} L</dd>
                    </div>
                    <div>
                      <dt>Planned fuel</dt>
                      <dd>{usage.plannedFuel.toFixed(1)} L</dd>
                    </div>
                  </dl>
                  <h3>Today’s routes</h3>
                  {usage.trips.map((trip) => (
                    <button
                      className="fleet-route-link"
                      key={trip.id}
                      onClick={() => onRoute(trip.id)}
                    >
                      <span>
                        <strong>{trip.id}</strong>
                        <small>
                          {tripDescription(trip)} · {trip.orderIds.length} stops
                        </small>
                      </span>
                      <ArrowRight size={17} />
                    </button>
                  ))}
                  {!usage.trips.length && (
                    <p className="operations-note">
                      No trips allocated to this vehicle.
                    </p>
                  )}
                  {selected.workshop ? (
                    <p className="operations-note">
                      <Wrench size={16} />
                      In workshop. Unavailable for allocation.
                    </p>
                  ) : (
                    <>
                      <Button
                        variant="outline"
                        disabled={published || usage.trips.length >= 2}
                        onClick={() => onCreate(selected.id)}
                      >
                        Create trip with {selected.id}
                      </Button>
                      {activeTrip && (
                        <>
                          <p className="small-note">
                            Selected route: {activeTrip.id}
                          </p>
                          <Button
                            className="dispatch-primary"
                            disabled={published || !!replacementIssues.length}
                            onClick={() => onUse(selected.id)}
                          >
                            Use {selected.id}
                          </Button>
                          {replacementIssues.length > 0 && (
                            <div className="fleet-compatibility">
                              <strong>
                                Cannot replace this route’s vehicle
                              </strong>
                              <ul>
                                {replacementIssues.map((issue) => (
                                  <li key={issue}>{issue}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </>
                      )}
                    </>
                  )}
                </div>
              ) : (
                <p className="operations-note">
                  Choose a matching vehicle to inspect.
                </p>
              )}
            </aside>
          </div>
        ) : (
          <section className="operations-panel capacity-panel">
            <div className="operations-panel-heading">
              <div>
                <h2>Managed capacities</h2>
                <p>
                  Capacity is checked per trip; fuel is shared across this
                  vehicle’s planned day.
                </p>
              </div>
              <CheckCircle2 size={21} />
            </div>
            <div
              className="operations-table-scroll"
              tabIndex={0}
              role="region"
              aria-label="Scrollable trip capacities"
            >
              <table className="operations-table capacity-table">
                <caption className="sr-only">
                  {depot} planned trip capacity checks
                </caption>
                <thead>
                  <tr>
                    <th>Route / vehicle</th>
                    <th>Brand / district</th>
                    <th>Weight</th>
                    <th>Volume</th>
                    <th>Schedule</th>
                    <th>Checks</th>
                    <th>
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {plan.trips
                    .filter((trip) => trip.depot === depot)
                    .map((trip) => {
                      const vehicle = vehicles.find(
                        (item) => item.id === trip.vehicleId,
                      )!;
                      const load = totals(trip);
                      const issues = validateTrip(trip, plan);
                      return (
                        <tr key={trip.id}>
                          <td>
                            <strong>{trip.id}</strong>
                            <small>{vehicle.id}</small>
                          </td>
                          <td>
                            {tripDescription(trip)
                              .split(" · ")
                              .slice(0, 2)
                              .join(" · ")}
                          </td>
                          <td>
                            {load.kg} / {vehicle.kg} kg
                            <small>
                              {Math.round((load.kg / vehicle.kg) * 100)}% used
                            </small>
                          </td>
                          <td>
                            {load.m3.toFixed(1)} / {vehicle.m3} m³
                            <small>
                              {Math.round((load.m3 / vehicle.m3) * 100)}% used
                            </small>
                          </td>
                          <td>
                            {formatTime(trip.departure)}–
                            {formatTime(
                              stopTimes(trip).at(-1)?.end ?? trip.departure,
                            )}
                            <small>Demo service finish</small>
                          </td>
                          <td>
                            <span
                              className={`operation-status ${issues.length ? "status-deferred" : "status-assigned"}`}
                            >
                              {issues.length
                                ? `${issues.length} to resolve`
                                : "Checks pass"}
                            </span>
                          </td>
                          <td>
                            <button
                              className="dispatch-text-button"
                              onClick={() => onRoute(trip.id)}
                              aria-label={`Edit route ${trip.id}`}
                            >
                              Edit route <ArrowRight size={14} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
              {!plan.trips.some((trip) => trip.depot === depot) && (
                <div className="operations-empty">
                  <h3>No planned trips</h3>
                  <p>Create this depot’s first trip to compare capacity.</p>
                  <Button variant="outline" onClick={() => onRoute()}>
                    Open route planning
                  </Button>
                </div>
              )}
            </div>
            <div className="capacity-fuel-list">
              <h3>Weekly fuel after this plan</h3>
              {fleet.map((vehicle) => {
                const item = vehicleUsage(vehicle, plan);
                return (
                  <div key={vehicle.id}>
                    <strong>{vehicle.id}</strong>
                    <meter
                      min={0}
                      max={vehicle.fuelRemaining}
                      value={Math.max(0, item.fuelLeft)}
                      aria-label={`${vehicle.id} fuel remaining after plan`}
                    />
                    <span>
                      {item.fuelLeft.toFixed(1)} / {vehicle.fuelRemaining} L
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        )}
        <section className="operations-panel fleet-distribution">
          <div className="operations-panel-heading">
            <h2>Fleet distribution</h2>
            <span className="small-note">Sample fleet</span>
          </div>
          <div className="fleet-distribution-charts">
            <Donut
              title="Allocation"
              unit="vehicles"
              slices={[
                { name: "Allocated", value: used.length, fill: "#1765ab" },
                {
                  name: "Unallocated",
                  value: fleet.filter(
                    (vehicle) =>
                      !vehicle.workshop &&
                      !vehicleUsage(vehicle, plan).trips.length,
                  ).length,
                  fill: "#7a8ea5",
                },
                { name: "Workshop", value: workshop.length, fill: "#af7429" },
              ]}
            />
            <Donut
              title="Vehicle types"
              unit="vehicles"
              slices={[
                {
                  name: "Trucks",
                  value: fleet.filter((vehicle) => vehicle.type === "Truck")
                    .length,
                  fill: "#1765ab",
                },
                {
                  name: "Vans",
                  value: fleet.filter((vehicle) => vehicle.type === "Van")
                    .length,
                  fill: "#247a70",
                },
              ]}
            />
          </div>
        </section>
      </div>
    </div>
  );
}
