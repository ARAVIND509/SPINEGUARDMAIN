# Python AI Microservice Dockerfile
FROM python:3.10-slim

WORKDIR /app

# Install system dependencies required for OpenCV and Scipy
RUN apt-get update && apt-get install -y \
    libgl1-mesa-glx \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

COPY . .

ENV PORT=8000

EXPOSE 8000

CMD ["gunicorn", "ai_server:app", "--bind", "0.0.0.0:8000", "--workers", "2", "--timeout", "120"]
