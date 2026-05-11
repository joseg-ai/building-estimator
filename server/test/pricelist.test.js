const { test } = require('node:test');
const assert = require('node:assert/strict');
const { app, request, registerAndLogin, authHeader } = require('./setup');

const samplePayload = () => ({
  name: 'Test PL ' + Math.random().toString(36).slice(2, 7),
  supplier: 'Central States',
  notes: 'sample',
  items: [
    { item_key: 'Z82514R', description: 'Z purlin 8x2.5x14ga R', unit: 'lb', unit_price: 1.23, category: 'purlins' },
    { item_key: 'PG-01',   description: 'Painted girt',           unit: 'lb', unit_price: 1.10, category: 'girts' },
  ],
});

test('GET /api/price-list/versions on empty DB → 200 []', async () => {
  const res = await request(app).get('/api/price-list/versions');
  assert.equal(res.status, 200);
  assert.ok(Array.isArray(res.body));
});

test('POST /api/price-list/versions without auth → 401', async () => {
  const res = await request(app).post('/api/price-list/versions').send(samplePayload());
  assert.equal(res.status, 401);
});

test('POST with auth + valid payload → 201 with id', async () => {
  const { token } = await registerAndLogin('pl-creator');
  const res = await request(app)
    .post('/api/price-list/versions')
    .set(authHeader(token))
    .send(samplePayload());
  assert.equal(res.status, 201);
  assert.equal(typeof res.body.id, 'number');
  assert.equal(res.body.item_count, 2);
});

test('POST with auth + missing name → 400 VALIDATION', async () => {
  const { token } = await registerAndLogin('pl-bad');
  const bad = samplePayload();
  delete bad.name;
  const res = await request(app)
    .post('/api/price-list/versions')
    .set(authHeader(token))
    .send(bad);
  assert.equal(res.status, 400);
  assert.equal(res.body.error.code, 'VALIDATION');
});

test('POST with auth + missing item_key → 400 VALIDATION', async () => {
  const { token } = await registerAndLogin('pl-bad2');
  const bad = samplePayload();
  bad.items[0] = { unit_price: 1.0 };
  const res = await request(app)
    .post('/api/price-list/versions')
    .set(authHeader(token))
    .send(bad);
  assert.equal(res.status, 400);
  assert.equal(res.body.error.code, 'VALIDATION');
});

test('GET /api/price-list/versions/:id existing → 200 with items', async () => {
  const { token } = await registerAndLogin('pl-getter');
  const created = await request(app)
    .post('/api/price-list/versions')
    .set(authHeader(token))
    .send(samplePayload());
  const id = created.body.id;
  const res = await request(app).get(`/api/price-list/versions/${id}`);
  assert.equal(res.status, 200);
  assert.equal(res.body.version.id, id);
  assert.equal(res.body.items.length, 2);
});

test('GET /api/price-list/versions/99999 → 404 NOT_FOUND', async () => {
  const res = await request(app).get('/api/price-list/versions/99999');
  assert.equal(res.status, 404);
  assert.equal(res.body.error.code, 'NOT_FOUND');
});

test('PUT item with auth + valid → updates and round-trips', async () => {
  const { token } = await registerAndLogin('pl-edit');
  const created = await request(app)
    .post('/api/price-list/versions')
    .set(authHeader(token))
    .send(samplePayload());
  const id = created.body.id;

  const put = await request(app)
    .put(`/api/price-list/versions/${id}/items/Z82514R`)
    .set(authHeader(token))
    .send({ unit_price: 9.99, description: 'updated desc' });
  assert.equal(put.status, 200);
  assert.equal(put.body.unit_price, 9.99);
  assert.equal(put.body.description, 'updated desc');

  const round = await request(app).get(`/api/price-list/versions/${id}`);
  const item = round.body.items.find((i) => i.item_key === 'Z82514R');
  assert.equal(item.unit_price, 9.99);
  const other = round.body.items.find((i) => i.item_key === 'PG-01');
  assert.equal(other.unit_price, 1.10);
});

test('PUT item without auth → 401', async () => {
  const res = await request(app)
    .put('/api/price-list/versions/1/items/Z82514R')
    .send({ unit_price: 1.0 });
  assert.equal(res.status, 401);
});

test('PUT activate flips is_active and clears others', async () => {
  const { token } = await registerAndLogin('pl-activate');
  const v1 = (await request(app).post('/api/price-list/versions').set(authHeader(token)).send(samplePayload())).body;
  const v2 = (await request(app).post('/api/price-list/versions').set(authHeader(token)).send(samplePayload())).body;

  const a1 = await request(app).put(`/api/price-list/versions/${v1.id}/activate`).set(authHeader(token));
  assert.equal(a1.status, 200);
  assert.equal(a1.body.is_active, 1);

  const a2 = await request(app).put(`/api/price-list/versions/${v2.id}/activate`).set(authHeader(token));
  assert.equal(a2.status, 200);
  assert.equal(a2.body.is_active, 1);

  const check = await request(app).get(`/api/price-list/versions/${v1.id}`);
  assert.equal(check.body.version.is_active, 0);

  const active = await request(app).get('/api/price-list/active');
  assert.equal(active.status, 200);
  assert.equal(active.body.version.id, v2.id);
});

test('DELETE unreferenced version → success', async () => {
  const { token } = await registerAndLogin('pl-delete');
  const created = (await request(app).post('/api/price-list/versions').set(authHeader(token)).send(samplePayload())).body;
  const del = await request(app)
    .delete(`/api/price-list/versions/${created.id}`)
    .set(authHeader(token));
  assert.equal(del.status, 200);
  assert.equal(del.body.deleted, true);

  const after = await request(app).get(`/api/price-list/versions/${created.id}`);
  assert.equal(after.status, 404);
});

test('DELETE unknown version → 404', async () => {
  const { token } = await registerAndLogin('pl-del404');
  const res = await request(app).delete('/api/price-list/versions/88888').set(authHeader(token));
  assert.equal(res.status, 404);
  assert.equal(res.body.error.code, 'NOT_FOUND');
});
