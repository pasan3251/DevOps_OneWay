# Waypoint product context

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Requested: recommend a suitable frontend stack before implementation. The team confirmed experience when asked about Next.js/React. Selected and initialized: Next.js App Router, TypeScript, Tailwind CSS, shadcn/ui. The frontend scaffold is in apps/web. Sign-in uses an explicitly labeled demo adapter until the backend is connected. Backend preference remains unspecified.

## Users

- Dispatcher: large-screen planning office; builds validated plans, explains deferrals, monitors execution.
- Loader: shared warehouse tablet or terminal; verifies reverse-stop loading and reports shortfalls. Judges also assess this role on phone-sized screens.
- Driver: personal phone, intermittent connectivity; records stops and proof of delivery while safely stopped.
- Store manager: outlet desktop or phone; places orders, reviews ETAs or deferrals, confirms receipt and reports discrepancies.

## Product Purpose

Connect ordering, planning, loading, delivery, and receipt across four roles. Make capacity decisions explainable and preserve delivery records through connectivity loss.

## Operating Context

The fictional Sri Lankan network has 120 outlets across Fresh, Style, and Tech; Peliyagoda and Kandy depots; and 60 vehicles. There are 16 chilled-capable vehicles, including four refrigerated vans. Eight vehicles in total are vans. Vehicle home depot, temperature, access, weight, volume, time windows, two-trip limit, and weekly fuel quotas constrain planning. Use calendar operating dates and Asia/Colombo time. Orders close at 16:00.

## Capabilities and Constraints

Frontend-first development is explicitly requested; backend work follows. The Hackathon nevertheless requires an integrated application, seeded database/accounts, offline recovery, public deployment, and Docker Compose by October 4, 2026, 23:59 Asia/Colombo.

The booklet permits manual allocation with validation. Datathon models are separately judged and do not need to be integrated into the Hackathon build. Team workflow notes add reverse-stop loading, manifest versioning, structured deferral reasons, and offline conflict review. Treat team-selected thresholds as policies, not organizer requirements.

## Evidence on Hand

- `reference/planning/About the project/Challenge Booklet.pdf`: competition authority.
- `reference/planning/About the project/project_overview.md`: product and architectural intent.
- `reference/planning/About the project/primary_workflow.md` and `.mermaid`: lifecycle and role connections.
- `reference/planning/About the project/secondary_workflows (1).md`: scoped core, alternative, and failure workflows.
- `reference/planning/About the project/system_business_logic_operational_constraints.md`: detailed rules and team policies.
- Attached Gemini transcript: candidate component libraries, not an approved dependency list.
- Netlify prototype: reviewed as a reference; user says it is not the submitted Day 5 design.

No source application, CSV datasets, validation script, or actual Day 5 submission was initially supplied. The frontend is now initialized in apps/web. A copy of the subsequently supplied Excalidraw is in reference/design/Dis_new.excalidraw. Do not invent dataset coordinates, stock catalogs, telemetry, or model outputs.

## Product Principles

1. A decision in one role must have an observable consequence in the others.
2. Distinguish order acceptance, allocation, delivery, receipt, and synchronization.
3. Explain blocked assignments and deferrals with the affected order and actionable reason.
4. Preserve field records locally before acknowledging successful capture.
5. Follow the booklet where planning notes disagree; record significant design departures.

## Accessibility & Inclusion

Phone usability for loader and driver is an explicit judging requirement. Use labeled status indicators, touch-friendly controls, readable text, keyboard access, and visible recovery feedback. Do not rely on color alone to communicate risks.
