# Multi-stage build for combining Node.js and Python

# Stage 1: Build Node.js app
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma/
RUN npm install

COPY . .
RUN npm run build

# Stage 2: Final image with Python and Node.js
FROM python:3.10-slim

# Install dependencies for OpenCV and Node.js
RUN apt-get update && apt-get install -y curl \
    libgl1 \
    libglib2.0-0 \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies
COPY python-api/requirements.txt ./python-api/
RUN pip install --no-cache-dir -r python-api/requirements.txt

# Copy built Node.js app and deps
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

# Copy python API code
COPY python-api ./python-api

# Add startup script
COPY start.sh .
RUN chmod +x start.sh

ENV NODE_ENV=production
ENV PORT=5000
# Node backend expects python API on 8000
ENV PYTHON_API_URL=http://localhost:8000

EXPOSE 5000

CMD ["./start.sh"]
