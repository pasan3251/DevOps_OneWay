// Run with playwright-cli run-code after opening the local application.
// This function exercises the browser; it is not a test-runner configuration.
async (page) => {
  const base = "http://127.0.0.1:3000";
  const key = "waypoint.demo.session.v1";
  const results = [];
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  const assert = (condition, message) => { if (!condition) throw new Error(message); };
  await page.goto(base);
  await page.getByRole("heading", { name: "Sign in", exact: true }).waitFor();
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: ".impeccable/review/desktop.png", fullPage: true });
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    const fits = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
    assert(fits, `Horizontal overflow at ${width}px`);
    await page.screenshot({ path: `.impeccable/review/${width === 390 ? "mobile" : "mobile-320"}.png`, fullPage: true });
  }
  results.push("Desktop and 390px/320px phone layouts have no horizontal overflow");
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.getByText("Enter your email or employee ID.", { exact: true }).waitFor();
  await page.getByText("Enter your password.", { exact: true }).waitFor();
  assert(await page.getByLabel("Email or employee ID", { exact: true }).getAttribute("aria-invalid") === "true", "Invalid email field is not announced");
  results.push("Empty fields show associated validation errors");
  await page.getByLabel("Email or employee ID", { exact: true }).fill("unknown@waypoint.demo");
  await page.getByLabel("Password", { exact: true }).fill("incorrect-demo-password");
  await page.getByRole("button", { name: "Show password", exact: true }).click();
  assert(await page.getByLabel("Password", { exact: true }).getAttribute("type") === "text", "Password visibility did not toggle");
  await page.getByRole("button", { name: "Hide password", exact: true }).click();
  assert(await page.getByLabel("Password", { exact: true }).getAttribute("type") === "password", "Password was not concealed");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  const credentialError = page.locator(".sign-in-error");
  await credentialError.waitFor();
  assert((await credentialError.innerText()).includes("match a demo account"), "Missing invalid credential feedback");
  results.push("Password toggle and invalid credential recovery work");
  await page.getByRole("button", { name: "Forgot password?", exact: true }).click();
  await page.getByRole("dialog").waitFor();
  await page.getByRole("heading", { name: "Password help" }).waitFor();
  await page.keyboard.press("Escape");
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  results.push("Password help opens and dismisses with keyboard");

  const accounts = [
    { role: "dispatcher", label: "Dispatcher" },
    { role: "loader", label: "Loader" },
    { role: "driver", label: "Driver" },
    { role: "store-manager", label: "Store manager" },
  ];
  for (const account of accounts) {
    await page.getByRole("button", { name: new RegExp(`^${account.label} `) }).click();
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await page.getByRole("heading", { name: account.role === "dispatcher" ? "Today’s overview" : `${account.label} workspace`, exact: true }).waitFor();
    assert(new URL(page.url()).pathname === `/workspace/${account.role}`, "Wrong role destination");
    const sessionState = await page.evaluate((storageKey) => ({ session: sessionStorage.getItem(storageKey), persistent: localStorage.getItem(storageKey) }), key);
    assert(!!sessionState.session && !sessionState.persistent, "Session-only login used persistent storage");
    assert(!sessionState.session.includes("password") && !sessionState.session.includes("waypoint-demo"), "Credentials persisted");
    await page.reload();
    await page.getByRole("heading", { name: account.role === "dispatcher" ? "Today’s overview" : `${account.label} workspace`, exact: true }).waitFor();
    await page.getByRole("button", { name: "Sign out", exact: true }).click();
    await page.getByRole("heading", { name: "Sign in", exact: true }).waitFor();
    assert(await page.evaluate((storageKey) => !localStorage.getItem(storageKey) && !sessionStorage.getItem(storageKey), key), "Sign out did not clear session");
  }
  results.push("All four roles sign in, survive reload, and sign out without storing passwords");
  await page.getByLabel("Email or employee ID", { exact: true }).fill("  disp001  ");
  await page.getByLabel("Password", { exact: true }).fill("waypoint-demo");
  await page.getByRole("checkbox", { name: "Keep me signed in" }).check();
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.getByRole("heading", { name: "Today’s overview", exact: true }).waitFor();
  assert(await page.evaluate((storageKey) => !!localStorage.getItem(storageKey) && !sessionStorage.getItem(storageKey), key), "Remember-me did not use persistent storage");
  const extraTab = await page.context().newPage();
  await extraTab.goto(`${base}/workspace/dispatcher`);
  await extraTab.getByRole("heading", { name: "Today’s overview", exact: true }).waitFor();
  await extraTab.close();
  await page.goto(`${base}/workspace/loader`);
  await page.getByRole("heading", { name: "Today’s overview", exact: true }).waitFor();
  assert(new URL(page.url()).pathname === "/workspace/dispatcher", "Wrong role route was not corrected");
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await page.getByRole("heading", { name: "Sign in", exact: true }).waitFor();
  await page.goto(`${base}/workspace/driver`);
  await page.getByRole("heading", { name: "Sign in", exact: true }).waitFor();
  results.push("Employee ID normalization, remembered new-tab access, role routing, and logged-out redirect work");
  assert(pageErrors.length === 0, `Browser errors: ${pageErrors.join("; ")}`);
  results.push("No browser page errors during the walkthrough");
  return results;
}
