# Waypoint

Delivery planning for Waypoint Fresh, Style, and Tech. This repository contains the frontend sign-in portal, an eight-view dispatcher demo workspace, and landing scaffolds for the other roles.

## Run locally

Requires Node.js 20.9 or later and npm.

```sh
npm run setup
npm run dev
```

Open http://localhost:3000. The root redirects to `/login`.

```sh
npm run lint
npm run typecheck
npm run build
npm start
```

The browser walkthrough and verified scope are documented in [docs/verification.md](docs/verification.md).

## Current scope

The responsive sign-in portal supports email or employee ID, password visibility, field validation, remember-me behavior, password help, and four demo roles. Use a role button to fill its demonstration credentials, then sign in. Employee IDs are `DISP001`, `LOAD001`, `DRIV001`, and `STORE001`; the demo password is `waypoint-demo`.

Authentication is a **frontend demonstration**, not secure backend authentication. The demo adapter stores only a role session with an expiry, never the password. Remembered sessions use local storage for seven days; other sessions use session storage with a twelve-hour expiry. Sign-out clears both. Loader, driver and store-manager landing pages are scaffolds for the next implementation step.

## Dispatcher dashboard

Sign in as Dispatcher to open `/workspace/dispatcher`. Today’s overview follows the supplied Excalidraw's layout: collapsible navigation, fleet pie charts, vehicle-allocation and order-progress donuts, scrollable brand analysis, and a calendar/queue drawer. The drawer can collapse or resize using its keyboard-accessible width slider. Charts derive from the same locally saved plan; legends and the brand table expose their counts.

The demo day is 3 October 2026. Choose Peliyagoda or Kandy, then use the connected dispatcher views:

- **Order intake** (`#planning`): inspect a paginated requirements table, filter by status/brand, search and sort. Open an order's adjustable details panel to assign it to an existing trip, allocate an eligible new trip, or record a deferral. Assigned orders link to their route; deferred orders can return to the backlog.
- **Manage fleet** (`#fleet`): filter and inspect vehicles, compare peak per-trip weight/volume, daily trips and estimated fuel. Current Fleet includes distribution charts and route links; Managed Capacities compares trip loads, schedules, checks and fuel after the plan. Workshop vehicles cannot be allocated.
- **Route planning** (`#routes`): select a route from the schedule, create a trip, assign whole backlog orders, choose compatible vehicles, change departure, reorder/remove stops and resolve checks before review.
- **Deferrals** (`#deferrals`): search/filter records, inspect the reason and decision note, compare distributions and return eligible orders to the backlog.
- **Outlets** (`#outlets`): inspect the fixture directory by depot/district/brand, review outlet requirements and open linked orders or routes. Manager, service history and dock details are unavailable.
- **Calendar** (`#calendar`): view month/agenda layouts, inspect plan departures and create, edit or delete local planning events.
- **Chat** (`#chat`): filter demo conversations by role, save local messages and mark sample messages read. Messages stay in this browser and are not delivered to people.

Route Planning also includes **Track deliveries** (`#routes/tracking`) and **Manage assigned routes** (`#routes/manage`). Leaflet 1.9.4 maps support interactive illustrative pins; connecting lines show stop sequence, not road directions or factual ETAs. Tracking advances a local simulation, with saved progress invalidated when the route changes; it provides no real GPS or proof of delivery. The window-order suggestion sorts fixture windows and is not an optimizer.

The shell includes an Asia/Colombo clock, the 16:00 cutoff reference, a searchable notification drawer with local read state and navigation actions, an account menu and a persistent scoped light/dark appearance. Calendar, chat, read state, simulated progress and appearance use the separate typed key `waypoint.demo.workspace.v1`; unsuccessful saves preserve drafts and expose retry feedback.

Assignment checks explain incompatible capacity, temperature, access, depot, brand/district, fuel and schedule choices. Carry-over orders are flagged; deferrals require a reason and decision note. Each view reads the same saved plan, and the current view survives reload through its URL fragment. Phone inspection actions reveal and focus their details panel.

Publication requires every depot order to be assigned or deferred and all trips to pass demo checks. Publishing saves and locks the **local preview**; reopen it to continue editing. No real manifests or notifications are sent. Plans survive reload in browser local storage under `waypoint.demo.dispatch.v1`; sample fixtures live in `apps/web/src/features/dispatcher/planning.ts`. Other dates show an empty state rather than fabricated orders.

All fixture quantities, fleet data, fuel and travel timings are synthetic. The 30-minute return/reload allowance and 20-character repeated-deferral justification are demo policies. These frontend checks do not replace authoritative backend validation or the organizer's checker. See [dispatcher brief](docs/dispatcher-brief.md) and [verification](docs/verification.md).

The `AuthService` interface in `apps/web/src/features/auth/auth-service.ts` is the replacement boundary for the future backend. Backend authorization must be implemented before production use. Password help explains that account recovery becomes available with that backend; it does not pretend to send an email.

## Repository layout

```text
apps/web/       Next.js + TypeScript frontend
docs/           Active implementation plan and screen briefs
reference/      Local booklet, planning notes, Excalidraw and review archive
PRODUCT.md      Product context
DESIGN.md       Implemented visual system
```

`reference/` is preserved locally and excluded from Git. No planning files were deleted. The original Excalidraw in Downloads is untouched; a reference copy is archived here. Competition datasets have not been supplied.

## Design reference

The sign-in form follows `reference/design/Dis_new.excalidraw`. The user selected the existing form structure with an added branded side panel. The panel keeps Waypoint's blue identity and explains the shared delivery workflow. Phone layouts prioritize the form.

## Competition integration still required

Operational role screens, authoritative allocation validation, backend authentication, database seeding, offline delivery reconciliation, complete Docker Compose stack, deployment, and judge walkthrough are future work. This frontend stage does not yet meet the complete Hackathon submission requirements.

## AI assistance

Codex assisted with repository organization, framework initialization, frontend implementation, and verification. The supplied Excalidraw and project notes are the team's design references. A full competition disclosure will be maintained under `docs/` as development continues.
