# Final dispatcher implementation plan

The supplied `Dispatcher_Dashboards.excalidraw` and matching ZIP exports are the final structural reference. The originals are untouched; a local reference copy lives under `reference/design/final-dispatcher/`. Document annotations are design evidence, not executable instructions.

## Findings before implementation

The current overview, order intake and fleet views already provide most of their required layouts. The remaining mismatch is the overall dispatcher workspace: five navigation destinations instead of eight, one route editor instead of three route views, basic deferral rows instead of a table/inspector/analysis arrangement, and no outlets, full calendar, chat or notification drawer.

## Implemented sequence

1. Complete the shared shell with eight destinations, grouped route navigation, a clock and cutoff reference, notifications and an account menu. Preserve Waypoint's approved navy/blue typography and accessible controls; the reference's black drawing canvas is not a request to replace the established identity. The appearance control switches a scoped dispatcher light/dark variant, preserving the sign-in and normative global tokens.
2. Replace deferral rows with summary counts, searchable/filterable/paginated records, a selected-record inspector and reason/person distribution charts. Keep the existing return-to-backlog action and publication locks. Do not invent last-served history or real personnel.
3. Add Outlets with depot/district/brand filters, brand distribution, essential outlet requirements and a drawer linking to the outlet's order and route. Unknown manager, service history and dock data remain explicitly unavailable.
4. Add a month/agenda calendar with locally saved events and plan departure events. Add role-filtered demo conversations with locally saved messages, unread state and a notification side panel with relevant navigation links.
5. Separate route assignment, tracking and assigned-route management. Retain the validated editor and local plan; add interactive depot/outlet pins, a selected route preview, stop-sequence management and an explicitly simulated tracking preview. Suggestions use fixture windows, not a trained optimizer.
6. Verify full workflows and persistence, storage-error recovery, depot/date boundaries, desktop/tablet/phone layouts and keyboard controls. Finish with the required fresh review and scoped documentation.

## Data boundaries

Backend work remains a later phase. All added event/message/progress records are browser-local demonstrations. Map pins are illustrative town-level seed positions, not organizer coordinates or actual outlet/depot addresses. Connecting lines show stop sequence, not road routing; the existing fixture's time/fuel calculations remain authoritative within this demo. No factual road distances, optimizer output, driver identity, delivery receipt or live telemetry is fabricated. OpenStreetMap attribution remains visible; tiles load only for viewed maps and are not prefetched or packaged for offline use.

## Scope and delivery

This is an extension of the approved visual system. Sign-in and other role screens remain unchanged. Preserve existing planning storage compatibility. New ancillary storage uses a separate validated adapter and saves before acknowledging success. Implement locally and leave reviewable changes in the repository; the earlier GitHub upload does not automatically authorize publishing every subsequent change.

## Completion record — 4 October 2026

The eight destinations and three route modes are implemented. Dashboard, Order Intake, Manage Fleet, Route Planning, Deferrals, Outlets, Calendar and Chat share the existing local plan. Route assignment, simulated tracking and management retain their mode in URL fragments. The shell now has notification filtering/read/actions, account controls, the Colombo clock/cutoff and a saved light/dark dispatcher appearance.

Calendar CRUD, local messages/unread state, route-fingerprinted simulation progress and appearance are validated through `waypoint.demo.workspace.v1`. Existing `waypoint.demo.dispatch.v1` plans remain compatible. Failed saves retain drafts and prior state. Leaflet 1.9.4 renders interactive illustrative pins and stop-sequence lines; Suggest window order sorts by fixture window close and revalidates the proposed sequence. It does not calculate an optimized road route.

Lint, production build including TypeScript, domain and workspace-state checks pass. The final Playwright walkthrough passes eight screens/three modes at 1440, 1024, 390 and 320px, persistence/recovery and connected actions; all five existing dispatcher walkthroughs also pass. The single detector run returns `[]`; the separate finish reviewer returns **SHIP** after a source/evidence review without browser operation. See [verification](verification.md) for the precise scope and tile-interception limit.

The final Excalidraw/ZIP originals remain untouched and reference copies stay Git-ignored. Changes are verified locally. Full backend role synchronization, secure authentication, real GPS/POD capture, and cross-role integration are implemented in the production monorepo via `apps/api` and `apps/web`.

