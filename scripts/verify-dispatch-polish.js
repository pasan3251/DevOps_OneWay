async (page) => {
  await page.route("**://**tile.openstreetmap.org/**", route => route.fulfill({ contentType: "image/png", body: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=", "base64") }));
  const assert = (value, message) => {
    if (!value) throw new Error(message);
  };
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("http://127.0.0.1:3000/login");
  await page.evaluate(() => {
    localStorage.removeItem("waypoint.demo.dispatch.v1"); localStorage.removeItem("waypoint.demo.workspace.v1");
    localStorage.removeItem("waypoint.demo.session.v1");
    sessionStorage.removeItem("waypoint.demo.session.v1");
  });
  await page.reload();
  await page
    .getByRole("button", { name: /Dispatcher Planning office/ })
    .click();
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page
    .getByRole("heading", { name: "Today’s overview", exact: true })
    .waitFor();
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.evaluate(() => document.fonts.ready);
  const separator = page.getByRole("separator", {
    name: "Resize planning panel",
  });
  await separator.focus();
  await page.keyboard.press("End");
  await page.waitForTimeout(300);
  assert(
    (await separator.getAttribute("aria-valuenow")) === "390",
    "Resize separator keyboard maximum failed",
  );
  await page.keyboard.press("Home");
  await page.waitForTimeout(300);
  const bounds = await separator.boundingBox();
  await page.mouse.move(
    bounds.x + bounds.width / 2,
    bounds.y + bounds.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(bounds.x - 60, bounds.y + bounds.height / 2, {
    steps: 5,
  });
  await page.mouse.up();
  await page.waitForTimeout(300);
  assert(
    Number(await separator.getAttribute("aria-valuenow")) > 250,
    "Pointer resize failed",
  );
  assert(
    (await page
      .getByRole("slider", { name: "Planning drawer width", exact: true })
      .inputValue()) === (await separator.getAttribute("aria-valuenow")),
    "Slider and divider lost synchronization",
  );
  assert(
    await page
      .locator(".companion-order")
      .first()
      .innerText()
      .then(
        (text) =>
          text.includes("ORD-1043") &&
          text.includes("Van only") &&
          text.includes("Window 03:30–08:00"),
      ),
    "Priority queue lost order requirements",
  );
  await page
    .getByRole("button", { name: "Review priority", exact: true })
    .click();
  await page
    .getByRole("heading", { name: "Order intake", exact: true })
    .waitFor();
  assert(
    await page
      .getByRole("checkbox", { name: "Select ORD-1043", exact: true })
      .isChecked(),
    "Priority action did not select the carry-over order",
  );
  const nav = page.getByRole("navigation", { name: "Dispatcher navigation" });
  await nav
    .getByRole("button", { name: "Dashboard", exact: true })
    .click();
  for (const [width, height] of [
    [1440, 900],
    [1024, 900],
    [390, 844],
    [320, 844],
  ]) {
    await page.setViewportSize({ width, height });
    await page.waitForTimeout(300);
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      `Page overflow at ${width}`,
    );
    assert(
      await page.locator(".overview-priority").isVisible(),
      `Priority notice hidden at ${width}`,
    );
    if (width <= 760) {
      assert(await page.locator(".overview-priority p").evaluate(el => el.getBoundingClientRect().width >= 180), "Phone priority text is squeezed beside its action");
      assert(
        !(await separator.isVisible()),
        "Desktop resize handle visible on phone",
      );
      const main = await page.locator(".overview-scroll").boundingBox();
      const companion = await page.locator(".overview-drawer").boundingBox();
      assert(
        main.y < companion.y,
        "Phone hides dashboard analysis behind calendar",
      );
    }
    await page.screenshot({
      path: `.impeccable/review/polish-${width}.png`,
      fullPage: true,
    });
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.getByRole("button", { name: "Expand navigation", exact: true }).click();
  await page.getByRole("slider", { name: "Planning drawer width", exact: true }).focus();
  await page.keyboard.press("End");
  await page.waitForTimeout(300);
  assert(await page.locator('.overview-fleet-charts').evaluate(el => {
    const panel = el.closest('.overview-analysis').getBoundingClientRect();
    return [...el.querySelectorAll('.chart-legend li')].every(row => {
      const bounds = row.getBoundingClientRect();
      return bounds.left >= panel.left && bounds.right <= panel.right - 12;
    });
  }), "Fleet legends overflow with expanded navigation and maximum companion width");
  await page.screenshot({ path: ".impeccable/review/polish-expanded.png", fullPage: true });
  await page.getByRole("button", { name: "Collapse navigation", exact: true }).click();
  await page.getByRole("slider", { name: "Planning drawer width", exact: true }).focus();
  await page.keyboard.press("Home");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await page.locator(".overview-scroll").evaluate(el => { el.scrollTop = 10000; });
  await page.waitForTimeout(300);
  await page.screenshot({ path: ".impeccable/review/polish-analysis.png", fullPage: true });
  await page.locator(".overview-scroll").evaluate(el => { el.scrollTop = 0; });
  await page.getByLabel("Depot", { exact: true }).selectOption("Kandy");
  assert(await page.locator(".overview-priority").innerText().then(text => text.includes("1 carry-over order needs priority")), "Kandy carry-over count is incorrect");
  await page.getByLabel("Depot", { exact: true }).selectOption("Peliyagoda");
  await page.getByRole("button", { name: "Review priority", exact: true }).click();
  await page.getByRole("button", { name: "Create trip for ORD-1043 with WP-008", exact: true }).click();
  await page.getByRole("heading", { name: "Route planning", exact: true }).waitFor();
  await nav.getByRole("button", { name: "Dashboard", exact: true }).click();
  assert(
    await page
      .locator(".overview-priority")
      .innerText()
      .then((text) =>
        text.includes("No carry-over orders awaiting allocation"),
      ),
    "No-priority state shows misleading urgency",
  );
  await page
    .getByRole("button", { name: "Close planning drawer", exact: true })
    .click();
  await page.waitForTimeout(300);
  await page.screenshot({
    path: ".impeccable/review/polish-closed.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Open planning drawer", exact: true })
    .click();
  assert(errors.length === 0, `Browser errors: ${errors.join("; ")}`);
  return "Dispatcher polish passed: keyboard/pointer resize, priority handoff, queue requirements, expanded-panel legend containment, responsive layout and empty-priority state; no page errors.";
}
