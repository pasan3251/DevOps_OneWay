async (page) => {
  const assert = (value, message) => { if (!value) throw new Error(message); };
  await page.goto("http://127.0.0.1:3000/workspace/dispatcher");
  await page.getByRole("heading",{name:"Today’s overview",exact:true}).waitFor();
  await page.getByRole("navigation", {name:"Dispatcher navigation"}).getByRole("button",{name:"Route planning",exact:true}).click();
  await page.getByRole("heading",{name:"Route planning",exact:true}).waitFor();
  await page.getByLabel("Select ORD-1043",{exact:true}).check();
  await page.getByRole("button",{name:"Defer orders",exact:true}).click();
  await page.getByLabel("Decision note",{exact:true}).fill("No van");
  await page.getByRole("button",{name:"Save deferral",exact:true}).click();
  await page.getByText("A repeated deferral needs a justification of at least 20 characters (demo team policy).",{exact:true}).waitFor();
  await page.getByLabel("Decision note",{exact:true}).fill("No refrigerated van capacity; prioritize on the next operating run.");
  const previous = await page.evaluate(() => localStorage.getItem("waypoint.demo.dispatch.v1"));
  await page.evaluate(() => {
    window.__dispatchOriginalSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function(key,value) {
      if (key === "waypoint.demo.dispatch.v1") throw new DOMException("Synthetic storage failure","QuotaExceededError");
      return window.__dispatchOriginalSetItem.call(this,key,value);
    };
  });
  try {
    await page.getByRole("button",{name:"Save deferral",exact:true}).click();
    await page.getByRole("dialog").getByRole("alert").filter({hasText:"Your browser couldn’t save this change"}).waitFor();
    assert(await page.getByLabel("Decision note",{exact:true}).inputValue() === "No refrigerated van capacity; prioritize on the next operating run.","Save failure lost decision note");
    assert(await page.evaluate(() => localStorage.getItem("waypoint.demo.dispatch.v1")) === previous,"Failed save changed persisted plan");
  } finally {
    await page.evaluate(() => { Storage.prototype.setItem = window.__dispatchOriginalSetItem; delete window.__dispatchOriginalSetItem; });
  }
  await page.getByRole("button",{name:"Save deferral",exact:true}).click();
  await page.getByRole("dialog").waitFor({state:"hidden"});
  await page.getByRole("button",{name:/^Deferrals/}).click();
  await page.getByRole("button",{name:"Return to backlog",exact:true}).click();
  await page.getByRole("button",{name:"Route planning",exact:true}).click();
  await page.getByRole("button",{name:"Move ORD-1042 earlier",exact:true}).click();
  assert((await page.locator(".trip-stops li").first().innerText()).includes("ORD-1042"),"Stop reorder failed");
  await page.getByRole("button",{name:"Remove ORD-1041 from trip",exact:true}).click();
  await page.getByLabel("Select ORD-1041",{exact:true}).waitFor();
  await page.getByLabel("Trip departure",{exact:true}).fill("07:50");
  await page.getByText("A stop finishes after its delivery window. Change departure or split the trip.",{exact:true}).waitFor();
  await page.evaluate(() => localStorage.removeItem("waypoint.demo.dispatch.v1"));
  await page.reload();
  await page.getByRole("heading",{name:"Route planning",exact:true}).waitFor();
  return "Passed: carry-over justification, visible modal save failure, preserved input/persisted plan, retry, restored backlog, stop reorder/removal, late departure warning.";
}
