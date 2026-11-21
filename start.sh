#!/bin/bash
set -e

# Capture container-provided PORT (e.g. Render sets PORT=10000)
PUBLIC_PORT="${PORT:-10000}"

echo "Starting Python AI Microservice on 127.0.0.1:8001..."
cd /app/python-api
python3 -m uvicorn ai_server:app --host 127.0.0.1 --port 8001 &

cd /app
node scripts/prepare-db.js || true

if [ -f .env ]; then
  set -a
  source .env 2>/dev/null || true
  set +a
fi

# Ensure PORT and NODE_ENV are never corrupted by .env
export PORT="${PUBLIC_PORT}"
export NODE_ENV="production"

echo "Starting Node.js Backend on 0.0.0.0:${PORT}..."
exec node dist/index.js
