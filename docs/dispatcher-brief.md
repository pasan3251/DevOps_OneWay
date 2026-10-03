# Dispatcher planning workspace

Mode: Operate. Target: `apps/web/src/features/dispatcher/dispatcher-dashboard.tsx`.

Extends the initialized dispatcher role landing with the planning workspace specified in the frontend plan. The incumbent Waypoint navy/blue, Public Sans, light controls, borders and focus treatments remain binding. This is an implementation of the already specified backlog / selected trip / contextual validation structure, not an identity replacement or open composition workshop.

THESIS: Turn a depot backlog into an explainable daily plan.

OWN-WORLD: Inherit DESIGN.md; navy navigation, white work surface, blue selection and actions, compact readable operational data.

STORY: Choose depot and day, inspect carry-over orders, assign whole orders to an eligible vehicle, resolve blocking checks, record deferrals, review the demo publication.

FIRST VIEWPORT: The user's Excalidraw is now the structural authority: collapsible icon/label navigation, Today’s overview with five summary metrics, fleet pies and vehicle-allocation donut, independently scrollable analysis, and a right calendar/category/action drawer. Route Planning retains the backlog/trip workflow; Order Intake is the separate requirements and allocation view described below. Phone layouts stack the companion and analysis regions with bounded internal scrolling.

FORM: User-specified Excalidraw structure and attached dispatcher screenshot; no randomized composition applies. Keep Waypoint's incumbent palette/type. No shipping raster artwork.

SIGNATURE: Selecting a trip makes its vehicle, ordered stops, payload and blocking checks visible together. Assignment changes both backlog and trip; publication locks that local plan until reopened.

The user specifically requested sidebars, sliders, scrollable sections and pie charts. Navigation expands/collapses; the calendar/queue drawer opens/closes and its desktop width is adjustable with a keyboard-accessible range slider. Pie/donut and brand bar charts derive from the local plan; legends and a brand data table expose exact values. Preserve “assigned” versus actual “served” semantics.

FINISH: Bounded desktop/phone captures, browser and domain checks, finish-review verdict and documentation comparison with the incumbent system.

## Data and scope

All orders, vehicles, travel times, fuel and delivery windows are independent synthetic fixtures, visibly labeled. No real CSV, geolocation, optimization, telemetry, or cross-role broadcast is claimed. The demo date is 3 October 2026, Asia/Colombo. Other dates show an honest empty state.

Implement planning, fleet inspection and reasoned deferral views inside the dashboard; do not expose dead navigation for future monitoring/reconciliation pages. Preserve the existing sign-in destination `/workspace/dispatcher`. Store demo plans locally through a typed adapter, with recoverable storage errors. Backend authentication and authoritative validation remain future work.

## Order intake, fleet and route extension

Mode: Operate; extend the user-approved Excalidraw structure and Waypoint world.

THESIS: Keep order inspection, vehicle capacity and route editing distinct but connected to one local plan.

OWN-WORLD: Inherit navy navigation, Public Sans, blue actions, white panels and explicit units from DESIGN.md.

STORY: Inspect an order, allocate to an existing or eligible new trip, inspect that vehicle, then edit the route and review its checks.

FIRST VIEWPORT: Order Intake has status tabs, search/brand/sort, a horizontally scrollable requirements table, pagination and a collapsible adjustable details panel. Manage Fleet has Current Fleet/Managed Capacities tabs, summary metrics, vehicle cards with peak load/fuel/trips, an inspector and distribution charts. Route Planning has a trip schedule selector above the existing backlog and editable stop sequence.

FORM: User-supplied Excalidraw is the structural authority; this is an extension, with no new identity or composition tournament. Use Assigned rather than Served until delivery events exist. Capacity stays per trip; fuel shares the vehicle's planned day. No invented drivers, coordinates or optimization output.

SIGNATURE: Allocating an eligible new trip saves the trip and whole order atomically; its route, fleet metrics and overview update together. Use native keyboard controls and bounded independent scrolling.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.

## Finish record

Final bounded verdict: ship for the three scored extension fixes. Single-order Intake assignment/deferral explicitly target the inspected order, and entry from bulk route selection retains one order. Tablet route panels fill their stacked container; nested search controls have uninterrupted borders. All three were scored resolved by the finish reviewer, with no regression observed in the fix batch. Lint, TypeScript, production build, domain checks and the operations/planning/recovery/overview browser walkthroughs pass. See `docs/verification.md` for test scope and `docs/dispatcher-design-check.md` for comparison with the preserved design system.

## Overview refinement — updated Excalidraw

Scope: polish the existing dispatcher overview using `reference/design/dispatcher-refinement.excalidraw` (the supplied `Untitled-2026-06-13-1801.excalidraw`). Preserve the approved Waypoint identity, five summary metrics, fleet pies, allocation analysis, collapsible navigation, calendar and independently scrollable panels. The drawing's maps, delivery tracking, chat, outlets and notification concepts describe later features; they are not part of this overview refinement.

Direction: improve the operational hierarchy with an actionable carry-over notice, compact chart/legend arrangements and clearer queue requirements. Keep both pointer and keyboard resizing, including the existing width slider. On phones, analysis precedes the companion so the overview is visible before the calendar. Counts and priority states derive from the shared local plan. No new backend, telemetry or geographic claims.

Verification: `scripts/verify-dispatch-polish.js` covers pointer/keyboard resizing, slider synchronization, priority-to-intake handoff, queue requirements, depot changes and four viewport widths. Review and final documentation follow the production captures.

### Refinement finish record

Implemented: a carry-over notice hands its explicit order ID to Intake; compact chart/legend pairs reflow with analysis-container width; the companion adds a pointer/keyboard separator alongside the synchronized native range. Queue cards repeat chilled/ambient, van-access and delivery-window requirements, ordered by carry-over then window end. Phone analysis precedes the calendar companion. Calendar state is keyed to the selected operating month.

Final bounded verdict: **ship at scored-fix scope**. The reviewer scored the sole material finding, fleet-legend overflow with expanded navigation and maximum companion width, **resolved**, with no regression observed from that fix. The refreshed expanded capture uses two fleet columns with Vehicle types spanning the next row; refreshed (390px)/(320px) captures remain readable. This verdict covers the scored containment fix, not whole-surface perfection or later Excalidraw features.

The latest production polish walkthrough passes, including the added expanded-panel legend-containment assertion; lint, TypeScript and build pass. Overview and operations regressions passed before the final CSS-only container reflow. The existing design documents remain byte-for-byte preserved; comparison, hashes and evidence limits are recorded in `docs/dispatcher-design-check.md` and `docs/verification.md`. Review PNGs are evidence rather than shipping raster assets.
