#!/bin/bash
# Startup script: rebuild native modules on Azure container, then start server.
# Runs once per deployment (node_modules are rebuilt for the correct glibc/Node ABI).
set -e

cd /home/site/wwwroot/server

echo "[startup] Installing production dependencies..."
npm ci --omit=dev

echo "[startup] Starting server..."
cd /home/site/wwwroot
exec node server/index.js
