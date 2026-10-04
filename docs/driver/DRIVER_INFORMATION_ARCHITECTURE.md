# Waypoint Driver Application — Information Architecture & Screen Normalization

## 1. Architectural Philosophy & Normalization Principles

The Driver application is an **operational in-cab tool**, not a desktop administrative dashboard. In field operations, drivers face rapid context switches, bright sunlight, physical fatigue, and time-critical delivery windows.

To maximize operational speed and eliminate cognitive overhead, the application adheres to five core normalization principles:

1. **One Operational Responsibility Per Screen**: Every screen answers a single primary operational question (e.g. *"What do I do next?"*, *"Where is this stop and what is on my truck?"*, *"How do I record this handover?"*).
2. **Zero Information Duplication**: Rather than generating separate pages for "Mark Arrival", "Upload POD", "Delivery Notes", and "Confirm Handover", these related actions are normalized into a unified, step-aware **Delivery Stop Detail & Execution Hub** with progressive disclosure.
3. **Progressive Disclosure**: Essential operational data (outlet name, delivery window, carton count, next action) is visible immediately. Deep technical specifications (SKU breakdowns, temperature logs, vehicle dimensions, past audit notes) are accessible via lightweight expandable cards, drawers, and bottom sheets without leaving the operational screen.
4. **Contextual Action Placement**: Actions are rendered strictly where the driver needs them with sticky bottom action bars sized for thumb operation ($48\text{px}$ minimum height, $44\text{px}$ touch targets).
5. **Smallest Useful Navigation Footprint**: Bottom navigation contains only the 4 persistent anchors:
   - **Home (Today)**: Real-time operational command center.
   - **Route**: Ordered stop manifest, LIFO cargo layout, and route timeline/map.
   - **History**: Completed trips, delivered stops, and offline reconciliation records.
   - **Vehicle & Profile**: In-cab vehicle specs, refrigeration status, fuel status, sync queue, and settings.

Operational sub-screens (e.g. Stop Detail, POD Capture Sheet, Exception Reporting Modal) are entered contextually from the Active Route and return smoothly upon completion.

---

## 2. Normalized Module & Screen Structure

```
WAYPOINT DRIVER APPLICATION
 ├── [MOD-1] TODAY / COMMAND CENTER (Home)
 │    └── Screen: Driver Home View
 ├── [MOD-2] ROUTE & MANIFEST (Trip Overview)
 │    └── Screen: Active Route Manifest & Timeline
 ├── [MOD-3] STOP EXECUTION (Delivery Detail & POD)
 │    ├── View: Stop Detail & Cargo Verification
 │    ├── Sheet: Proof of Delivery (POD) Handover Sheet
 │    └── Sheet: Exception & Incident Reporting Sheet
 ├── [MOD-4] RUN HISTORY & SYNC AUDIT (Records)
 │    └── Screen: Shift History & Sync Reconciliation Log
 └── [MOD-5] VEHICLE & SESSION (Settings & Profile)
      └── Screen: Vehicle Telematics, Profile & Offline Storage Manager
```

---

## 3. Detailed Screen Specifications

### Module 1: Today / Command Center (`MOD-1`)

#### Screen 1.1: Driver Home View
- **Operational Purpose**: Answers the driver's first question: *"What do I need to do right now?"* Displays active assignment, route departure status, next immediate stop, progress summary, and the dominant Next Action.
- **Main Information Shown**:
  - Driver identity, assigned vehicle ID (e.g. `WP-012`), and Depot (`Peliyagoda DC` or `Kandy`).
  - Active Shift Status chip (`Assigned`, `In Transit`, `At Stop 2/3`, `Shift Completed`).
  - Offline / Online Connectivity Indicator & Sync Queue Counter.
  - Active Route Snapshot Card: Brand (`Waypoint Fresh`), District (`Colombo`), Departure Time, Stops ($X/Y$ completed).
  - Next Immediate Stop Hero Card: Outlet Name, Brand Badge, Window Close Countdown, Estimated Travel Time, Address.
  - Quick Route Metric Badges: Remaining Stops, Total Delivered Cartons, Time Budget Remaining.
- **Primary Action**: Single high-contrast Sticky CTA:
  - If trip not departed: `Start Route / Depart Depot`
  - If en route to stop: `Navigate & View Next Stop`
  - If arrived at stop: `Open Stop & Complete Delivery`
  - If all stops delivered: `Return to Depot & Close Trip`
- **Secondary Actions**:
  - `View Full Route Manifest` (transitions to Route tab).
  - `Pre-Departure Vehicle Check` (quick modal for tire/reefer check).
  - `Report Transit Delay` (quick delay reason logging).
- **UI Components**:
  - `DriverHeader` (Greeting, Vehicle chip, Network status badge).
  - `ActiveStopCard` (Hero card with live status, window countdown, address).
  - `RouteProgressIndicator` (Visual progress bar with stop dots).
  - `PrimaryActionBar` (Sticky bottom CTA bar).
  - `SyncStatusBanner` (Appears when offline or when unsynced items exist).

---

### Module 2: Route & Manifest (`MOD-2`)

#### Screen 2.1: Route Manifest & Sequence View
- **Operational Purpose**: Provides the complete spatial and operational overview of the assigned route, stop sequence, LIFO loading order, and live stop statuses.
- **Main Information Shown**:
  - Route Header: Trip ID (e.g. `TRIP-01`), Vehicle ID, Brand (`Fresh`), District (`Colombo`), Depot origin.
  - Capacity & Resource Utilization: Weight utilization ($1,320 / 1,800\text{ kg}$), Volume utilization ($6.2 / 10\text{ m}³$), Estimated Route Duration vs Shift Budget ($145 / 270\text{ min}$).
  - Thermal / Reefer Status: Temperature setpoint and sensor reading (e.g. `Reefer Active: 3.4°C`).
  - Toggle between **Stop Timeline List** and **Interactive Route Map**.
  - Stop Sequence Cards:
    - Sequence number ($1, 2, 3\dots$).
    - Outlet name, Brand badge, Dock type (`rear_dock`, `street`, `mall_bay`).
    - Delivery window $[T_{\text{open}} - T_{\text{close}}]$ with status indicator (`Scheduled`, `En Route`, `Arrived`, `Delivered`, `Delayed`, `Failed`).
    - Order summary: Weight (kg), Volume (m³), carton count, chilled requirement badge.
    - LIFO staging indicator showing unload position.
- **Primary Action**: `Open Current Stop` (jumps directly into the active stop execution flow).
- **Secondary Actions**:
  - Map/List view switch.
  - Filter by status (`All`, `Pending`, `Completed`).
  - Call Outlet Receiving Desk (telephone launcher).
- **UI Components**:
  - `RouteCapacitySummaryBar`
  - `StopTimelineList`
  - `StopCard` with status badges and quick action buttons.
  - `RouteMapViewer` (Compact Leaflet map with numbered stop pins).

---

### Module 3: Stop Execution Hub (`MOD-3`)

#### Screen 3.1: Delivery Stop Detail & Unload Verification
- **Operational Purpose**: The single comprehensive hub for executing a delivery stop. Houses stop arrival, early window wait timer, order item check, and entry points for POD and Exception reporting.
- **Main Information Shown**:
  - Destination Card: Outlet name, commercial brand, physical address, docking instructions, receiving contact phone number.
  - Operating Window Status:
    - Delivery window $[T_{\text{open}}, T_{\text{close}}]$.
    - If arrived before window: **Early Arrival Holding Timer** with amber banner and countdown until $T_{\text{open}}$.
    - If approaching window close: **Breach Risk Alert** (amber/orange banner).
  - Order Breakdown:
    - For Fresh outlets: Dual-order split (Ambient order + Chilled order lines).
    - Weight (kg), Volume (m³), package count, special handling notes.
    - Expandable Itemized SKU manifest (SKU code, description, carton count).
  - Dock / Access specifications (e.g. `Rear Loading Dock`, `Mall Underground Bay - Gate B`).
- **Primary Action (Context-Aware State Machine)**:
  - If state is `En Route`: `Mark Arrived at Outlet`
  - If state is `Arrived & Early`: `Holding for Window (Opens in Xm)` (disabled or override option)
  - If state is `Window Open`: `Start Handover & Record POD`
- **Secondary Actions**:
  - `Report Issue / Exception` (opens Exception Reporting Sheet).
  - `Call Store Manager` (initiates phone call).
  - `Open Google/Apple Maps Navigation` (external GPS launch).
- **UI Components**:
  - `StopDetailHeader`
  - `DeliveryWindowTimer`
  - `CargoManifestList` with dual-order support.
  - `StopActionBar`

#### Screen 3.2: Proof of Delivery (POD) Handover Sheet (Modal / Bottom Sheet)
- **Operational Purpose**: Rapid, legally verifiable proof of delivery capture during store manager handover. Fully functional offline.
- **Main Information Shown**:
  - Outlet & Order Reference Numbers.
  - Verified carton count confirmation.
  - Receiver details entry: Store Manager / Receiving Officer Name and Staff ID.
  - Delivery outcome selector: `Delivered in Full` vs `Partial Delivery (Shortage)` vs `Damaged Goods Accepted with Claim`.
  - Signature Canvas (touch-enabled digital signature pad with Clear / Accept buttons).
  - Photo Proof of Delivery (live camera capture or photo upload simulation with timestamp overlay).
  - Operational Handover Notes (optional quick tags: *"Unloaded at rear dock"*, *"Seals verified"*, *"Count verified with SM"*).
- **Primary Action**: `Confirm Delivery & Complete Stop` (persists locally, queues for sync, transitions stop to `Completed`).
- **Secondary Actions**: `Cancel / Back to Stop`.

#### Screen 3.3: Exception & Incident Reporting Sheet (Modal / Bottom Sheet)
- **Operational Purpose**: Standardized exception capture for delivery failures, rejections, partial shortages, and on-road delays.
- **Main Information Shown**:
  - Scope selector: `Stop Exception` (Store Closed, Customer Refused, Damaged Goods, Access Blocked) vs `Vehicle / Transit Incident` (Breakdown, Traffic Gridlock, Monsoon Flood).
  - Standardized Reason Code Picker (Radio list matching business logic taxonomy):
    - `STORE_CLOSED_UNAVAILABLE`: Receiving staff not present.
    - `DELIVERY_REJECTED`: Manager refused goods (wrong order/temperature).
    - `DAMAGED_GOODS`: Physical crushing or seal puncture.
    - `SHORTAGE_PARTIAL`: Digital manifest quantity does not match physical count.
    - `ACCESS_BLOCKED`: Vehicle physically unable to park or access dock.
    - `VEHICLE_BREAKDOWN`: Engine, tire, or mechanical failure.
    - `ROAD_WEATHER_DELAY`: Severe monsoon landslide or road closure.
  - Affected Order & Quantity inputs (for shortages or damage).
  - Photo Evidence Capture.
  - Mandatory Driver Explanation note.
- **Primary Action**: `Submit Exception & Notify Dispatch` (marks stop as `Exception` or logs route incident; updates local ledger).
- **Secondary Actions**: `Cancel`.

---

### Module 4: Run History & Sync Audit (`MOD-4`)

#### Screen 4.1: Shift History & Sync Audit
- **Operational Purpose**: Provides drivers with a transparent record of today's completed runs, delivered stops, captured POD receipts, and offline synchronization state.
- **Main Information Shown**:
  - Today's Performance Summary: Completed stops, On-time delivery rate, Total weight delivered (kg), Total hours on route.
  - Completed Trip History Cards:
    - Trip ID, vehicle, depot origin, completed timestamp.
    - Stop list with completion outcomes (`Delivered in Full`, `Partial`, `Exception`).
    - Clickable POD receipt drawer showing saved signature, receiver name, and timestamp.
  - **Offline Sync Ledger**:
    - Number of pending offline queue items.
    - Chronological log of recent sync events.
    - Manual `Sync Now` trigger when cellular signal is restored.
- **Primary Action**: `Export / View Receipt Details`.
- **Secondary Actions**: `Force Sync Local Storage`.
- **UI Components**:
  - `ShiftSummaryMetrics`
  - `CompletedTripCard`
  - `SyncQueueList` with itemized status badges (`Synced`, `Pending Upload`, `Conflict Flagged`).

---

### Module 5: Vehicle Telematics & Session (`MOD-5`)

#### Screen 5.1: In-Cab Vehicle Telematics & Driver Settings
- **Operational Purpose**: In-cab reference for assigned vehicle limits, fuel budget, refrigeration metrics, driver session management, and application preferences.
- **Main Information Shown**:
  - Assigned Vehicle Card: Registration / ID (`WP-012`), Type (`Refrigerated Truck`), Home Depot (`Peliyagoda DC`).
  - Vehicle Constraints & Live Status:
    - Weight Capacity: $1,800\text{ kg}$ rated.
    - Volumetric Capacity: $10.0\text{ m}³$ rated.
    - Fuel Quota: Weekly quota, liters consumed, remaining allowance ($40\text{ L}$ left), efficiency ($6.0\text{ km/L}$).
    - Reefer Status: Thermal unit active, sensor reading ($3.2^\circ\text{C}$), target range ($2 - 4^\circ\text{C}$).
  - Driver Profile: Name, Employee ID (`DRIV001`), Assigned Depot.
  - Application Settings:
    - Theme Switcher (`Light` vs `Dark` mode with instant contrast switch for day/night driving).
    - Offline Cache Status (storage usage, cached manifests, clear cache utility).
    - Emergency Dispatch Contact (one-touch direct call to Peliyagoda/Kandy Planning Desk).
- **Primary Action**: `Sign Out of Driver Session`.
- **Secondary Actions**: `Contact Dispatch Desk`, `Toggle Night Driving Theme`.

---

## 4. Justification of Screen Grouping & Normalization

| Traditional Fragmented Approach | Normalized Waypoint Driver Approach | Operational Justification |
|---|---|---|
| Separate "Mark Arrival" screen, "Unload Checklist" screen, "POD Signature" screen, "Delivery Confirmation" screen | Unified **Stop Detail & Execution Hub** with contextual state transitions | Drivers need to see outlet info, cargo info, and arrival status on the same screen while parking and stepping out of the cab. Eliminates 4 redundant screen navigations. |
| Separate pages for each exception type (Shortage page, Damage page, Breakdown page) | Single **Exception & Incident Reporting Sheet** with taxonomy selector | Standardizes field reporting; driver picks the reason code from a unified modal, attaches photo evidence, and submits in under 15 seconds. |
| Standalone "Offline Sync" page | Embedded **Sync Status Banner** + **Sync Audit drawer** in History & Settings | Offline capability is an underlying capability, not a separate task. Banners inform the driver in-place, and sync occurs transparently. |
| Heavy multi-panel analytics dashboard | Operational **Driver Command Center (Home)** | Eliminates dispatcher-level forecasting, financial charts, and pivot tables. Prioritizes: *"What is my assignment?"* and *"What is my next stop?"*. |
