async (page) => {
  const base = "http://localhost:3000";
  const assert = (value, message) => {
    if (!value) throw new Error(message);
  };
  const errors = [];
  const results = [];
  page.on("pageerror", (error) => errors.push(error.message));

  const storageKeys = [
    "waypoint.demo.session.v1",
    "waypoint.demo.store.orders.v1",
    "waypoint.demo.store.discrepancies.v1",
    "waypoint.store.navigation-collapsed.v1",
  ];

  await page.goto(`${base}/login`);
  await page.evaluate((keys) => {
    keys.forEach((key) => localStorage.removeItem(key));
    sessionStorage.removeItem("waypoint.demo.session.v1");
  }, storageKeys);
  await page.reload();
  await page.waitForFunction(() => {
    const signIn = [...document.querySelectorAll("button")].find((button) => button.textContent?.trim() === "Sign in");
    return Boolean(signIn && Object.keys(signIn).some((key) => key.startsWith("__reactProps$")));
  });
  await page.getByRole("textbox", { name: "Email or employee ID" }).fill("STORE001");
  await page.getByRole("textbox", { name: "Password" }).fill("waypoint-demo");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.getByRole("heading", { name: "Today", exact: true }).waitFor();

  const navigation = page.getByRole("navigation", { name: "Store manager navigation" });
  assert(await navigation.getByRole("button").count() === 3, "Store navigation still contains redundant destinations");
  assert(await page.locator(".store-outlet-context").count() === 1, "Assigned outlet context is missing");
  assert(await page.locator(".store-outlet-context select").count() === 0, "Store Manager can still switch outlet scope");
  assert(await page.getByText("Standard store flow", { exact: true }).count() === 1, "Normalized store flow is missing");
  results.push("Today presents the assigned outlet and one four-step operational flow");

  const scroll = await page.locator(".store-content").evaluate((element) => ({
    overflowY: getComputedStyle(element).overflowY,
    scrollable: element.scrollHeight > element.clientHeight,
  }));
  assert(scroll.overflowY === "auto" && scroll.scrollable, "Desktop workspace is not using its primary content scrollbar");
  results.push("The complete Store Manager workspace uses a full-height primary content scrollbar");

  await navigation.getByRole("button", { name: "Orders", exact: true }).click();
  await page.getByRole("heading", { name: "Replenishment orders", exact: true }).waitFor();
  assert(await page.locator(".store-order-table").count() === 1, "TanStack order table is missing");
  await page.getByRole("button", { name: "Deferred", exact: true }).click();
  await page.getByRole("button", { name: /View/i }).first().click();
  const detail = page.getByRole("dialog");
  assert(await detail.getByText("Formal deferral reason", { exact: true }).isVisible(), "Formal deferral reason is hidden");
  assert(await detail.getByRole("button", { name: /Cancel before cutoff/i }).count() === 0, "Deferred order can still be cancelled");
  await detail.getByRole("button", { name: "Close", exact: true }).click();
  results.push("Orders exposes formal Dispatch decisions and locks invalid cancellation states");

  await page.getByRole("button", { name: "Create order", exact: true }).click();
  await page.getByRole("heading", { name: "Build one complete order", exact: true }).waitFor();
  assert(await page.locator(".store-stepper li").count() === 3, "Order builder is not a three-step flow");
  assert(await page.getByRole("button", { name: "Submit order", exact: true }).count() === 0, "Submit action appears before review");
  assert(await page.getByRole("button", { name: /Ambient/i }).count() === 1, "Ambient regime is missing");
  assert(await page.getByRole("button", { name: /Chilled/i }).count() === 1, "Fresh dual-order regime is missing");
  results.push("Create Order is a guided drill-down with Fresh ambient/chilled constraints and one review gate");

  await navigation.getByRole("button", { name: "Receiving", exact: true }).click();
  await page.getByRole("heading", { name: "Receiving", exact: true }).waitFor();
  assert(await page.locator(".store-delivery-card").count() >= 2, "Split Fresh deliveries are not represented independently");
  assert(await page.getByText("Receiving changes", { exact: true }).isVisible(), "ETA or partial-manifest notices are missing");
  assert(await page.getByRole("button", { name: "View POD", exact: true }).count() === 1, "POD action is not scoped to a completed handover");
  assert(await page.getByRole("button", { name: "Report discrepancy", exact: true }).count() === 1, "Discrepancy action is not scoped to a completed handover");
  results.push("Receiving owns split movements, plan changes, POD, and post-handover claims");

  for (const width of [1440, 1120, 768, 390, 320]) {
    await page.setViewportSize({ width, height: width > 1000 ? 900 : 844 });
    assert(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      `Horizontal overflow at ${width}px`,
    );
  }
  await navigation.getByRole("button", { name: "Orders", exact: true }).click();
  await page.getByRole("button", { name: "Create order", exact: true }).click();
  const mobileFontSizes = await page.locator(".store-order-builder input, .store-order-builder select, .store-order-builder textarea")
    .evaluateAll((fields) => fields.map((field) => parseFloat(getComputedStyle(field).fontSize)));
  assert(mobileFontSizes.every((size) => size >= 16), `Mobile form controls are below 16px: ${mobileFontSizes}`);
  results.push("Desktop, tablet, and mobile layouts avoid page-level overflow and mobile input zoom");

  assert(errors.length === 0, `Browser errors: ${errors.join(", ")}`);
  results.push("No JavaScript page errors were observed throughout the normalized flow");
  await page.evaluate((keys) => keys.forEach((key) => localStorage.removeItem(key)), storageKeys);
  return results;
}
