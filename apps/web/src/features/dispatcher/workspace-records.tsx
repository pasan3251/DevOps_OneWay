"use client";

import { useRef, useState, type CSSProperties } from "react";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  PanelRightClose,
  PanelRightOpen,
  Search,
  Undo2,
  X,
} from "lucide-react";
import { Donut } from "./dispatch-overview";
import { orderStatus } from "./dispatch-operations";
import { orders, formatTime, type Depot, type Plan } from "./planning";

export function DeferralRecords({
  plan,
  depot,
  published,
  onReturn,
  onIntake,
}: {
  plan: Plan;
  depot: Depot;
  published: boolean;
  onReturn: (id: string) => void;
  onIntake: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [reason, setReason] = useState("All reasons");
  const [priority, setPriority] = useState("All priorities");
  const [sort, setSort] = useState("Priority");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string | null>(null);
  const [open, setOpen] = useState(true);
  const [width, setWidth] = useState(340);
  const inspector = useRef<HTMLElement>(null);
  const records = plan.deferrals.flatMap((entry) => {
    const order = orders.find(
      (o) => o.id === entry.orderId && o.depot === depot,
    );
    return order ? [{ entry, order }] : [];
  });
  const reasons = [...new Set(records.map((r) => r.entry.reason))];
  const filtered = records
    .filter(
      (r) =>
        (reason === "All reasons" || reason === r.entry.reason) &&
        (priority === "All priorities" ||
          (priority === "Repeated" ? r.order.carryOver : !r.order.carryOver)) &&
        `${r.order.id} ${r.order.outlet} ${r.entry.reason}`
          .toLowerCase()
          .includes(query.toLowerCase()),
    )
    .sort((a, b) =>
      sort === "Order ID"
        ? a.order.id.localeCompare(b.order.id)
        : Number(b.order.carryOver) - Number(a.order.carryOver),
    );
  const currentPage = Math.min(
    page,
    Math.max(1, Math.ceil(filtered.length / 5)),
  );
  const shown = filtered.slice((currentPage - 1) * 5, currentPage * 5);
  const detail = records.find((r) => r.order.id === selected) ?? filtered[0];
  return (
    <div className="records-workspace">
      <div className="workspace-stat-strip" aria-label="Deferral statistics">
        <span>
          <strong>{records.length}</strong> Recorded deferrals
        </span>
        <span>
          <strong>{records.filter((r) => r.order.carryOver).length}</strong>{" "}
          Repeated deferrals
        </span>
        <span>
          <strong>{reasons.length}</strong> Reasons
        </span>
        <span>
          <strong>{records.reduce((sum, r) => sum + r.order.kg, 0)}</strong> kg
          deferred
        </span>
      </div>
      <div
        className={`records-split ${open ? "" : "inspector-closed"}`}
        style={{ "--record-width": `${width}px` } as CSSProperties}
      >
        <section
          className="workspace-panel records-list"
          aria-label="Deferral records"
        >
          <div className="operations-filters">
            <label className="dispatch-search">
              <Search size={16} />
              <input
                aria-label="Search deferrals"
                placeholder="Search order, outlet or reason"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
              />
            </label>
            <select
              aria-label="Filter deferral reason"
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                setPage(1);
              }}
            >
              <option>All reasons</option>
              {reasons.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
            <select
              aria-label="Filter deferral priority"
              value={priority}
              onChange={(e) => {
                setPriority(e.target.value);
                setPage(1);
              }}
            >
              <option>All priorities</option>
              <option>Repeated</option>
              <option>Standard</option>
            </select>
            <select
              aria-label="Sort deferrals"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
            >
              <option>Priority</option>
              <option>Order ID</option>
            </select>
          </div>
          <div className="workspace-table-scroll">
            <table className="workspace-table">
              <caption className="sr-only">Deferred orders for {depot}</caption>
              <thead>
                <tr>
                  <th>Deferral / order</th>
                  <th>Outlet</th>
                  <th>Priority</th>
                  <th>Reason</th>
                  <th>Deferred by</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {shown.map(({ entry, order }) => (
                  <tr
                    key={order.id}
                    className={
                      detail?.order.id === order.id ? "is-selected" : ""
                    }
                  >
                    <td>
                      <strong>DEF-{order.id.split("-")[1]}</strong>
                      <small>{order.id}</small>
                    </td>
                    <td>
                      {order.outlet}
                      <small>{order.district}</small>
                    </td>
                    <td>{order.carryOver ? "Repeated" : "Standard"}</td>
                    <td>{entry.reason}</td>
                    <td>
                      Dispatcher<small>Local demo</small>
                    </td>
                    <td>
                      <button
                        className="dispatch-text-button"
                        aria-label={`Inspect deferral ${order.id}`}
                        onClick={() => {
                          setSelected(order.id);
                          setOpen(true);
                          requestAnimationFrame(() => {
                            if (matchMedia("(max-width: 900px)").matches) {
                              inspector.current?.focus();
                              inspector.current?.scrollIntoView({
                                behavior: "smooth",
                                block: "start",
                              });
                            }
                          });
                        }}
                      >
                        Inspect <ArrowRight size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!filtered.length && (
            <div className="workspace-empty">
              <Undo2 size={26} />
              <h2>
                {records.length
                  ? "No matching deferrals"
                  : "No orders deferred"}
              </h2>
              <p>
                {records.length
                  ? "Change the filters to find a recorded decision."
                  : "Recorded decisions appear here with their reason and priority."}
              </p>
              <button
                className="dispatch-text-button"
                onClick={() => {
                  setQuery("");
                  setReason("All reasons");
                  setPriority("All priorities");
                  if (!records.length) onIntake("");
                }}
              >
                {records.length ? "Clear filters" : "Go to daily plan"}
              </button>
            </div>
          )}
          <div className="operations-pagination">
            <span>
              {filtered.length} records · Page {currentPage} of{" "}
              {Math.max(1, Math.ceil(filtered.length / 5))}
            </span>
            <div>
              <button
                aria-label="Previous deferrals page"
                disabled={currentPage === 1}
                onClick={() => setPage(currentPage - 1)}
              >
                <ChevronLeft size={16} />
              </button>
              <button
                aria-label="Next deferrals page"
                disabled={currentPage * 5 >= filtered.length}
                onClick={() => setPage(currentPage + 1)}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </section>
        <aside
          className="workspace-panel records-inspector"
          aria-label="Deferral inspector"
          ref={inspector}
          tabIndex={-1}
        >
          <div className="workspace-panel-heading">
            <h2>
              {open ? (
                "Deferral details"
              ) : (
                <span className="sr-only">Deferral details</span>
              )}
            </h2>
            <button
              aria-label={
                open ? "Close deferral inspector" : "Open deferral inspector"
              }
              aria-expanded={open}
              onClick={() => setOpen(!open)}
            >
              {open ? (
                <PanelRightClose size={20} />
              ) : (
                <PanelRightOpen size={20} />
              )}
            </button>
          </div>
          {open && (
            <div
              className="records-inspector-scroll"
              tabIndex={0}
              aria-label="Scrollable deferral analysis"
            >
              <label className="companion-size-control">
                Panel width
                <input
                  type="range"
                  aria-label="Deferral inspector width"
                  min="280"
                  max="420"
                  step="10"
                  value={width}
                  onChange={(e) => setWidth(Number(e.target.value))}
                />
              </label>
              <div className="workspace-detail-body">
                {detail ? (
                  <>
                    <span className="order-id">{detail.order.id}</span>
                    <h3>{detail.order.outlet}</h3>
                    <dl className="workspace-facts">
                      <div>
                        <dt>Priority</dt>
                        <dd>
                          {detail.order.carryOver
                            ? "Repeated deferral"
                            : "Standard"}
                        </dd>
                      </div>
                      <div>
                        <dt>Reason</dt>
                        <dd>{detail.entry.reason}</dd>
                      </div>
                      <div>
                        <dt>Recorded by</dt>
                        <dd>Dispatcher · local demo</dd>
                      </div>
                      <div>
                        <dt>Last served</dt>
                        <dd>No delivery history connected</dd>
                      </div>
                    </dl>
                    <p className="workspace-decision">{detail.entry.note}</p>
                    <button
                      className="workspace-action"
                      disabled={published}
                      onClick={() => onReturn(detail.order.id)}
                    >
                      <Undo2 size={16} /> Return to backlog
                    </button>
                    <button
                      className="dispatch-text-button"
                      onClick={() => onIntake(detail.order.id)}
                    >
                      Inspect order <ArrowRight size={15} />
                    </button>
                  </>
                ) : (
                  <p>
                    Select a record after recording a deferral in Order Intake.
                  </p>
                )}
              </div>
              <div className="workspace-analysis">
                <h3>Deferral distribution</h3>
                <Donut
                  title="By reason"
                  unit="records"
                  slices={reasons.map((r, i) => ({
                    name: r,
                    value: records.filter((record) => record.entry.reason === r)
                      .length,
                    fill: [
                      "#1765ab",
                      "#247a70",
                      "#af7429",
                      "#7561a8",
                      "#7a8ea5",
                    ][i % 5],
                  }))}
                />
                <Donut
                  title="By recorded role"
                  unit="records"
                  slices={[
                    {
                      name: "Dispatcher",
                      value: records.length,
                      fill: "#1765ab",
                    },
                  ]}
                />
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

export function OutletDirectory({
  plan,
  depot,
  onOrder,
  onRoute,
}: {
  plan: Plan;
  depot: Depot;
  onOrder: (id: string) => void;
  onRoute: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [district, setDistrict] = useState("All districts");
  const [brand, setBrand] = useState("All brands");
  const [sort, setSort] = useState("Outlet name");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const detailRef = useRef<HTMLElement>(null);
  const all = orders.filter((o) => o.depot === depot);
  const districts = [...new Set(all.map((o) => o.district))];
  const filtered = all
    .filter(
      (o) =>
        (district === "All districts" || o.district === district) &&
        (brand === "All brands" || o.brand === brand) &&
        `${o.outlet} ${o.id}`.toLowerCase().includes(query.toLowerCase()),
    )
    .sort((a, b) =>
      sort === "Window closes"
        ? a.window[1] - b.window[1]
        : a.outlet.localeCompare(b.outlet),
    );
  const selected = all.find((o) => o.id === selectedId);
  const route = selected
    ? plan.trips.find((t) => t.orderIds.includes(selected.id))
    : undefined;
  return (
    <div className={`directory-workspace ${selected ? "with-inspector" : ""}`}>
      <aside className="workspace-panel directory-analysis">
        <div className="workspace-panel-heading">
          <h2>Outlet distribution</h2>
        </div>
        <div className="workspace-detail-body">
          <label>
            District
            <select
              aria-label="Filter outlet district"
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
            >
              <option>All districts</option>
              {districts.map((d) => (
                <option key={d}>{d}</option>
              ))}
            </select>
          </label>
          <Donut
            title="Outlets by brand"
            unit="outlets"
            slices={["Fresh", "Style", "Tech"].map((name, i) => ({
              name,
              value: filtered.filter((o) => o.brand === name).length,
              fill: ["#247a70", "#1765ab", "#7561a8"][i],
            }))}
          />
          <p className="workspace-note">
            {filtered.length} sample outlets in {depot}. The directory uses the
            supplied frontend scenario, not the full network. Allocation status
            refers to the 3 October 2026 demo plan.
          </p>
        </div>
      </aside>
      <section
        className="workspace-panel directory-list"
        aria-label="Outlet directory"
      >
        <div className="operations-filters">
          <label className="dispatch-search">
            <Search size={16} />
            <input
              aria-label="Search outlets"
              placeholder="Search outlet or order"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <select
            aria-label="Filter outlet brand"
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
          >
            <option>All brands</option>
            <option>Fresh</option>
            <option>Style</option>
            <option>Tech</option>
          </select>
          <select
            aria-label="Sort outlets"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            <option>Outlet name</option>
            <option>Window closes</option>
          </select>
        </div>
        <div className="workspace-table-scroll">
          <table className="workspace-table">
            <caption className="sr-only">Sample outlet requirements</caption>
            <thead>
              <tr>
                <th>Outlet / district</th>
                <th>Brand</th>
                <th>Depot</th>
                <th>Access</th>
                <th>Operating window</th>
                <th>Plan status</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((o) => (
                <tr key={o.id}>
                  <td>
                    <strong>{o.outlet}</strong>
                    <small>{o.district}</small>
                  </td>
                  <td>{o.brand}</td>
                  <td>{o.depot}</td>
                  <td>
                    {o.vanOnly ? "Van only" : "Truck / van"}
                    <small>
                      {o.chilled ? "Chilled delivery" : "Ambient delivery"}
                    </small>
                  </td>
                  <td>
                    {formatTime(o.window[0])}–{formatTime(o.window[1])}
                  </td>
                  <td>{orderStatus(o.id, plan)}</td>
                  <td>
                    <button
                      className="dispatch-text-button"
                      aria-label={`Inspect outlet ${o.id}`}
                      onClick={() => {
                        setSelectedId(o.id);
                        requestAnimationFrame(() => {
                          if (matchMedia("(max-width: 1100px)").matches) {
                            detailRef.current?.focus();
                            detailRef.current?.scrollIntoView({
                              behavior: "smooth",
                              block: "start",
                            });
                          }
                        });
                      }}
                    >
                      Inspect <ArrowRight size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!filtered.length && (
          <div className="workspace-empty">
            <h2>No matching outlets</h2>
            <p>Try another outlet name, brand or district.</p>
            <button
              className="dispatch-text-button"
              onClick={() => {
                setQuery("");
                setDistrict("All districts");
                setBrand("All brands");
              }}
            >
              Clear filters
            </button>
          </div>
        )}
      </section>
      {selected && (
        <aside
          className="workspace-panel directory-inspector"
          aria-label="Outlet inspector"
          ref={detailRef}
          tabIndex={-1}
        >
          <div className="workspace-panel-heading">
            <h2>Outlet details</h2>
            <button
              aria-label="Close outlet inspector"
              onClick={() => setSelectedId(null)}
            >
              <X size={18} />
            </button>
          </div>
          <div className="workspace-detail-body">
            <span className="order-id">{selected.id}</span>
            <h3>{selected.outlet}</h3>
            <dl className="workspace-facts">
              <div>
                <dt>District / depot</dt>
                <dd>
                  {selected.district} · {selected.depot}
                </dd>
              </div>
              <div>
                <dt>Delivery access</dt>
                <dd>{selected.vanOnly ? "Van only" : "Truck or van"}</dd>
              </div>
              <div>
                <dt>Operating window</dt>
                <dd>
                  {formatTime(selected.window[0])}–
                  {formatTime(selected.window[1])}
                </dd>
              </div>
              <div>
                <dt>Plan status</dt>
                <dd>{orderStatus(selected.id, plan)}</dd>
              </div>
              <div>
                <dt>Store manager</dt>
                <dd>Account not connected</dd>
              </div>
              <div>
                <dt>Last served / loading dock</dt>
                <dd>History and dock details not supplied</dd>
              </div>
              <div>
                <dt>Road distance / ETA</dt>
                <dd>Awaiting actual location data</dd>
              </div>
            </dl>
            <button
              className="workspace-action"
              onClick={() => onOrder(selected.id)}
            >
              Open order <ArrowRight size={16} />
            </button>
            {route && (
              <button
                className="dispatch-text-button"
                onClick={() => onRoute(route.id)}
              >
                Open {route.id} <ArrowRight size={16} />
              </button>
            )}
          </div>
        </aside>
      )}
    </div>
  );
}
