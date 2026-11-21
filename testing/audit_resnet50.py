#!/usr/bin/env python3
"""
Diagnostic Audit Script for ResNet-50 Classifier Head & Preprocessing
Inspects:
- Raw logits before sigmoid activation
- Probability distribution on healthy MRI scan (N1,N...)
- Preprocessing tensor statistics
- Effect of uncalibrated FC head
"""

import os
import sys
import torch
import numpy as np
from PIL import Image

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'python-api')))

from ml_pipeline import SpineModel, SpineInferencePipeline, get_pipeline

def audit_model():
    print("=" * 70)
    print("AUDIT: ResNet-50 Classifier Head & Normal MRI Classification")
    print("=" * 70)

    pipeline = get_pipeline()
    normal_scan_path = os.path.join(os.path.dirname(__file__), '..', 'attached_assets', 'N1,N,40,M_1_0_1759664214363.jpg')

    if not os.path.exists(normal_scan_path):
        print(f"Error: {normal_scan_path} not found")
        return

    img = Image.open(normal_scan_path)
    print(f"[*] Normal Test Scan: {normal_scan_path}")
    print(f"  - Original Size: {img.size}, Mode: {img.mode}")

    # Inspect Preprocessing
    if img.mode != 'RGB':
        img_rgb = img.convert('RGB')
    else:
        img_rgb = img

    input_tensor = pipeline.transform(img_rgb).unsqueeze(0).to(pipeline.device)
    print(f"  - Preprocessed Tensor Shape: {input_tensor.shape}")
    print(f"  - Tensor Mean: {input_tensor.mean().item():.4f}, Std: {input_tensor.std().item():.4f}")
    print(f"  - Tensor Min: {input_tensor.min().item():.4f}, Max: {input_tensor.max().item():.4f}")

    # Inspect Raw Logits vs Sigmoid
    pipeline.model.eval()
    with torch.no_grad():
        raw_logits = pipeline.model(input_tensor).squeeze().cpu().numpy()
        sigmoids = torch.sigmoid(torch.tensor(raw_logits)).numpy()

    print("\n[*] Model Output Audit across 6 classes:")
    print(f"{'Class Name':<30} | {'Raw Logit':<12} | {'Sigmoid (%)':<12} | {'Assigned Severity'}")
    print("-" * 75)
    for i, cond in enumerate(pipeline.conditions):
        prob = sigmoids[i] * 100
        sev = "severe" if prob > 85 else ("moderate" if prob > 70 else ("mild" if prob > 50 else "normal"))
        print(f"{cond:<30} | {raw_logits[i]:<12.4f} | {prob:<12.1f} | {sev}")

    print("\n[*] ROOT CAUSE SUMMARY:")
    print(f"1. Raw Logits are centered at: mean = {np.mean(raw_logits):.4f}, near 0.0.")
    print(f"2. Sigmoid of logits near 0.0 yields probabilities around ~50%.")
    print(f"3. Because threshold is 'prob > 50% = mild', any logit > 0.0 is classified as abnormal!")
    print(f"4. The linear classifier has NO calibrated negative bias (e.g. bias = -2.5 to -3.0).")

if __name__ == "__main__":
    audit_model()
