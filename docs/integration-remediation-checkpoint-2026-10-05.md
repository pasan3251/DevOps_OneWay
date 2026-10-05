# Integration remediation checkpoint — 2026-10-05

This checkpoint preserves the active implementation context before integrating the teammate backend branch. It is a continuation guide, not a statement that remediation is complete.

## Branch integration and recovery point

- Local branch: `main`. Pre-merge remediation was committed at `00ec6fd`.
- Newest teammate branch on the verified remote: `origin/fix/docker-and-tests`, commit `103a9e6` (with `e4d0251` before it).
- Reconciled merge: `4fe451a`, pushed to `origin/main`. There were no textual conflicts; semantic corrections are listed below.
- The teammate branch contains Docker setup and workflow-test/documentation changes, not a broad set of backend service fixes. No newer teammate branch was returned by the final fetch.
- Origin now uses the repository's relocated URL: `https://github.com/pasan3251/DevOps_OneWay.git`.
- Safety stash remains `pre-teammate-merge generated migration and user docs.zip state`. Do not pop it: its generated migration is obsolete, and `0002_neat_revanche.sql` is the reconciled migration.

## Resumed remediation after the merge

- Dispatcher tracking now polls persisted trip, loading-exception, POD, receipt, delay and failure records. Removed simulated route-progress controls and fabricated intermediate truck positions.
- Route maps use actual outlet/depot coordinates and explicitly show stop sequence rather than claiming road-navigation directions. Recorded driver position is shown only when server telemetry has a timestamp.
- Dispatcher calendar and Loader operating dates no longer depend on the October 3 fixture date. Order listing includes the actual outlet depot relation, preventing Kandy orders being labeled Peliyagoda.
- Removed obsolete seeded driver data, duplicate sample account/notification controls, and browser-owned operational progress/read state. Personal calendar notes and theme remain legitimate preferences.
- Driver POD and exception capture now open the real camera/file picker. Removed fabricated evidence images and the preselected claim that carton counts had been verified.
- Plan revision revokes previous clearance/readiness and stales the old manifest atomically. Already-departed/completed work cannot be cloned into a new execution draft. Conditional readiness/departure updates reject concurrent revocation.
- Real database tests exposed and fixed missing Store Manager notification recipients: stores are scoped by outlet, not a warehouse depot field. Central dispatch receives events from both depots.
- Offline workflow-state rejections are returned as `CONFLICT`, remain unsynced, and have persisted conflict records.
- Corrected development seed fuel allowances, Fresh receiving windows, item/totals consistency, missing item lines and Colombo dates. Ran migration and seed only against a disposable local test database.
- Added a separate PostgreSQL integration suite using the compiled production Nest application, real authentication, HTTP endpoints, Drizzle persistence and guarded local-only database configuration.

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

1. Run separate authenticated multi-role browser verification against an isolated API/database. Automated lifecycle proof is now available, but browser interaction is not yet verified for this stage.
2. Replace the Driver's remaining predefined outlet/depot GPS submissions with actual device geolocation, including truthful denied/unavailable states. POD and depot-return coordinates currently still need this correction.
3. Namespace Driver offline cache/queue by authenticated user and review durable queue handling, local storage failures, stale-route conflicts and retry behavior across account switches.
4. Expand database integration coverage for dispatcher deferral/priority rollover, two-trip gating, late ETA, van-only routing, reefer overflow, mall windows and concurrency beyond the currently tested lifecycle paths.
5. Finish loading exception resolution choices (ship partial / replacement hold / emergency deferral) with authoritative quantity, payload and ETA changes; the current text resolution does not implement all three alternatives.
6. Recheck route time budgets against the source rules: fuel/distance must include depot return, while the documented shift-budget formula excludes that return allowance. Review publication-time revalidation and loader/revision concurrency.
7. Review remaining dispatcher directory/forecast helpers: the current outlet directory is order-backed, not a full network directory. Do not label estimated or derived information as actual telemetry.
8. Validate full Compose image builds/startup. Docker is installed and running; `docker compose config --quiet` passed. A stuck image-download lock was safely cleared before the PostgreSQL tests.
9. Add the API's missing ESLint dependency/configuration or remove its nonfunctional lint script. Web lint is clean; the API lint command currently cannot find ESLint.
10. Review evidence image sizes/upload limits and remaining development-only controls before browser QA and production release.

## Current verification status

- `npm run typecheck`: passed.
- `npm run lint`: passed (web).
- `npm run build`: passed (web and API production builds).
- `npm run test:api`: passed, 47/47.
- `npm --prefix apps/api run test:integration`: passed, 4/4 against real PostgreSQL. Covers the complete four-role lifecycle, early-window holding, controlled revision/re-verification, loading damage, chronological offline events/deduplication/conflicts, failed delivery, receiving discrepancy, messages/profile, unauthorized access and deactivated users.
- Fresh PostgreSQL migration and corrected development seed: passed.
- `npm --prefix apps/api run lint`: unavailable because the API package declares a lint script but does not include ESLint or an ESLint configuration.

## Workspace caution

- `docs.zip` was already deleted in the working tree and is not part of this remediation. Preserve that user-owned state during integration unless explicitly instructed otherwise.
- Disposable PostgreSQL container: `waypoint-remediation-postgres-20261005`, database `waypoint_integration_test`, bound to `127.0.0.1:55432`. Stopped after verification; retained for continuation. Only task-created test/seed records were changed. No existing project database was migrated, cleared or seeded.
- To resume database tests, start that container and set `TEST_DATABASE_URL` to `postgresql://waypoint_test:waypoint_test_only@127.0.0.1:55432/waypoint_integration_test`. The test suite rejects nonlocal hosts and any database name other than `waypoint_integration_test`.
