# Dispatcher design comparison

Checked on 3 October 2026 against `DESIGN.md`, `.impeccable/design.json`, `PRODUCT.md`, `docs/dispatcher-brief.md`, dispatcher source, the original `reference/design/Dis_new.excalidraw`, the attached dispatcher screenshot, and the seven captures listed below. This is an ordinary extension of Waypoint's incumbent world. The user requested the Excalidraw's sidebars, sliders, scrollable sections and pie charts; the correction makes that composition the dashboard landing while retaining the working planning flow in Order intake.

## Incumbent world preserved

| Existing commitment | Implemented evidence |
| --- | --- |
| Public Sans throughout; sentence-case labels | The dispatcher inherits the global font stack. Compact operational headings, small supporting labels and tabular numeric values retain the existing hierarchy. |
| Navy identity, blue actions, light task surfaces | Navigation retains Waypoint navy and its wordmark. Selection, calendar date, range control and primary actions use incumbent blue; white panels sit on the muted background with inherited ink, slate and border colors. |
| Restrained corners and depth | Controls retain the existing control radius (8px). Operational containers use a surface-specific radius (12px), borders and tinted regions rather than a new shadow system. |
| Labeled state and visible focus | Navigation carries accessible names and `aria-current`; drawer and navigation toggles expose expanded state; calendar and category buttons expose pressed state. Chart legends include names and exact counts. Controls retain inherited focus styling. |
| Phone entry and honest demo boundaries | Editable dashboard inputs/selects and dialog fields use at least (16px) on phones. Demo labels, footer and chart note identify synthetic fixtures and browser-local planning. |

Chart-specific teal, amber, slate, purple and mixed-brand colors distinguish local data series. Written legends, counts and the brand table accompany them. These are surface-specific data treatments, not replacement brand primitives or approved global palette additions.

## Excalidraw composition implemented

The original drawing explicitly labels icon/name and icon/tooltip navigation, open/closed drawers, sliders, calendar, category bar, cards, pie charts, donut charts and a scrollable dashboard. The current overview follows those structural instructions in the incumbent light Waypoint treatment. This comparison establishes the observed structure; it does not claim a pixel-identical reproduction of the sketch or that every annotation in the larger drawing is implemented.

- **Navigation:** Desktop starts with a compact icon rail (76px). Its top-bar toggle expands the rail to icon/name navigation (216px at wide desktop, 190px at compact desktop). Dashboard, Order intake, Manage fleet and Deferrals lead to implemented local views. Collapsed buttons retain accessible names and native title tooltips. Expanded navigation restores the wordmark, team context and labels.
- **Overview:** Today's overview presents depot/day controls, review action and five derived metrics: Orders, Assigned, Deferred, Vehicles used and Refrigerated used. Fleet distribution contains two solid pies for Trucks and Vans and a vehicle-type donut. Lower analysis contains allocation-by-brand and daily-order-allocation donuts. A grouped brand bar chart and its numeric table follow inside the same analysis scroll region: five Recharts pie/donut figures plus one bar chart in total.
- **Planning companion:** A separate right region contains a close/open toggle, width slider, calendar, awaiting-allocation queue, All/Fresh/Style/Tech category filters and a fleet action. Queue cards hand their order ID to Order intake: the dashboard clears the brand filter, searches for that ID, selects the order, clears assignment errors and focuses its checkbox after navigation. The drawer starts open at (280px); its native range input adjusts desktop width from (250px) to (390px) in (10px) steps and supports keyboard range interaction. Closing leaves an action rail (48px) with calendar/queue reopening buttons and pending count. Grid width transitions supply the opening/closing movement; this is a width-changing companion rather than an overlay.
- **Scrolling:** The desktop shell is bounded to the viewport (100svh). Heading, controls, top bar and footer remain outside the analysis scroll region. Analysis and companion content have separate, focusable named scroll regions, contained overscroll and stable scrollbar gutters. The scrolled capture exposes the brand chart/table and lower queue cards while the shell stays visible.
- **Planning retained:** Order intake keeps the backlog/selected-trip composition, capacity meters, ordered stops, departure editing, validation and reasoned deferral controls. Wide desktop backlog and trip panels scroll independently; below (1050px) the planning grid stacks with panel heights bounded to (650px). Review and local publication remain available, with publication locking the local plan until reopened.

## Data semantics and responsive adaptation

Overview values derive from the selected depot's synthetic orders/vehicles and the current local plan's trips/deferrals. Assigned orders are distinct order IDs present in trips; used vehicles are distinct vehicles with nonempty trips. Truck/van pies distinguish used, not used and workshop vehicles. Vehicle types distinguish ambient/chilled trucks/vans. Brand allocation classifies each vehicle by its assigned brands, including multiple-brand, unallocated and workshop categories when applicable. Order progress and the bar/table distinguish assigned, awaiting allocation and deferred orders.

The sketch's “Served” metric is deliberately represented as **Assigned**, with “Planned, not delivered” directly beneath it. No delivered/served count is inferred from assignment. The captures show a local Peliyagoda scenario with 6 orders, 2 assigned, 0 deferred, 1 of 4 vehicles used and 1 of 2 refrigerated vehicles used; these are fixture/plan results, not the complete network or live delivery telemetry. Other operating dates use the dashboard's empty state rather than fabricated activity.

At (1200px) and below, the companion is capped at (35vw), metrics use three columns, fleet charts use two columns with the vehicle-type donut spanning both, and lower analysis stacks. At (760px) and below, navigation becomes a wrapping icon/name row, the desktop navigation toggle and width slider are hidden, the mobile wordmark descriptor stays on its own line, and the companion appears above analysis in the page flow. Companion height is bounded to (440px), analysis to (720px); each still scrolls internally. Phone metrics use two columns and fleet figures stack. Below (359px), depot/day controls stack. These are workspace adaptations, not revisions to the portal's global breakpoint contract.

Order intake preserves its earlier responsive delivery-window treatment: a dedicated column where space permits and the same value inline when the column is hidden, with mutually exclusive representations. Fleet inspection, reasoned deferrals and actionable storage-error feedback remain companion workflow behavior.

## Evidence and limits

| Inspected capture | Observed evidence |
| --- | --- |
| `.impeccable/review/overview-desktop.png` | Compact navy icon rail, five metrics, three fleet figures and open calendar/queue companion beside analysis. |
| `.impeccable/review/overview-expanded.png` | Icon/name navigation with wordmark/team context; overview and companion remain adjacent. |
| `.impeccable/review/overview-drawer-closed.png` | Calendar/queue action rail replaces the companion and analysis gains width. |
| `.impeccable/review/overview-scrolled.png` | Brand bars, exact numeric table and synthetic-data note; companion queue is independently scrolled while top controls and footer remain visible. |
| `.impeccable/review/overview-390.png` | Wrapped navigation, adjacent depot/day fields, companion above two-column metrics and stacked fleet charts. |
| `.impeccable/review/overview-320.png` | Mobile wordmark descriptor on its own line; stacked depot/day fields, readable calendar and metrics, single-column fleet figures. |
| `.impeccable/review/overview-order-handoff.png` | Order intake searches for ORD-1044 with All brands, shows that order as the single selected row and exposes assignment controls beside the retained trip workspace. |

This documentation pass inspected source and existing captures; it did not run a browser session or independently verify keyboard interactions, assignment updates, persistence or publication. Source establishes the native keyboard-operable range and order-ID handoff/focus wiring; captures establish visible states. The handoff capture shows search, cleared brand filter and selection; a static capture alone does not establish keyboard focus or successful assignment. Browser/domain verification and the finish-review verdict are recorded separately. No backend integration, optimization, cross-role broadcast or authoritative operational validation is claimed.

The global documents describe the sign-in portal and role scaffolds; their component snippets and breakpoint metadata consequently omit these operational charts and panels. This surface-specific comparison records those additions without promoting them to a global system. No source, global design, browser state or unrelated drift repair was changed by this documentation pass.

`DESIGN.md` and `.impeccable/design.json` were preserved byte-for-byte. SHA-256 was checked before and after this pass:

- `DESIGN.md`: `DF6FD55C23E5FD7E76551BB30FE9B9008DA6E01C762B93DC2D35DC9521780805`
- `.impeccable/design.json`: `9579D8FE4015E5C6F7C9202D8C2AEBAB080FE0AB2EF8FD10D3734C9F89F3F3DC`

## Order intake, fleet and route extension comparison

Compared on 3 October 2026 with the incumbent documents, the extension contract in `docs/dispatcher-brief.md`, `order-intake.tsx`, `fleet-manager.tsx`, `route-schedule.tsx`, `dispatch-operations.ts`, `operations.css`, dashboard integration and the 17 refreshed captures below. This remains an ordinary extension of the user-approved Excalidraw and Waypoint world. The earlier combined backlog/trip composition now belongs to **Route planning**; **Order intake** is a separate requirements table and details panel. This section supersedes the earlier combined-intake description, while the overview comparison remains applicable.

| Binding commitment | Extension evidence |
| --- | --- |
| Navy navigation, blue actions, Public Sans and light work surfaces | All three views inherit the same shell and typography. Selected rows/routes use pale blue, actions use incumbent blue, and bordered white panels retain the existing operational (12px) radius. No global palette or type replacement was introduced. |
| Order requirements precede allocation | Intake exposes All/Pending/Assigned/Deferred counts, order/outlet/district search, brand and priority/ID/weight sorting, five-row pagination, and a horizontally scrollable table containing temperature, access, delivery window, weight/volume and status/vehicle. Details repeat the inspected order's requirements and relevant allocation, route or deferral actions. |
| Sidebars, sliders and bounded scrolling | Desktop intake keeps a separate collapsible details region, initially (320px), adjustable from (280px) to (400px) in (10px) steps; closing leaves a (48px) rail. The table and details scroll independently. Search uses one continuous outer border with a transparent (36px) nested input. |
| Separate fleet inspection and capacity comparison | Current fleet has vehicle search/type/status filters, peak-load meters, daily trip counts, fuel after plan and a linked vehicle inspector. Managed capacities lists each trip's payload, schedule and check result, followed by remaining weekly fuel. Two distribution donuts retain written legends and exact counts. |
| Route selection alongside editing | A horizontally scrollable schedule identifies trip/vehicle, brand/district, stop count, departure/service finish and check status. Selecting it exposes the existing departure, stop sequence, reorder/removal, payload and validation controls. Fleet and intake route links select the corresponding trip. |
| Explicit state and units | Pending/Assigned/Deferred, Allocated/Unallocated/Workshop and Checks pass/check counts are written labels. Payload uses kg/m³ and fuel uses L. Teal/amber status and chart colors remain local data treatments, without becoming global tokens. |

Intake operates on one inspected order: navigation trims route multi-selection to one order, while assignment and deferral callbacks receive that order ID explicitly. The inspected ID survives selection clearing through the details state, and overview handoff prioritizes its selected ID. New-trip eligibility uses the existing validator; a successful save commits the proposed trip and whole order together, then opens its route. Storage failure preserves the prior plan and permits retry. These are source and walkthrough findings, not conclusions established by static captures alone.

Capacity semantics remain precise: vehicle cards show the maximum weight/volume across its trips, capacity rows show each trip's own load, and planned fuel sums across the vehicle's day against the fixture's remaining weekly allowance. The desktop allocation sequence shows three assigned orders across two trips and two of four vehicles allocated; later responsive captures show the restored fixture with two assigned orders on one trip. Those differing states are intentional walkthrough results, not live telemetry. “Assigned” never implies actual delivery, and service-finish times remain labeled demo estimates.

At (1200px) and below, route backlog/editor panels stack, stretch across their container and use bounded scrolling. The (1024px) capture shows the full-width backlog; the browser check also verifies both panels occupy at least 95% of their container without overlap. Fleet inspection stacks below its list at (900px); intake hides its width slider at that breakpoint. At (760px), intake table/details stack, editable text controls use (16px), fleet summaries use two columns, and distribution charts stack. Phone tables preserve their full columns through internal horizontal scrolling; screenshots show only the currently visible columns. At (320px), intake status filters wrap and depot/day controls stack. These remain local workspace adaptations.

### Extension evidence and limits

| Inspected refreshed captures under `.impeccable/review/` | Visible evidence |
| --- | --- |
| `intake-desktop.png`, `intake-assignment.png` | Separate table/details, selected ORD-1043, continuous search border and pagination; scrolled details show the van-only assignment block and eligible WP-008 allocation. |
| `intake-1024.png`, `intake-390.png`, `intake-320.png` | Adjacent tablet details; stacked phone panels, wrapped narrow filters, requirements repeated in details and confined table columns. |
| `fleet-desktop.png`, `fleet-1024.png`, `fleet-390.png`, `fleet-320.png` | Fleet tabs/summary, bordered filter fields, readable peak-load/trip/fuel cards; desktop/tablet inspector alongside the list. Phone captures show the bounded list rather than every lower region. |
| `capacity-desktop.png`, `capacity-390.png`, `capacity-320.png` | Per-trip comparison and weekly-fuel meters; narrow table remains internally scrollable. There is no separate (1024px) capacity capture. |
| `fleet-analysis.png` | Scrolled fuel/distribution region, four-vehicle totals, allocation legend with 2 allocated/1 unallocated/1 workshop, and 2 trucks/2 vans. |
| `routes-desktop.png`, `routes-1024.png`, `routes-390.png`, `routes-320.png` | Schedule selector and selected route, desktop backlog/editor pair, stretched tablet backlog, and phone backlog/editor with inline delivery windows. |

This documentation pass independently inspected source and all 17 final captures; it did not operate a browser or run tests. `docs/verification.md` records the passing production operations walkthrough, planning/recovery/overview regressions, lint, TypeScript, build and domain checks. The operations walkthrough includes four selected route orders becoming one intake selection/one deferral, explicit order-ID mutation, save failure/retry/reload, keyboard drawer controls, focused phone inspectors, no page overflow, phone control sizes and tablet width/non-overlap assertions. Static evidence cannot establish persistence, keyboard behavior, successful mutations or accessibility completeness. The separate finish review recorded in `docs/dispatcher-brief.md` returns **ship** for the resolved intake-selection, search-field and tablet-route fixes, with no observed fix-batch regression; that bounded verdict does not extend to unimplemented backend work.

No backend, geographic map, driver identity, actual delivery event, optimizer, synchronized role update or organizer-data validation is implied. No shipping raster artwork was added; these PNGs are review evidence. Only this comparison document was extended: source, global design documents and unrelated surfaces were untouched. The global documents continue to describe their incumbent portal/scaffold scope rather than claiming these operational patterns as a completed global component library.

Before/after SHA-256 checks for this extension documentation pass preserve `DESIGN.md` (`DF6FD55C23E5FD7E76551BB30FE9B9008DA6E01C762B93DC2D35DC9521780805`) and `.impeccable/design.json` (`9579D8FE4015E5C6F7C9202D8C2AEBAB080FE0AB2EF8FD10D3734C9F89F3F3DC`) byte-for-byte.

## Overview refinement comparison

Compared on 3 October 2026 with `PRODUCT.md`, the preserved design documents, the updated overview brief, `dispatch-overview.tsx`, `overview.css`, `scripts/verify-dispatch-polish.js` and the seven fresh production captures below. The supplied refinement scene is archived at `reference/design/dispatcher-refinement.excalidraw`. This is ordinary code-led refinement within Waypoint's incumbent world: navy navigation, Public Sans, blue actions, light bordered work surfaces, explicit units and synthetic-plan disclosures remain. No new identity or shipping raster was introduced.

This section supersedes the earlier overview's chart placement and phone companion-first description. Five metrics and all existing chart meanings remain. Compact figure/legend pairs use the available analysis width; container queries change fleet figures to two columns at (800px) and one at (550px), with Vehicle types spanning the two-column row. Expanded navigation and a wide companion can therefore trigger reflow even on a wide viewport. Written labels and exact counts remain beside the figures rather than being replaced by color alone.

| Refinement | Evidence and meaning |
| --- | --- |
| Actionable carry-over hierarchy | The notice derives carry-over/pending/trip counts from the selected depot's local plan. Review priority passes the carry-over order ID to Intake; after allocation, the neutral notice says no carry-over orders await allocation and offers Open intake. |
| Queue requirements and priority | Cards repeat payload, chilled/ambient requirement, access and delivery window. The filtered queue sorts carry-over first, then earliest window end; these are planning requirements rather than delivery telemetry. |
| Companion resizing | A labeled vertical separator exposes its current (250–390px) value, supports pointer dragging and Arrow/Home/End keys, and shares (10px) increments with the retained native range. Both desktop mechanisms are hidden on phones. |
| Phone hierarchy and calendar state | Analysis precedes the companion in the page flow. Analysis remains bounded to (720px), the companion to (440px), with independent scrolling. Calendar remounting is keyed to the selected operating month so external month changes align its state. |

### Fresh refinement evidence

| Inspected capture under `.impeccable/review/` | Visible evidence |
| --- | --- |
| `polish-1440.png` | Carry-over notice, five metrics, compact chart/legend pairs, open calendar companion and resize grip. |
| `polish-1024.png` | Three-column metric arrangement and container-driven single-column fleet figures beside the companion. |
| `polish-390.png`, `polish-320.png` | Readable wrapped priority copy/action and metrics before the companion; stacked narrow controls at (320px). The bounded analysis reveals its first fleet figure, not every lower chart at once. |
| `polish-expanded.png` | Expanded navy navigation and maximum-width companion; two fleet columns with Vehicle types spanning the following row, keeping legends inside the analysis panel. |
| `polish-analysis.png` | Independently scrolled brand bars, written key, exact values table and synthetic-plan note while the calendar stays visible. |
| `polish-closed.png` | Closed companion rail and neutral no-carry-over notice after allocation; metrics reflect three assigned orders across two trips. |

The separate reviewer scored the sole material chart-containment finding **resolved**, observed no regression from the fix, and returned **ship at scored-fix scope**. That verdict is bounded to the finding. The latest production polish walkthrough passes including expanded-panel legend containment; overview and operations regressions passed before the final CSS-only container reflow. Lint, TypeScript and build pass, and the detector's single run returned `[]`. This documentation pass inspected source and the seven fresh captures, without independently operating a browser or rerunning tests. Supplementary earlier middle/mobile analysis captures show the same lower content but are not represented as fresh final-build verification.

Static captures establish visible states, not successful mutations, persistence, keyboard coverage or accessibility completeness. Maps, tracking, chat, outlets and notifications in the larger scene remain later scope. Backend integration, optimizer results, real coordinates, actual delivery events and synchronized role updates remain unimplemented. Assigned continues to mean planned, not delivered. These intentional boundaries do not weaken the bounded containment verdict.

Only `docs/dispatcher-brief.md`, `docs/dispatcher-design-check.md` and `docs/verification.md` were changed in this documentation pass. Before/after SHA-256 evidence preserves the normative tokens and sidecar byte-for-byte:

- `DESIGN.md`: `DF6FD55C23E5FD7E76551BB30FE9B9008DA6E01C762B93DC2D35DC9521780805`
- `.impeccable/design.json`: `9579D8FE4015E5C6F7C9202D8C2AEBAB080FE0AB2EF8FD10D3734C9F89F3F3DC`
