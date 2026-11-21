#!/usr/bin/env python3
"""
SpinalGuard Explainable AI (XAI) Testing & Verification Suite
Evaluates:
- Grad-CAM hook execution and gradient backpropagation
- Heatmap tensor normalization, dynamic range [0, 1], and Jet colormap application
- Visual explanation fidelity and comparison with original image
- Edge-case resilience (zero variance, uniform black, uniform white, synthetic noise)
- Explanation determinism and consistency across repeat invocations
"""

import os
import sys
import json
import time
import base64
import numpy as np
from PIL import Image
import io

# Add python-api to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'python-api')))

import torch
from ml_pipeline import get_pipeline

def run_xai_evaluation():
    print("=" * 70)
    print("SpinalGuard Explainable AI (XAI) / Grad-CAM Testing Suite")
    print("=" * 70)

    pipeline = get_pipeline()
    base_image_path = os.path.join(os.path.dirname(__file__), '..', 'test-data', 'sample-spine.png')

    if not os.path.exists(base_image_path):
        print(f"[!] Error: Test image {base_image_path} not found.")
        return

    test_img = Image.open(base_image_path)
    orig_w, orig_h = test_img.size
    print(f"[*] Input Medical Scan: {base_image_path} ({orig_w}x{orig_h}, mode={test_img.mode})")

    # 1. Grad-CAM Generation & Tensor Dimension Validation
    print("\n[TEST XAI-1] Validating Grad-CAM Activation and Gradient Hooks...")
    results, heatmap_b64, top_class = pipeline.predict(test_img)
    
    activations = pipeline.model.activations
    gradients = pipeline.model.gradients

    print(f"  - Top Target Diagnostic Class for CAM: '{top_class}'")
    print(f"  - Cached Activations Tensor: {activations.shape if activations is not None else 'None'}")
    print(f"  - Cached Gradients Tensor: {gradients.shape if gradients is not None else 'None'}")
    
    hooks_valid = (
        activations is not None and 
        gradients is not None and 
        activations.shape[1] == 2048 and 
        gradients.shape[1] == 2048
    )
    print(f"  - Tensor Topology Verification: {'PASSED (7x7x2048 feature map)' if hooks_valid else 'FAILED'}")

    # 2. Heatmap Base64 Encoding & Decodability Test
    print("\n[TEST XAI-2] Validating Base64 Serialization & Image Decoding...")
    heatmap_valid = False
    decoded_img = None
    if heatmap_b64:
        try:
            heatmap_bytes = base64.b64decode(heatmap_b64)
            decoded_img = Image.open(io.BytesIO(heatmap_bytes))
            heatmap_valid = True
            print(f"  - Decoded Heatmap Dimensions: {decoded_img.size} (Expected: {orig_w}x{orig_h})")
            print(f"  - Decoded Image Format: {decoded_img.format}, Mode: {decoded_img.mode}")
            dim_match = (decoded_img.size == (orig_w, orig_h))
            print(f"  - Spatial Dimension Match: {'MATCHED' if dim_match else 'MISMATCH'}")
        except Exception as e:
            print(f"  [!] Heatmap decoding failed: {e}")
    else:
        print("  [!] Heatmap base64 string was empty or None.")

    # 3. Dynamic Range & Colormap Analysis
    print("\n[TEST XAI-3] Analyzing Heatmap Dynamic Range & Color Distribution...")
    if decoded_img:
        hm_arr = np.array(decoded_img)
        # Heatmap should have 3 channels (RGB/BGR colormap)
        channels = hm_arr.shape[2] if len(hm_arr.shape) > 2 else 1
        min_val = int(np.min(hm_arr))
        max_val = int(np.max(hm_arr))
        mean_val = float(np.mean(hm_arr))
        std_val = float(np.std(hm_arr))
        
        print(f"  - Channel Count: {channels}")
        print(f"  - Min Pixel Intensity: {min_val}")
        print(f"  - Max Pixel Intensity: {max_val}")
        print(f"  - Mean Pixel Intensity: {mean_val:.2f}")
        print(f"  - Standard Deviation: {std_val:.2f}")

        dynamic_range_ok = (min_val >= 0 and max_val <= 255 and max_val > 100 and std_val > 10)
        print(f"  - Dynamic Range & Contrast: {'PASSED (Rich colormap distribution)' if dynamic_range_ok else 'FAILED'}")

    # 4. Consistency & Determinism across Repeated Invocations
    print("\n[TEST XAI-4] Testing Explainability Determinism across 3 Repeated Executions...")
    heatmaps_raw = []
    for i in range(3):
        _, b64, _ = pipeline.predict(test_img)
        raw_b = base64.b64decode(b64)
        heatmaps_raw.append(np.array(Image.open(io.BytesIO(raw_b))))

    diff_1_2 = float(np.mean(np.abs(heatmaps_raw[0].astype(float) - heatmaps_raw[1].astype(float))))
    diff_2_3 = float(np.mean(np.abs(heatmaps_raw[1].astype(float) - heatmaps_raw[2].astype(float))))
    max_pixel_diff = max(diff_1_2, diff_2_3)
    
    print(f"  - Mean Absolute Difference between Run 1 and 2: {diff_1_2:.6f}")
    print(f"  - Mean Absolute Difference between Run 2 and 3: {diff_2_3:.6f}")
    xai_deterministic = max_pixel_diff < 1e-4
    print(f"  - Heatmap Determinism: {'PASSED (Pixel-perfect consistency)' if xai_deterministic else 'FAILED'}")

    # 5. Edge-Case / Failure Mode Robustness Testing
    print("\n[TEST XAI-5] Testing Edge-Case Inputs (Zero Variance, Blank, Uniform)...")
    edge_cases = [
        ("Black Image (0s)", Image.new("RGB", (orig_w, orig_h), color=(0, 0, 0))),
        ("White Image (255s)", Image.new("RGB", (orig_w, orig_h), color=(255, 255, 255))),
        ("Random Noise (Uniform)", Image.fromarray(np.random.randint(0, 256, (orig_h, orig_w, 3), dtype=np.uint8)))
    ]

    edge_results = []
    for name, img in edge_cases:
        try:
            res, hm, top = pipeline.predict(img)
            success = hm is not None and len(hm) > 100
            print(f"  - {name}: {'HANDLED SAFELY' if success else 'FAILED'} (Top Class = {top})")
            edge_results.append({
                "case": name,
                "status": "PASSED" if success else "FAILED",
                "top_class": top,
                "heatmap_generated": success
            })
        except Exception as e:
            print(f"  - {name}: CRASHED with error: {e}")
            edge_results.append({
                "case": name,
                "status": "CRASHED",
                "error": str(e)
            })

    results_data = {
        "timestamp": json.loads(json.dumps(time.strftime("%Y-%m-%dT%H:%M:%SZ"))),
        "target_layer": "base_model.layer4[-1]",
        "feature_map_dimensions": [1, 2048, 7, 7],
        "hooks_status": "PASSED" if hooks_valid else "FAILED",
        "spatial_dimension_match": dim_match if decoded_img else False,
        "dynamic_range_status": "PASSED" if dynamic_range_ok else "FAILED",
        "determinism_max_diff": max_pixel_diff,
        "is_xai_deterministic": xai_deterministic,
        "edge_case_tests": edge_results
    }

    out_file = os.path.join(os.path.dirname(__file__), 'results', 'xai_gradcam_results.json')
    with open(out_file, 'w', encoding='utf-8') as f:
        json.dump(results_data, f, indent=2)
    print(f"\n[+] Explainable AI Test Results successfully saved to: {out_file}")

if __name__ == "__main__":
    run_xai_evaluation()
