async (page) => {
  const assert = (value, message) => { if (!value) throw new Error(message); };
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("http://127.0.0.1:3000/login");
  await page.evaluate(() => { localStorage.removeItem("waypoint.demo.dispatch.v1"); localStorage.removeItem("waypoint.demo.session.v1"); sessionStorage.removeItem("waypoint.demo.session.v1"); });
  await page.reload();
  await page.getByRole("button", {name:/Dispatcher Planning office/}).click();
  await page.getByRole("button", {name:"Sign in",exact:true}).click();
  await page.getByRole("heading", {name:"Today’s overview",exact:true}).waitFor();
  const nav = page.getByRole("navigation", {name:"Dispatcher navigation"});
  await page.setViewportSize({width:1440,height:1000});
  await nav.getByRole("button", {name:"Route planning",exact:true}).click();
  await page.getByLabel("Select all visible orders",{exact:true}).check();
  await nav.getByRole("button", {name:"Order intake",exact:true}).click();
  await page.getByRole("heading", {name:"Order intake",exact:true}).waitFor();
  assert(await page.locator('.intake-table input[type="checkbox"]:checked').count() === 1,"Bulk route selection leaked into single-order intake");
  await page.getByRole("button",{name:"Defer orders",exact:true}).click();
  assert((await page.getByRole("dialog").innerText()).includes("1 selected order(s)"),"Intake deferral included other route selections");
  await page.getByLabel("Decision note",{exact:true}).fill("No refrigerated van available; prioritize this order on the next run.");
  await page.getByRole("button",{name:"Save deferral",exact:true}).click();
  assert(await page.evaluate(() => JSON.parse(localStorage.getItem("waypoint.demo.dispatch.v1")).deferrals.length) === 1,"Intake deferred multiple orders");
  await page.getByRole("button",{name:"Return to backlog",exact:true}).click();
  assert(await page.locator(".intake-table tbody tr").count() === 5,"Pagination first page mismatch");
  await page.getByRole("button", {name:"Next orders page",exact:true}).click();
  assert(await page.locator(".intake-table tbody tr").count() === 1,"Pagination second page mismatch");
  await page.getByRole("button", {name:"Previous orders page",exact:true}).click();
  await page.getByRole("button", {name:/^Assigned\s*2$/}).click();
  assert(await page.locator(".intake-table tbody tr").count() === 2,"Assigned status filter mismatch");
  await page.getByRole("button", {name:/^Pending\s*4$/}).click();
  assert(await page.locator(".intake-table tbody tr").count() === 4,"Pending status filter mismatch");
  await page.getByLabel("Filter by brand", {exact:true}).selectOption("Tech");
  assert(await page.locator(".intake-table tbody tr").count() === 1,"Brand filter mismatch");
  await page.getByLabel("Search orders", {exact:true}).fill("no matching outlet");
  await page.getByRole("heading", {name:"No matching orders",exact:true}).waitFor();
  await page.getByRole("button", {name:"Clear filters",exact:true}).click();
  await page.getByRole("button", {name:"View ORD-1043",exact:true}).click();
  await page.getByRole("button", {name:"Assign to trip",exact:true}).click();
  await page.getByText("Assignment blocked",{exact:true}).waitFor();
  assert((await page.locator(".assignment-error").innerText()).includes("van-only"),"Missing invalid vehicle explanation");
  assert(await page.getByRole("button",{name:"Create trip for ORD-1043 with WP-008",exact:true}).count() === 1,"Eligible refrigerated van missing");
  assert(await page.getByRole("button",{name:"Create trip for ORD-1043 with WP-012",exact:true}).count() === 0,"Ineligible truck suggested");
  await page.getByRole("button",{name:"Close order details",exact:true}).click();
  await page.getByRole("button",{name:"Open order details",exact:true}).click();
  await page.getByLabel("Order details width",{exact:true}).focus();
  await page.keyboard.press("End");
  assert(await page.getByLabel("Order details width",{exact:true}).inputValue() === "400","Order width slider failed");
  await page.keyboard.press("Home");
  await page.keyboard.press("ArrowRight"); await page.keyboard.press("ArrowRight"); await page.keyboard.press("ArrowRight"); await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(300);
  await page.screenshot({path:".impeccable/review/intake-desktop.png",fullPage:true});
  await page.locator(".operations-detail-scroll").evaluate(element => element.scrollTop = element.scrollHeight);
  await page.screenshot({path:".impeccable/review/intake-assignment.png",fullPage:true});
  const before = await page.evaluate(() => localStorage.getItem("waypoint.demo.dispatch.v1"));
  await page.evaluate(() => { window.__opsOriginalSetItem = Storage.prototype.setItem; Storage.prototype.setItem = function(key,value) { if(key === "waypoint.demo.dispatch.v1") throw new DOMException("Synthetic failure","QuotaExceededError"); return window.__opsOriginalSetItem.call(this,key,value); }; });
  try {
    await page.getByRole("button",{name:"Create trip for ORD-1043 with WP-008",exact:true}).click();
    await page.getByRole("alert").filter({hasText:"Your browser couldn’t save this change"}).waitFor();
    assert(await page.getByLabel("Select ORD-1043",{exact:true}).isChecked(),"Failed allocation lost selection");
    assert(await page.evaluate(() => localStorage.getItem("waypoint.demo.dispatch.v1")) === before,"Failed allocation mutated persistence");
  } finally { await page.evaluate(() => { Storage.prototype.setItem = window.__opsOriginalSetItem; delete window.__opsOriginalSetItem; }); }
  await page.getByRole("button",{name:"Create trip for ORD-1043 with WP-008",exact:true}).click();
  await page.getByRole("heading",{name:"Route planning",exact:true}).waitFor();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("waypoint.demo.dispatch.v1")));
  const newTrip = saved.trips.find(trip => trip.orderIds.includes("ORD-1043"));
  assert(newTrip?.vehicleId === "WP-008","New trip allocation failed");
  assert(newTrip.orderIds.length === 1,"Single-order intake allocated other selected orders");
  assert(saved.trips.filter(trip => trip.orderIds.includes("ORD-1043")).length === 1,"Duplicate order allocation");
  await page.reload(); await page.getByRole("heading",{name:"Route planning",exact:true}).waitFor();
  await page.getByRole("button",{name:`Select route ${newTrip.id}`,exact:true}).click();
  assert(await page.getByLabel("Select ORD-1043",{exact:true}).count() === 0,"Assigned order in route backlog");
  await page.screenshot({path:".impeccable/review/routes-desktop.png",fullPage:true});
  await nav.getByRole("button",{name:"Manage fleet",exact:true}).click();
  await page.getByRole("button",{name:"Inspect WP-008",exact:true}).click();
  assert((await page.getByRole("complementary",{name:"Vehicle details"}).innerText()).includes(newTrip.id),"Fleet did not reflect new route");
  await page.getByRole("button",{name:"Inspect WP-027",exact:true}).click();
  await page.getByText("In workshop. Unavailable for allocation.",{exact:true}).waitFor();
  assert(await page.getByRole("button",{name:"Create trip with WP-027",exact:true}).count() === 0,"Workshop allocation exposed");
  await page.getByLabel("Vehicle status",{exact:true}).selectOption("Workshop");
  assert(await page.locator(".fleet-vehicle-card").count() === 1,"Workshop filter mismatch");
  await page.getByLabel("Vehicle status",{exact:true}).selectOption("All statuses");
  await page.getByLabel("Search vehicles",{exact:true}).fill("unmatched");
  await page.getByRole("heading",{name:"No matching vehicles",exact:true}).waitFor();
  await page.getByRole("button",{name:"Clear vehicle filters",exact:true}).click();
  await page.getByRole("button",{name:"Inspect WP-008",exact:true}).click();
  await page.locator(".fleet-workspace-scroll").evaluate(element => element.scrollTop = 0);
  await page.screenshot({path:".impeccable/review/fleet-desktop.png",fullPage:true});
  await page.getByRole("button",{name:"Managed capacities",exact:true}).click();
  assert(await page.locator(".capacity-table tbody tr").count() === 2,"Capacity trip rows mismatch");
  await page.locator(".fleet-workspace-scroll").evaluate(element => element.scrollTop = 0);
  await page.screenshot({path:".impeccable/review/capacity-desktop.png",fullPage:true});
  await page.locator(".fleet-workspace-scroll").evaluate(element => element.scrollTop = element.scrollHeight);
  await page.screenshot({path:".impeccable/review/fleet-analysis.png",fullPage:true});
  await page.getByRole("button",{name:`Edit route ${newTrip.id}`,exact:true}).click();
  await page.getByLabel("Trip departure",{exact:true}).fill("07:50");
  await page.getByText("A stop finishes after its delivery window. Change departure or split the trip.",{exact:true}).waitFor();
  await page.getByLabel("Trip departure",{exact:true}).fill("03:30");
  await page.getByRole("button",{name:"Remove ORD-1043 from trip",exact:true}).click();
  await page.getByRole("button",{name:"Remove empty trip",exact:true}).click();
  assert(await page.getByRole("button",{name:`Select route ${newTrip.id}`,exact:true}).count() === 0,"Empty route not removed");
  for (const width of [1024,390,320]) {
    await page.setViewportSize({width,height:844});
    for (const [label, prefix] of [["Order intake","intake"],["Manage fleet","fleet"],["Route planning","routes"]]) {
      await nav.getByRole("button",{name:label,exact:true}).click();
      await page.getByRole("heading",{name:label,exact:true}).waitFor();
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),`${label} overflow at ${width}`);
      if (width <= 760) {
        const sizes = await page.locator('.dispatch-app input:not([type="checkbox"]):not([type="range"]), .dispatch-app select').evaluateAll(fields => fields.filter(field => field.getBoundingClientRect().width).map(field => parseFloat(getComputedStyle(field).fontSize)));
        assert(sizes.every(size => size >= 16),`Small phone controls in ${label}`);
      }
      await page.screenshot({path:`.impeccable/review/${prefix}-${width}.png`,fullPage:true});
      if (label === "Route planning" && width === 1024) {
        const bounds = await page.locator(".dispatch-planning-grid").evaluate(element => { const panels = [...element.children].map(child => child.getBoundingClientRect()); return panels[0].bottom <= panels[1].top && panels.every(panel => panel.width >= element.clientWidth * .95); });
        assert(bounds,"Tablet route panels overlap or do not fill the available width");
      }
      if (width <= 760 && label === "Manage fleet") {
        await page.getByRole("button",{name:"Inspect WP-008",exact:true}).click();
        await page.waitForFunction(() => document.activeElement?.matches(".fleet-inspector"));
        assert(await page.getByRole("complementary",{name:"Vehicle details"}).evaluate(element => element === document.activeElement),"Phone vehicle inspection did not focus details");
        await page.getByRole("button",{name:"Managed capacities",exact:true}).click();
        await page.evaluate(() => { window.scrollTo(0,0); document.querySelector(".fleet-workspace-scroll").scrollTop = 0; });
        await page.screenshot({path:`.impeccable/review/capacity-${width}.png`,fullPage:true});
      }
      if (width <= 760 && label === "Order intake") {
        await page.getByRole("button",{name:"View ORD-1043",exact:true}).click();
        await page.waitForFunction(() => document.activeElement?.matches(".operations-detail"));
        assert(await page.getByRole("complementary",{name:"Order details"}).evaluate(element => element === document.activeElement),"Phone order inspection did not focus details");
      }
    }
  }
  await page.setViewportSize({width:1440,height:1000});
  await page.evaluate(() => window.scrollTo(0,0));
  await nav.getByRole("button",{name:"Order intake",exact:true}).click();
  await page.getByLabel("Depot",{exact:true}).selectOption("Kandy");
  assert(await page.locator(".intake-table tbody tr").count() === 2,"Depot isolation failed");
  await page.getByLabel("Operating day",{exact:true}).fill("2026-10-05");
  await page.getByRole("heading",{name:"No demo orders for this day",exact:true}).waitFor();
  await page.getByRole("button",{name:"Return to demo day",exact:true}).click();
  await page.getByLabel("Depot",{exact:true}).selectOption("Peliyagoda");
  await page.evaluate(() => localStorage.removeItem("waypoint.demo.dispatch.v1"));
  await page.reload(); await page.getByRole("heading",{name:"Order intake",exact:true}).waitFor();
  assert(errors.length === 0, errors.join(", "));
  return "Passed: order pagination/status/brand/search, invalid assignment recovery, eligible whole-order allocation, atomic failed-save/retry and reload, fleet filters/workshop/routes, capacity table, route editing/empty removal, depot/date states, 1024/390/320px layouts and phone control sizes; no page errors.";
}
