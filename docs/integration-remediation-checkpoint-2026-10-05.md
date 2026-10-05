# Integration remediation checkpoint — 2026-10-05

This checkpoint preserves the active implementation context before integrating the teammate backend branch. It is a continuation guide, not a statement that remediation is complete.

## Completed and compiling

- Added persisted plan/version, loading-manifest, loading-exception, receipt, messages, notifications, audit, and sync-conflict foundations.
- Rechecked authenticated users against current database role and active status on every JWT request.
- Added current-profile read/update support and removed password hashes from operational responses.
- Rebuilt dispatch publication and controlled revision flow with server-calculated route estimates, window checks, daily trip limits, fuel-quota checks, LIFO loading sequence, manifests, notifications, and audit events.
- Added draft/revision trip update and removal endpoints so dispatcher route editing is server-authoritative.
- Rebuilt loader manifest verification, persisted loading exceptions, exception resolution, gate clearance, Trip 2 gating, and scoped manifest access.
- Rebuilt driver readiness/departure/arrival/POD/failure/delay/return state gates and chronological offline mutation replay with persisted conflicts.
- Replaced the driver’s seeded route and simulated sync with the authenticated active trip, completed-trip history, and the real sync endpoint. Browser storage is now only an offline cache/queue.
- Rebuilt store receipt confirmation/discrepancy handling and replaced the store dashboard’s operational demo fallback with the API.
- Added one shared persisted messages service/UI, shared notifications, and shared editable profile tools across role workspaces.
- Loader, driver, dispatcher, and store UI data paths now use the shared authenticated API client.
- Merged `origin/fix/docker-and-tests` after reviewing every changed file. Kept its Docker orchestration and web image, removed the nonexistent automatic seed command, replaced placeholder workflow tests, and rewrote the obsolete local-demo testing guide for the persisted API workflow.
- Regenerated migration `0002_neat_revanche.sql` from the final schema and updated the seed cleanup order for all newly persisted workflow tables.
- API and web production builds, web lint, web typecheck, and all API tests pass at this checkpoint.

## Important merge decisions

- Preserve the authoritative plan-version model and the rule that published plans are immutable; edits require a draft revision.
- Preserve `CLEARED -> DRIVER_READY -> EN_ROUTE -> RETURNING -> COMPLETED` and the loader manifest states.
- Preserve original client timestamps in offline replay and never mark rejected/conflicting events as synced.
- Preserve outlet/depot/user scoping, active-user checks, password-hash redaction, and strict role guards.
- Preserve one shared message/notification/profile architecture instead of role-local duplicates.
- Compare any teammate schema or status changes against the business workflows before combining them. Do not keep parallel fields/endpoints for the same concept.

## Known unfinished work after branch integration

1. Add coherent plan/version/manifest lifecycle seed data for real multi-role browser verification.
2. Add a database-backed lifecycle integration test: store order -> dispatch plan/publish -> loader verify/clear -> driver execute/POD -> store receipt, including revision and offline-conflict scenarios. The new workflow suite currently verifies the public cross-role state/endpoint contract without a live database.
3. Run the generated migration and seed against a fresh PostgreSQL instance, then perform browser QA for every role.
4. Validate the Compose stack on a machine with Docker; Docker is not installed in the current environment.
5. Add the API's missing ESLint dependency/configuration or remove its nonfunctional lint script. Web lint is clean; the API lint command currently cannot find ESLint.
6. Remove remaining “demo” copy and review any purely preference-level browser storage. Operational state must remain server-owned.
7. Review remaining dispatcher calendar/workspace helpers, generated route-preview assumptions, and any obsolete seeded driver data imports/files.
8. Push the reconciled result after verification.

## Current verification status

- `npm run typecheck`: passed.
- `npm run lint`: passed (web).
- `npm run build`: passed (web and API production builds).
- `npm run test:api`: passed, 34/34.
- `npm --prefix apps/api run lint`: unavailable because the API package declares a lint script but does not include ESLint or an ESLint configuration.

## Workspace caution

- `docs.zip` was already deleted in the working tree and is not part of this remediation. Preserve that user-owned state during integration unless explicitly instructed otherwise.
