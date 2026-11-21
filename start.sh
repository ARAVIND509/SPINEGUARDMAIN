#!/bin/bash
set -e

echo "Starting Python AI Microservice on 127.0.0.1:8001..."
cd /app/python-api
python3 -m uvicorn ai_server:app --host 127.0.0.1 --port 8001 &

echo "Starting Node.js Backend on port ${PORT:-5000}..."
cd /app
node scripts/prepare-db.js

if [ -f .env ]; then
  set -a
  source .env 2>/dev/null || true
  set +a
fi

exec node dist/index.js
