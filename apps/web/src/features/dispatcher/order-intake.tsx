"use client";

import { useRef, useState } from "react";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  PanelRightClose,
  PanelRightOpen,
  Search,
  Snowflake,
  Sun,
  Truck,
  Undo2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  eligibleVehicles,
  orderStatus,
  tripDescription,
  type OrderStatus,
} from "./dispatch-operations";
import { formatTime, orders, type Depot, type Plan } from "./planning";

type Props = {
  plan: Plan;
  depot: Depot;
  published: boolean;
  query: string;
  brand: string;
  selected: string[];
  tripId?: string;
  onQuery: (value: string) => void;
  onBrand: (value: string) => void;
  onSelect: (ids: string[]) => void;
  onTrip: (id: string) => void;
  onAssign: (orderId: string) => void;
  onCreateAssign: (orderId: string, vehicleId: string) => void;
  onDefer: (orderId: string) => void;
  onReturn: (orderId: string) => void;
  onRoute: (tripId?: string) => void;
  errors: string[];
};
export function OrderIntake(props: Props) {
  const { plan, depot, published, query, brand, selected } = props;
  const [status, setStatus] = useState<"All" | OrderStatus>("All");
  const [page, setPage] = useState(1);
  const [detailsId, setDetailsId] = useState<string | null>(selected[0] ?? null);
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [drawerWidth, setDrawerWidth] = useState(320);
  const [sort, setSort] = useState("Priority");
  const detailsRef = useRef<HTMLElement>(null);
  const depotOrders = orders.filter((order) => order.depot === depot);
  const filtered = depotOrders
    .filter(
      (order) =>
        (status === "All" || orderStatus(order.id, plan) === status) &&
        (brand === "All brands" || order.brand === brand) &&
        `${order.id} ${order.outlet} ${order.district}`
          .toLowerCase()
          .includes(query.toLowerCase()),
    )
    .sort((a, b) =>
      sort === "Weight"
        ? b.kg - a.kg
        : sort === "Order ID"
          ? a.id.localeCompare(b.id)
          : Number(b.carryOver) - Number(a.carryOver) ||
            a.id.localeCompare(b.id),
    );
  const pageCount = Math.max(1, Math.ceil(filtered.length / 5));
  const currentPage = Math.min(page, pageCount);
  const visible = filtered.slice((currentPage - 1) * 5, currentPage * 5);
  const selectedOrder =
    depotOrders.find((order) => order.id === selected[0]) ??
    depotOrders.find((order) => order.id === detailsId) ??
    filtered[0];
  const detailStatus = selectedOrder
    ? orderStatus(selectedOrder.id, plan)
    : null;
  const assignedTrip = selectedOrder
    ? plan.trips.find((trip) => trip.orderIds.includes(selectedOrder.id))
    : undefined;
  const deferred = selectedOrder
    ? plan.deferrals.find((entry) => entry.orderId === selectedOrder.id)
    : undefined;
  const suggestions =
    selectedOrder && detailStatus === "Pending"
      ? eligibleVehicles(selectedOrder, plan)
      : [];
  const depotTrips = plan.trips.filter((trip) => trip.depot === depot);
  function inspect(id: string) {
    setDetailsId(id);
    setDrawerOpen(true);
    props.onSelect(orderStatus(id, plan) === "Pending" ? [id] : []);
    if (window.innerWidth <= 760)
      window.requestAnimationFrame(() => {
        detailsRef.current?.focus({ preventScroll: true });
        detailsRef.current?.scrollIntoView({ block: "start" });
      });
  }
  return (
    <div
      className={`operations-layout${drawerOpen ? "" : " detail-closed"}`}
      style={{ "--detail-width": `${drawerWidth}px` } as React.CSSProperties}
    >
      <section
        className="operations-panel intake-panel"
        aria-label="Order intake table"
        tabIndex={0}
      >
        <div className="operations-panel-heading">
          <div>
            <h2>
              Daily orders <span>{depotOrders.length}</span>
            </h2>
            <p>Inspect requirements before allocating a whole order.</p>
          </div>
          <ClipboardList size={21} aria-hidden="true" />
        </div>
        <div className="operations-tabs" aria-label="Order status filters">
          {(["All", "Pending", "Assigned", "Deferred"] as const).map(
            (value) => (
              <button
                key={value}
                aria-pressed={status === value}
                onClick={() => {
                  setStatus(value);
                  setPage(1);
                }}
              >
                {value}
                <span>
                  {value === "All"
                    ? depotOrders.length
                    : depotOrders.filter(
                        (order) => orderStatus(order.id, plan) === value,
                      ).length}
                </span>
              </button>
            ),
          )}
        </div>
        <div className="operations-filters">
          <label className="dispatch-search">
            <Search size={17} aria-hidden="true" />
            <input
              aria-label="Search orders"
              value={query}
              placeholder="Order, outlet or district"
              onChange={(event) => {
                props.onQuery(event.target.value);
                setPage(1);
              }}
            />
          </label>
          <select
            aria-label="Filter by brand"
            value={brand}
            onChange={(event) => {
              props.onBrand(event.target.value);
              setPage(1);
            }}
          >
            {["All brands", "Fresh", "Style", "Tech"].map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
          <select
            aria-label="Sort orders"
            value={sort}
            onChange={(event) => {
              setSort(event.target.value);
              setPage(1);
            }}
          >
            {["Priority", "Order ID", "Weight"].map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </div>
        <div
          className="operations-table-scroll"
          tabIndex={0}
          role="region"
          aria-label="Scrollable order requirements"
        >
          <table className="operations-table intake-table">
            <caption className="sr-only">
              {depot} orders and allocation requirements
            </caption>
            <thead>
              <tr>
                <th>Order / outlet</th>
                <th>Temperature</th>
                <th>Access</th>
                <th>Delivery window</th>
                <th>Payload</th>
                <th>Status / vehicle</th>
                <th>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {visible.map((order) => {
                const state = orderStatus(order.id, plan);
                const trip = plan.trips.find((item) =>
                  item.orderIds.includes(order.id),
                );
                return (
                  <tr
                    key={order.id}
                    className={
                      selectedOrder?.id === order.id ? "is-selected" : ""
                    }
                  >
                    <td>
                      <div className="intake-order-identity">
                        <input
                          id={`dispatch-order-${order.id}`}
                          type="checkbox"
                          aria-label={`Select ${order.id}`}
                          disabled={published || state !== "Pending"}
                          checked={selected.includes(order.id)}
                          onChange={(event) => {
                            setDetailsId(order.id);
                            props.onSelect(
                              event.target.checked ? [order.id] : [],
                            );
                          }}
                        />
                        <div>
                          <span className="order-id">
                            {order.id}
                            {order.carryOver && (
                              <span className="carry-over-badge">
                                Carry-over
                              </span>
                            )}
                          </span>
                          <strong>{order.outlet}</strong>
                          <small>{order.district}</small>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="temperature-label">
                        {order.chilled ? (
                          <Snowflake size={14} aria-hidden="true" />
                        ) : (
                          <Sun size={14} aria-hidden="true" />
                        )}
                        {order.chilled ? "Chilled" : "Ambient"}
                      </span>
                    </td>
                    <td>{order.vanOnly ? "Van only" : "Truck / van"}</td>
                    <td>
                      {formatTime(order.window[0])}–
                      {formatTime(order.window[1])}
                    </td>
                    <td>
                      {order.kg.toLocaleString()} kg<small>{order.m3} m³</small>
                    </td>
                    <td>
                      <span
                        className={`operation-status status-${state.toLowerCase()}`}
                      >
                        {state}
                      </span>
                      <small>{trip?.vehicleId ?? "Not allocated"}</small>
                    </td>
                    <td>
                      <button
                        className="dispatch-text-button"
                        aria-label={`View ${order.id}`}
                        onClick={() => inspect(order.id)}
                      >
                        View <ArrowRight size={14} aria-hidden="true" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!filtered.length && (
            <div className="operations-empty">
              <Search size={28} aria-hidden="true" />
              <h3>No matching orders</h3>
              <p>
                Choose another status or clear the search and brand filters.
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  props.onQuery("");
                  props.onBrand("All brands");
                  setStatus("All");
                }}
              >
                Clear filters
              </Button>
            </div>
          )}
        </div>
        <div className="operations-pagination">
          <span>
            {filtered.length
              ? `${(currentPage - 1) * 5 + 1}–${Math.min(currentPage * 5, filtered.length)} of ${filtered.length} orders`
              : "0 orders"}
          </span>
          <div>
            <button
              aria-label="Previous orders page"
              disabled={currentPage === 1}
              onClick={() => setPage(currentPage - 1)}
            >
              <ChevronLeft size={17} />
            </button>
            <span>
              Page {currentPage} of {pageCount}
            </span>
            <button
              aria-label="Next orders page"
              disabled={currentPage === pageCount}
              onClick={() => setPage(currentPage + 1)}
            >
              <ChevronRight size={17} />
            </button>
          </div>
        </div>
      </section>
      <aside
        ref={detailsRef}
        tabIndex={-1}
        className="operations-panel operations-detail"
        aria-label="Order details"
      >
        <div className="operations-panel-heading">
          <h2>
            {drawerOpen ? (
              "Order details"
            ) : (
              <span className="sr-only">Order details</span>
            )}
          </h2>
          <button
            className="dispatch-icon-button"
            aria-label={
              drawerOpen ? "Close order details" : "Open order details"
            }
            aria-expanded={drawerOpen}
            onClick={() => setDrawerOpen(!drawerOpen)}
          >
            {drawerOpen ? (
              <PanelRightClose size={19} />
            ) : (
              <PanelRightOpen size={19} />
            )}
          </button>
        </div>
        {drawerOpen && (
          <>
            <label className="operations-resize">
              Panel width
              <input
                aria-label="Order details width"
                type="range"
                min={280}
                max={400}
                step={10}
                value={drawerWidth}
                onChange={(event) => setDrawerWidth(Number(event.target.value))}
              />
            </label>
            <div className="operations-detail-scroll" tabIndex={0}>
              {selectedOrder ? (
                <>
                  <div className="order-detail-title">
                    <span className="order-id">{selectedOrder.id}</span>
                    <h3>{selectedOrder.outlet}</h3>
                    <span
                      className={`operation-status status-${detailStatus?.toLowerCase()}`}
                    >
                      {detailStatus}
                    </span>
                  </div>
                  <dl className="operation-facts">
                    <div>
                      <dt>Depot / district</dt>
                      <dd>
                        {depot} / {selectedOrder.district}
                      </dd>
                    </div>
                    <div>
                      <dt>Temperature</dt>
                      <dd>{selectedOrder.chilled ? "Chilled" : "Ambient"}</dd>
                    </div>
                    <div>
                      <dt>Vehicle access</dt>
                      <dd>
                        {selectedOrder.vanOnly ? "Van only" : "Truck or van"}
                      </dd>
                    </div>
                    <div>
                      <dt>Weight / volume</dt>
                      <dd>
                        {selectedOrder.kg} kg / {selectedOrder.m3} m³
                      </dd>
                    </div>
                    <div>
                      <dt>Delivery window</dt>
                      <dd>
                        {formatTime(selectedOrder.window[0])}–
                        {formatTime(selectedOrder.window[1])}
                      </dd>
                    </div>
                  </dl>
                  {selectedOrder.carryOver && (
                    <p className="operations-note">
                      <Undo2 size={16} aria-hidden="true" />
                      Carried over from a previous run. Prioritize allocation.
                    </p>
                  )}
                  {detailStatus === "Pending" && (
                    <div className="intake-allocation">
                      <h3>Allocate this order</h3>
                      <p>Select its checkbox to enable assignment.</p>
                      <label>
                        Existing trip
                        <select
                          aria-label="Selected trip"
                          value={props.tripId ?? ""}
                          disabled={!depotTrips.length}
                          onChange={(event) => props.onTrip(event.target.value)}
                        >
                          {!depotTrips.length && (
                            <option value="">No trips yet</option>
                          )}
                          {depotTrips.map((trip) => (
                            <option key={trip.id} value={trip.id}>
                              {trip.id} · {trip.vehicleId}
                            </option>
                          ))}
                        </select>
                      </label>
                      <Button
                        className="dispatch-primary"
                        disabled={
                          !selected.includes(selectedOrder.id) ||
                          !props.tripId ||
                          published
                        }
                        onClick={() => props.onAssign(selectedOrder.id)}
                      >
                        Assign to trip <ArrowRight size={15} />
                      </Button>
                      {props.errors.length > 0 && (
                        <div className="assignment-error" role="alert">
                          <strong>Assignment blocked</strong>
                          <ul>
                            {props.errors.map((error) => (
                              <li key={error}>{error}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      <h3>Eligible for a new trip</h3>
                      <p>Validated against this order and today’s plan.</p>
                      {suggestions.map((vehicle) => (
                        <div className="intake-suggestion" key={vehicle.id}>
                          <Truck size={20} aria-hidden="true" />
                          <div>
                            <strong>{vehicle.id}</strong>
                            <small>
                              {vehicle.chilled ? "Refrigerated" : "Ambient"}{" "}
                              {vehicle.type.toLowerCase()}
                            </small>
                          </div>
                          <button
                            className="dispatch-text-button"
                            disabled={published}
                            aria-label={`Create trip for ${selectedOrder.id} with ${vehicle.id}`}
                            onClick={() =>
                              props.onCreateAssign(selectedOrder.id, vehicle.id)
                            }
                          >
                            Allocate
                          </button>
                        </div>
                      ))}
                      {!suggestions.length && (
                        <p className="operations-note">
                          No vehicle passes all checks for a new trip. Adjust
                          existing routes or record a deferral.
                        </p>
                      )}
                      <button
                        className="dispatch-text-button"
                        disabled={
                          !selected.includes(selectedOrder.id) || published
                        }
                        onClick={() => props.onDefer(selectedOrder.id)}
                      >
                        <Undo2 size={15} />
                        Defer orders
                      </button>
                    </div>
                  )}
                  {assignedTrip && (
                    <div className="intake-allocation">
                      <h3>
                        {assignedTrip.id} · {assignedTrip.vehicleId}
                      </h3>
                      <p>{tripDescription(assignedTrip)}</p>
                      <Button
                        variant="outline"
                        onClick={() => props.onRoute(assignedTrip.id)}
                      >
                        Open route <ArrowRight size={15} />
                      </Button>
                      <p className="small-note">
                        Assigned for planning. Delivery has not been recorded.
                      </p>
                    </div>
                  )}
                  {deferred && (
                    <div className="intake-allocation">
                      <h3>{deferred.reason}</h3>
                      <p>{deferred.note}</p>
                      <Button
                        variant="outline"
                        disabled={published}
                        onClick={() => props.onReturn(selectedOrder.id)}
                      >
                        Return to backlog
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <p className="operations-note">
                  Choose an order to inspect its requirements.
                </p>
              )}
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
