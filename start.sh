#!/bin/bash
set -e

# Capture container-provided PORT (e.g. Render sets PORT=10000)
PUBLIC_PORT="${PORT:-10000}"

# Read .env if present
if [ -f .env ]; then
  set -a
  source .env 2>/dev/null || true
  set +a
fi

# Ensure PORT and NODE_ENV are never corrupted by .env
export PORT="${PUBLIC_PORT}"
export NODE_ENV="production"
export NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=256}"

# Conditionally start local Python AI Microservice only if using local URL
if [[ -z "${PYTHON_API_URL}" || "${PYTHON_API_URL}" == *"127.0.0.1"* || "${PYTHON_API_URL}" == *"localhost"* ]]; then
  echo "Starting local Python AI Microservice on 127.0.0.1:8001..."
  cd /app/python-api
  python3 -m uvicorn ai_server:app --host 127.0.0.1 --port 8001 &
  cd /app
else
  echo "Using remote Python AI Microservice at: ${PYTHON_API_URL}"
  echo "Local Python microservice disabled to conserve Render container memory."
fi

cd /app
node scripts/prepare-db.js || true

echo "Starting Node.js Backend on 0.0.0.0:${PORT}..."
exec node dist/index.js
