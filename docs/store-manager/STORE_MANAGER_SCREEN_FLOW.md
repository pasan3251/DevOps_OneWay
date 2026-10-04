# Store Manager Screen Flow & Workflow Diagrams — Waypoint Logistics

## 1. End-to-End Operational Lifecycle Flow

```mermaid
flowchart TD
  START([Store Manager Signs In]) --> OVERVIEW["Overview Screen<br/>(Check Cutoff, Deliveries & Inbound Trucks)"]
  OVERVIEW --> DECIDE{"Select Action"}
  
  DECIDE -->|Create Order| NEW_ORD["Replenishment Order Screen<br/>(Select Date, Class & SKUs)"]
  DECIDE -->|Review Deliveries| DELIV["Deliveries Screen<br/>(Track Inbound Truck & POD)"]
  DECIDE -->|Manage Orders| ORD_LIST["Orders Hub<br/>(View Status & Details)"]

  NEW_ORD --> SUBMIT["Submit Order to Backend"]
  SUBMIT --> CUTOFF_CHECK{"Submission Time < 16:00?"}
  CUTOFF_CHECK -- Yes --> CONFIRMED["Status: ORDER_RECORDED<br/>(Scheduled for Next-Day Run)"]
  CUTOFF_CHECK -- No --> QUEUED["Status: QUEUED_NEXT_RUN<br/>(Queued for Following Run)"]
  
  CONFIRMED --> DISPATCH_PLAN["Central Dispatcher Plans Route<br/>Status: ASSIGNED"]
  DISPATCH_PLAN --> DRIVER_DEPART["Driver Departs Depot<br/>Status: IN_TRANSIT"]
  DRIVER_DEPART --> DRIVER_ARRIVE["Driver Arrives at Outlet Dock<br/>Status: ARRIVED"]
  
  DRIVER_ARRIVE --> POD_CAPTURE["Physical Handover & Electronic POD<br/>(Store Manager Signs Terminal)"]
  POD_CAPTURE --> DISCREPANCY_CHECK{"Physical Goods Match Order?"}
  DISCREPANCY_CHECK -- Yes --> RECEIPT_CONFIRM["Status: DELIVERED<br/>(Digital Receipt Issued)"]
  DISCREPANCY_CHECK -- No --> LOG_CLAIM["Log Claim (SM-3)<br/>(Shortage or Damage Noted)"]
  LOG_CLAIM --> RECEIPT_CONFIRM
```

---

## 2. Pre-Cutoff Order Placement Flow (`SM-1`)

```mermaid
flowchart TD
  A["Store Manager Opens Order Form"] --> B["Select Target Delivery Date"]
  B --> C{"Store Brand is Fresh?"}
  C -- Yes --> D["Select Class: Ambient OR Chilled"]
  C -- No --> E["Class Automatically Locked to Ambient"]
  
  D --> F["Browse Approved Brand SKU Catalog"]
  E --> F
  F --> G["Select Quantities (Real-Time Weight & Volume Rollup)"]
  
  G --> H{"Existing Order for same Date & Class?"}
  H -- Yes --> I["Block Submission (409 Conflict: Dual-Order Rule)"]
  H -- No --> J["Click Submit Order"]
  
  J --> K{"Time < 16:00?"}
  K -- Yes --> L["Order Scheduled for Tomorrow's Delivery"]
  K -- No --> M["Order Queued for Next Business Run"]
```

---

## 3. Fresh Dual-Order Split Delivery Flow (`ALT-1`)

```mermaid
flowchart TD
  A["Fresh Supermarket Places Dry & Chilled Orders"] --> B["System Links Orders under Outlet ID"]
  B --> C{"Central Dispatcher Vehicle Assignment"}
  
  C -- Reefer has spare ambient space --> D["Single Reefer Truck Assigned<br/>(Both Orders arrive together)"]
  C -- Reefer capacity constrained --> E["Split across 2 Vehicles<br/>(Chilled on Reefer, Ambient on Dry-Box)"]
  
  D --> F["Store Manager sees 1 Delivery Card with 2 Line Categories"]
  E --> G["Store Manager sees 2 Separate Delivery Cards with Distinct ETAs"]
  
  F --> H["Single Receiving & Signature Event"]
  G --> I["Two Independent Receiving & Signature Events"]
```

---

## 4. Delivery Handover & Discrepancy Flow (`SM-3`)

```mermaid
flowchart TD
  A["Driver Terminal presents Manifest"] --> B["Store Manager Inspects Physical Cartons"]
  B --> C{"Are all items present, intact, and temperature verified?"}
  
  C -- Yes --> D["Store Manager signs glass on driver mobile"]
  D --> E["Driver uploads POD with GPS Coordinates"]
  E --> F["Store Manager view updates to DELIVERED with View Receipt action"]
  
  C -- No --> G["Store Manager clicks 'Report Discrepancy'"]
  G --> H["Select Reason: Damage in Transit / Shortage / Temp Breach"]
  H --> I["Enter Shortfall Count and Explanatory Notes"]
  I --> J["Discrepancy Claim Created (DISC-...) & Alert Dispatched to Dispatcher"]
  J --> D
```
