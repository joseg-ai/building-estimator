const { test } = require('node:test');
const assert = require('node:assert/strict');
const { app, request, registerAndLogin, authHeader } = require('./setup');

// ── helpers ───────────────────────────────────────────────────────────────────

const minCustomer = (overrides = {}) => ({
  name: 'Acme Steel ' + Math.random().toString(36).slice(2, 7),
  company: 'Acme Steel LLC',
  email: 'contact@acme.example',
  ...overrides,
});

async function createCustomer(token, overrides = {}) {
  const res = await request(app)
    .post('/api/customers')
    .set(authHeader(token))
    .send(minCustomer(overrides));
  if (res.status !== 201) throw new Error(`createCustomer failed (${res.status}): ${JSON.stringify(res.body)}`);
  return res.body;
}

async function createQuote(token, overrides = {}) {
  const res = await request(app)
    .post('/api/quotes')
    .set(authHeader(token))
    .send({
      config: { projectName: 'Test Quote', customerName: '', jobLocation: '' },
      grandTotal: 1000,
      ...overrides,
    });
  if (res.status !== 201) throw new Error(`createQuote failed (${res.status}): ${JSON.stringify(res.body)}`);
  return res.body;
}

// ── tests ─────────────────────────────────────────────────────────────────────

test('GET /api/customers empty → 200 []', async () => {
  const { token } = await registerAndLogin('cust-empty');
  const res = await request(app).get('/api/customers').set(authHeader(token));
  assert.equal(res.status, 200);
  assert.ok(Array.isArray(res.body));
  assert.equal(res.body.length, 0);
});

test('POST /api/customers without auth → 401', async () => {
  const res = await request(app).post('/api/customers').send(minCustomer());
  assert.equal(res.status, 401);
});

test('POST /api/customers valid → 201 with id and quoteCount: 0', async () => {
  const { token } = await registerAndLogin('cust-create');
  const res = await request(app)
    .post('/api/customers')
    .set(authHeader(token))
    .send(minCustomer({ name: 'Builder Inc', company: 'Builder Inc LLC' }));
  assert.equal(res.status, 201);
  assert.equal(typeof res.body.id, 'number');
  assert.equal(res.body.name, 'Builder Inc');
  assert.equal(res.body.quoteCount, 0);
  assert.equal(typeof res.body.createdAt, 'number');
});

test('POST /api/customers missing name → 400 VALIDATION', async () => {
  const { token } = await registerAndLogin('cust-noname');
  const body = minCustomer();
  delete body.name;
  const res = await request(app).post('/api/customers').set(authHeader(token)).send(body);
  assert.equal(res.status, 400);
  assert.equal(res.body.error.code, 'VALIDATION');
});

test('POST /api/customers invalid email format → 400 VALIDATION', async () => {
  const { token } = await registerAndLogin('cust-bademail');
  const res = await request(app)
    .post('/api/customers')
    .set(authHeader(token))
    .send(minCustomer({ email: 'not-an-email' }));
  assert.equal(res.status, 400);
  assert.equal(res.body.error.code, 'VALIDATION');
});

test('POST /api/customers non-numeric defaultProfitPct → 400 VALIDATION', async () => {
  const { token } = await registerAndLogin('cust-badnum');
  const res = await request(app)
    .post('/api/customers')
    .set(authHeader(token))
    .send(minCustomer({ defaultProfitPct: 'twenty' }));
  assert.equal(res.status, 400);
  assert.equal(res.body.error.code, 'VALIDATION');
});

test('GET /api/customers returns created customer with quoteCount: 0', async () => {
  const { token } = await registerAndLogin('cust-list');
  const created = await createCustomer(token, { name: 'Listed Co' });
  const res = await request(app).get('/api/customers').set(authHeader(token));
  assert.equal(res.status, 200);
  const found = res.body.find((c) => c.id === created.id);
  assert.ok(found, 'created customer not in list');
  assert.equal(found.name, 'Listed Co');
  assert.equal(found.quoteCount, 0);
});

test('GET /api/customers?search= filters by name and company', async () => {
  const { token } = await registerAndLogin('cust-search');
  await createCustomer(token, { name: 'Alpine Metals', company: 'Alpine LLC' });
  await createCustomer(token, { name: 'Desert Steel', company: 'Desert Corp' });
  await createCustomer(token, { name: 'Prairie Iron', company: 'Prairie LLC' });

  // search by name
  const byName = await request(app).get('/api/customers?search=Alpine').set(authHeader(token));
  assert.equal(byName.status, 200);
  assert.equal(byName.body.length, 1);
  assert.equal(byName.body[0].name, 'Alpine Metals');

  // search by company
  const byCompany = await request(app).get('/api/customers?search=Desert Corp').set(authHeader(token));
  assert.equal(byCompany.status, 200);
  assert.equal(byCompany.body.length, 1);
  assert.equal(byCompany.body[0].name, 'Desert Steel');
});

test('GET /api/customers/:id existing → 200 full record', async () => {
  const { token } = await registerAndLogin('cust-getid');
  const created = await createCustomer(token, { name: 'Ironworks LLC', phone: '555-9999' });
  const res = await request(app).get(`/api/customers/${created.id}`).set(authHeader(token));
  assert.equal(res.status, 200);
  assert.equal(res.body.id, created.id);
  assert.equal(res.body.name, 'Ironworks LLC');
  assert.equal(res.body.phone, '555-9999');
  assert.equal(typeof res.body.quoteCount, 'number');
});

test('GET /api/customers/:id another user\'s record → 404 (no leak)', async () => {
  const { token: tokenA } = await registerAndLogin('cust-ownerA');
  const { token: tokenB } = await registerAndLogin('cust-ownerB');
  const created = await createCustomer(tokenA, { name: 'Secret Corp' });

  const res = await request(app).get(`/api/customers/${created.id}`).set(authHeader(tokenB));
  assert.equal(res.status, 404);
  assert.equal(res.body.error.code, 'NOT_FOUND');
});

test('PUT /api/customers/:id own → updates fields', async () => {
  const { token } = await registerAndLogin('cust-put');
  const created = await createCustomer(token, { name: 'Old Name', city: 'Austin' });

  const res = await request(app)
    .put(`/api/customers/${created.id}`)
    .set(authHeader(token))
    .send({ name: 'New Name', city: 'Houston', defaultLaborRate: 1.5 });
  assert.equal(res.status, 200);
  assert.equal(res.body.name, 'New Name');
  assert.equal(res.body.city, 'Houston');
  assert.equal(res.body.defaultLaborRate, 1.5);
});

test('PUT /api/customers/:id another user\'s → 404', async () => {
  const { token: tokenA } = await registerAndLogin('cust-putA');
  const { token: tokenB } = await registerAndLogin('cust-putB');
  const created = await createCustomer(tokenA, { name: 'A Corp' });

  const res = await request(app)
    .put(`/api/customers/${created.id}`)
    .set(authHeader(tokenB))
    .send({ name: 'B Attempt' });
  assert.equal(res.status, 404);
});

test('DELETE /api/customers/:id with no quotes → 200 success', async () => {
  const { token } = await registerAndLogin('cust-del-clean');
  const created = await createCustomer(token, { name: 'Temp Corp' });

  const res = await request(app).delete(`/api/customers/${created.id}`).set(authHeader(token));
  assert.equal(res.status, 200);
  assert.equal(res.body.deleted, true);
  assert.equal(res.body.quotesUnlinked, 0);

  const after = await request(app).get(`/api/customers/${created.id}`).set(authHeader(token));
  assert.equal(after.status, 404);
});

test('DELETE /api/customers/:id with quotes → 409 IN_USE', async () => {
  const { token } = await registerAndLogin('cust-del-inuse');
  const cust = await createCustomer(token, { name: 'Busy Corp' });
  await createQuote(token, { customerId: cust.id });

  const res = await request(app).delete(`/api/customers/${cust.id}`).set(authHeader(token));
  assert.equal(res.status, 409);
  assert.equal(res.body.error.code, 'IN_USE');
});

test('DELETE /api/customers/:id?force=true → success, quotes customer_id SET NULL', async () => {
  const { token } = await registerAndLogin('cust-del-force');
  const cust = await createCustomer(token, { name: 'Force Corp' });
  const quote = await createQuote(token, { customerId: cust.id });

  const del = await request(app)
    .delete(`/api/customers/${cust.id}?force=true`)
    .set(authHeader(token));
  assert.equal(del.status, 200);
  assert.equal(del.body.deleted, true);
  assert.equal(del.body.quotesUnlinked, 1);

  // Quote must survive with customerId nulled out via FK ON DELETE SET NULL
  const q = await request(app).get(`/api/quotes/${quote.id}`).set(authHeader(token));
  assert.equal(q.status, 200);
  assert.equal(q.body.customerId, null);
});

test('GET /api/customers/:id/quotes returns linked quotes only', async () => {
  const { token } = await registerAndLogin('cust-id-quotes');
  const cust = await createCustomer(token, { name: 'Linked Corp' });
  const otherCust = await createCustomer(token, { name: 'Other Corp' });

  const linked = await createQuote(token, {
    customerId: cust.id,
    config: { projectName: 'Linked Q', customerName: 'Linked Corp', jobLocation: '' },
  });
  await createQuote(token, {}); // unlinked
  await createQuote(token, {
    customerId: otherCust.id,
    config: { projectName: 'Other Q', customerName: 'Other Corp', jobLocation: '' },
  });

  const res = await request(app)
    .get(`/api/customers/${cust.id}/quotes`)
    .set(authHeader(token));
  assert.equal(res.status, 200);
  assert.equal(res.body.length, 1);
  assert.equal(res.body[0].id, linked.id);
  assert.equal(res.body[0].customerId, cust.id);
});
