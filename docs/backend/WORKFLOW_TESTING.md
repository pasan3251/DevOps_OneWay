# Waypoint Logistics — cross-role workflow verification

This guide verifies one authoritative record as it moves through Store Manager, Dispatcher, Loader, Driver, and back to Store Manager. Operational state is stored by the API in PostgreSQL; it is not passed between roles through browser storage.

## Environment

1. Start PostgreSQL, Redis, the API, and the web app with `docker compose up --build`.
2. Apply the current migrations before testing. The Compose `api-init` service performs migration automatically.
3. Seed a disposable development database explicitly with `npm run db:seed`. The seed is destructive and is intentionally not run on every container start.
4. Open `http://localhost:3000`.

The development seed password is `Password123!` for these accounts:

- Dispatcher: `dispatcher@waypoint.lk`
- Loader: `loader.cmb@waypoint.lk`
- Driver: `driver.sunil@waypoint.lk`
- Store Manager: `manager.fresh1@waypoint.lk`

Use separate browser profiles only if each profile signs in independently. JWTs and UI preferences are browser-local; orders, plans, manifests, route progress, receipts, messages, notifications, and audit events are server-owned.

## 1. Store Manager — create demand

1. Sign in as the Store Manager.
2. Create one eligible ambient or chilled order for the assigned outlet and operating day.
3. Verify that a duplicate order for the same outlet/date/temperature stream is rejected.
4. Verify that the order appears in Orders with its API status and that Dispatch receives an order-created notification.

Expected authoritative state: `ORDER_RECORDED` (or `QUEUED_NEXT_RUN` when submitted after cutoff according to the business rule).

## 2. Dispatcher — allocate and publish

1. Sign in as Dispatcher and select the matching depot and operating day.
2. Allocate orders only to a vehicle and driver from the same depot.
3. Verify that refrigeration, van-only access, capacity, receiving windows, daily trip count, time budgets, and weekly fuel quota are enforced by the API.
4. Reorder stops or change the vehicle/departure and confirm the server recalculates distance, ETA, return time, and fuel.
5. Publish the plan.

Expected authoritative state: plan version `PUBLISHED`; trip `LOCKED`; orders `ASSIGNED`; one current manifest per trip. Editing a published plan must require a controlled revision.

## 3. Loader — verify the physical load

1. Sign in as the Loader assigned to the plan depot.
2. Open the published manifest and confirm its SKU lines and reverse-stop LIFO loading order.
3. Report a shortfall, damage, or temperature issue. Verify Dispatch receives a persisted exception notification and gate clearance is blocked while it is open.
4. Resolve the exception as Dispatcher when appropriate, re-verify the manifest, and issue gate clearance.
5. For a second trip on the same vehicle, verify clearance remains blocked until Trip 1 returns and completes.

Expected authoritative state: manifest `CLEARED`; trip `CLEARED`; orders `LOADED`; the assigned driver receives a departure-clearance notification.

## 4. Driver — execute in sequence

1. Sign in as the assigned Driver.
2. Confirm all readiness checks. The trip should move from `CLEARED` to `DRIVER_READY`.
3. Depart and verify the trip moves to `EN_ROUTE` and the first stop becomes the only executable stop.
4. Record arrival. Verify early arrival creates a mandatory hold until the effective outlet/mall window opens.
5. Submit a full or partial POD with representative details, coordinates, carton counts, and signature or photo evidence. Alternatively record a failure with a reason, notes, evidence, and affected cartons.
6. Finish every stop in the published sequence, return within the depot geofence, and complete the trip.

Expected authoritative state: terminal stops are `DELIVERED`, `DISCREPANCY_FLAGGED`, or `FAILED`; trip becomes `RETURNING` and then `COMPLETED`.

### Offline replay check

1. Use the development-only signal-loss control.
2. Record two or more field actions while offline.
3. Restore connectivity and verify replay occurs in original timestamp order.
4. Confirm committed events become synced. Rejected or stale events must remain visible as conflicts and must not be reported as successful.

## 5. Store Manager — decide receipt outcome

1. Return to the Store Manager workspace and open Receiving.
2. Review the persisted driver POD.
3. Confirm a correct receipt, or open a receiving discrepancy for a physical difference.

Expected authoritative state: a correct handover creates a `CONFIRMED` receipt and order `RECEIVED`; a discrepancy creates a `DISCREPANCY` receipt/claim and order `DISPUTED`.

## 6. Shared-service checks

- Send a message from one role to another and verify it appears after the recipient signs in.
- Mark notifications read and verify the state survives a refresh.
- Update the signed-in profile and verify `/auth/me` returns the change.
- Verify a disabled user or changed role cannot continue using an old access token.
- Verify loaders cannot read another depot, drivers cannot mutate another route, and store managers cannot access another outlet.

## Automated checks

- `npm run test:api` validates domain rules, authorization-sensitive service behavior, API contracts, and the cross-role workflow surface.
- `npm --prefix apps/api run test:integration` exercises the production Nest application against a disposable PostgreSQL database using real authenticated HTTP requests and persisted records.
- `npm run typecheck` validates the web application and generated Next.js route types.
- `npm run build` builds both the web and API production bundles.

The workflow contract test is not a substitute for the browser/database walkthrough above. It intentionally fails if a required cross-role endpoint or lifecycle state is removed or renamed.

### Database-backed lifecycle suite

Provide `TEST_DATABASE_URL` for a disposable local PostgreSQL database named exactly `waypoint_integration_test`. The suite refuses other database names and nonlocal hosts, applies current migrations, and creates uniquely named test records. It never uses the normal `DATABASE_URL` for test data.

```powershell
$env:TEST_DATABASE_URL = 'postgresql://waypoint_test:waypoint_test_only@127.0.0.1:55432/waypoint_integration_test'
npm --prefix apps/api run test:integration
```

The suite covers the four-role happy path, early receiving-window holds, loading damage/resolution, plan revision invalidation and re-verification, offline chronological replay and duplicate detection, persisted conflicts, failed delivery, receiving discrepancy, shared messages/profile and authorization. Expected error logs in negative scenarios are intentional assertions of blocked transitions.

These tests do not claim browser/device-camera/GPS verification or full Compose startup validation. Continue the real multi-role walkthrough after the automated suite passes.
