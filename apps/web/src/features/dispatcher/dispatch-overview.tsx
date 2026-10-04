"use client";

import { useRef, useState, type CSSProperties } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  CalendarDays,
  ArrowUpRight,
  GripVertical,
  Undo2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  PanelRightClose,
  PanelRightOpen,
  Truck,
} from "lucide-react";
import {
  orders,
  vehicles,
  formatTime,
  tripOrders,
  type Depot,
  type Plan,
} from "./planning";

type Slice = { name: string; value: number; fill: string };
const shades = {
  blue: "#1765ab",
  teal: "#247a70",
  amber: "#af7429",
  slate: "#7a8ea5",
  purple: "#7561a8",
};

export function Donut({
  title,
  slices,
  unit,
  solid = false,
}: {
  title: string;
  slices: Slice[];
  unit: string;
  solid?: boolean;
}) {
  const total = slices.reduce((sum, slice) => sum + slice.value, 0);
  return (
    <figure className="overview-chart" aria-label={title}>
      <figcaption>{title}</figcaption>
      <div className="overview-pie-frame">
        {total ? (
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <PieChart accessibilityLayer>
              <Pie
                data={slices.filter((slice) => slice.value > 0)}
                dataKey="value"
                nameKey="name"
                innerRadius={solid ? 0 : "63%"}
                outerRadius="87%"
                stroke="white"
                strokeWidth={3}
                isAnimationActive={false}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: 8,
                  fontSize: 12,
                  borderColor: "#dce3eb",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <p className="overview-chart-empty">No {unit} in this category</p>
        )}
        {!solid && total > 0 && (
          <div className="pie-center" aria-hidden="true">
            <strong>{total}</strong>
            <span>{unit}</span>
          </div>
        )}
      </div>
      <ul className="chart-legend">
        {slices.map((slice) => (
          <li key={slice.name}>
            <span
              className="legend-swatch"
              style={{ background: slice.fill }}
            />
            <span>{slice.name}</span>
            <strong>{slice.value}</strong>
          </li>
        ))}
      </ul>
    </figure>
  );
}

function Calendar({
  date,
  onDate,
}: {
  date: string;
  onDate: (date: string) => void;
}) {
  const [month, setMonth] = useState(date.slice(0, 7));
  const [year, index] = month.split("-").map(Number);
  const start = new Date(Date.UTC(year, index - 1, 1)).getUTCDay();
  const days = new Date(Date.UTC(year, index, 0)).getUTCDate();
  const shift = (delta: number) => {
    const next = new Date(Date.UTC(year, index - 1 + delta, 1));
    setMonth(
      `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, "0")}`,
    );
  };
  const title = new Intl.DateTimeFormat("en", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, index - 1, 1)));
  return (
    <section className="overview-calendar" aria-label="Operating calendar">
      <div className="calendar-heading">
        <h3>{title}</h3>
        <div>
          <button aria-label="Previous month" onClick={() => shift(-1)}>
            <ChevronLeft size={16} aria-hidden="true" />
          </button>
          <button aria-label="Next month" onClick={() => shift(1)}>
            <ChevronRight size={16} aria-hidden="true" />
          </button>
        </div>
      </div>
      <div className="calendar-weekdays" aria-hidden="true">
        {["S", "M", "T", "W", "T", "F", "S"].map((day, i) => (
          <span key={i}>{day}</span>
        ))}
      </div>
      <div className="calendar-grid">
        {Array.from({ length: start }, (_, i) => (
          <span key={`blank-${i}`} />
        ))}
        {Array.from({ length: days }, (_, i) => {
          const key = `${month}-${String(i + 1).padStart(2, "0")}`;
          return (
            <button
              key={key}
              aria-label={`Select ${key}`}
              aria-pressed={date === key}
              onClick={() => onDate(key)}
            >
              {i + 1}
            </button>
          );
        })}
      </div>
      <p>Demo scenario: 3 October 2026</p>
    </section>
  );
}

export function DispatchOverview({
  plan,
  depot,
  date,
  onDate,
  onNavigate,
}: {
  plan: Plan;
  depot: Depot;
  date: string;
  onDate: (value: string) => void;
  onNavigate: (
    view: "planning" | "fleet" | "deferrals",
    orderId?: string,
  ) => void;
}) {
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [drawerWidth, setDrawerWidth] = useState(280);
  const [category, setCategory] = useState("All");
  const resize = useRef<{ x: number; width: number } | null>(null);
  const resizePanel = (value: number) =>
    setDrawerWidth(Math.max(250, Math.min(390, Math.round(value / 10) * 10)));
  const fleet = vehicles.filter((vehicle) => vehicle.depot === depot);
  const trips = plan.trips.filter((trip) => trip.depot === depot);
  const assignedIds = new Set(trips.flatMap((trip) => trip.orderIds));
  const usedIds = new Set(
    trips.filter((trip) => trip.orderIds.length).map((trip) => trip.vehicleId),
  );
  const depotOrders = orders.filter((order) => order.depot === depot);
  const deferred = new Set(plan.deferrals.map((item) => item.orderId));
  const pending = depotOrders.filter(
    (order) => !assignedIds.has(order.id) && !deferred.has(order.id),
  );
  const carryOver = pending.filter((order) => order.carryOver);
  const queue = pending
    .filter((order) => category === "All" || order.brand === category)
    .sort(
      (a, b) =>
        Number(b.carryOver) - Number(a.carryOver) || a.window[1] - b.window[1],
    );
  const stats = [
    {
      label: "Orders",
      value: String(depotOrders.length),
      detail: "In this depot",
    },
    {
      label: "Assigned",
      value: String(assignedIds.size),
      detail: "Planned, not delivered",
    },
    {
      label: "Deferred",
      value: String(
        depotOrders.filter((order) => deferred.has(order.id)).length,
      ),
      detail: "Reason recorded",
    },
    {
      label: "Vehicles used",
      value: `${usedIds.size} / ${fleet.length}`,
      detail: "Sample fleet",
    },
    {
      label: "Refrigerated used",
      value: `${fleet.filter((v) => v.chilled && usedIds.has(v.id)).length} / ${fleet.filter((v) => v.chilled).length}`,
      detail: "Sample cold-chain fleet",
    },
  ];
  const fleetSlices = (type: "Truck" | "Van"): Slice[] => {
    const group = fleet.filter((v) => v.type === type);
    return [
      {
        name: "Used",
        value: group.filter((v) => usedIds.has(v.id) && !v.workshop).length,
        fill: shades.blue,
      },
      {
        name: "Not used",
        value: group.filter((v) => !usedIds.has(v.id) && !v.workshop).length,
        fill: shades.slate,
      },
      {
        name: "In workshop",
        value: group.filter((v) => v.workshop).length,
        fill: shades.amber,
      },
    ];
  };
  const fleetTypes: Slice[] = [
    {
      name: "Ambient trucks",
      value: fleet.filter((v) => v.type === "Truck" && !v.chilled).length,
      fill: shades.blue,
    },
    {
      name: "Refrigerated trucks",
      value: fleet.filter((v) => v.type === "Truck" && v.chilled).length,
      fill: shades.teal,
    },
    {
      name: "Ambient vans",
      value: fleet.filter((v) => v.type === "Van" && !v.chilled).length,
      fill: shades.amber,
    },
    {
      name: "Refrigerated vans",
      value: fleet.filter((v) => v.type === "Van" && v.chilled).length,
      fill: shades.purple,
    },
  ];
  const allocation: Slice[] = [
    "Fresh",
    "Style",
    "Tech",
    "Multiple brands",
    "Unallocated",
    "In workshop",
  ].map((name, i) => ({
    name,
    fill: [
      shades.teal,
      shades.blue,
      shades.purple,
      "#9a5778",
      shades.slate,
      shades.amber,
    ][i],
    value: fleet.filter((vehicle) => {
      if (vehicle.workshop) return name === "In workshop";
      const brands = new Set(
        trips
          .filter((trip) => trip.vehicleId === vehicle.id)
          .flatMap((trip) => tripOrders(trip).map((order) => order.brand)),
      );
      return (
        name ===
        (brands.size > 1
          ? "Multiple brands"
          : brands.size === 1
            ? [...brands][0]
            : "Unallocated")
      );
    }).length,
  }));
  const brandData = ["Fresh", "Style", "Tech"].map((brand) => ({
    brand,
    Assigned: depotOrders.filter(
      (order) => order.brand === brand && assignedIds.has(order.id),
    ).length,
    Pending: pending.filter((order) => order.brand === brand).length,
    Deferred: depotOrders.filter(
      (order) => order.brand === brand && deferred.has(order.id),
    ).length,
  }));
  return (
    <div
      className={`overview-layout ${drawerOpen ? "drawer-open" : "drawer-closed"}`}
      style={{ "--companion-width": `${drawerWidth}px` } as CSSProperties}
    >
      <div
        className="overview-scroll"
        tabIndex={0}
        role="region"
        aria-label="Scrollable dashboard analysis"
      >
        <div
          className={`overview-priority ${carryOver.length ? "has-priority" : ""}`}
        >
          <Undo2 size={18} aria-hidden="true" />
          <p>
            <strong>
              {carryOver.length
                ? `${carryOver.length} carry-over order${carryOver.length === 1 ? " needs" : "s need"} priority`
                : "No carry-over orders awaiting allocation"}
            </strong>
            <span>
              {pending.length} order{pending.length === 1 ? "" : "s"} still to
              plan · {trips.length} planned trip{trips.length === 1 ? "" : "s"}
            </span>
          </p>
          <button
            onClick={() =>
              onNavigate("planning", carryOver[0]?.id ?? pending[0]?.id)
            }
          >
            {carryOver.length ? "Review priority" : "Open intake"}
            <ArrowUpRight size={16} aria-hidden="true" />
          </button>
        </div>
        <div className="overview-stats">
          {stats.map((stat) => (
            <div key={stat.label}>
              <span>{stat.label}</span>
              <strong>{stat.value}</strong>
              <small>{stat.detail}</small>
            </div>
          ))}
        </div>
        <section
          className="overview-analysis"
          aria-labelledby="fleet-analysis-heading"
        >
          <div className="overview-section-title">
            <h2 id="fleet-analysis-heading">Fleet distribution</h2>
            <span>{depot} · sample vehicles</span>
          </div>
          <div className="overview-fleet-charts">
            <Donut
              title="Trucks"
              slices={fleetSlices("Truck")}
              unit="trucks"
              solid
            />
            <Donut title="Vans" slices={fleetSlices("Van")} unit="vans" solid />
            <Donut title="Vehicle types" slices={fleetTypes} unit="vehicles" />
          </div>
        </section>
        <div className="overview-lower-grid">
          <section className="overview-analysis">
            <div className="overview-section-title">
              <h2>Vehicle allocation</h2>
              <button
                className="dispatch-text-button"
                onClick={() => onNavigate("fleet")}
              >
                Manage fleet
                <ChevronRight size={14} aria-hidden="true" />
              </button>
            </div>
            <Donut
              title="Allocation by brand"
              slices={allocation.filter(
                (slice) =>
                  slice.value ||
                  !["Multiple brands", "In workshop"].includes(slice.name),
              )}
              unit="vehicles"
            />
          </section>
          <section className="overview-analysis">
            <div className="overview-section-title">
              <h2>Order progress</h2>
              <span>{depotOrders.length} orders</span>
            </div>
            <Donut
              title="Daily order allocation"
              slices={[
                {
                  name: "Assigned",
                  value: assignedIds.size,
                  fill: shades.blue,
                },
                {
                  name: "Awaiting allocation",
                  value: pending.length,
                  fill: shades.slate,
                },
                {
                  name: "Deferred",
                  value: depotOrders.filter((order) => deferred.has(order.id))
                    .length,
                  fill: shades.amber,
                },
              ]}
              unit="orders"
            />
          </section>
        </div>
        <section className="overview-analysis overview-brand-analysis">
          <div className="overview-section-title">
            <h2>Allocation by brand</h2>
            <span>Selected operating day</span>
          </div>
          <div className="overview-bar-frame">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <BarChart
                data={brandData}
                accessibilityLayer
                margin={{ left: -20, right: 10, top: 10, bottom: 0 }}
              >
                <CartesianGrid
                  vertical={false}
                  stroke="#dce3eb"
                  strokeDasharray="3 3"
                />
                <XAxis
                  dataKey="brand"
                  tick={{ fontSize: 12, fill: "#58677a" }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 12, fill: "#58677a" }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Bar
                  dataKey="Assigned"
                  fill={shades.blue}
                  radius={[3, 3, 0, 0]}
                  isAnimationActive={false}
                />
                <Bar
                  dataKey="Pending"
                  fill={shades.slate}
                  radius={[3, 3, 0, 0]}
                  isAnimationActive={false}
                />
                <Bar
                  dataKey="Deferred"
                  fill={shades.amber}
                  radius={[3, 3, 0, 0]}
                  isAnimationActive={false}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="bar-chart-key">
            <span>
              <i style={{ background: shades.blue }} />
              Assigned
            </span>
            <span>
              <i style={{ background: shades.slate }} />
              Pending
            </span>
            <span>
              <i style={{ background: shades.amber }} />
              Deferred
            </span>
          </div>
          <table className="overview-data-table">
            <caption className="sr-only">
              Order allocation by brand, values also represented in the chart
            </caption>
            <thead>
              <tr>
                <th>Brand</th>
                <th>Assigned</th>
                <th>Pending</th>
                <th>Deferred</th>
              </tr>
            </thead>
            <tbody>
              {brandData.map((row) => (
                <tr key={row.brand}>
                  <th>{row.brand}</th>
                  <td>{row.Assigned}</td>
                  <td>{row.Pending}</td>
                  <td>{row.Deferred}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        <p className="overview-data-note">
          Synthetic scenario. These charts analyze the local plan, not live
          delivery telemetry.
        </p>
      </div>
      <aside className="overview-drawer" aria-label="Planning companion">
        {drawerOpen && (
          <div
            className="overview-resize-handle"
            role="separator"
            tabIndex={0}
            aria-label="Resize planning panel"
            aria-orientation="vertical"
            aria-valuemin={250}
            aria-valuemax={390}
            aria-valuenow={drawerWidth}
            aria-valuetext={`${drawerWidth} pixels`}
            title="Drag to resize, or use arrow keys"
            onPointerDown={(event) => {
              if (event.button !== 0) return;
              resize.current = { x: event.clientX, width: drawerWidth };
              event.currentTarget.setPointerCapture(event.pointerId);
            }}
            onPointerMove={(event) => {
              if (resize.current)
                resizePanel(
                  resize.current.width + resize.current.x - event.clientX,
                );
            }}
            onPointerUp={(event) => {
              resize.current = null;
              if (event.currentTarget.hasPointerCapture(event.pointerId))
                event.currentTarget.releasePointerCapture(event.pointerId);
            }}
            onLostPointerCapture={() => {
              resize.current = null;
            }}
            onKeyDown={(event) => {
              const values: Record<string, number> = {
                ArrowLeft: drawerWidth - 10,
                ArrowRight: drawerWidth + 10,
                Home: 250,
                End: 390,
              };
              if (event.key in values) {
                event.preventDefault();
                resizePanel(values[event.key]);
              }
            }}
          >
            <GripVertical size={16} aria-hidden="true" />
          </div>
        )}
        <div className="overview-drawer-heading">
          <h2>
            {drawerOpen ? (
              "Planning companion"
            ) : (
              <span className="sr-only">Planning companion</span>
            )}
          </h2>
          <button
            aria-label={
              drawerOpen ? "Close planning drawer" : "Open planning drawer"
            }
            aria-expanded={drawerOpen}
            aria-controls="planning-companion-content"
            onClick={() => setDrawerOpen(!drawerOpen)}
          >
            {drawerOpen ? (
              <PanelRightClose size={20} aria-hidden="true" />
            ) : (
              <PanelRightOpen size={20} aria-hidden="true" />
            )}
          </button>
        </div>
        {drawerOpen ? (
          <div
            id="planning-companion-content"
            className="overview-drawer-scroll"
            role="region"
            aria-label="Scrollable planning companion"
            tabIndex={0}
          >
            <label className="companion-size-control">
              Panel width
              <input
                type="range"
                aria-label="Planning drawer width"
                min="250"
                max="390"
                step="10"
                value={drawerWidth}
                onChange={(event) => setDrawerWidth(Number(event.target.value))}
              />
            </label>
            <Calendar key={date.slice(0, 7)} date={date} onDate={onDate} />
            <section className="companion-queue">
              <div className="overview-section-title">
                <h3>Awaiting allocation</h3>
                <span>{pending.length}</span>
              </div>
              <div
                className="companion-categories"
                aria-label="Queue brand filter"
              >
                {["All", "Fresh", "Style", "Tech"].map((brand) => (
                  <button
                    key={brand}
                    aria-pressed={category === brand}
                    onClick={() => setCategory(brand)}
                  >
                    {brand}
                  </button>
                ))}
              </div>
              {queue.length ? (
                queue.map((order) => (
                  <button
                    className="companion-order"
                    key={order.id}
                    onClick={() => onNavigate("planning", order.id)}
                  >
                    <span>
                      {order.id}
                      {order.carryOver && (
                        <span className="carry-over-badge">Carry-over</span>
                      )}
                    </span>
                    <strong>{order.outlet}</strong>
                    <small>
                      {order.kg} kg · {order.m3} m³
                      {order.chilled ? " · Chilled" : ""}
                      {order.vanOnly ? " · Van only" : ""}
                    </small>
                    <small>
                      Window {formatTime(order.window[0])}–
                      {formatTime(order.window[1])}
                    </small>
                    <span>
                      Open in order intake
                      <ChevronRight size={14} aria-hidden="true" />
                    </span>
                  </button>
                ))
              ) : (
                <p className="companion-empty">
                  No pending {category === "All" ? "" : category} orders. Change
                  the filter or review the plan.
                </p>
              )}
            </section>
            <button
              className="companion-fleet-link"
              onClick={() => onNavigate("fleet")}
            >
              <Truck size={18} aria-hidden="true" />
              Inspect available vehicles
              <ChevronRight size={15} aria-hidden="true" />
            </button>
          </div>
        ) : (
          <div className="companion-rail">
            <button
              aria-label="Open operating calendar"
              onClick={() => setDrawerOpen(true)}
            >
              <CalendarDays size={20} aria-hidden="true" />
            </button>
            <button
              aria-label="Open pending order queue"
              onClick={() => setDrawerOpen(true)}
            >
              <ClipboardList size={20} aria-hidden="true" />
              <span>{pending.length}</span>
            </button>
          </div>
        )}
      </aside>
    </div>
  );
}
