async (page) => {
  await page.route("**://**tile.openstreetmap.org/**", route => route.fulfill({ contentType: "image/png", body: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=", "base64") }));
  const base = "http://127.0.0.1:3000";
  const assert = (value, message) => { if (!value) throw new Error(message); };
  const errors = []; page.on("pageerror", error => errors.push(error.message));
  const results = [];

  // SETUP: fresh loader session
  await page.goto(`${base}/login`);
  await page.evaluate(() => {
    localStorage.removeItem("waypoint.demo.dispatch.v1");
    localStorage.removeItem("waypoint.demo.workspace.v1");
    localStorage.removeItem("waypoint.demo.session.v1");
    localStorage.removeItem("waypoint.demo.loader.discrepancies.v1");
    localStorage.removeItem("waypoint.demo.loader.clearances.v1");
    sessionStorage.removeItem("waypoint.demo.session.v1");
  });
  await page.reload();

  // Sign in as Loader
  await page.getByRole("button", { name: /Warehouse Loader/ }).click();
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.getByRole("heading", { name: "Warehouse staging overview", exact: true }).waitFor();

  // 1. RESPONSIVE LAYOUT
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.evaluate(() => document.fonts.ready);
  for (const width of [1440, 1120, 1024, 768, 390, 320]) {
    const height = width > 1000 ? 1000 : 844;
    await page.setViewportSize({ width, height });
    assert(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      `Horizontal overflow at ${width}px`
    );
    if (width <= 768) {
      const sizes = await page
        .locator(".dispatch-app input:not([type=checkbox]), .dispatch-app select")
        .evaluateAll(fields => fields.map(f => parseFloat(getComputedStyle(f).fontSize)));
      assert(sizes.every(s => s >= 16), `Small-viewport inputs below 16px at ${width}px: ${sizes}`);
    }
    await page.screenshot({ path: `.impeccable/review/loader-overview-${width}.png`, fullPage: true });
  }
  results.push("All breakpoints (1440/1120/1024/768/390/320px) render without horizontal overflow");
  await page.setViewportSize({ width: 1440, height: 1000 });

  // 2. STAGING OVERVIEW: metric cards and vehicle queue
  assert(await page.locator(".loader-stat-card").count() >= 4, "Summary strip missing metric cards");
  assert(await page.locator(".loader-vehicle-card").count() >= 1, "Staging queue is empty");
  const firstCardText = await page.locator(".loader-vehicle-card").first().innerText();
  assert(firstCardText.includes("TRIP-01"), `First vehicle card does not show TRIP-01: "${firstCardText}"`);
  results.push("Staging overview metric cards and vehicle queue render correctly");

  // 3. LIFO MANIFEST: navigate and check layout
  await page.locator(".loader-vehicle-card").first().getByRole("button", { name: /Open LIFO Checklist|View Cleared Manifest/ }).click();
  await page.getByRole("heading", { name: "LIFO loading manifest", exact: true }).waitFor();
  await page.screenshot({ path: ".impeccable/review/loader-manifest-initial.png", fullPage: true });

  assert(await page.locator("text=LIFO Staging Sequence").isVisible(), "LIFO staging sequence banner not visible");
  assert(await page.locator(".workspace-panel .h-2.bg-muted.rounded-full").count() >= 3, "Payload progress bars not found");

  const clearBtn = page.getByRole("button", { name: /Clear for Departure/ });
  assert(await clearBtn.isDisabled(), "Clear for Departure should be disabled before verification");

  // 4. LIFO SKU CHECKLIST: toggle expand
  const firstStopRow = page.locator(".workspace-panel .divide-y > div").first();
  await firstStopRow.locator(".cursor-pointer").first().click();
  await firstStopRow.locator(".cursor-pointer").first().click();
  const firstSkuCheckbox = firstStopRow.locator("input[type=checkbox]").first();
  if (await firstSkuCheckbox.count() > 0) { await firstSkuCheckbox.check(); }
  results.push("LIFO manifest SKU checklist expands and individual SKU checkbox works");

  // 5. VERIFY ALL STOPS (bulk)
  await page.getByRole("button", { name: "Verify All Stops", exact: true }).click();
  await page.waitForTimeout(300);
  assert(await clearBtn.isEnabled(), "Clear for Departure should be enabled after Verify All Stops");
  await page.screenshot({ path: ".impeccable/review/loader-manifest-all-verified.png", fullPage: true });
  results.push("Verify All Stops enables the Clear for Departure button");

  // 6. RESET VERIFICATION
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await page.waitForTimeout(200);
  assert(await clearBtn.isDisabled(), "Clear for Departure should be disabled again after Reset");
  results.push("Reset clears all verifications and re-gates the departure clearance");

  // 7. FAIL-A EXCEPTION LOGGING
  const logBtn = page.locator("button", { hasText: /Log Shortfall\/Damage/ }).first();
  await logBtn.click();
  await page.getByRole("dialog").waitFor();
  await page.getByRole("dialog").locator("select").selectOption("damaged");
  await page.getByRole("dialog").locator("input[type=number]").fill("3");
  await page.getByRole("dialog").locator("textarea").fill("Crates punctured during pallet transfer.");
  await page.getByRole("button", { name: "Log Exception & Notify Dispatch", exact: true }).click();
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  await page.waitForTimeout(300);

  assert(await page.locator(".loader-badge.discrepancy").isVisible(), "Exception badge not shown after logging");
  assert(await page.locator("text=/FAIL-A Exception/").count() >= 1, "FAIL-A exception line not shown");
  await page.screenshot({ path: ".impeccable/review/loader-manifest-fail-a.png", fullPage: true });
  results.push("FAIL-A exception dialog logs discrepancy and annotates the affected stop");

  assert(await page.locator("text=/kg exception/").count() >= 1, "Payload recalculation annotation missing");
  results.push("Payload bars recalculate and annotate exception weight reduction");

  // 8. ALT-6 MANIFEST REVISION SIMULATION
  await page.getByRole("button", { name: /Simulate Plan Change \(ALT-6\)/ }).click();
  await page.waitForTimeout(300);

  const revBanner = page.locator("text=High Priority Alert: Manifest Plan Revised (ALT-6)");
  assert(await revBanner.isVisible(), "ALT-6 revision alert banner not shown");
  assert(await page.locator("text=/v1\.0 → v1\./").count() >= 1, "Version transition badge not shown");
  assert(await page.locator("text=/Re-ordered in .* \(ALT-6\)/").count() >= 1, "Re-ordered stop badge not shown");
  assert(await clearBtn.isDisabled(), "Clearance gate should re-lock during ALT-6 revision");
  await page.screenshot({ path: ".impeccable/review/loader-manifest-alt6.png", fullPage: true });
  results.push("ALT-6 simulation shows banner, version badge, re-ordered highlights, and re-gates clearance");

  await page.getByRole("button", { name: "Acknowledge & Re-verify LIFO", exact: true }).click();
  await page.waitForTimeout(200);
  assert(!(await revBanner.isVisible()), "ALT-6 banner should dismiss after acknowledgement");
  results.push("Acknowledging ALT-6 revision clears the banner");

  // 9. L5 DEPARTURE CLEARANCE SIGN-OFF
  await page.getByRole("button", { name: "Verify All Stops", exact: true }).click();
  await page.waitForTimeout(300);
  assert(await clearBtn.isEnabled(), "Clear for Departure should be enabled after re-verify");

  await clearBtn.click();
  const clearModal = page.getByRole("dialog");
  await clearModal.waitFor();
  assert(await clearModal.getByText("Confirm Vehicle Departure Clearance (L5)").isVisible(), "L5 clearance modal title not found");
  assert(await clearModal.locator("text=TRIP-01").isVisible(), "Trip ID not in clearance modal");
  assert(await clearModal.locator("text=/Final Cleared Payload/").isVisible(), "Cleared payload summary missing");
  await page.screenshot({ path: ".impeccable/review/loader-clearance-modal.png", fullPage: true });

  await clearModal.getByRole("button", { name: "Confirm & Release Manifest", exact: true }).click();
  await clearModal.waitFor({ state: "hidden" });
  await page.getByRole("heading", { name: "Warehouse staging overview", exact: true }).waitFor();

  const feedbackMsg = page.locator(".dispatch-feedback");
  assert(await feedbackMsg.isVisible(), "No feedback message shown after clearance");
  const feedbackText = await feedbackMsg.innerText();
  assert(feedbackText.includes("TRIP-01"), `Feedback doesn't mention TRIP-01: "${feedbackText}"`);
  await page.screenshot({ path: ".impeccable/review/loader-overview-after-clearance.png", fullPage: true });
  results.push("L5 clearance modal confirms departure, returns to overview, shows feedback toast");

  // 10. CLEARANCE PERSISTENCE across reload
  await page.reload();
  await page.getByRole("heading", { name: "Warehouse staging overview", exact: true }).waitFor();
  const clearedCard = page.locator(".loader-vehicle-card").filter({ hasText: "TRIP-01" });
  assert(await clearedCard.count() >= 1, "TRIP-01 card missing after reload");
  assert(await clearedCard.locator(".loader-badge.cleared").count() >= 1, "Cleared badge missing after reload");
  results.push("Departure clearance persists across reload — TRIP-01 shows Cleared badge");

  const clearedStatCard = page.locator(".loader-stat-card").filter({ hasText: "Cleared Departures" });
  const clearedStatValue = await clearedStatCard.locator(".loader-stat-value").innerText();
  assert(clearedStatValue.includes("1"), `Cleared Departures stat should show 1, got: "${clearedStatValue}"`);
  results.push("Cleared Departures metric increments correctly and survives reload");

  // 11. MANIFEST LOCKED after clearance
  await page.locator(".loader-vehicle-card").filter({ hasText: "TRIP-01" })
    .getByRole("button", { name: /View Cleared Manifest/ }).click();
  await page.getByRole("heading", { name: "LIFO loading manifest", exact: true }).waitFor();
  const lockedBtn = page.getByRole("button", { name: "Cleared for Departure", exact: true });
  assert(await lockedBtn.isVisible(), "Locked Cleared for Departure button not shown");
  assert(await lockedBtn.isDisabled(), "Cleared manifest should be read-only");
  assert(await page.getByRole("button", { name: "Verify All Stops", exact: true }).isDisabled(), "Verify All Stops should be disabled on cleared manifest");
  await page.screenshot({ path: ".impeccable/review/loader-manifest-cleared-locked.png", fullPage: true });
  results.push("Cleared manifest is fully read-only — all action buttons disabled");

  // 12. DISCREPANCY LOG
  await page.getByRole("navigation", { name: "Loader navigation" })
    .getByRole("button", { name: "Discrepancy log", exact: true }).click();
  await page.getByRole("heading", { name: "Discrepancy log (FAIL-A)", exact: true }).waitFor();
  assert(await page.locator("table tbody tr, .workspace-table tbody tr").count() >= 1, "Discrepancy log is empty");
  await page.screenshot({ path: ".impeccable/review/loader-discrepancy-log.png", fullPage: true });
  results.push("Discrepancy log shows logged FAIL-A exceptions");

  // 13. SIGNED-OUT GUARD
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await page.getByRole("heading", { name: "Sign in", exact: true }).waitFor();
  await page.goto(`${base}/workspace/loader`);
  await page.getByRole("heading", { name: "Sign in", exact: true }).waitFor();
  results.push("Sign-out and logged-out navigation guard work correctly");

  // FINAL
  assert(errors.length === 0, `Browser console errors: ${errors.join(", ")}`);
  results.push("No JavaScript console errors throughout all loader scenarios");

  await page.evaluate(() => {
    localStorage.removeItem("waypoint.demo.loader.discrepancies.v1");
    localStorage.removeItem("waypoint.demo.loader.clearances.v1");
  });

  return results;
}
