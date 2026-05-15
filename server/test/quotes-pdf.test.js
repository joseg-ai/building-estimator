// Issue #17: GET /api/quotes/:id/pdf — server-side PDF generation
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { app, request, registerAndLogin, authHeader } = require('./setup');

async function createQuote(token, overrides = {}) {
  const res = await request(app)
    .post('/api/quotes')
    .set(authHeader(token))
    .send({
      config: {
        projectName: 'PDF Test Project',
        customerName: 'ACME Corp',
        jobLocation: 'Houston, TX',
        dimensions: { width: 50, length: 100, eaveHeight: 16, roofPitch: 4, baySpacing: 4, girts: 4, purlins: 10 },
        roofType: 'gable',
        options: { economicEndFrame: false, centralPoles: false, singleSlope: false, bypassGirts: false, parapet: false, parapetWidth: 0, parapetHeight: 0 },
        overhangs: { right: 0, left: 0, front: 0, back: 0 },
        leanTos: {
          right: { enabled: false, length: 0, width: 0, pitch: 0, drop: 0, highSide: 0, lowSide: 0, rafterLength: 0, purlins: 0 },
          left: { enabled: false, length: 0, width: 0, pitch: 0, drop: 0, highSide: 0, lowSide: 0, rafterLength: 0, purlins: 0 },
          front: { enabled: false, length: 0, width: 0, pitch: 0, drop: 0, highSide: 0, lowSide: 0, rafterLength: 0, purlins: 0 },
          back: { enabled: false, length: 0, width: 0, pitch: 0, drop: 0, highSide: 0, lowSide: 0, rafterLength: 0, purlins: 0 },
        },
        sheeting: { sideWall: true, swLinerPanel: false, swLinerHeight: 0, endWall: true, ewLinerPanel: false, ewLinerHeight: 0, roof: true, soffit: false, swSkirt: false, swSkirtHeight: 0, ewSkirt: false, ewSkirtHeight: 0 },
        doorsWindows: {
          doors3070: { qty: 2, includeFrame: true, width: 3, height: 7 },
          doors4070: { qty: 0, includeFrame: false, width: 0, height: 0 },
          door6070: { qty: 0, includeFrame: false, width: 0, height: 0 },
          panicHardware: 0, deadBolt: 0,
          rollUpDoors: [{ qty: 1, includeFrame: false, width: 12, height: 14 }, { qty: 0, includeFrame: false, width: 0, height: 0 }, { qty: 0, includeFrame: false, width: 0, height: 0 }, { qty: 0, includeFrame: false, width: 0, height: 0 }],
          frameOpenings: [{ qty: 0, includeFrame: false, width: 0, height: 0 }, { qty: 0, includeFrame: false, width: 0, height: 0 }, { qty: 0, includeFrame: false, width: 0, height: 0 }, { qty: 0, includeFrame: false, width: 0, height: 0 }],
          window3030: { qty: 0, includeFrame: false, width: 0, height: 0 },
          window4030: { qty: 0, includeFrame: false, width: 0, height: 0 },
          window6030: { qty: 0, includeFrame: false, width: 0, height: 0 },
          window6040: { qty: 0, includeFrame: false, width: 0, height: 0 },
        },
        accessories: { canopies: [], hssCanopies: [], masonry: 0, ridgeVents: 0, skylights: 0 },
        insulation: { roof: true, wall: false, additional: false },
        components: [],
        overheads: { laborRate: 0.75, detailing: 5000, engineering: 1500, loadingHauling: 0, freight: 500, overheadRate: 0.02, erection: 8000, foundation: 0, permits: 0, profitRate: 0.15, commissionRate: 0.04 },
        windSpeedMph: 140,
        exposureCategory: 'C',
        roofLiveLoadPsf: 20,
        snowLoadPsf: 0,
        roofColor: 'Galvalume',
        wallColor: 'Polar White',
        trimColor: 'Polar White',
        salesTaxRate: 0.0825,
        salesTaxIncluded: false,
      },
      grandTotal: 125000,
      ...overrides,
    });
  if (res.status !== 201) throw new Error(`createQuote ${res.status}: ${JSON.stringify(res.body)}`);
  return res.body;
}

test('GET /api/quotes/:id/pdf → 200 application/pdf with %PDF- magic bytes', async () => {
  const { token } = await registerAndLogin('pdf-basic');
  const q = await createQuote(token);

  const res = await request(app)
    .get(`/api/quotes/${q.id}/pdf`)
    .set(authHeader(token))
    .buffer(true)
    .parse((res, callback) => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => callback(null, Buffer.concat(chunks)));
    });

  assert.equal(res.status, 200, `expected 200, got ${res.status}: ${JSON.stringify(res.body)}`);
  assert.ok(
    res.headers['content-type']?.includes('application/pdf'),
    `expected application/pdf content-type, got: ${res.headers['content-type']}`
  );
  const body = res.body;
  assert.ok(Buffer.isBuffer(body), 'response body should be a Buffer');
  const magic = body.slice(0, 5).toString('ascii');
  assert.equal(magic, '%PDF-', `response should start with %PDF-, got: ${magic}`);
});

test('GET /api/quotes/:id/pdf → Content-Disposition filename is Q-{id}-r{rev}.pdf', async () => {
  const { token } = await registerAndLogin('pdf-filename');
  const q = await createQuote(token);

  const res = await request(app)
    .get(`/api/quotes/${q.id}/pdf`)
    .set(authHeader(token))
    .buffer(true)
    .parse((res, callback) => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => callback(null, Buffer.concat(chunks)));
    });

  assert.equal(res.status, 200);
  const disposition = res.headers['content-disposition'] ?? '';
  const expected = `Q-${q.id}-r0.pdf`;
  assert.ok(
    disposition.includes(expected),
    `Content-Disposition should include "${expected}", got: "${disposition}"`
  );
});

test('GET /api/quotes/:id/pdf for another user → 404', async () => {
  const { token: tA } = await registerAndLogin('pdf-userA');
  const { token: tB } = await registerAndLogin('pdf-userB');
  const q = await createQuote(tA);

  const res = await request(app)
    .get(`/api/quotes/${q.id}/pdf`)
    .set(authHeader(tB));

  assert.equal(res.status, 404);
});

test('GET /api/quotes/:id/pdf for non-existent id → 404', async () => {
  const { token } = await registerAndLogin('pdf-notfound');
  const res = await request(app)
    .get('/api/quotes/does-not-exist-uuid/pdf')
    .set(authHeader(token));

  assert.equal(res.status, 404);
});
