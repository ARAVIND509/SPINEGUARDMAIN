---
title: Spineguard Medical AI
emoji: 🩺
colorFrom: blue
colorTo: indigo
sdk: docker
app_port: 7860
pinned: false
---

# SpineGuard Medical AI Microservice

FastAPI & PyTorch microservice powering SpinalGuard's deep learning diagnostic analysis and Grad-CAM explainable AI.

## Endpoints
- `GET /health`: Returns operational status and model version.
- `POST /analyze`: Accepts multipart form image file (`image`), runs spinal segmentation, ResNet-50 classification, and authentic PyTorch Grad-CAM heatmap generation.
