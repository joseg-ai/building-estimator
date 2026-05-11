// Per-test-file setup: point DB_PATH at a unique temp file BEFORE loading the app.
// Each test file should require this module before requiring '../index'.

const os = require('os');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const tmpName = `pemb-test-${process.pid}-${crypto.randomBytes(6).toString('hex')}.db`;
const tmpPath = path.join(os.tmpdir(), tmpName);

process.env.DB_PATH = tmpPath;
process.env.JWT_SECRET = 'test-secret';
process.env.NODE_ENV = 'test';

const app = require('../index');
const request = require('supertest');

function cleanup() {
  for (const ext of ['', '-wal', '-shm']) {
    try { fs.unlinkSync(tmpPath + ext); } catch { /* ignore */ }
  }
}

process.on('exit', cleanup);

async function registerAndLogin(username = 'tester') {
  const uniq = `${username}-${crypto.randomBytes(3).toString('hex')}`;
  const res = await request(app)
    .post('/api/auth/register')
    .send({ username: uniq, password: 'pw1234', displayName: uniq });
  if (res.status !== 201) {
    throw new Error(`register failed (${res.status}): ${JSON.stringify(res.body)}`);
  }
  return { token: res.body.token, user: res.body.user };
}

function authHeader(token) {
  return { Authorization: `Bearer ${token}` };
}

module.exports = { app, request, registerAndLogin, authHeader, tmpPath, cleanup };
