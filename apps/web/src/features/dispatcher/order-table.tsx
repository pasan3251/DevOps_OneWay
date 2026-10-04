"use client";

import { useMemo } from "react";
import {
  createColumnHelper,
  tableFeatures,
  useTable,
} from "@tanstack/react-table";
import { ArrowRight, Snowflake, Sun } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatTime, type Order, type Plan } from "./planning";
import { orderStatus, type OrderStatus } from "./dispatch-operations";

const orderTableFeatures = tableFeatures({});
const columnHelper = createColumnHelper<typeof orderTableFeatures, Order>();

export function orderStatusLabel(status: OrderStatus) {
  if (status === "Pending") return "Awaiting decision";
  if (status === "Assigned") return "Planned";
  return "Deferred";
}

export function OrderTable({
  rows,
  plan,
  published,
  selectedOrderId,
  selectedIds,
  onSelect,
  onInspect,
}: {
  rows: Order[];
  plan: Plan;
  published: boolean;
  selectedOrderId?: string;
  selectedIds: string[];
  onSelect: (id: string, checked: boolean) => void;
  onInspect: (id: string) => void;
}) {
  const columns = useMemo(
    () =>
      columnHelper.columns([
        columnHelper.display({
          id: "identity",
          header: "Order / outlet",
          cell: ({ row }) => {
            const order = row.original;
            const state = orderStatus(order.id, plan);
            return (
              <div className="intake-order-identity">
                <input
                  id={`dispatch-order-${order.id}`}
                  type="checkbox"
                  aria-label={`Select ${order.id}`}
                  disabled={published || state !== "Pending"}
                  checked={selectedIds.includes(order.id)}
                  onChange={(event) => onSelect(order.id, event.target.checked)}
                />
                <div>
                  <span className="order-id">
                    {order.id}
                    {order.carryOver && (
                      <Badge variant="outline" className="carry-over-badge">
                        Carry-over
                      </Badge>
                    )}
                  </span>
                  <strong>{order.outlet}</strong>
                  <small>{order.district}</small>
                </div>
              </div>
            );
          },
        }),
        columnHelper.accessor("chilled", {
          header: "Temperature",
          cell: ({ row }) => (
            <span className="temperature-label">
              {row.original.chilled ? (
                <Snowflake size={14} aria-hidden="true" />
              ) : (
                <Sun size={14} aria-hidden="true" />
              )}
              {row.original.chilled ? "Chilled" : "Ambient"}
            </span>
          ),
        }),
        columnHelper.accessor("vanOnly", {
          header: "Access",
          cell: ({ row }) =>
            row.original.vanOnly ? "Van only" : "Truck / van",
        }),
        columnHelper.accessor("window", {
          header: "Delivery window",
          cell: ({ row }) =>
            `${formatTime(row.original.window[0])}–${formatTime(row.original.window[1])}`,
        }),
        columnHelper.display({
          id: "payload",
          header: "Payload",
          cell: ({ row }) => (
            <>
              {row.original.kg.toLocaleString()} kg
              <small>{row.original.m3} m³</small>
            </>
          ),
        }),
        columnHelper.display({
          id: "status",
          header: "Status / vehicle",
          cell: ({ row }) => {
            const order = row.original;
            const state = orderStatus(order.id, plan);
            const trip = plan.trips.find((item) =>
              item.orderIds.includes(order.id),
            );
            return (
              <>
                <Badge
                  variant="outline"
                  className={`operation-status status-${state.toLowerCase()}`}
                >
                  {orderStatusLabel(state)}
                </Badge>
                <small>{trip?.vehicleId ?? "Not allocated"}</small>
              </>
            );
          },
        }),
        columnHelper.display({
          id: "actions",
          header: () => <span className="sr-only">Actions</span>,
          cell: ({ row }) => (
            <button
              className="dispatch-text-button"
              aria-label={`View ${row.original.id}`}
              onClick={() => onInspect(row.original.id)}
            >
              View <ArrowRight size={14} aria-hidden="true" />
            </button>
          ),
        }),
      ]),
    [onInspect, onSelect, plan, published, selectedIds],
  );
  const table = useTable({
    features: orderTableFeatures,
    data: rows,
    columns,
  });

  return (
    <Table className="operations-table intake-table">
      <TableCaption className="sr-only">
        Order requirements and planning decisions
      </TableCaption>
      <TableHeader>
        {table.getHeaderGroups().map((group) => (
          <TableRow key={group.id}>
            {group.headers.map((header) => (
              <TableHead key={header.id}>
                {header.isPlaceholder ? null : (
                  <table.FlexRender header={header} />
                )}
              </TableHead>
            ))}
          </TableRow>
        ))}
      </TableHeader>
      <TableBody>
        {table.getRowModel().rows.map((row) => (
          <TableRow
            key={row.id}
            className={
              selectedOrderId === row.original.id ? "is-selected" : undefined
            }
          >
            {row.getAllCells().map((cell) => (
              <TableCell key={cell.id}>
                <table.FlexRender cell={cell} />
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
