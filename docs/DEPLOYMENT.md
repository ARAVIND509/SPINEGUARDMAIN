# SpineGuard AI — Deployment & Infrastructure Guide

> **Environment:** Node.js (v20+) & Python (v3.10+)  
> **Target Platforms:** Docker, Render, Cloud Run, VPS  
> **Status:** Deployment-Ready Academic Infrastructure  

---

## 1. Architecture Overview

SpineGuard AI operates as a coordinated two-tier microservice architecture:

1. **Application Gateway & Viewport (Node.js/Express):**
   - Serves the compiled React/Vite single-page application.
   - Manages sessions, authentication, RBAC, database transactions, and persistent scan storage.
   - Runs on port `5000` (or `PORT` environment variable).

2. **Deep Learning Inference Service (Python/FastAPI):**
   - Loads the PyTorch ResNet-50 weights (`python-api/models/spine_resnet50.pth`).
   - Executes deterministic forward passes and layer4 multi-class Grad-CAM backpropagation.
   - Runs on port `8000` (or `PORT` environment variable).

---

## 2. Environment Variables Specification

| Variable | Required | Default | Description |
| :--- | :---: | :---: | :--- |
| `NODE_ENV` | Yes | `production` | Node environment runtime flag (`production` or `development`) |
| `PORT` | Yes | `5000` | HTTP port for the web application server |
| `DATABASE_URL` | Yes | `file:./dev.db` | Prisma database URI (`file:./dev.db` or `postgresql://...`) |
| `SESSION_SECRET` | Yes | `spineguardai-secret` | 32+ character cryptographic secret for session signing |
| `STORAGE_DIR` | No | `./uploads` | Persistent directory path for medical scan storage |
| `PYTHON_SERVICE_URL` | No | `http://127.0.0.1:8000` | Endpoint to reach the PyTorch inference microservice |

---

## 3. Local & Standalone Production Setup

### Step 1: Install Node & Python Dependencies
```bash
# Install Node dependencies
npm install

# Prepare database and generate Prisma Client
npm run db:push

# Build production assets (Vite frontend + esbuild backend)
npm run build
```

```bash
# In a separate terminal or virtual environment:
cd python-api
pip install -r requirements.txt
```

### Step 2: Start the PyTorch AI Service
```bash
cd python-api
uvicorn ai_server:app --host 0.0.0.0 --port 8000
```

### Step 3: Start the Web Application Service
```bash
# In the root repository directory:
npm run start
```
The application will be accessible at `http://localhost:5000`.

---

## 4. Docker Deployment

### Building & Running the Inference Service:
```bash
docker build -t spineguard-ai-engine -f python-api/Dockerfile .
docker run -d -p 8000:8000 --name spineguard-ai spineguard-ai-engine
```

### Building & Running the Web Gateway:
```bash
docker build -t spineguard-web -f Dockerfile .
docker run -d -p 5000:5000 -e PYTHON_SERVICE_URL=http://host.docker.internal:8000 -e DATABASE_URL="file:/app/data/prod.db" -v spineguard_data:/app/data spineguard-web
```

---

## 5. Render.com Deployment Configuration

On Render, SpineGuard AI can be deployed either as a unified Docker service or as two paired Web Services:

### Web Service 1: `spineguard-ai-engine` (PyTorch Microservice)
- **Environment:** `Docker` (or `Python 3`)
- **Docker Context Directory:** `python-api`
- **Docker Path:** `python-api/Dockerfile`
- **Port:** `8000`
- **Plan:** Free CPU / Basic

### Web Service 2: `spineguard-web` (Application Gateway)
- **Environment:** `Node`
- **Build Command:** `npm install && npm run db:push && npm run build`
- **Start Command:** `npm run start`
- **Environment Variables:**
  - `NODE_ENV`: `production`
  - `PYTHON_SERVICE_URL`: Internal URL of `spineguard-ai-engine` (e.g., `http://spineguard-ai-engine:8000`)
  - `DATABASE_URL`: Managed PostgreSQL connection string or persistent disk SQLite
  - `SESSION_SECRET`: Random 64-character hex string
