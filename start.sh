#!/bin/bash
set -e

echo "Starting Python AI Server on 127.0.0.1:8000 (internal)..."
cd /app/python-api
python3 -m uvicorn ai_server:app --host 127.0.0.1 --port 8000 &

echo "Starting Node.js Backend on port ${PORT:-5000} (public)..."
cd /app
node scripts/prepare-db.js

if [ -f .env ]; then
  set -a
  source .env 2>/dev/null || true
  set +a
fi

exec node dist/index.js
