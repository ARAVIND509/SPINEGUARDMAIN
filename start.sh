#!/bin/bash
set -e

echo "Starting Python AI Server..."
cd /app/python-api
gunicorn ai_server:app -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000 --workers 1 --timeout 120 &

echo "Starting Node.js Backend..."
cd /app
npm start
