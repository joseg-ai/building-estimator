// PR #24 follow-up: design loads + colors persisted as proper scalar columns.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { app, request, registerAndLogin, authHeader } = require('./setup');

const BASE_CONFIG = { projectName: 'Load Test', customerName: '', jobLocation: '' };

async function createQuote(token, overrides = {}) {
  const res = await request(app)
    .post('/api/quotes')
    .set(authHeader(token))
    .send({ config: BASE_CONFIG, grandTotal: 0, ...overrides });
  if (res.status !== 201) throw new Error(`createQuote ${res.status}: ${JSON.stringify(res.body)}`);
  return res.body;
}

// ── POST ─────────────────────────────────────────────────────────────────────

test('POST /api/quotes persists design loads + colors and returns them', async () => {
  const { token } = await registerAndLogin('dl-post-full');
  const config = {
    ...BASE_CONFIG,
    windSpeedMph: 130,
    exposureCategory: 'D',
    roofLiveLoadPsf: 25,
    snowLoadPsf: 35,
    roofColor: 'Galvalume',
    wallColor: 'Slate Blue',
    trimColor: 'White',
  };
  const q = await createQuote(token, { config });
  assert.equal(q.windSpeedMph, 130);
  assert.equal(q.exposureCategory, 'D');
  assert.equal(q.roofLiveLoadPsf, 25);
  assert.equal(q.snowLoadPsf, 35);
  assert.equal(q.roofColor, 'Galvalume');
  assert.equal(q.wallColor, 'Slate Blue');
  assert.equal(q.trimColor, 'White');
});

test('POST /api/quotes uses sensible defaults when fields absent', async () => {
  const { token } = await registerAndLogin('dl-post-defaults');
  const q = await createQuote(token);
  assert.equal(q.windSpeedMph, 115);
  assert.equal(q.exposureCategory, 'C');
  assert.equal(q.roofLiveLoadPsf, 20);
  assert.equal(q.snowLoadPsf, 20);
  assert.equal(q.roofColor, '');
  assert.equal(q.wallColor, '');
  assert.equal(q.trimColor, '');
});

test('POST /api/quotes with invalid exposureCategory → 400 VALIDATION', async () => {
  const { token } = await registerAndLogin('dl-bad-exp');
  const res = await request(app)
    .post('/api/quotes')
    .set(authHeader(token))
    .send({ config: { ...BASE_CONFIG, exposureCategory: 'Z' }, grandTotal: 0 });
  assert.equal(res.status, 400);
  assert.equal(res.body.error.code, 'VALIDATION');
});

test('POST /api/quotes with non-number windSpeedMph → 400 VALIDATION', async () => {
  const { token } = await registerAndLogin('dl-bad-wind');
  const res = await request(app)
    .post('/api/quotes')
    .set(authHeader(token))
    .send({ config: { ...BASE_CONFIG, windSpeedMph: 'fast' }, grandTotal: 0 });
  assert.equal(res.status, 400);
  assert.equal(res.body.error.code, 'VALIDATION');
});

test('POST /api/quotes with non-string roofColor → 400 VALIDATION', async () => {
  const { token } = await registerAndLogin('dl-bad-color');
  const res = await request(app)
    .post('/api/quotes')
    .set(authHeader(token))
    .send({ config: { ...BASE_CONFIG, roofColor: 42 }, grandTotal: 0 });
  assert.equal(res.status, 400);
  assert.equal(res.body.error.code, 'VALIDATION');
});

// ── GET list + detail ─────────────────────────────────────────────────────────

test('GET /api/quotes list returns design load fields', async () => {
  const { token } = await registerAndLogin('dl-list');
  const config = { ...BASE_CONFIG, windSpeedMph: 120, exposureCategory: 'B', roofLiveLoadPsf: 30, snowLoadPsf: 40, roofColor: 'Red', wallColor: 'Blue', trimColor: 'Gray' };
  const created = await createQuote(token, { config });

  const res = await request(app).get('/api/quotes').set(authHeader(token));
  assert.equal(res.status, 200);
  const item = res.body.find((q) => q.id === created.id);
  assert.ok(item, 'created quote must appear in list');
  assert.equal(item.windSpeedMph, 120);
  assert.equal(item.exposureCategory, 'B');
  assert.equal(item.roofLiveLoadPsf, 30);
  assert.equal(item.snowLoadPsf, 40);
  assert.equal(item.roofColor, 'Red');
  assert.equal(item.wallColor, 'Blue');
  assert.equal(item.trimColor, 'Gray');
});

test('GET /api/quotes/:id detail returns design load fields', async () => {
  const { token } = await registerAndLogin('dl-detail');
  const config = { ...BASE_CONFIG, windSpeedMph: 105, exposureCategory: 'C', roofLiveLoadPsf: 15, snowLoadPsf: 0, roofColor: 'Bone White', wallColor: 'Burnished Slate', trimColor: '' };
  const created = await createQuote(token, { config });

  const res = await request(app).get(`/api/quotes/${created.id}`).set(authHeader(token));
  assert.equal(res.status, 200);
  assert.equal(res.body.windSpeedMph, 105);
  assert.equal(res.body.exposureCategory, 'C');
  assert.equal(res.body.roofLiveLoadPsf, 15);
  assert.equal(res.body.snowLoadPsf, 0);
  assert.equal(res.body.roofColor, 'Bone White');
  assert.equal(res.body.wallColor, 'Burnished Slate');
  assert.equal(res.body.trimColor, '');
});

// ── PUT ───────────────────────────────────────────────────────────────────────

test('PUT /api/quotes/:id updates design load fields via config', async () => {
  const { token } = await registerAndLogin('dl-put');
  const q = await createQuote(token);

  const updated = { ...BASE_CONFIG, windSpeedMph: 140, exposureCategory: 'D', roofLiveLoadPsf: 22, snowLoadPsf: 50, roofColor: 'Forest Green', wallColor: 'Tan', trimColor: 'Brown' };
  const put = await request(app)
    .put(`/api/quotes/${q.id}`)
    .set(authHeader(token))
    .send({ config: updated });
  assert.equal(put.status, 200);

  const got = await request(app).get(`/api/quotes/${q.id}`).set(authHeader(token));
  assert.equal(got.body.windSpeedMph, 140);
  assert.equal(got.body.exposureCategory, 'D');
  assert.equal(got.body.roofLiveLoadPsf, 22);
  assert.equal(got.body.snowLoadPsf, 50);
  assert.equal(got.body.roofColor, 'Forest Green');
  assert.equal(got.body.wallColor, 'Tan');
  assert.equal(got.body.trimColor, 'Brown');
});

test('PUT /api/quotes/:id with invalid exposureCategory → 400 VALIDATION', async () => {
  const { token } = await registerAndLogin('dl-put-bad-exp');
  const q = await createQuote(token);
  const res = await request(app)
    .put(`/api/quotes/${q.id}`)
    .set(authHeader(token))
    .send({ config: { ...BASE_CONFIG, exposureCategory: 'A' } });
  assert.equal(res.status, 400);
  assert.equal(res.body.error.code, 'VALIDATION');
});

// ── Revision copy ─────────────────────────────────────────────────────────────

test('POST /api/quotes/:id/revisions copies design load fields', async () => {
  const { token } = await registerAndLogin('dl-rev');
  const config = { ...BASE_CONFIG, windSpeedMph: 125, exposureCategory: 'C', roofLiveLoadPsf: 18, snowLoadPsf: 28, roofColor: 'Burnished Slate', wallColor: 'Slate Blue', trimColor: 'White' };
  const parent = await createQuote(token, { config });

  const res = await request(app)
    .post(`/api/quotes/${parent.id}/revisions`)
    .set(authHeader(token))
    .send({});
  assert.equal(res.status, 201);
  const rev = res.body;
  assert.equal(rev.windSpeedMph, 125);
  assert.equal(rev.exposureCategory, 'C');
  assert.equal(rev.roofLiveLoadPsf, 18);
  assert.equal(rev.snowLoadPsf, 28);
  assert.equal(rev.roofColor, 'Burnished Slate');
  assert.equal(rev.wallColor, 'Slate Blue');
  assert.equal(rev.trimColor, 'White');
});

// ── Schema migration ──────────────────────────────────────────────────────────

test('Schema migration: quotes table has all design load + color columns', async () => {
  await registerAndLogin('dl-schema');
  const db = require('../db');
  const cols = new Set(db.prepare('PRAGMA table_info(quotes)').all().map((c) => c.name));
  for (const col of ['wind_speed_mph', 'exposure_category', 'roof_live_load_psf', 'snow_load_psf', 'roof_color', 'wall_color', 'trim_color']) {
    assert.ok(cols.has(col), `quotes table missing column: ${col}`);
  }
});
