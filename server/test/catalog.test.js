const { test } = require('node:test');
const assert = require('node:assert/strict');
const { app, request, registerAndLogin, authHeader } = require('./setup');

const complexPayload = {
  id: 'PG-01',
  category: 'girts',
  description: 'Painted girt 8x2.5x14ga',
  unit: 'lb',
  weightPerUnit: 4.16,
  weightUnit: 'lb/ft',
  dims: { depth: 8, flange: 2.5, gauge: 14 },
  finishes: ['painted', 'galvanized'],
  alternates: [{ id: 'PG-01-G', costMultiplier: 1.15 }],
  notes: 'Used as wall girt for spans up to 25ft',
};

const samplePayload = () => ({
  name: 'Test Catalog ' + Math.random().toString(36).slice(2, 7),
  notes: 'sample',
  items: [
    { category: 'girts',   item_key: 'PG-01',   payload: complexPayload },
    { category: 'purlins', item_key: 'Z82514R', payload: { id: 'Z82514R', weightPerUnit: 3.2 } },
  ],
});

test('GET /api/catalog/versions on empty DB → 200 []', async () => {
  const res = await request(app).get('/api/catalog/versions');
  assert.equal(res.status, 200);
  assert.ok(Array.isArray(res.body));
});

test('POST /api/catalog/versions without auth → 401', async () => {
  const res = await request(app).post('/api/catalog/versions').send(samplePayload());
  assert.equal(res.status, 401);
});

test('POST with auth + valid payload → 201 with id', async () => {
  const { token } = await registerAndLogin('cat-creator');
  const res = await request(app)
    .post('/api/catalog/versions')
    .set(authHeader(token))
    .send(samplePayload());
  assert.equal(res.status, 201);
  assert.equal(typeof res.body.id, 'number');
  assert.equal(res.body.item_count, 2);
});

test('POST with missing name → 400 VALIDATION', async () => {
  const { token } = await registerAndLogin('cat-bad');
  const bad = samplePayload();
  delete bad.name;
  const res = await request(app)
    .post('/api/catalog/versions')
    .set(authHeader(token))
    .send(bad);
  assert.equal(res.status, 400);
  assert.equal(res.body.error.code, 'VALIDATION');
});

test('POST with item missing payload → 400 VALIDATION', async () => {
  const { token } = await registerAndLogin('cat-bad2');
  const bad = samplePayload();
  bad.items[0] = { category: 'girts', item_key: 'PG-99' };
  const res = await request(app)
    .post('/api/catalog/versions')
    .set(authHeader(token))
    .send(bad);
  assert.equal(res.status, 400);
  assert.equal(res.body.error.code, 'VALIDATION');
});

test('GET /api/catalog/versions/:id round-trips complex payload (deep equal)', async () => {
  const { token } = await registerAndLogin('cat-roundtrip');
  const created = (await request(app)
    .post('/api/catalog/versions')
    .set(authHeader(token))
    .send(samplePayload())).body;
  const res = await request(app).get(`/api/catalog/versions/${created.id}`);
  assert.equal(res.status, 200);
  const item = res.body.items.find((i) => i.item_key === 'PG-01');
  assert.ok(item, 'PG-01 missing');
  assert.deepEqual(item.payload, complexPayload);
});

test('GET /api/catalog/versions/99999 → 404', async () => {
  const res = await request(app).get('/api/catalog/versions/99999');
  assert.equal(res.status, 404);
  assert.equal(res.body.error.code, 'NOT_FOUND');
});

test('PUT item updates payload and round-trips', async () => {
  const { token } = await registerAndLogin('cat-edit');
  const created = (await request(app)
    .post('/api/catalog/versions')
    .set(authHeader(token))
    .send(samplePayload())).body;

  const newPayload = { ...complexPayload, weightPerUnit: 5.5, notes: 'updated' };
  const put = await request(app)
    .put(`/api/catalog/versions/${created.id}/items/PG-01`)
    .set(authHeader(token))
    .send({ payload: newPayload });
  assert.equal(put.status, 200);
  assert.deepEqual(put.body.payload, newPayload);

  const round = await request(app).get(`/api/catalog/versions/${created.id}`);
  const item = round.body.items.find((i) => i.item_key === 'PG-01');
  assert.deepEqual(item.payload, newPayload);
});

test('PUT item without auth → 401', async () => {
  const res = await request(app)
    .put('/api/catalog/versions/1/items/PG-01')
    .send({ payload: {} });
  assert.equal(res.status, 401);
});

test('PUT item missing payload → 400', async () => {
  const { token } = await registerAndLogin('cat-edit2');
  const created = (await request(app)
    .post('/api/catalog/versions')
    .set(authHeader(token))
    .send(samplePayload())).body;
  const res = await request(app)
    .put(`/api/catalog/versions/${created.id}/items/PG-01`)
    .set(authHeader(token))
    .send({});
  assert.equal(res.status, 400);
  assert.equal(res.body.error.code, 'VALIDATION');
});

test('PUT activate flips is_active across versions', async () => {
  const { token } = await registerAndLogin('cat-activate');
  const v1 = (await request(app).post('/api/catalog/versions').set(authHeader(token)).send(samplePayload())).body;
  const v2 = (await request(app).post('/api/catalog/versions').set(authHeader(token)).send(samplePayload())).body;

  await request(app).put(`/api/catalog/versions/${v1.id}/activate`).set(authHeader(token));
  await request(app).put(`/api/catalog/versions/${v2.id}/activate`).set(authHeader(token));

  const check = await request(app).get(`/api/catalog/versions/${v1.id}`);
  assert.equal(check.body.version.is_active, 0);

  const active = await request(app).get('/api/catalog/active');
  assert.equal(active.status, 200);
  assert.equal(active.body.version.id, v2.id);
});

test('DELETE unreferenced version → success', async () => {
  const { token } = await registerAndLogin('cat-delete');
  const created = (await request(app).post('/api/catalog/versions').set(authHeader(token)).send(samplePayload())).body;
  const del = await request(app).delete(`/api/catalog/versions/${created.id}`).set(authHeader(token));
  assert.equal(del.status, 200);
  assert.equal(del.body.deleted, true);

  const after = await request(app).get(`/api/catalog/versions/${created.id}`);
  assert.equal(after.status, 404);
});

test('DELETE unknown version → 404', async () => {
  const { token } = await registerAndLogin('cat-del404');
  const res = await request(app).delete('/api/catalog/versions/88888').set(authHeader(token));
  assert.equal(res.status, 404);
  assert.equal(res.body.error.code, 'NOT_FOUND');
});
