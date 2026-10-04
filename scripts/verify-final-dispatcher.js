async (page) => {
  const assert = (value, message) => { if (!value) throw new Error(message); };
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  // Never request public map tiles during automated navigation or screenshots.
  await page.route('**://**tile.openstreetmap.org/**', route => route.fulfill({contentType:'image/png', body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64')}));
  await page.setViewportSize({width:1440,height:900});
  await page.goto('http://127.0.0.1:3000/login');
  await page.evaluate(() => { for (const key of ['waypoint.demo.dispatch.v1','waypoint.demo.workspace.v1','waypoint.demo.session.v1']) { localStorage.removeItem(key); sessionStorage.removeItem(key); } });
  await page.reload();
  await page.getByRole('button',{name:/Dispatcher Planning office/}).click();
  await page.getByRole('button',{name:'Sign in',exact:true}).click();
  await page.getByRole('heading',{name:'Today’s overview',exact:true}).waitFor();
  const nav = page.getByRole('navigation',{name:'Dispatcher navigation'});
  const go = async name => nav.getByRole('button',{name,exact:true}).click();
  const state = () => page.evaluate(() => JSON.parse(localStorage.getItem('waypoint.demo.workspace.v1')));
  const failStorage = () => page.evaluate(() => { window.__originalSetItem = Storage.prototype.setItem; Storage.prototype.setItem = function(k,v) { if(k === 'waypoint.demo.workspace.v1') throw new DOMException('Synthetic failure','QuotaExceededError'); return window.__originalSetItem.call(this,k,v); }; });
  const restoreStorage = () => page.evaluate(() => { Storage.prototype.setItem = window.__originalSetItem; delete window.__originalSetItem; });
  for (const name of ['Dashboard','Order intake','Manage fleet','Route planning','Deferrals','Outlets','Calendar','Chat']) assert(await nav.getByRole('button',{name,exact:true}).count() === 1,`Missing ${name} navigation`);
  await go('Order intake');
  await page.getByRole('button',{name:'View ORD-1043',exact:true}).click();
  await page.getByRole('button',{name:'Defer orders',exact:true}).click();
  await page.getByLabel('Decision note',{exact:true}).fill('Refrigerated van unavailable; prioritize the next allocation review.');
  await page.getByRole('button',{name:'Save deferral',exact:true}).click();
  await go('Deferrals');
  assert(await page.locator('.records-list .workspace-table tbody tr').count() === 1,'Deferral record missing');
  await page.getByRole('button',{name:'Inspect deferral ORD-1043',exact:true}).click();
  assert((await page.getByLabel('Deferral inspector',{exact:true}).innerText()).includes('Refrigerated van unavailable'),'Decision note missing from inspector');
  await page.getByLabel('Search deferrals',{exact:true}).fill('unmatched');
  await page.getByRole('heading',{name:'No matching deferrals',exact:true}).waitFor();
  await page.getByLabel('Search deferrals',{exact:true}).fill('');
  await go('Outlets');
  assert(await page.locator('.directory-workspace .workspace-table tbody tr').count() === 6,'Depot outlet count mismatch');
  await page.getByLabel('Filter outlet brand',{exact:true}).selectOption('Tech');
  assert(await page.locator('.directory-workspace .workspace-table tbody tr').count() === 1,'Outlet brand filter failed');
  await page.getByLabel('Filter outlet brand',{exact:true}).selectOption('All brands');
  await page.getByRole('button',{name:'Inspect outlet ORD-1041',exact:true}).click();
  assert((await page.getByLabel('Outlet inspector',{exact:true}).innerText()).includes('not'),'Unknown outlet metadata not explained');
  await go('Calendar');
  await page.getByRole('button',{name:'Add event',exact:true}).click();
  await page.getByLabel('Event title',{exact:true}).fill('Dispatch test review');
  await page.getByLabel('Event date',{exact:true}).fill('2026-10-04');
  await page.getByLabel('Event time',{exact:true}).fill('09:15');
  await failStorage();
  await page.getByRole('button',{name:'Save event locally',exact:true}).click();
  assert(await page.getByRole('dialog').isVisible(),'Failed event save closed dialog');
  assert(await page.getByLabel('Event title',{exact:true}).inputValue() === 'Dispatch test review','Failed event save lost entries');
  await restoreStorage();
  await page.getByRole('button',{name:'Save event locally',exact:true}).click();
  await page.getByRole('dialog').waitFor({state:'hidden'});
  assert((await state()).events.some(e => e.title === 'Dispatch test review'),'Event not persisted');
  await page.getByRole('button',{name:/09:15.*Dispatch test review/}).click();
  await page.getByLabel('Event title',{exact:true}).fill('Updated dispatch review');
  await page.getByRole('button',{name:'Save event locally',exact:true}).click();
  assert((await state()).events.filter(e => e.title === 'Updated dispatch review').length === 1,'Event edit failed');
  await page.getByLabel('Calendar view',{exact:true}).selectOption('Agenda');
  await page.getByRole('button',{name:'Delete event Updated dispatch review',exact:true}).click();
  assert(!(await state()).events.some(e => e.title === 'Updated dispatch review'),'Event deletion failed');
  await page.getByLabel('Operating day',{exact:true}).fill('2026-10-04');
  assert(await page.getByLabel('Dispatch calendar',{exact:true}).isVisible(),'Calendar unavailable outside fixture date');
  await go('Chat');
  await page.getByRole('button',{name:'Open conversation Peliyagoda loading team',exact:true}).click();
  await page.getByLabel('Message text',{exact:true}).fill('Local dispatch checklist ready.');
  await failStorage();
  await page.getByRole('button',{name:'Save message',exact:true}).click();
  assert(await page.getByLabel('Message text',{exact:true}).inputValue() === 'Local dispatch checklist ready.','Failed chat save lost draft');
  await restoreStorage();
  await page.getByRole('button',{name:'Save message',exact:true}).click();
  assert((await state()).messages.some(m => m.text === 'Local dispatch checklist ready.' && m.outgoing),'Chat message not persisted');
  await page.getByRole('button',{name:'Mark as read',exact:true}).click();
  await page.getByLabel('Filter conversation role',{exact:true}).selectOption('Driver');
  assert(await page.locator('.chat-contacts > button').count() === 1,'Chat role filter failed');
  await page.getByLabel('Filter conversation role',{exact:true}).selectOption('All roles');
  await page.getByRole('button',{name:/Open notifications,/}).click();
  await page.getByLabel('Search notifications',{exact:true}).fill('unmatched');
  await page.getByRole('heading',{name:'No matching notifications',exact:true}).waitFor();
  await page.getByLabel('Search notifications',{exact:true}).fill('');
  await failStorage();
  await page.getByRole('button',{name:'Mark all as read',exact:true}).click();
  assert((await page.getByRole('dialog').innerText()).includes('This change was not saved'),'Notification save failure hidden behind dialog');
  await restoreStorage();
  await page.getByRole('button',{name:'Mark all as read',exact:true}).click();
  await page.keyboard.press('Escape');
  await page.getByRole('button',{name:'Use dark theme',exact:true}).click();
  await page.reload();
  assert(await page.locator('.dispatch-app').getAttribute('data-theme') === 'dark','Theme not restored');
  await page.getByRole('button',{name:'Use light theme',exact:true}).click();
  await page.getByLabel('Operating day',{exact:true}).fill('2026-10-03');
  await go('Route planning');
  await page.getByRole('button',{name:'Track deliveries',exact:true}).click();
  await page.locator('.leaflet-container').waitFor();
  await page.getByRole('button',{name:'Advance demo stop',exact:true}).click();
  assert((await state()).progress['TRIP-01'].completed === 1,'Demo progress not saved');
  await page.reload();
  assert(page.url().endsWith('#routes/tracking'),'Route mode hash lost');
  assert(await page.getByLabel('Simulated delivery progress',{exact:true}).getAttribute('value') === '1','Progress not restored');
  await page.getByRole('button',{name:'Manage assigned routes',exact:true}).click();
  await page.getByRole('button',{name:'Edit route',exact:true}).click();
  await page.getByLabel('Trip departure',{exact:true}).fill('04:55');
  await page.getByRole('button',{name:'Track deliveries',exact:true}).click();
  assert(await page.getByLabel('Simulated delivery progress',{exact:true}).getAttribute('value') === '0','Edited route inherited stale progress');
  await page.getByRole('button',{name:'Review capacities',exact:true}).click();
  assert(await page.locator('.capacity-table').isVisible(),'Capacity handoff failed');
  await go('Deferrals');
  await page.getByRole('button',{name:'Return to backlog',exact:true}).click();
  assert(await page.evaluate(() => JSON.parse(localStorage.getItem('waypoint.demo.dispatch.v1')).deferrals.length) === 0,'Deferral return failed');
  // Restore a deferral fixture for inspector/chart captures.
  await go('Order intake');
  await page.getByRole('button',{name:'View ORD-1043',exact:true}).click();
  await page.getByRole('button',{name:'Defer orders',exact:true}).click();
  await page.getByLabel('Decision note',{exact:true}).fill('Refrigerated van unavailable; prioritize the next allocation review.');
  await page.getByRole('button',{name:'Save deferral',exact:true}).click();
  for (const width of [1440,1024,390,320]) {
    await page.setViewportSize({width,height:900});
    for (const name of ['Dashboard','Order intake','Manage fleet','Route planning','Deferrals','Outlets','Calendar','Chat']) {
      await go(name);
      if (name === 'Outlets') await page.getByRole('button',{name:'Inspect outlet ORD-1041',exact:true}).click();
      if (name === 'Outlets') await page.locator('.workspace-table-scroll').evaluate(e => e.scrollLeft = 0);
      await page.evaluate(() => window.scrollTo(0,0));
      await page.waitForTimeout(350);
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),`${name} overflows at ${width}`);
      await page.screenshot({path:`.impeccable/review/final-${name.toLowerCase().replaceAll(' ','-')}-${width}.png`,fullPage:true});
      if (name === 'Deferrals' && width === 1440) {
        await page.locator('.records-inspector-scroll').evaluate(e => e.scrollTop = e.scrollHeight);
        await page.screenshot({path:'.impeccable/review/final-deferral-analysis.png',fullPage:true});
      }
      if (name === 'Route planning' && width === 1440) {
        await page.locator('.dispatch-trip').evaluate(e => e.scrollTop = 140);
        await page.screenshot({path:'.impeccable/review/final-route-assignment-map.png',fullPage:true});
      }
    }
    await go('Route planning');
    for (const mode of ['Track deliveries','Manage assigned routes']) {
      await page.getByRole('button',{name:mode,exact:true}).click();
      await page.locator('.leaflet-container').waitFor();
      await page.waitForTimeout(350);
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),`${mode} overflows at ${width}`);
      await page.screenshot({path:`.impeccable/review/final-${mode.toLowerCase().replaceAll(' ','-')}-${width}.png`,fullPage:true});
    }
  }
  await page.setViewportSize({width:1440,height:900});
  await go('Dashboard');
  await page.getByRole('button',{name:'Use dark theme',exact:true}).click();
  for (const name of ['Dashboard','Deferrals','Calendar','Chat']) {
    await go(name);
    await page.waitForTimeout(350);
    await page.screenshot({path:`.impeccable/review/final-dark-${name.toLowerCase()}.png`,fullPage:true});
  }
  await page.getByRole('button',{name:/Open notifications,/}).click();
  await page.waitForTimeout(350);
  await page.screenshot({path:'.impeccable/review/final-notification-panel.png',fullPage:true});
  await page.keyboard.press('Escape');
  await page.getByRole('button',{name:'Use light theme',exact:true}).click();
  await page.getByRole('button',{name:'Open account menu',exact:true}).click();
  await page.getByRole('dialog').getByRole('button',{name:'Sign out',exact:true}).click();
  await page.waitForURL('**/login');
  assert(errors.length === 0,`Browser errors: ${errors.join('; ')}`);
  return {passed:true,viewports:[1440,1024,390,320],screens:8,routeModes:3,storageFailureRecovery:true,externalMapTiles:'intercepted',browserErrors:errors};
}
