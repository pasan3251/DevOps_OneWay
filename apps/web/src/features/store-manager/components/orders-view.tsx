"use client";

import { useMemo, useState } from "react";
import { createColumnHelper, tableFeatures, useTable } from "@tanstack/react-table";
import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  FileText,
  PackagePlus,
  Search,
  Snowflake,
  Sun,
  Trash2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { storeApi, type CutoffInfo, type StoreOrder } from "../store-manager-api";
import { formatDate, friendlyDeferral, orderStatusMeta } from "../store-manager-format";

interface OrdersViewProps {
  orders: StoreOrder[];
  cutoff: CutoffInfo;
  selectedOrder: StoreOrder | null;
  onSelectOrder: (order: StoreOrder | null) => void;
  onRefresh: () => void;
  onNavigateToNewOrder: () => void;
}

type OrderFilter = "ALL" | "AWAITING" | "PLANNED" | "IN_TRANSIT" | "DEFERRED" | "DELIVERED";

const orderFeatures = tableFeatures({});
const orderColumn = createColumnHelper<typeof orderFeatures, StoreOrder>();

const filters: Array<{ id: OrderFilter; label: string }> = [
  { id: "ALL", label: "All" },
  { id: "AWAITING", label: "Awaiting Dispatch" },
  { id: "PLANNED", label: "Planned" },
  { id: "IN_TRANSIT", label: "In transit" },
  { id: "DEFERRED", label: "Deferred" },
  { id: "DELIVERED", label: "Delivered" },
];

function matchesFilter(order: StoreOrder, filter: OrderFilter) {
  if (filter === "ALL") return true;
  if (filter === "AWAITING") {
    return ["ORDER_RECORDED", "QUEUED_NEXT_RUN", "DISPATCH_PENDING"].includes(order.status);
  }
  if (filter === "PLANNED") return order.status === "ASSIGNED";
  if (filter === "IN_TRANSIT") return order.status === "IN_TRANSIT";
  if (filter === "DEFERRED") return order.status === "DEFICIT_PENDING";
  return order.status === "DELIVERED";
}

function readableError(error: unknown) {
  return error instanceof Error ? error.message : "The order action could not be completed.";
}

export function OrdersView({
  orders,
  cutoff,
  selectedOrder,
  onSelectOrder,
  onRefresh,
  onNavigateToNewOrder,
}: OrdersViewProps) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<OrderFilter>("ALL");
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [actionError, setActionError] = useState("");

  const visibleOrders = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return orders.filter((order) => {
      if (!matchesFilter(order, filter)) return false;
      if (!normalized) return true;
      return [order.orderNumber, order.orderDate, order.tempRequirement, order.status]
        .some((value) => value.toLowerCase().includes(normalized));
    });
  }, [filter, orders, query]);

  const columns = useMemo(
    () =>
      orderColumn.columns([
        orderColumn.display({
          id: "order",
          header: "Order / delivery day",
          cell: ({ row }) => (
            <span className="store-table-primary">
              <strong>{row.original.orderNumber}</strong>
              <small>{formatDate(row.original.orderDate)}</small>
            </span>
          ),
        }),
        orderColumn.accessor("tempRequirement", {
          header: "Goods",
          cell: ({ row }) => {
            const chilled = row.original.tempRequirement === "chilled";
            return (
              <span className="store-temperature">
                {chilled ? <Snowflake size={14} /> : <Sun size={14} />}
                {chilled ? "Chilled" : "Ambient"}
              </span>
            );
          },
        }),
        orderColumn.display({
          id: "payload",
          header: "Requested load",
          cell: ({ row }) => (
            <span className="store-table-primary">
              <strong>{row.original.totalItemsCount} units</strong>
              <small>{row.original.totalWeightKg} kg · {row.original.totalVolumeM3} m³</small>
            </span>
          ),
        }),
        orderColumn.display({
          id: "status",
          header: "Dispatch decision",
          cell: ({ row }) => {
            const meta = orderStatusMeta[row.original.status];
            return <span className="store-status" data-tone={meta.tone}>{meta.label}</span>;
          },
        }),
        orderColumn.display({
          id: "action",
          header: () => <span className="sr-only">View order</span>,
          cell: ({ row }) => (
            <button className="store-text-button" type="button" onClick={() => onSelectOrder(row.original)}>
              View <ArrowRight size={14} />
            </button>
          ),
        }),
      ]),
    [onSelectOrder],
  );
  const table = useTable({ features: orderFeatures, data: visibleOrders, columns });

  const isCancellable = Boolean(
    selectedOrder &&
      selectedOrder.status === "ORDER_RECORDED" &&
      !selectedOrder.isCutoffLocked &&
      !cutoff.isPastCutoff,
  );

  async function cancelOrder() {
    if (!selectedOrder) return;
    setCancelling(true);
    setActionError("");
    try {
      await storeApi.cancelOrder(selectedOrder.id);
      setCancelOpen(false);
      onSelectOrder(null);
      onRefresh();
    } catch (error) {
      setActionError(readableError(error));
      setCancelOpen(false);
    } finally {
      setCancelling(false);
    }
  }

  return (
    <div className="store-page-stack">
      <section className="store-task-header">
        <div>
          <span className="store-eyebrow">One lifecycle per order</span>
          <h2>Replenishment orders</h2>
          <p>Follow the Dispatch decision, planned movement, deferral reason, and final receipt.</p>
        </div>
        <button className="store-primary-button" type="button" onClick={onNavigateToNewOrder}>
          <PackagePlus size={17} /> Create order
        </button>
      </section>

      <section className="store-panel store-orders-panel" aria-labelledby="order-register-title">
        <header className="store-panel-heading">
          <div>
            <span className="store-eyebrow">Order register</span>
            <h2 id="order-register-title">{visibleOrders.length} visible orders</h2>
          </div>
          <label className="store-search-field">
            <Search size={16} aria-hidden="true" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search order or date" />
          </label>
        </header>

        <div className="store-filter-pills store-order-filters" aria-label="Filter orders by decision">
          {filters.map((item) => (
            <button key={item.id} type="button" data-selected={filter === item.id} onClick={() => setFilter(item.id)}>
              {item.label}
            </button>
          ))}
        </div>

        {actionError && (
          <div className="store-feedback is-error" role="alert">
            <AlertTriangle size={16} /><span>{actionError}</span>
            <button type="button" onClick={() => setActionError("")}>Dismiss</button>
          </div>
        )}

        {visibleOrders.length === 0 ? (
          <div className="store-empty-state">
            <FileText size={22} />
            <strong>No matching orders</strong>
            <span>Change the filter or create the next replenishment order.</span>
          </div>
        ) : (
          <>
            <div className="store-order-table-wrap">
              <Table className="store-order-table">
                <TableCaption className="sr-only">Store replenishment order lifecycle</TableCaption>
                <TableHeader>
                  {table.getHeaderGroups().map((group) => (
                    <TableRow key={group.id}>
                      {group.headers.map((header) => (
                        <TableHead key={header.id}>{header.isPlaceholder ? null : <table.FlexRender header={header} />}</TableHead>
                      ))}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  {table.getRowModel().rows.map((row) => (
                    <TableRow key={row.id}>
                      {row.getAllCells().map((cell) => (
                        <TableCell key={cell.id}><table.FlexRender cell={cell} /></TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="store-order-cards">
              {visibleOrders.map((order) => {
                const meta = orderStatusMeta[order.status];
                return (
                  <button key={order.id} type="button" onClick={() => onSelectOrder(order)}>
                    <span className="store-order-card-top"><strong>{order.orderNumber}</strong><span className="store-status" data-tone={meta.tone}>{meta.label}</span></span>
                    <span>{formatDate(order.orderDate)} · {order.tempRequirement}</span>
                    <small>{order.totalItemsCount} units · {order.totalWeightKg} kg</small>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </section>

      <Dialog open={Boolean(selectedOrder)} onOpenChange={(open) => !open && onSelectOrder(null)}>
        {selectedOrder && (
          <DialogContent className="sm:max-w-[680px] store-dialog store-order-dialog">
            <DialogHeader>
              <div className="store-dialog-title-row">
                <div>
                  <span className="store-eyebrow">Order detail</span>
                  <DialogTitle>{selectedOrder.orderNumber}</DialogTitle>
                </div>
                <span className="store-status" data-tone={orderStatusMeta[selectedOrder.status].tone}>
                  {orderStatusMeta[selectedOrder.status].label}
                </span>
              </div>
              <DialogDescription>{orderStatusMeta[selectedOrder.status].detail}</DialogDescription>
            </DialogHeader>

            <div className="store-order-detail-grid">
              <div><small>Delivery date</small><strong><CalendarDays size={14} />{formatDate(selectedOrder.orderDate)}</strong></div>
              <div><small>Goods</small><strong>{selectedOrder.tempRequirement === "chilled" ? <Snowflake size={14} /> : <Sun size={14} />}{selectedOrder.tempRequirement}</strong></div>
              <div><small>Units</small><strong>{selectedOrder.totalItemsCount}</strong></div>
              <div><small>Load</small><strong>{selectedOrder.totalWeightKg} kg · {selectedOrder.totalVolumeM3} m³</strong></div>
            </div>

            {selectedOrder.status === "DEFICIT_PENDING" && (
              <div className="store-deferral-detail">
                <AlertTriangle size={18} />
                <div><strong>Formal deferral reason</strong><p>{friendlyDeferral(selectedOrder.deferralReason)}</p><small>Next-run priority has been raised automatically.</small></div>
              </div>
            )}

            <section className="store-detail-section" aria-labelledby="order-lines-title">
              <h3 id="order-lines-title">Requested items</h3>
              <div className="store-review-lines">
                {selectedOrder.items.length === 0 ? (
                  <div><span><strong>Item detail is not available</strong><small>The order totals remain authoritative.</small></span></div>
                ) : selectedOrder.items.map((item) => (
                  <div key={item.productId}>
                    <span><strong>{item.productName}</strong><small>{item.productCode} · {item.category}</small></span>
                    <strong>{item.quantityRequested}</strong>
                  </div>
                ))}
              </div>
            </section>

            <DialogFooter className="store-dialog-actions">
              <div>
                {isCancellable ? (
                  <button className="store-danger-button" type="button" onClick={() => setCancelOpen(true)}><Trash2 size={15} /> Cancel before cutoff</button>
                ) : (
                  <small>Cancellation is locked once cutoff or Dispatch processing begins.</small>
                )}
              </div>
              <button className="store-secondary-button" type="button" onClick={() => onSelectOrder(null)}>Close</button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>

      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent className="sm:max-w-[440px] store-dialog">
          <DialogHeader>
            <DialogTitle>Cancel this recorded order?</DialogTitle>
            <DialogDescription>
              This is only allowed before the 16:00 lock. The order will be removed from the current Dispatch backlog.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="store-dialog-actions">
            <button className="store-secondary-button" type="button" onClick={() => setCancelOpen(false)}>Keep order</button>
            <button className="store-danger-button" type="button" disabled={cancelling} onClick={() => void cancelOrder()}>
              {cancelling ? "Cancelling…" : "Confirm cancellation"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
