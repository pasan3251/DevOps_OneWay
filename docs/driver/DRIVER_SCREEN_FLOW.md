# Waypoint Driver Application — Screen Navigation & Interaction Flows

## 1. Global Navigation Architecture

The Waypoint Driver application employs an ergonomic **Bottom Navigation Bar** optimized for single-handed mobile operation (thumb zone reachability between $360\text{px}$ and $430\text{px}$ viewport width). Operational sub-screens and workflow modals slide in smoothly from the bottom (sheet) or push forward with an immediate, unambiguous Back action.

```mermaid
flowchart TD
  subgraph BottomNav["Persistent Bottom Navigation Bar"]
    N1["🏠 Today<br/>(Command Center)"]
    N2["🗺️ Route<br/>(Manifest & Stops)"]
    N3["📋 History<br/>(Completed & PODs)"]
    N4["🚚 Vehicle & Profile<br/>(Specs & Sync)"]
  end

  subgraph ContextualScreens["Contextual Operational Sub-Screens"]
    S1["Stop Detail & Handover Hub"]
    S2["Proof of Delivery (POD) Sheet"]
    S3["Exception & Incident Reporting Sheet"]
    S4["Pre-Departure Vehicle Check Sheet"]
    S5["POD Receipt & Signature Viewer"]
  end

  N1 -->|"Tap Active Stop / Resume"| S1
  N2 -->|"Tap Stop Card"| S1
  S1 -->|"Record POD Handover"| S2
  S1 -->|"Report Issue / Delay"| S3
  N1 -->|"Pre-Trip Safety Check"| S4
  N3 -->|"View Proof of Delivery"| S5

  S2 -->|"Complete Delivery"| S1
  S3 -->|"Submit Incident"| S1
  S1 -->|"Back to Route"| N2
```

---

## 2. Primary End-to-End Delivery Flow

This is the standard operational happy path executed for every scheduled route.

```mermaid
sequenceDiagram
  autonumber
  actor D as Driver
  participant App as Driver App (Mobile)
  participant Storage as Local Storage (Offline DB)
  participant Disp as Dispatch Console (Central)

  Note over D,App: Shift Start & Departure
  D->>App: Opens App & Authenticates (DRIV001)
  App->>Storage: Load cached active trip & vehicle data
  App-->>D: Display Driver Home (Today's Assignment: TRIP-01, WP-012)
  D->>App: Tap "Start Route / Depart Depot"
  App->>Storage: Log departure timestamp (e.g. 05:00 AM)
  App->>Disp: Emit departure event (or queue if offline)
  App-->>D: Transition state to In Transit; Show Stop 1 Navigation

  Note over D,App: Stop 1 Transit & Arrival
  D->>App: Arrive at Stop 1 (Fresh · Borella)
  D->>App: Tap "Mark Arrived"
  App->>Storage: Save arrival timestamp & GPS coordinates

  alt Arrived Before Window Open (e.g. 05:15 AM < 05:30 AM)
    App-->>D: Display "Holding for Delivery Window" with live Countdown Timer
    D->>D: Waits in vehicle until 05:30 AM
    App-->>D: Timer expires: Window Open Alert; Unlock Handover button
  else Arrived Inside Window
    App-->>D: Delivery Window Active; Unlock Handover button immediately
  end

  Note over D,App: Physical Handover & POD Capture
  D->>D: Unloads Stop 1 cargo from rear doors (LIFO order)
  D->>App: Tap "Start Handover & Record POD"
  App-->>D: Display POD Handover Sheet
  D->>App: Confirm carton count, input Store Manager Name (e.g. "K. Perera")
  D->>App: Capture Touch Signature & Camera Photo
  D->>App: Tap "Confirm Delivery & Complete Stop"
  App->>Storage: Store signed POD record locally
  App->>Disp: Emit Stop Completed payload (or queue if offline)
  App-->>D: Stop 1 marked "Delivered In Full"; Prompt "Proceed to Stop 2"

  Note over D,App: Stop Iteration & Route Completion
  D->>App: Tap "Navigate to Stop 2"
  Note over D,App: (Repeats arrival & POD for Stop 2: Fresh · Nugegoda)
  App-->>D: All stops completed! Show "Return to Depot" prompt
  D->>App: Tap "Confirm Return to Peliyagoda DC"
  App->>Storage: Save trip close timestamp
  App-->>D: Display Shift Summary; Show Trip 2 readiness or Day Close
```

---

## 3. Alternative Operational Flows

### Flow ALT-1: Same-Outlet Dual Orders (Fresh Dry + Chilled)
When a Fresh outlet has both an Ambient grocery order and a Chilled dairy/meat order on the same vehicle:

```mermaid
flowchart TD
  A["Driver opens Stop Detail"] --> B["Header shows: Dual Order Delivery"]
  B --> C["Section 1: Chilled Order (ORD-1041-C)<br/>Dairy/Meat, 420 kg, 2.2 m³ (Reefer Active)"]
  B --> D["Section 2: Ambient Order (ORD-1041-A)<br/>Dry Groceries, 300 kg, 1.8 m³"]
  C & D --> E["Driver unloads both consignments"]
  E --> F["Single unified POD captures joint verification"]
  F --> G["Store Manager signs once for both order lines"]
  G --> H["Stop marked complete for both orders"]
```

### Flow ALT-2: Multi-Trip Shift Execution (Fresh Morning + Style Daytime)
When the vehicle is assigned to execute two trips within daily time budgets:

```mermaid
flowchart TD
  A["Trip 1 (Fresh Morning Run) completed"] --> B["Driver arrives back at Peliyagoda DC"]
  B --> C{"Is Trip 2 scheduled and within time budget?"}
  C -- Yes --> D["Home Screen updates: TRIP-02 Ready for Staging"]
  D --> E["Driver reviews Trip 2 manifest (Waypoint Style / Tech)"]
  E --> F["Warehouse Loader completes Trip 2 LIFO loading"]
  F --> G["Driver verifies load & departs for Trip 2"]
  C -- No --> H["Day Complete: Show shift summary & sync ledger"]
```

---

## 4. Exception & Failure Flows

### Flow EXC-1: Delivery Exception (Store Closed / Unreachable / Refused)

```mermaid
flowchart TD
  A["Driver arrives at outlet"] --> B["Gate closed or receiving staff absent"]
  B --> C["Driver taps 'Report Issue / Exception'"]
  C --> D["Select Issue Category: Stop Exception"]
  D --> E{"Select Reason Code"}
  E -->|STORE_CLOSED| E1["Store Closed / Manager Unavailable"]
  E -->|DELIVERY_REJECTED| E2["Delivery Rejected by Manager"]
  E -->|ACCESS_BLOCKED| E3["Access Blocked / Dock Impassable"]
  E1 & E2 & E3 --> F["Capture mandatory photo evidence (e.g. locked gate)"]
  F --> G["Add driver field note & call attempt confirmation"]
  G --> H["Tap 'Submit Exception'"]
  H --> I["Stop marked 'Failed / Exception'"]
  I --> J["Dispatcher alerted immediately via telemetry"]
  J --> K["System prompts driver: 'Advance to Next Stop'"]
```

### Flow EXC-2: Partial Delivery & Physical Cargo Damage

```mermaid
flowchart TD
  A["Driver unloads cargo with Store Manager"] --> B["Manager spots punctured carton or 2 missing cases"]
  B --> C["Driver opens POD Handover Sheet"]
  C --> D["Select Outcome: 'Partial Delivery' or 'Damaged Goods'"]
  D --> E["Adjust delivered carton count vs manifest"]
  E --> F["Specify shortage / damaged SKU quantity"]
  F --> G["Capture photo of damaged packaging"]
  G --> H["Store Manager signs acknowledgement of partial receipt"]
  H --> I["Submit POD with discrepancy tag"]
  I --> J["Dispatcher console generates immediate discrepancy claim"]
  J --> K["Next-day inventory backlog flags replacement order"]
```

### Flow EXC-3: Transit Delay & Road Weather Warning (FAIL-D)

```mermaid
flowchart TD
  A["Vehicle encounters heavy traffic, monsoon flood, or mechanical fault"] --> B["Vehicle is safely stopped curbside"]
  B --> C["Driver taps 'Report Transit Delay' from Home or Route header"]
  C --> D["Select Delay Reason: Weather / Traffic / Mechanical / Puncture"]
  D --> E["Input estimated delay minutes (e.g. +25 min)"]
  E --> F["Submit Delay Notice"]
  F --> G["Central Dispatcher console flags Route in Amber/Red"]
  G --> H["Store Managers at downstream stops receive revised ETA notification"]
```

### Flow EXC-4: Complete Cellular Outage & Offline Synchronization (FAIL-C)

```mermaid
flowchart TD
  A["Vehicle enters mountain / rural zone with zero cellular signal"] --> B["Network state switches to Offline"]
  B --> C["Driver App displays prominent 'Offline Mode Active' Banner"]
  C --> D["Driver performs all operations normally:"]
  D --> D1["Log arrival timestamp"]
  D --> D2["Wait for delivery window"]
  D --> D3["Capture touch signature and photo POD"]
  D --> D4["Report shortages or exceptions"]
  D1 & D2 & D3 & D4 --> E["All mutations stored immediately in browser IndexedDB/LocalStorage"]
  E --> F["Sync Badge shows '3 Pending Sync Items'"]
  F --> G["Vehicle returns to urban corridor; cellular signal restored"]
  G --> H["Automatic background sync initiates"]
  H --> I["Queued events uploaded in strict chronological order"]
  I --> J["Banner confirms 'All Records Synchronized'"]
```

---

## 5. Screen Transitions & State Map

| From Screen | Trigger Event / User Action | Destination View | Animation / UX Transition |
|---|---|---|---|
| **Home (`MOD-1`)** | Tap "Start Route" | **Home (`MOD-1`)** (updated to En Route) | Instant state switch, Next Stop highlights |
| **Home (`MOD-1`)** | Tap "View Stop Details" or Next Stop Card | **Stop Execution Hub (`MOD-3`)** | Forward slide transition |
| **Home (`MOD-1`)** | Tap "View Manifest" or Route tab | **Route Manifest (`MOD-2`)** | Bottom tab switch |
| **Route (`MOD-2`)** | Tap any Stop Card | **Stop Execution Hub (`MOD-3`)** | Push transition with Stop context |
| **Route (`MOD-2`)** | Tap Map / List toggle | **Route Manifest (`MOD-2`)** (view toggle) | Smooth crossfade between List and Map |
| **Stop Hub (`MOD-3`)** | Tap "Start Handover & POD" | **POD Handover Sheet (`MOD-3.2`)** | Bottom sheet slide-up |
| **Stop Hub (`MOD-3`)** | Tap "Report Issue / Delay" | **Exception Sheet (`MOD-3.3`)** | Modal sheet slide-up |
| **POD Sheet (`MOD-3.2`)** | Tap "Confirm Delivery" | **Stop Hub (`MOD-3`)** $\rightarrow$ Next Stop prompt | Sheet dismisses, success checkmark badge |
| **Stop Hub (`MOD-3`)** | Tap "Next Scheduled Stop" | **Stop Hub (`MOD-3`)** (Next Stop) | Next stop loaded into view |
| **History (`MOD-4`)** | Tap completed Stop item | **POD Receipt Viewer (`MOD-3.2`)** | Read-only drawer slide-up with signature |
| **Profile (`MOD-5`)** | Tap "Sync Now" | **Profile (`MOD-5`)** | Spinner $\rightarrow$ "All items synced" |
