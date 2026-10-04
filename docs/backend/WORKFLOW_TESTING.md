# Waypoint Logistics — End-to-End Walkthrough Guide

This is the click-by-click guide to testing the cross-role operational workflow using the browser demo. 

**Important:** You must use one browser profile (or one Incognito window without closing it) so that locally stored dispatch data remains available when switching accounts. Do not use multiple tabs with different roles simultaneously.

## 1. Store Manager (Order Placement)
1. Sign in using the demo account: `store@waypoint.demo` (Password: `waypoint-demo`)
2. In the outlet selector, choose **Fresh outlet (F-COL-01)**.
3. Navigate to the order creation screen.
4. Submit **one ambient order**.
5. Submit **one chilled order** for the same eligible date.
6. **Validation check**: Attempt to submit a second ambient order for the same date. The system should reject this as a duplicate.
7. Sign out.

## 2. Dispatcher (Routing and Assignment)
1. Sign in using the demo account: `dispatcher@waypoint.demo` (Password: `waypoint-demo`)
2. Select the **Peliyagoda** depot and set the fixture date to **3 October 2026**.
3. Inspect order `ORD-1043` (a chilled, van-only order).
4. **Validation check**: Attempt to assign this order to an incompatible standard truck. The system should block this.
5. Allocate a compatible refrigerated van to the order instead.
6. Record a capacity deferral for an unserved order.
7. Click **Publish Plan** to lock the trips.
8. Sign out.

## 3. Warehouse Loader (Loading and Clearance)
1. Sign in using the demo account: `loader@waypoint.demo` (Password: `waypoint-demo`)
2. Inspect the trip that was just published by the dispatcher.
3. Verify that the loading sequence correctly follows the reverse stop order (LIFO).
4. Verify the physical cargo matches the digital manifest.
5. Provide the final L5 departure clearance to release the truck.
6. Sign out.

## 4. Delivery Driver (Execution and Proof of Delivery)
1. Sign in using the demo account: `driver@waypoint.demo` (Password: `waypoint-demo`)
2. Review the active assigned route.
3. Complete the mandatory pre-trip safety checklist.
4. "Arrive" at the first sample stop on the route.
5. Record a digital signature for Proof of Delivery (POD).
6. **Validation check**: Try submitting a status update while simulating an offline state (if testing local queues).
7. Sign out.

## 5. Store Manager (Receiving and Claims)
1. Sign back in as the Store Manager: `store@waypoint.demo`
2. Navigate to the Receiving dashboard.
3. Inspect the inbound receiving card for your outlet.
4. Log a discrepancy claim (e.g., shortfall or physical damage) for the delivered goods.

---
*Note: The browser flow is a demo of individual workspaces using simulated state propagation. See the architecture document for details on how this maps to backend PostgreSQL storage.*
