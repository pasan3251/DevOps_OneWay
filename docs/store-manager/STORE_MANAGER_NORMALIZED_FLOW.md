# Store Manager Dashboard — Normalized Operational Flow

## Final information architecture

The Store Manager workspace has three top-level destinations. Each destination owns one business responsibility and the page itself uses the primary vertical scrollbar.

1. **Today** — cutoff awareness, the standard four-step flow, operational counts, next arrivals, formal deferrals, revised ETAs, and partial-manifest notices. It summarizes work without duplicating the full order or delivery records.
2. **Orders** — the authoritative replenishment register. It shows the lifecycle from recorded demand through Dispatch decision, assignment, transit, deferral, delivery, or cancellation.
3. **Receiving** — the authoritative delivery timeline. It shows each vehicle movement, receiving-window context, ETA and manifest changes, POD, and post-handover discrepancy claims.

**Create order** is a drill-down from Today or Orders, not a fourth navigation destination. It uses one controlled path: delivery context → items → review and submit. There is exactly one final submission action.

## Removed redundancy and invalid behavior

- Removed the outlet switcher. The authenticated Store Manager is bound to one assigned outlet by the API.
- Removed duplicate “New Order” navigation and duplicated submit actions.
- Removed full delivery cards from Today; Today now provides only arrival and exception summaries.
- Removed cancellation for `QUEUED_NEXT_RUN`. A post-cutoff order is already locked.
- Removed generic raw-status presentation. Store-facing labels explain the current Dispatch decision and next expected action.
- Kept routing, vehicle selection, deferral resolution, and partial-shipment decisions outside the Store Manager workspace because they belong to Dispatch.
- Restricted discrepancy creation to a completed delivery and its matching outlet/order/stop.

## Business rules represented in the interface

- The operational cutoff is 16:00 Asia/Colombo.
- Before cutoff, the earliest delivery date is the next operating cycle; after cutoff it is the following run.
- Fresh may submit one ambient and one chilled order for the same date. Style and Tech are ambient-only.
- An order is planned as a whole; the Store Manager does not split it across vehicles.
- Dispatch must publish either a vehicle/ETA or a formal deferral reason.
- Revised ETA and partial-manifest notices are receiving information, not chat messages.
- POD and discrepancy actions become available only after delivery handover.

## Backend enforcement

- Store-manager create/list/read/cancel operations are scoped to `user.outletId`.
- The API rejects delivery dates earlier than the date allowed by the live Colombo cutoff.
- Cancellation requires `ORDER_RECORDED`, `isCutoffLocked = false`, and a live time before 16:00.
- A discrepancy requires a delivered order. When a stop is supplied, it must match the order, outlet, and delivered stop.

## Responsive behavior

- Desktop uses a collapsible navigation rail and one scrollable content surface.
- Tables use TanStack Table and become readable record cards on narrow screens.
- Tablet and mobile layouts remove fixed-height content traps, avoid page-level horizontal overflow, and keep form controls at a mobile-safe font size.

