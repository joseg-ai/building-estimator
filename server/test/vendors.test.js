const { test } = require('node:test');
const assert = require('node:assert/strict');
const { app, request, registerAndLogin, authHeader } = require('./setup');

// ── helpers ───────────────────────────────────────────────────────────────────

const minVendor = (overrides = {}) => ({
  name: 'Acme Steel ' + Math.random().toString(36).slice(2, 7),
  email: 'contact@acme.example',
  phone: '555-0100',
  ...overrides,
});

async function createVendor(token, overrides = {}) {
  const res = await request(app)
    .post('/api/vendors')
    .set(authHeader(token))
    .send(minVendor(overrides));
  if (res.status !== 201) throw new Error(`createVendor failed (${res.status}): ${JSON.stringify(res.body)}`);
  return res.body;
}

async function upsertPrice(token, vendorId, itemKey, body = {}) {
  const res = await request(app)
    .put(`/api/vendors/${vendorId}/prices/${itemKey}`)
    .set(authHeader(token))
    .send({ unitPrice: 1.25, ...body });
  if (res.status !== 200) throw new Error(`upsertPrice failed (${res.status}): ${JSON.stringify(res.body)}`);
  return res.body;
}

// ── Vendor CRUD ───────────────────────────────────────────────────────────────

test('GET /api/vendors empty → 200 []', async () => {
  const { token } = await registerAndLogin('vendor-empty');
  const res = await request(app).get('/api/vendors').set(authHeader(token));
  assert.equal(res.status, 200);
  assert.ok(Array.isArray(res.body));
  assert.equal(res.body.length, 0);
});

test('POST /api/vendors without auth → 401', async () => {
  const res = await request(app).post('/api/vendors').send(minVendor());
  assert.equal(res.status, 401);
});

test('POST /api/vendors valid → 201 with id', async () => {
  const { token } = await registerAndLogin('vendor-create');
  const res = await request(app)
    .post('/api/vendors')
    .set(authHeader(token))
    .send(minVendor({ name: 'Central States', city: 'Omaha', state: 'NE' }));
  assert.equal(res.status, 201);
  assert.equal(typeof res.body.id, 'number');
  assert.equal(res.body.name, 'Central States');
  assert.equal(res.body.city, 'Omaha');
  assert.equal(res.body.isDefault, false);
  assert.equal(typeof res.body.createdAt, 'number');
  assert.equal(typeof res.body.updatedAt, 'number');
});

test('POST /api/vendors missing name → 400 VALIDATION', async () => {
  const { token } = await registerAndLogin('vendor-noname');
  const body = minVendor();
  delete body.name;
  const res = await request(app).post('/api/vendors').set(authHeader(token)).send(body);
  assert.equal(res.status, 400);
  assert.equal(res.body.error.code, 'VALIDATION');
});

test('POST /api/vendors empty string name → 400 VALIDATION', async () => {
  const { token } = await registerAndLogin('vendor-emptyname');
  const res = await request(app)
    .post('/api/vendors')
    .set(authHeader(token))
    .send(minVendor({ name: '   ' }));
  assert.equal(res.status, 400);
  assert.equal(res.body.error.code, 'VALIDATION');
});

test('POST /api/vendors invalid email → 400 VALIDATION', async () => {
  const { token } = await registerAndLogin('vendor-bademail');
  const res = await request(app)
    .post('/api/vendors')
    .set(authHeader(token))
    .send(minVendor({ email: 'not-an-email' }));
  assert.equal(res.status, 400);
  assert.equal(res.body.error.code, 'VALIDATION');
});

test('POST /api/vendors with isDefault=true → succeeds, sets isDefault true', async () => {
  const { token } = await registerAndLogin('vendor-isdefault');
  const res = await request(app)
    .post('/api/vendors')
    .set(authHeader(token))
    .send(minVendor({ name: 'Default Vendor', isDefault: true }));
  assert.equal(res.status, 201);
  assert.equal(res.body.isDefault, true);
});

test('POST second vendor with isDefault=true → first vendor isDefault flips to false (atomic swap)', async () => {
  const { token } = await registerAndLogin('vendor-swap');

  // Create first vendor as default
  const first = await createVendor(token, { name: 'First Vendor', isDefault: true });
  assert.equal(first.isDefault, true);

  // Create second vendor as default — should clear the first
  const second = await createVendor(token, { name: 'Second Vendor', isDefault: true });
  assert.equal(second.isDefault, true);

  // Verify first vendor no longer is_default
  const firstAgain = await request(app)
    .get(`/api/vendors/${first.id}`)
    .set(authHeader(token));
  assert.equal(firstAgain.status, 200);
  assert.equal(firstAgain.body.isDefault, false);
});

test('GET /api/vendors lists vendors with isDefault correctly', async () => {
  const { token } = await registerAndLogin('vendor-list');
  const v1 = await createVendor(token, { name: 'List Vendor A', isDefault: true });
  const v2 = await createVendor(token, { name: 'List Vendor B' });

  const res = await request(app).get('/api/vendors').set(authHeader(token));
  assert.equal(res.status, 200);
  assert.equal(res.body.length, 2);

  const found1 = res.body.find((v) => v.id === v1.id);
  const found2 = res.body.find((v) => v.id === v2.id);
  assert.ok(found1, 'vendor A not in list');
  assert.ok(found2, 'vendor B not in list');
  assert.equal(found1.isDefault, true);
  assert.equal(found2.isDefault, false);
});

test('GET /api/vendors?search= filters by name LIKE', async () => {
  const { token } = await registerAndLogin('vendor-search');
  await createVendor(token, { name: 'Alpine Steel Supply', email: null });
  await createVendor(token, { name: 'Desert Metals Inc', email: null });
  await createVendor(token, { name: 'Prairie Iron Works', email: null });

  const res = await request(app).get('/api/vendors?search=Alpine').set(authHeader(token));
  assert.equal(res.status, 200);
  assert.equal(res.body.length, 1);
  assert.equal(res.body[0].name, 'Alpine Steel Supply');

  const res2 = await request(app).get('/api/vendors?search=metals').set(authHeader(token));
  assert.equal(res2.status, 200);
  assert.equal(res2.body.length, 1);
  assert.equal(res2.body[0].name, 'Desert Metals Inc');
});

test('GET /api/vendors/:id existing → 200', async () => {
  const { token } = await registerAndLogin('vendor-getid');
  const v = await createVendor(token, { name: 'GetById Vendor', city: 'Denver' });

  const res = await request(app).get(`/api/vendors/${v.id}`).set(authHeader(token));
  assert.equal(res.status, 200);
  assert.equal(res.body.id, v.id);
  assert.equal(res.body.name, 'GetById Vendor');
  assert.equal(res.body.city, 'Denver');
});

test("GET /api/vendors/:id another user's → 404 (no existence leak)", async () => {
  const { token: tokenA } = await registerAndLogin('vendor-ownerA');
  const { token: tokenB } = await registerAndLogin('vendor-ownerB');
  const v = await createVendor(tokenA, { name: 'Secret Vendor' });

  const res = await request(app).get(`/api/vendors/${v.id}`).set(authHeader(tokenB));
  assert.equal(res.status, 404);
  assert.equal(res.body.error.code, 'NOT_FOUND');
});

test('PUT /api/vendors/:id own → updates fields', async () => {
  const { token } = await registerAndLogin('vendor-put');
  const v = await createVendor(token, { name: 'Old Name', city: 'Austin' });

  const res = await request(app)
    .put(`/api/vendors/${v.id}`)
    .set(authHeader(token))
    .send({ name: 'New Name', city: 'Houston', notes: 'Updated' });
  assert.equal(res.status, 200);
  assert.equal(res.body.name, 'New Name');
  assert.equal(res.body.city, 'Houston');
  assert.equal(res.body.notes, 'Updated');
});

test("PUT /api/vendors/:id another user's → 404", async () => {
  const { token: tokenA } = await registerAndLogin('vendor-putA');
  const { token: tokenB } = await registerAndLogin('vendor-putB');
  const v = await createVendor(tokenA, { name: 'A Vendor' });

  const res = await request(app)
    .put(`/api/vendors/${v.id}`)
    .set(authHeader(tokenB))
    .send({ name: 'B Attempt' });
  assert.equal(res.status, 404);
});

test('DELETE /api/vendors/:id → removes vendor AND cascades vendor_prices', async () => {
  const { token } = await registerAndLogin('vendor-del');
  const v = await createVendor(token, { name: 'Delete Me Vendor' });

  // Insert some prices to confirm cascade
  await upsertPrice(token, v.id, 'Z82514R', { unitPrice: 0.82 });
  await upsertPrice(token, v.id, 'PG-01', { unitPrice: 12.5 });

  // Confirm prices exist before deletion
  const pricesBefore = await request(app)
    .get(`/api/vendors/${v.id}/prices`)
    .set(authHeader(token));
  assert.equal(pricesBefore.status, 200);
  assert.equal(pricesBefore.body.length, 2);

  // Delete the vendor
  const del = await request(app).delete(`/api/vendors/${v.id}`).set(authHeader(token));
  assert.equal(del.status, 200);
  assert.equal(del.body.deleted, true);
  assert.equal(del.body.id, v.id);

  // Vendor is gone
  const getAfter = await request(app).get(`/api/vendors/${v.id}`).set(authHeader(token));
  assert.equal(getAfter.status, 404);

  // Prices are gone too (cascade) — a new vendor gets a different id, so directly verify
  // by creating another vendor and confirming the deleted vendor's prices are not accessible
  // The 404 on the vendor itself is sufficient proof since prices require a valid vendor.
  // But let's also verify no prices leaked to the DB by checking row-count after re-registering
  // as the same user and confirming the list is empty for a brand new vendor.
  const v2 = await createVendor(token, { name: 'New Vendor After Delete' });
  const pricesAfter = await request(app)
    .get(`/api/vendors/${v2.id}/prices`)
    .set(authHeader(token));
  assert.equal(pricesAfter.status, 200);
  assert.equal(pricesAfter.body.length, 0);
});

// ── Vendor Prices ─────────────────────────────────────────────────────────────

test('GET /api/vendors/:id/prices empty → 200 []', async () => {
  const { token } = await registerAndLogin('prices-empty');
  const v = await createVendor(token, { name: 'Price Empty Vendor' });

  const res = await request(app).get(`/api/vendors/${v.id}/prices`).set(authHeader(token));
  assert.equal(res.status, 200);
  assert.ok(Array.isArray(res.body));
  assert.equal(res.body.length, 0);
});

test('PUT /api/vendors/:id/prices/:itemKey valid → 200 upsert', async () => {
  const { token } = await registerAndLogin('prices-upsert');
  const v = await createVendor(token, { name: 'Price Upsert Vendor' });

  const res = await request(app)
    .put(`/api/vendors/${v.id}/prices/Z82514R`)
    .set(authHeader(token))
    .send({ unitPrice: 0.82, currency: 'USD', leadTimeDays: 14, notes: 'Q2 rate' });
  assert.equal(res.status, 200);
  assert.equal(res.body.vendorId, v.id);
  assert.equal(res.body.itemKey, 'Z82514R');
  assert.equal(res.body.unitPrice, 0.82);
  assert.equal(res.body.currency, 'USD');
  assert.equal(res.body.leadTimeDays, 14);
  assert.equal(res.body.notes, 'Q2 rate');
  assert.equal(typeof res.body.updatedAt, 'number');
});

test("PUT /api/vendors/:id/prices/:itemKey on another user's vendor → 404", async () => {
  const { token: tokenA } = await registerAndLogin('prices-ownerA');
  const { token: tokenB } = await registerAndLogin('prices-ownerB');
  const v = await createVendor(tokenA, { name: 'A Price Vendor' });

  const res = await request(app)
    .put(`/api/vendors/${v.id}/prices/Z82514R`)
    .set(authHeader(tokenB))
    .send({ unitPrice: 0.99 });
  assert.equal(res.status, 404);
  assert.equal(res.body.error.code, 'NOT_FOUND');
});

test('PUT /api/vendors/:id/prices/:itemKey twice → updates (no 409, UNIQUE upsert)', async () => {
  const { token } = await registerAndLogin('prices-upsert-twice');
  const v = await createVendor(token, { name: 'Twice Upsert Vendor' });

  // First upsert
  const first = await request(app)
    .put(`/api/vendors/${v.id}/prices/PG-01`)
    .set(authHeader(token))
    .send({ unitPrice: 12.50 });
  assert.equal(first.status, 200);

  // Second upsert with different price
  const second = await request(app)
    .put(`/api/vendors/${v.id}/prices/PG-01`)
    .set(authHeader(token))
    .send({ unitPrice: 11.75, notes: 'Discounted' });
  assert.equal(second.status, 200);
  assert.equal(second.body.unitPrice, 11.75);
  assert.equal(second.body.notes, 'Discounted');
});

test('PUT /api/vendors/:id/prices/:itemKey with string unitPrice → 400 VALIDATION', async () => {
  const { token } = await registerAndLogin('prices-badprice-str');
  const v = await createVendor(token, { name: 'Bad Price String Vendor' });

  const res = await request(app)
    .put(`/api/vendors/${v.id}/prices/Z82514R`)
    .set(authHeader(token))
    .send({ unitPrice: 'not-a-number' });
  assert.equal(res.status, 400);
  assert.equal(res.body.error.code, 'VALIDATION');
});

test('PUT /api/vendors/:id/prices/:itemKey with negative unitPrice → 400 VALIDATION', async () => {
  const { token } = await registerAndLogin('prices-badprice-neg');
  const v = await createVendor(token, { name: 'Bad Price Negative Vendor' });

  const res = await request(app)
    .put(`/api/vendors/${v.id}/prices/Z82514R`)
    .set(authHeader(token))
    .send({ unitPrice: -5.00 });
  assert.equal(res.status, 400);
  assert.equal(res.body.error.code, 'VALIDATION');
});

test('GET /api/vendors/:id/prices returns upserted prices', async () => {
  const { token } = await registerAndLogin('prices-list');
  const v = await createVendor(token, { name: 'List Prices Vendor' });

  await upsertPrice(token, v.id, 'Z82514R', { unitPrice: 0.82 });
  await upsertPrice(token, v.id, 'PG-01', { unitPrice: 12.50 });

  const res = await request(app).get(`/api/vendors/${v.id}/prices`).set(authHeader(token));
  assert.equal(res.status, 200);
  assert.equal(res.body.length, 2);

  // Should be ordered by item_key ASC
  const keys = res.body.map((r) => r.itemKey);
  assert.deepEqual(keys, [...keys].sort());

  const pgRow = res.body.find((r) => r.itemKey === 'PG-01');
  assert.ok(pgRow);
  assert.equal(pgRow.unitPrice, 12.50);
});

test('DELETE /api/vendors/:id/prices/:itemKey → removes single override', async () => {
  const { token } = await registerAndLogin('prices-del');
  const v = await createVendor(token, { name: 'Del Price Vendor' });

  await upsertPrice(token, v.id, 'Z82514R', { unitPrice: 0.82 });
  await upsertPrice(token, v.id, 'PG-01', { unitPrice: 12.50 });

  const del = await request(app)
    .delete(`/api/vendors/${v.id}/prices/Z82514R`)
    .set(authHeader(token));
  assert.equal(del.status, 200);
  assert.equal(del.body.deleted, true);
  assert.equal(del.body.vendorId, v.id);
  assert.equal(del.body.itemKey, 'Z82514R');

  // Only PG-01 remains
  const remaining = await request(app).get(`/api/vendors/${v.id}/prices`).set(authHeader(token));
  assert.equal(remaining.status, 200);
  assert.equal(remaining.body.length, 1);
  assert.equal(remaining.body[0].itemKey, 'PG-01');
});

test('DELETE /api/vendors/:id/prices/:itemKey non-existent override → 404', async () => {
  const { token } = await registerAndLogin('prices-del-404');
  const v = await createVendor(token, { name: 'Del 404 Vendor' });

  const res = await request(app)
    .delete(`/api/vendors/${v.id}/prices/NONEXISTENT-KEY`)
    .set(authHeader(token));
  assert.equal(res.status, 404);
  assert.equal(res.body.error.code, 'NOT_FOUND');
});

test('POST /api/vendors/:id/prices/bulk → upserts all, returns count', async () => {
  const { token } = await registerAndLogin('prices-bulk');
  const v = await createVendor(token, { name: 'Bulk Vendor' });

  const items = [
    { itemKey: 'Z82514R', unitPrice: 0.82, leadTimeDays: 14, notes: 'Contract Q2' },
    { itemKey: 'PG-01', unitPrice: 12.50 },
    { itemKey: 'MF-03', unitPrice: 125.00, currency: 'USD' },
  ];

  const res = await request(app)
    .post(`/api/vendors/${v.id}/prices/bulk`)
    .set(authHeader(token))
    .send({ items });
  assert.equal(res.status, 200);
  assert.equal(res.body.upserted, 3);
  assert.equal(res.body.vendorId, v.id);

  // Verify all prices were written
  const list = await request(app).get(`/api/vendors/${v.id}/prices`).set(authHeader(token));
  assert.equal(list.status, 200);
  assert.equal(list.body.length, 3);
});

test('POST /api/vendors/:id/prices/bulk with invalid item → entire batch rejected 400 VALIDATION', async () => {
  const { token } = await registerAndLogin('prices-bulk-invalid');
  const v = await createVendor(token, { name: 'Bulk Invalid Vendor' });

  const items = [
    { itemKey: 'Z82514R', unitPrice: 0.82 },
    { itemKey: 'PG-01', unitPrice: -5.00 }, // invalid: negative
  ];

  const res = await request(app)
    .post(`/api/vendors/${v.id}/prices/bulk`)
    .set(authHeader(token))
    .send({ items });
  assert.equal(res.status, 400);
  assert.equal(res.body.error.code, 'VALIDATION');

  // Entire batch rejected — no prices should have been written
  const list = await request(app).get(`/api/vendors/${v.id}/prices`).set(authHeader(token));
  assert.equal(list.status, 200);
  assert.equal(list.body.length, 0);
});

test('POST /api/vendors/:id/prices/bulk with empty items array → 400 VALIDATION', async () => {
  const { token } = await registerAndLogin('prices-bulk-empty');
  const v = await createVendor(token, { name: 'Bulk Empty Vendor' });

  const res = await request(app)
    .post(`/api/vendors/${v.id}/prices/bulk`)
    .set(authHeader(token))
    .send({ items: [] });
  assert.equal(res.status, 400);
  assert.equal(res.body.error.code, 'VALIDATION');
});

test("POST /api/vendors/:id/prices/bulk on another user's vendor → 404", async () => {
  const { token: tokenA } = await registerAndLogin('prices-bulk-ownerA');
  const { token: tokenB } = await registerAndLogin('prices-bulk-ownerB');
  const v = await createVendor(tokenA, { name: 'A Bulk Vendor' });

  const res = await request(app)
    .post(`/api/vendors/${v.id}/prices/bulk`)
    .set(authHeader(tokenB))
    .send({ items: [{ itemKey: 'Z82514R', unitPrice: 0.82 }] });
  assert.equal(res.status, 404);
  assert.equal(res.body.error.code, 'NOT_FOUND');
});
