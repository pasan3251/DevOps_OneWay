# Waypoint Driver Application — Operational Responsibilities & Domain Model

## 1. Executive Role Summary

In the **Waypoint Intelligent Enterprise Delivery Planning System**, the **Delivery Driver** operates on the front lines of freight execution across Sri Lanka's diverse geographical corridors—from dense Colombo urban streets to high-elevation, winding tea country routes around Kandy and Nuwara Eliya.

The Driver is responsible for the physical custody, thermal integrity, timely transit, and legally verified handover of goods spanning Waypoint Group's three commercial brands:
- **Waypoint Fresh**: Time-critical perishable produce, dairy, and meats requiring reefer temp compliance and strict delivery before **08:00 AM**.
- **Waypoint Style**: High-cube apparel requiring careful bay access and secure handling.
- **Waypoint Tech**: Fragile, high-value electronics and appliances requiring careful curbside/dock unloading and strict serial/carton verification.

The Driver application is an **operational, in-cab execution tool** designed for high clarity, minimal cognitive load, thumb-friendly ergonomics, and full **offline resilience** in zero-connectivity mountain dead zones.

---

## 2. Driver Responsibilities Across the Working Day

### 2.1 Shift Initialization & Pre-Departure Verification
- **Sign In & Vehicle Handshake**: Authenticate in the vehicle cab and verify the assigned vehicle, refrigeration class, and home depot. Capacity planning remains a dispatcher responsibility.
- **Manifest Review**: Receive and review the published trip plan from Dispatcher, confirming stop sequence, total payload (kg / m³), and route district.
- **Loading & Gate Clearance Check**: Verify that warehouse staging and LIFO (Last-In, First-Out) loading are completed and dock clearance has been granted by the Loader.
- **Thermal & Safety Check**: For refrigerated vehicles carrying Fresh orders, verify that the refrigeration unit temperature is within target bounds (2°C - 4°C for chilled) before departing the depot gate.
- **Trip Departure Confirmation**: Log actual gate departure timestamp, transitioning the trip status to `In Progress` and notifying central Dispatch.

### 2.2 En-Route Navigation & Transit Monitoring
- **Sequential Navigation**: Drive toward the next scheduled stop in accordance with the planned stop order.
- **Live ETA & Schedule Compliance**: Monitor estimated arrival against the outlet's authorized delivery window $[T_{\text{open}}, T_{\text{close}}]$ (and shopping mall access windows where applicable).
- **Traffic & Delay Acknowledgment**: In the event of road disruption, severe monsoon downpours, or breakdown, log delay reason codes safely when stopped to inform central Dispatch.

### 2.3 Destination Arrival & Window Holding
- **Arrival Timestamp Logging**: Mark arrival immediately upon reaching the outlet perimeter (capturing timestamp and GPS coordinates).
- **Early Arrival Holding Rule**: If the vehicle arrives before $T_{\text{open}}$ (e.g., arriving at 04:45 AM for a 05:15 AM window):
  - Driver must remain parked on-site without unloading to avoid disrupting store setup or violating municipal/mall quiet hours.
  - The application displays an active **Window Countdown Timer** and holds the action gate until the window officially unlocks.

### 2.4 Unloading & Proof of Delivery (POD) Handover
- **Cargo Unloading**: Retrieve cargo from rear doors (Stop 1 is immediately accessible due to reverse LIFO packing).
- **Multi-Order Identification**: At Fresh outlets receiving dual deliveries (Ambient dry goods + Chilled dairy/meats), verify both order lines.
- **Physical Verification**: Hand over packages to Store Receiving Manager and verify carton counts.
- **Digital POD Capture**:
  - Store Manager name and designation.
  - Digital touch-signature or photo proof of delivery (dock handover, store entrance, or receipt stamp).
  - Unloading completion timestamp.
- **Stop Completion**: Mark stop as `Delivered` and receive instant routing prompt for the next stop.

### 2.5 Field Exception Management
When normal handover cannot occur, the driver executes standardized exception reporting:
- **Delivery Exceptions**:
  - `STORE_CLOSED_UNAVAILABLE`: Receiving staff absent or gates locked.
  - `DELIVERY_REJECTED`: Store manager refuses shipment (e.g. temperature breach, wrong store).
  - `DAMAGED_GOODS`: Cartons crushed, thawed, or punctured during transit.
  - `SHORTAGE_PARTIAL`: Delivered carton count does not match digital manifest (partial delivery).
  - `ACCESS_BLOCKED`: Street impassable for vehicle dimensions.
- **Vehicle / Operational Incidents**:
  - `VEHICLE_BREAKDOWN`: Mechanical failure, puncture, or engine overheat.
  - `MONSOON_FLOOD_TRAFFIC`: Extreme weather or impassable mountain slips.
- **Evidence Attachment**: Capture photo evidence and mandatory textual justification before Dispatch escalation.

### 2.6 Multi-Trip & End-of-Day Close
- **Multi-Stop Iteration**: Advance sequentially until all assigned stops on Trip 1 are resolved.
- **Depot Return**: Navigate back to home depot (Peliyagoda or Kandy).
- **Trip 2 Evaluation**: If scheduled for a secondary run (e.g., Fresh morning run followed by daytime Style/Tech run within the 480-minute budget), report to loading bay for Trip 2 staging.
- **Shift Reconciliation & Offline Sync**: Ensure all offline queued PODs, GPS logs, and incident reports have synchronized to the central cloud database; review daily completion summary.

---

## 3. Operational Inputs & Outputs

```
+-----------------------------------------------------------------------------------+
|                              DRIVER SYSTEM BOUNDARIES                             |
+-----------------------------------------------------------------------------------+
| INPUTS RECEIVED                                                                   |
| * Published Trip Plan (Vehicle ID, Trip ID, Departure time, Depot origin)         |
| * Ordered Stop Manifest (Sequence, Outlet Name, Address, Contact, Dock Type)      |
| * Order Lines (Order ID, Brand, Weight kg, Volume m³, Chilled flag, Item counts)   |
| * Operating Windows (Window Open/Close, Mall Window Intersection)                 |
| * Dispatcher / Loader Alerts (Route amendments, pre-departure shortfall notices)  |
+-----------------------------------------------------------------------------------+
| ACTIONS & DECISIONS MADE                                                          |
| * Gate Departure Confirmation                                                     |
| * Stop Arrival Timestamp                                                          |
| * Window Wait Adherence                                                           |
| * Delivery Outcome Selection (Delivered In Full, Partial, Refused, Closed)        |
| * Exception / Delay Reason Code Assignment                                        |
| * Photo / Signature Evidence Capture                                              |
| * Offline Sync Trigger                                                            |
+-----------------------------------------------------------------------------------+
| OUTPUTS EMITTED                                                                   |
| * Real-time GPS & Status Telemetry (En Route, Arrived, Unloading, Completed)      |
| * Timestamped Proof-of-Delivery Record (Signee, Signature Vector, Photo URI)      |
| * Exception Tickets with Cause Codes & Discrepancy Quantities                     |
| * Offline Sync Queue Items (reconciled upon network reconnection)                 |
| * Completed Shift Summary Log                                                     |
+-----------------------------------------------------------------------------------+
```

---

## 4. Business Constraints & Operational Rules Affecting the Driver

1. **Brand & District Isolation**: The driver's assigned trip strictly serves one brand and one district. The driver never mixes delivery stops across districts or brands on a single trip.
2. **Whole Order Integrity**: Orders cannot be partially left behind at the depot without an official Loader Shortfall exception (`FAIL-A`). At delivery, any discrepancy must be logged as a `Partial Delivery` or `Refused` exception with exact carton counts.
3. **Delivery Window Compliance**:
   - Deliveries before `window_open` are prohibited from unloading (mandatory waiting period).
   - Deliveries completed after `window_close` are tagged as SLA breaches; driver must record reason.
4. **Mall Delivery Windows**: Outlets with `parking_constraint = mall_dock` enforce strict security gate closures outside `mall_window`. Driver cannot access bays outside the intersected window.
5. **Reefer Thermal Integrity**: Chilled orders must remain refrigerated until immediate curbside/dock transfer.
6. **Maximum Two Trips Daily**: A single driver/vehicle combination can execute at most 2 trips per 24-hour cycle. Fresh morning operations are limited to 270 minutes cumulative; commercial runs to 480 minutes cumulative.
7. **Offline-First Resilience**: In cellular dead zones, the driver's operations must never be blocked. The local application acts as the authoritative ledger, queueing events chronologically and syncing automatically with conflict detection.

---

## 5. State Machine & Status Transitions

### 5.1 Route / Trip Status Lifecycle
```
[ASSIGNED] ──(Loader clears & Driver starts)──> [EN_ROUTE]
                                                    │
                                                    ├──(All stops resolved)──> [RETURNING_TO_DEPOT]
                                                    │                                │
                                                    │                                └──> [COMPLETED]
                                                    └──(Emergency incident)──> [DELAYED / INCIDENT]
```

### 5.2 Stop Delivery Status Lifecycle
```
[SCHEDULED]
    │
    ▼
[EN_ROUTE_TO_STOP] ──(Driver reaches outlet)──> [ARRIVED]
                                                    │
                   ┌────────────────────────────────┴────────────────────────┐
                   │ (If current time < window_open)                         │ (If current time >= window_open)
                   ▼                                                         ▼
            [WAITING_FOR_WINDOW] ──(Window opens)──> [UNLOADING_IN_PROGRESS]
                                                             │
                  ┌──────────────────────────────────────────┼──────────────────────────────────────────┐
                  ▼                                          ▼                                          ▼
     [DELIVERED_IN_FULL]                             [PARTIALLY_DELIVERED]                          [DELIVERY_FAILED]
     - Full count verified                           - Discrepancy logged                           - Closed / Refused / Damaged
     - Signature & Photo captured                    - Shortage notes & POD                         - Exception code & photo
```

---

## 6. Interactions with Other System Roles

| System Role | Driver Interaction Touchpoint | Data Exchanged |
|---|---|---|
| **Dispatcher** | Receives route publication; emits live status; logs transit delay or breakdown incidents | Trip assignment, live ETA, delay notifications, exception escalation |
| **Warehouse Loader** | Verifies LIFO loading; inspects pre-departure carton damage; confirms gate clearance | Physical vehicle release, shortfall flags, manifest handoff |
| **Store Receiving Manager** | Handover at outlet dock; count verification; joint POD signing; discrepancy recording | Delivered cartons, damaged SKU counts, digital signature, POD confirmation |
