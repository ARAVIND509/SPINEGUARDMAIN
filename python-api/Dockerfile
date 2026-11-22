# Python AI Microservice Dockerfile for Hugging Face Spaces & Cloud Deployment
FROM python:3.10-slim

# Install system dependencies required for OpenCV and Scipy
RUN apt-get update && apt-get install -y \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Set up user with UID 1000 (standard for Hugging Face Spaces non-root containers)
RUN useradd -m -u 1000 user
USER user
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH

WORKDIR $HOME/app

COPY --chown=user requirements.txt .
RUN pip install --no-cache-dir --upgrade -r requirements.txt

COPY --chown=user . .

ENV PORT=7860
EXPOSE 7860

CMD ["uvicorn", "ai_server:app", "--host", "0.0.0.0", "--port", "7860"]
