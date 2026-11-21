#!/bin/bash
set -e

echo "Starting Python AI Server on port 8000..."
cd /app/python-api
python3 -m uvicorn ai_server:app --host 0.0.0.0 --port 8000 &

echo "Starting Node.js Backend on port ${PORT:-5000}..."
cd /app
npm start
