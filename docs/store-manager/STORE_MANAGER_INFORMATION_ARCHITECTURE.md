# Store Manager Information Architecture — Waypoint Logistics

## 1. Information Architecture Overview

The Store Manager interface is designed as an operational command workspace rather than an abstract analytics dashboard. Every screen maps directly to what a Store Manager needs to know and what action they must take during a trading day.

```text
                               STORE MANAGER INFORMATION ARCHITECTURE
   
                                     +----------------------+
                                     |    STORE MANAGER     |
                                     |   UNIFIED WORKSPACE  |
                                     +----------+-----------+
                                                |
          +--------------------+----------------+--------------------+--------------------+
          |                    |                                     |                    |
          v                    v                                     v                    v
  +---------------+   +------------------+                   +---------------+   +------------------+
  | 1. OVERVIEW   |   | 2. NEW ORDER     |                   | 3. ORDERS     |   | 4. DELIVERIES    |
  | Action Hub    |   | Commercial Cart  |                   | Canonical Hub |   | Receiving & POD  |
  +---------------+   +------------------+                   +---------------+   +------------------+
  | Store Banner  |   | Context Bar      |                   | Scoped List   |   | In-Transit ETA   |
  | Cutoff Clock  |   | Brand Catalog    |                   | Status Filter |   | Dual Split ETAs  |
  | Today Deliver |   | Ambient/Chilled  |                   | Order Detail  |   | Digital POD View |
  | Quick Orders  |   | Live Weight/Vol  |                   | Line Items    |   | Discrepancy Form |
  | Fast Actions  |   | Cutoff Validator |                   | Cancellation  |   | Receipt Confirm  |
  +---------------+   +------------------+                   +---------------+   +------------------+
```

---

## 2. Views & Navigation Structure

Navigation is streamlined into **4 primary operational views**:

### View 1: Operational Overview (`overview`)
- **Purpose**: Answer immediate morning operational questions: *"What needs my attention? When is my next cutoff? What truck is arriving today?"*
- **Components**:
  1. **Store Identity Banner**: Store Code, Name, Banner (`Fresh`, `Style`, `Tech`), District, Operating Depot, Contractual Receiving Window (`window_start` - `window_end`), and Van-Only physical restriction flag.
  2. **16:00 Operational Cutoff Monitor**: Real-time clock and countdown to 16:00 with explicit scheduling indicator (*"Orders placed now arrive Tomorrow"* vs *"Orders placed after 16:00 queue for following run"*).
  3. **Today's Delivery Inbound Tracker**: Displays arriving truck registration, driver name, live transit status (`PLANNED`, `EN_ROUTE`, `ARRIVED`), and ETA. If a Fresh dual order is split onto two trucks (`ALT-1`), displays two linked cards.
  4. **Active Orders Status Summary**: Metric counters for orders currently in `ORDER_RECORDED`, `ASSIGNED`, `IN_TRANSIT`, `DELIVERED`, and `QUEUED_NEXT_RUN`.
  5. **Quick Primary Action**: "Create Replenishment Order" button.

### View 2: Replenishment Order Creation (`new-order`)
- **Purpose**: Focused commercial purchasing workflow allowing the Store Manager to assemble, validate, and submit store stock requests before 16:00.
- **Components**:
  1. **Order Context Bar**: Target delivery date selector (defaulting to next trading day), and for Fresh supermarkets, a temperature class toggle (`Ambient (Dry Goods)` vs `Chilled (Dairy / Meat)`).
  2. **SKU Product Catalog**: Filterable by category, searchable by SKU or product name, showing unit weight (kg), unit volume ($m^3$), and unit price.
  3. **Quantity Stepper Controls**: Quick increment/decrement buttons with direct numeric input.
  4. **Live Manifest Rollup Sidebar**: Real-time reactive calculation of:
     - Total Line Items
     - Total Physical Weight (kg)
     - Total Volumetric Footprint ($m^3$)
     - Order Subtotal (LKR)
     - Cutoff Validation Status Indicator
  5. **Submit Action**: Single authoritative submission button with loading state and duplicate prevention.

### View 3: Orders Canonical Hub (`orders`)
- **Purpose**: Search, filter, inspect, and manage replenishment orders.
- **Components**:
  1. **Orders Table / Card List**: Scoped to the Store Manager's outlet, filterable by date, brand, status, and temperature class.
  2. **Order Detail Drawer / Modal**:
     - Order metadata header (Order Number, Date, Status Pill, Submission timestamp).
     - Order status timeline (`ORDER_RECORDED` $\to$ `ASSIGNED` $\to$ `IN_TRANSIT` $\to$ `DELIVERED`).
     - Line items table with requested quantities, unit weight, unit price, and item totals.
     - Dispatch trip context (Trip Number, Vehicle Registration, Driver Profile).
     - Pre-cutoff cancellation button (enabled only when unassigned).

### View 4: Deliveries & Receiving (`deliveries`)
- **Purpose**: Manage physical vehicle arrival, review electronic Proof of Delivery, and acknowledge receipts or log discrepancy claims (`SM-3`).
- **Components**:
  1. **Inbound Shipments Table**: Expected arrival window, driver name, vehicle type, and current status.
  2. **Proof of Delivery Inspector**:
     - Receiving representative printed name.
     - Digital signature inspection canvas.
     - Geofence coordinate verification stamp (Latitude, Longitude, and timestamp).
  3. **Discrepancy Claim Modal (`SM-3`)**: Form to report carton shortages, damaged goods, or temperature violations directly to the Central Dispatcher with photos/notes.
