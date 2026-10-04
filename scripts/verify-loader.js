async (page) => {
  const base = "http://localhost:3000";
  const assert = (value, message) => {
    if (!value) throw new Error(message);
  };
  const errors = [];
  const results = [];
  page.on("pageerror", (error) => errors.push(error.message));

  const storageKeys = [
    "waypoint.demo.dispatch.v1",
    "waypoint.demo.workspace.v1",
    "waypoint.demo.session.v1",
    "waypoint.demo.loader.discrepancies.v1",
    "waypoint.demo.loader.clearances.v1",
    "waypoint.demo.loader.verifications.v1",
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

  await page.getByRole("textbox", { name: "Email or employee ID" }).fill("LOAD001");
  await page.getByRole("textbox", { name: "Password" }).fill("waypoint-demo");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.getByRole("heading", { name: "Staging queue", exact: true }).waitFor();

  // Responsive shell and touch controls.
  for (const width of [1440, 1120, 768, 390, 320]) {
    await page.setViewportSize({ width, height: width > 1000 ? 950 : 844 });
    assert(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      `Horizontal overflow at ${width}px`
    );
    if (width <= 768) {
      const sizes = await page
        .locator(".dispatch-app input:not([type=checkbox]), .dispatch-app select")
        .evaluateAll((fields) => fields.map((field) => parseFloat(getComputedStyle(field).fontSize)));
      assert(sizes.every((size) => size >= 16), `Small inputs at ${width}px: ${sizes}`);
    }
  }
  results.push("Responsive loader shell has no page-level horizontal overflow");
  await page.setViewportSize({ width: 1440, height: 950 });

  // Queue is the only top-level entry into loading.
  assert(await page.locator(".loader-stat-card").count() === 4, "Staging summary is incomplete");
  assert(await page.locator(".loader-trip-card").count() === 1, "Released trip card is missing");
  assert(
    await page.getByRole("navigation", { name: "Loader navigation" }).getByRole("button").count() === 3,
    "Loader navigation contains a redundant top-level screen"
  );
  results.push("Queue-first information architecture exposes three non-redundant navigation items");

  // Depot parity: a Peliyagoda trip cannot remain visible in Kandy.
  await page.locator(".dispatch-context select").selectOption("Kandy");
  assert(await page.locator(".loader-trip-card").count() === 0, "Cross-depot trip leaked into Kandy");
  await page.locator(".dispatch-context select").selectOption("Peliyagoda");
  results.push("Depot change prevents cross-depot manifest access");

  await page.getByRole("button", { name: "Open loading checklist", exact: true }).click();
  await page.getByRole("heading", { name: "WP-012 loading checklist", exact: true }).waitFor();
  assert(await page.locator(".loader-lifo-banner").isVisible(), "LIFO instruction is missing");
  const stopCards = page.locator(".loader-stop-card");
  assert(await stopCards.count() === 2, "Expected two LIFO stop cards");
  assert((await stopCards.first().innerText()).includes("Delivery Stop 2"), "Last delivery stop is not loaded first");
  assert((await stopCards.last().innerText()).includes("Delivery Stop 1"), "Stop 1 is not placed nearest the rear door");
  results.push("Checklist presents the exact reverse-stop LIFO sequence");

  const clearButton = page.getByRole("button", { name: "Clear vehicle for departure", exact: true });
  assert(await clearButton.isDisabled(), "Departure should be locked before physical verification");
  assert(await page.getByRole("button", { name: /Verify all/i }).count() === 0, "Unsafe bulk verification is still present");

  // Per-SKU verification gates each stop.
  const firstStop = stopCards.first();
  const firstConfirm = firstStop.getByRole("button", { name: "Confirm stop loaded", exact: true });
  assert(await firstConfirm.isDisabled(), "Stop confirmation should be locked before SKU checks");
  const firstSkuChecks = firstStop.locator("input[type=checkbox]");
  for (let index = 0; index < await firstSkuChecks.count(); index += 1) {
    await firstSkuChecks.nth(index).check();
  }
  assert(await firstConfirm.isEnabled(), "Stop confirmation did not unlock after all SKU checks");
  await firstConfirm.click();
  results.push("Each stop requires per-SKU confirmation; no bulk verification shortcut remains");

  // Progress survives navigation and reload.
  await page.getByRole("navigation", { name: "Loader navigation" })
    .getByRole("button", { name: "Exception log", exact: true }).click();
  await page.getByRole("button", { name: "Open loading checklist", exact: true }).click();
  assert(await stopCards.first().getByRole("button", { name: "Undo stop verification", exact: true }).isVisible(), "Verification was lost after navigation");
  await page.reload();
  await page.getByRole("heading", { name: "Staging queue", exact: true }).waitFor();
  await page.getByRole("button", { name: "Open loading checklist", exact: true }).click();
  assert(await page.locator(".loader-stop-card").first().getByRole("button", { name: "Undo stop verification", exact: true }).isVisible(), "Verification was lost after reload");
  results.push("Trip verification progress persists across navigation and reload");

  // Finish the second stop and clear departure.
  const secondStop = page.locator(".loader-stop-card").last();
  const secondSkuChecks = secondStop.locator("input[type=checkbox]");
  for (let index = 0; index < await secondSkuChecks.count(); index += 1) {
    await secondSkuChecks.nth(index).check();
  }
  await secondStop.getByRole("button", { name: "Confirm stop loaded", exact: true }).click();
  assert(await clearButton.isEnabled(), "Departure did not unlock after all four gates passed");
  await clearButton.click();
  await page.getByRole("dialog").getByRole("button", { name: "Confirm and release", exact: true }).click();
  await page.getByRole("heading", { name: "Staging queue", exact: true }).waitFor();
  assert(await page.getByText("Departure cleared", { exact: true }).count() >= 1, "Cleared state is missing from the queue");
  results.push("Departure clearance locks the verified manifest and returns to the queue");

  // Start a clean, uncleared manifest and verify FAIL-A ownership.
  await page.evaluate(() => {
    localStorage.removeItem("waypoint.demo.loader.clearances.v1");
    localStorage.removeItem("waypoint.demo.loader.verifications.v1");
    localStorage.removeItem("waypoint.demo.loader.discrepancies.v1");
  });
  await page.reload();
  await page.getByRole("heading", { name: "Staging queue", exact: true }).waitFor();
  await page.getByRole("button", { name: "Open loading checklist", exact: true }).click();
  await page.locator(".loader-stop-card").first().getByRole("button", { name: "Report issue", exact: true }).first().click();
  const issueDialog = page.getByRole("dialog");
  await issueDialog.locator("select").selectOption("damaged");
  await issueDialog.locator("input[type=number]").fill("3");
  await issueDialog.locator("textarea").fill("Crates punctured during pallet transfer.");
  await issueDialog.getByRole("button", { name: "Report and notify Dispatch", exact: true }).click();
  assert(await clearButton.isDisabled(), "A pending dispatch decision did not lock departure");
  await page.getByRole("navigation", { name: "Loader navigation" })
    .getByRole("button", { name: "Exception log", exact: true }).click();
  assert(await page.getByText("Waiting on Dispatch", { exact: true }).count() >= 1, "Pending dispatch instruction is not visible");
  assert(await page.getByRole("button", { name: /^(Ship partial|Hold for replacement|Defer order)$/ }).count() === 0, "Loader can still choose a dispatcher-only resolution");
  results.push("FAIL-A creates a dispatch hold; the loader view cannot choose the resolution");

  assert(errors.length === 0, `Browser errors: ${errors.join(", ")}`);
  results.push("No JavaScript errors were observed throughout the normalized flow");

  await page.evaluate((keys) => {
    keys.forEach((key) => localStorage.removeItem(key));
  }, storageKeys);
  return results;
}
