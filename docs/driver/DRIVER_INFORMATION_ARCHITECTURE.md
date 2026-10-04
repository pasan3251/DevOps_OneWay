# Driver workspace — normalized information architecture

This structure is derived from the project overview, primary workflow, secondary workflows, and operational constraints. Those documents define the business rules; this file records how the driver client implements them.

## Primary navigation

The driver PWA has three primary destinations:

1. **Today** — the next required action, trip readiness, active stop, return leg, and Trip 2 release state.
2. **Route** — one Leaflet route map and the dispatcher-locked stop sequence.
3. **Records** — completed trips and the chronological offline-sync ledger.

Driver identity, assigned vehicle, connectivity, dispatch contact, sign-out, and demo controls live in a secondary operations sheet opened from the header. They are not separate operational dashboards.

## Screen ownership

| Surface | Driver can do | Driver cannot do |
|---|---|---|
| Today | confirm readiness, depart after loader clearance, resume the current stop, report a delay while stopped, confirm depot return | allocate vehicles, change a route, choose Trip 2 |
| Route | view map, inspect the manifest, open the current stop, launch navigation | reorder, reassign, defer, or split an order |
| Stop | record arrival, obey a window hold, review order lines, capture outcome/POD, report a delivery exception | execute a future stop or bypass the window gate |
| Records | review trip summaries, inspect and sync offline events | overwrite a server conflict |

## Required hierarchy

- The next safe action is always the strongest element.
- Only one stop is executable. Future and completed stops remain readable.
- Driver-facing information is limited to what supports safe execution: stop sequence, delivery window, access notes, manifest lines, reefer state, route, remaining trip budget, and sync state.
- Capacity planning, fleet utilization, allocation recommendations, forecasts, and route editing remain in dispatch.
- Detailed loading verification remains in the loader workspace. The driver sees only the released manifest and seal/readiness acknowledgement.

## Edge-case presentation

- **Early arrival:** persistent countdown; unloading remains locked until the effective outlet/mall window opens.
- **Late arrival:** visible SLA-breach marker; unloading can continue only when receiving staff are available.
- **Dual Fresh orders:** one outlet stop with separate ambient and chilled order lines; outcome evidence remains linked to each order in the backend.
- **Partial delivery:** carton count, note, evidence, POD, and a discrepancy claim are recorded together.
- **Refused/closed/access blocked/damaged:** terminal exception with reason, note, photo, time, and location.
- **Offline:** persistent banner, local chronological ledger, automatic replay, and explicit conflict state.
- **Trip 2:** hidden from execution until Trip 1 returns to the home depot and the loader publishes the next manifest.

## Map standard

All operational route maps use Leaflet with OpenStreetMap tiles (or `NEXT_PUBLIC_MAP_TILE_URL`). The map displays the depot, locked stop sequence, active stop, completed stops, and return leg using the same mapping stack as dispatch.
