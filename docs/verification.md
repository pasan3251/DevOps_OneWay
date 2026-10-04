# Sign-in verification

Verified on 3 October 2026 against the production build: ESLint, TypeScript, and `next build` passed. The browser walkthrough passed all checks below with no page errors. Desktop (1440px) and phone (390px and 320px) captures were inspected after the final heading, field-border contrast, and disclosure-size fixes.

The sign-in browser walkthrough is in `scripts/verify-sign-in.js`. It verifies field validation, password visibility, failed credentials, keyboard-dismissable help, all four role destinations, reload persistence, sign-out, employee ID normalization, remembered sessions, and route guards. It also captures 1440px, 390px, and 320px layouts and checks horizontal overflow.

Run the application first, then use an isolated Playwright CLI session:

```sh
npx --yes --package @playwright/cli playwright-cli -s=waypoint open http://127.0.0.1:3000
npx --yes --package @playwright/cli playwright-cli -s=waypoint run-code --filename scripts/verify-sign-in.js --raw
```

The script exercises only the frontend demo adapter. It does not verify a backend, server-side authentication, or operational role workflows. Captures are saved under `.impeccable/review/`, which is excluded from Git.

## Dispatcher verification

Verified on 3 October 2026 against the rebuilt production server. Lint, TypeScript and production build pass. The sign-in regression walkthrough also passes with the new dispatcher destination.

```sh
node scripts/verify-dispatch-domain.mjs
npx --yes --package @playwright/cli playwright-cli -s=waypoint run-code --filename scripts/verify-dispatcher.js --raw
npx --yes --package @playwright/cli playwright-cli -s=waypoint run-code --filename scripts/verify-dispatch-recovery.js --raw
```

The domain script uses Node.js 24's built-in TypeScript support. It checks exact and exceeded weight/volume and fuel boundaries, refrigeration, van access, depot/brand/district, workshop status, delivery windows, duplicate allocation, trip count and overlap, deferral exclusivity, Fresh daily budget and empty trips.

The browser walkthrough verifies search/brand filtering, blocked assignment with preserved selection, valid van assignment, reload persistence, unavailable workshop vehicles, mandatory deferral notes, return to backlog, publication gating and persisted lock/reopen, depot/date empty states, keyboard help, mobile sign-out and logged-out redirects. The recovery check injects a synthetic storage failure and verifies feedback in the active dialog, preserved input and persisted plan, then a successful retry; it also checks repeated-deferral justification, stop reorder/removal and late-departure warnings.

Final captures cover 1440px, 1120px, 1024px, 390px and 320px. Browser assertions confirm no page overflow, exactly one visible delivery-window representation at each width, and at least 16px for phone inputs/selects. No browser page errors occurred during the walkthrough. Captures use the `dispatch-` prefix under `.impeccable/review/`.

This verifies an independent synthetic frontend scenario. It does not verify the competition CSVs, organizer checker, server authorization, optimization, synchronized role updates or real delivery timing.

## Excalidraw overview verification

The dispatcher now opens on Today’s Overview; Order Intake keeps the existing planning workflow and remembers its view in the URL fragment on reload. Recharts 3.10.1 supplies five pie/donut charts and a brand bar chart. All values derive from the same synthetic order, vehicle and saved-plan state.

```sh
npx --yes --package @playwright/cli playwright-cli -s=waypoint run-code --filename scripts/verify-dispatch-overview.js --raw
```

Verified against the production build on 3 October 2026: chart presence and exact fixture totals, expanded/collapsed navigation, open/closed companion drawer, keyboard-driven width slider, independently scrolling analysis and companion panels, calendar month/date changes, honest empty dates, depot filtering, and updates after a recorded deferral. Desktop page height stays within the viewport; phone/tablet checks at 1024px, 390px and 320px show no horizontal overflow. No browser page errors occurred. Final capture files use the `overview-` prefix; they include expanded navigation, closed drawer and scrolled-analysis states.

The companion-to-intake check starts with a conflicting brand and search filter, opens a specific queue card, and verifies that the clicked order ID is searched, conflicting filters are cleared, and its checkbox is selected and focused. A separate `overview-order-handoff.png` capture records that state.

The original Excalidraw and user's dispatcher screenshot define the layout. “Assigned” describes planned orders; the overview does not fabricate served-delivery counts, live notifications, utilization histories or forecasts.

## Order intake, fleet and route planning verification

The three dispatcher views use the same synthetic plan and typed local-storage adapter. The former combined planning workflow now lives in Route Planning. Existing planning/recovery scripts were updated to navigate there; their assignment, deferral, publication and storage-recovery checks still pass. The overview walkthrough also passes with its queue handoff targeting the new Order Intake table.

```sh
npx --yes --package @playwright/cli playwright-cli -s=waypoint run-code --filename scripts/verify-dispatch-operations.js --raw
```

The new walkthrough checks order pagination, status/brand/search filters and empty results; blocked truck assignment for a chilled van-only order; eligible refrigerated-van suggestions; atomic whole-order/new-trip allocation; storage-failure feedback, preserved selection and successful retry; saved-plan reload; fleet filtering, workshop exclusion, linked routes and capacity rows; route departure warnings and empty-route removal; depot isolation and date empty states. It also checks the order drawer's native keyboard width slider and collapse controls.

The route-to-intake boundary is checked with four route orders selected: intake retains one selected order, its deferral dialog names one order, and saving defers only that order. Intake assignment and deferral callbacks explicitly receive the inspected order ID. Tablet route panels must fill at least 95% of their stacked container as well as avoid overlap.

Production captures cover 1440px, 1024px, 390px and 320px. Responsive assertions check horizontal overflow, at least 16px phone text controls, non-overlapping tablet route panels, and focused details after phone inspection. Images use the `intake-`, `fleet-`, `capacity-` and `routes-` prefixes under `.impeccable/review/`. No page errors occurred in the verified workflow. Lint, TypeScript, production build and domain boundary checks pass.

Capacity means peak load per vehicle or load per trip, rather than summed daily payload. Fuel values distinguish the fixture's remaining weekly allowance from the estimated fuel reserved by this plan. No driver identities, geographic routes, delivery events, optimization or backend integration are invented.

## Updated Excalidraw overview refinement verification

Verified on 3 October 2026 against the latest production build with the new polish walkthrough:

```sh
npx --yes --package @playwright/cli playwright-cli -s=waypoint run-code --filename scripts/verify-dispatch-polish.js --raw
```

The passing walkthrough checks separator Home/End keyboard bounds and pointer dragging, synchronization with the native drawer-width slider, carry-over queue requirements, explicit priority-order handoff to Intake, selected-depot carry-over counts, and the neutral no-priority state after successful allocation. Four viewport checks at (1440px), (1024px), (390px) and (320px) assert no page overflow and visible priority notice; phone checks assert readable priority-copy width, hidden desktop separator and analysis before companion. The new assertion checks every fleet legend row remains inside the analysis panel with expanded navigation and maximum companion width. No page errors occurred.

Fresh captures are `polish-1440.png`, `polish-1024.png`, `polish-390.png`, `polish-320.png`, `polish-expanded.png`, `polish-analysis.png` and `polish-closed.png` under `.impeccable/review/`. They show initial priority, compact/reflowed charts, phone ordering, scrolled brand analysis and the post-allocation neutral notice with closed companion. The expanded capture shows two fleet columns and a spanning Vehicle types row after the containment fix. Supplementary prior-fix middle/mobile analysis captures show the same content; they are not fresh final-build evidence.

Lint, TypeScript and production build pass. The overview and operations regression walkthroughs passed before the final CSS-only container reflow; they were not rerun after that adjustment. The latest production polish walkthrough was run after the adjustment and includes the added containment assertion. The detector ran once and returned `[]`. The finish reviewer scored the sole material legend-containment finding **resolved**, found no regression from that fix, and returned **ship at scored-fix scope**. This does not claim whole-surface perfection or complete accessibility coverage.

The scene `reference/design/dispatcher-refinement.excalidraw` is the refinement authority; maps, tracking, chat, outlets and notifications remain later scope. Verification still covers a synthetic browser-local frontend plan, without backend, live telemetry, geolocation, optimization, actual delivery events or synchronized roles. Review PNGs are evidence, with no raster artwork shipped. The documentation pass preserves `DESIGN.md` and `.impeccable/design.json` byte-for-byte; SHA-256 evidence is in `docs/dispatcher-design-check.md`.

## Final dispatcher workspace verification — 4 October 2026

This is the current verification record for the supplied `Dispatcher_Dashboards.excalidraw` and ZIP implementation. Earlier sections retain their historical scope; their later-scope statements about maps, tracking, outlets, calendar, chat and notifications are superseded by the local demo surfaces now implemented.

The implementation run passed `npm run lint`, `npm run build` (including TypeScript), `node scripts/verify-dispatch-domain.mjs` and `node scripts/verify-workspace-state.mjs`. The production Playwright walkthrough `scripts/verify-final-dispatcher.js` passed eight destinations and three route modes at 1440, 1024, 390 and 320px, with no page errors or horizontal page overflow. It checks calendar event create/edit/delete; failed workspace saves with preserved event/message drafts and successful retry; chat role filtering, message/read state; notification filtering/read and visible failure; saved appearance; saved simulated progress and reset after a route edit; capacity handoff; deferral return; and account sign-out.

All five existing dispatcher walkthroughs also passed on the final production build: `verify-dispatcher.js`, `verify-dispatch-operations.js`, `verify-dispatch-overview.js`, `verify-dispatch-recovery.js` and `verify-dispatch-polish.js`. Recovery now signs in independently. One environment rerun followed rebuilding while an older server was still running; the resolved mismatch was not an application defect.

```sh
node scripts/verify-workspace-state.mjs
npx --yes --package @playwright/cli playwright-cli -s=waypoint run-code --filename scripts/verify-final-dispatcher.js --raw
```

Run the current production server before the browser script. It uses isolated synthetic demo state. Public OpenStreetMap tile requests are intercepted with neutral deterministic tiles during automated navigation/captures; map interaction and pin rendering are exercised, but live provider tiles are **not verified** by this automation.

The required capture matrix under `.impeccable/review/` contains `final-{dashboard,order-intake,manage-fleet,route-planning,deferrals,outlets,calendar,chat,track-deliveries,manage-assigned-routes}-{1440,1024,390,320}.png`, four `final-dark-{dashboard,deferrals,calendar,chat}.png` variants, and `final-notification-panel.png`, `final-deferral-analysis.png`, `final-route-assignment-map.png`. Export crops are separately retained as `final-{deferrals,outlets,calendar,chat,notifications,route-assignment,tracking,manage-routes}.png`. They are reference/review evidence rather than shipped raster artwork.

The detector ran once; `final-detector.json` is `[]`. The fresh finish reviewer returned **SHIP**, sampled source without browser operation, checked the required capture evidence and requested no material fix; its record is `final-review-verdict.md`. The documentation pass independently checked all 47 required PNG signatures/dimensions, sampled four rendered captures and source/scripts, and verified the preserved design hashes. It did not rerun runtime tests. Static captures and bounded review do not establish complete accessibility coverage.

Verification covers browser-local planning, calendar, demo chat/read state, notifications, appearance and simulated route progress. The original planning key remains compatible; ancillary data uses the separate validated `waypoint.demo.workspace.v1` adapter. In the full-stack system, backend role synchronization, JWT authentication, and real GPS/POD recording are authoritatively implemented and tested in `apps/api` and verified with automated test suites (`test:api`).
