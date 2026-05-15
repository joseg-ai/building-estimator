// Issue #6: quote_number, revision, parent_quote_id, valid_until, status enum
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { app, request, registerAndLogin, authHeader } = require('./setup');

async function createQuote(token, overrides = {}) {
  const res = await request(app)
    .post('/api/quotes')
    .set(authHeader(token))
    .send({
      config: { projectName: 'P', customerName: '', jobLocation: '' },
      grandTotal: 1000,
      ...overrides,
    });
  if (res.status !== 201) throw new Error(`createQuote ${res.status}: ${JSON.stringify(res.body)}`);
  return res.body;
}

test('POST /api/quotes auto-generates quote_number (QT-YYYY-NNNN)', async () => {
  const { token } = await registerAndLogin('qn-auto');
  const q = await createQuote(token);
  assert.ok(q.quoteNumber, 'quoteNumber must be present');
  assert.match(q.quoteNumber, /^QT-\d{4}-\d{4}$/);
  assert.equal(q.revision, 0);
  assert.equal(q.parentQuoteId, null);
  assert.ok(q.validUntil, 'validUntil must be present');
  assert.match(q.validUntil, /^\d{4}-\d{2}-\d{2}$/);
});

test('POST /api/quotes sets validUntil ~30 days from now by default', async () => {
  const { token } = await registerAndLogin('qn-vu');
  const q = await createQuote(token);
  const vu = new Date(q.validUntil + 'T00:00:00Z').getTime();
  const expected = Date.now() + 30 * 24 * 60 * 60 * 1000;
  // within 2 days tolerance
  assert.ok(Math.abs(vu - expected) < 2 * 24 * 60 * 60 * 1000, `validUntil ${q.validUntil} not ~30 days out`);
});

test('Quote numbers increment per-user per-year (NNNN sequential)', async () => {
  const { token } = await registerAndLogin('qn-seq');
  const a = await createQuote(token);
  const b = await createQuote(token);
  const c = await createQuote(token);
  const year = new Date().getUTCFullYear();
  assert.equal(a.quoteNumber, `QT-${year}-0001`);
  assert.equal(b.quoteNumber, `QT-${year}-0002`);
  assert.equal(c.quoteNumber, `QT-${year}-0003`);
});

test('Quote number sequences are per-user (User B starts at 0001)', async () => {
  const { token: tA } = await registerAndLogin('qn-userA');
  const { token: tB } = await registerAndLogin('qn-userB');
  await createQuote(tA);
  await createQuote(tA);
  const b1 = await createQuote(tB);
  const year = new Date().getUTCFullYear();
  assert.equal(b1.quoteNumber, `QT-${year}-0001`);
});

test('GET /api/quotes returns new fields in list', async () => {
  const { token } = await registerAndLogin('qn-list');
  const created = await createQuote(token);
  const res = await request(app).get('/api/quotes').set(authHeader(token));
  assert.equal(res.status, 200);
  const item = res.body.find((q) => q.id === created.id);
  assert.ok(item);
  assert.equal(item.quoteNumber, created.quoteNumber);
  assert.equal(item.revision, 0);
  assert.equal(item.parentQuoteId, null);
  assert.equal(item.validUntil, created.validUntil);
});

test('GET /api/quotes/:id returns new fields', async () => {
  const { token } = await registerAndLogin('qn-detail');
  const created = await createQuote(token);
  const res = await request(app).get(`/api/quotes/${created.id}`).set(authHeader(token));
  assert.equal(res.status, 200);
  assert.equal(res.body.quoteNumber, created.quoteNumber);
  assert.equal(res.body.revision, 0);
  assert.equal(res.body.parentQuoteId, null);
  assert.equal(res.body.validUntil, created.validUntil);
});

test('POST /api/quotes with custom validUntil persists', async () => {
  const { token } = await registerAndLogin('qn-vucustom');
  const q = await createQuote(token, { validUntil: '2026-12-31' });
  assert.equal(q.validUntil, '2026-12-31');
});

test('POST /api/quotes with invalid validUntil → 400 VALIDATION', async () => {
  const { token } = await registerAndLogin('qn-vubad');
  const res = await request(app)
    .post('/api/quotes')
    .set(authHeader(token))
    .send({
      config: { projectName: 'P', customerName: '', jobLocation: '' },
      grandTotal: 100,
      validUntil: 'not-a-date',
    });
  assert.equal(res.status, 400);
  assert.equal(res.body.error.code, 'VALIDATION');
});

test('PUT /api/quotes/:id updates validUntil', async () => {
  const { token } = await registerAndLogin('qn-vuput');
  const created = await createQuote(token);
  const put = await request(app)
    .put(`/api/quotes/${created.id}`)
    .set(authHeader(token))
    .send({ validUntil: '2027-01-15' });
  assert.equal(put.status, 200);
  const got = await request(app).get(`/api/quotes/${created.id}`).set(authHeader(token));
  assert.equal(got.body.validUntil, '2027-01-15');
});

test('PUT /api/quotes/:id with invalid status → 400 VALIDATION', async () => {
  const { token } = await registerAndLogin('qn-stbad');
  const created = await createQuote(token);
  const put = await request(app)
    .put(`/api/quotes/${created.id}`)
    .set(authHeader(token))
    .send({ status: 'bogus' });
  assert.equal(put.status, 400);
  assert.equal(put.body.error.code, 'VALIDATION');
});

test('PUT /api/quotes/:id with valid status (sent/accepted/rejected/expired/superseded) → 200', async () => {
  const { token } = await registerAndLogin('qn-stok');
  for (const status of ['sent', 'accepted', 'rejected', 'expired', 'superseded']) {
    const created = await createQuote(token);
    const put = await request(app)
      .put(`/api/quotes/${created.id}`)
      .set(authHeader(token))
      .send({ status });
    assert.equal(put.status, 200, `status=${status} should be accepted`);
    const got = await request(app).get(`/api/quotes/${created.id}`).set(authHeader(token));
    assert.equal(got.body.status, status);
  }
});

test('POST /api/quotes with invalid status → 400 VALIDATION', async () => {
  const { token } = await registerAndLogin('qn-poststbad');
  const res = await request(app)
    .post('/api/quotes')
    .set(authHeader(token))
    .send({
      config: { projectName: 'P', customerName: '', jobLocation: '' },
      grandTotal: 100,
      status: 'in-review',
    });
  assert.equal(res.status, 400);
  assert.equal(res.body.error.code, 'VALIDATION');
});

test('POST /api/quotes/:id/revisions copies parent, increments revision, supersedes parent', async () => {
  const { token } = await registerAndLogin('qn-rev');
  const parent = await createQuote(token, {
    config: { projectName: 'Original', customerName: 'ACME', jobLocation: 'Houston' },
    grandTotal: 12345,
  });

  const res = await request(app)
    .post(`/api/quotes/${parent.id}/revisions`)
    .set(authHeader(token))
    .send({});
  assert.equal(res.status, 201);
  const rev = res.body;

  assert.notEqual(rev.id, parent.id);
  assert.equal(rev.parentQuoteId, parent.id);
  assert.equal(rev.revision, 1);
  assert.equal(rev.quoteNumber, parent.quoteNumber, 'revision keeps parent quote number');
  assert.equal(rev.status, 'draft');
  assert.equal(rev.projectName, 'Original');
  assert.equal(rev.customerName, 'ACME');
  assert.equal(rev.grandTotal, 12345);
  assert.ok(rev.config, 'revision should include config');
  assert.equal(rev.config.projectName, 'Original');

  // Parent should be marked superseded
  const parentNow = await request(app).get(`/api/quotes/${parent.id}`).set(authHeader(token));
  assert.equal(parentNow.body.status, 'superseded');
});

test('POST /api/quotes/:id/revisions chains: rev 1 → rev 2', async () => {
  const { token } = await registerAndLogin('qn-rev2');
  const parent = await createQuote(token);
  const rev1 = (await request(app)
    .post(`/api/quotes/${parent.id}/revisions`)
    .set(authHeader(token))
    .send({})).body;
  const rev2 = (await request(app)
    .post(`/api/quotes/${rev1.id}/revisions`)
    .set(authHeader(token))
    .send({})).body;
  assert.equal(rev2.revision, 2);
  assert.equal(rev2.parentQuoteId, rev1.id);
});

test('POST /api/quotes/:id/revisions on another user\'s quote → 404', async () => {
  const { token: tA } = await registerAndLogin('qn-revA');
  const { token: tB } = await registerAndLogin('qn-revB');
  const qA = await createQuote(tA);
  const res = await request(app)
    .post(`/api/quotes/${qA.id}/revisions`)
    .set(authHeader(tB))
    .send({});
  assert.equal(res.status, 404);
});

test('Schema migration: quotes table has all #6 columns', async () => {
  // Trigger DB load via registerAndLogin (cheap)
  await registerAndLogin('qn-schema');
  const db = require('../db');
  const cols = new Set(db.prepare('PRAGMA table_info(quotes)').all().map((c) => c.name));
  for (const col of ['quote_number', 'revision', 'parent_quote_id', 'valid_until']) {
    assert.ok(cols.has(col), `quotes table missing column: ${col}`);
  }
});
