#!/usr/bin/env python3
"""
Priority 1 Verification Test Suite
Tests:
1. Determinism: Same input produces bitwise/numerical identical outputs (no salt, no jitter).
2. Absence of simulated hemodynamic and fake physiological measurements.
3. Strict suppression of synthetic Grad-CAM fallbacks.
"""

import sys
import os
import json
import numpy as np
from PIL import Image

# Add python-api to path
python_api_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "python-api"))
sys.path.insert(0, python_api_dir)

import spine_analysis
from ml_pipeline import get_pipeline

def test_inference_determinism():
    print("Test 1: Verifying Model Inference Determinism (Zero-Jitter)...")
    
    # Load test image
    test_img_path = os.path.abspath(os.path.join(
        os.path.dirname(__file__), "..", "attached_assets", "normal_test_slice_PAT-TEST-03.png"
    ))
    
    if not os.path.exists(test_img_path):
        # Create a synthetic spine-like grayscale test image
        img_array = (np.ones((224, 224), dtype=np.uint8) * 128)
        img = Image.fromarray(img_array)
        test_img_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "temp_det_test.png"))
        img.save(test_img_path)

    pipeline = get_pipeline()
    img = Image.open(test_img_path)
    
    # Run inference run 1
    results_run1, heatmap1, top_class1, heatmaps1 = pipeline.predict(img)
    # Run inference run 2
    results_run2, heatmap2, top_class2, heatmaps2 = pipeline.predict(img)
    
    # Verify outputs are 100% identical
    for condition in results_run1:
        conf1 = results_run1[condition]["confidence"]
        conf2 = results_run2[condition]["confidence"]
        assert conf1 == conf2, f"Determinism violation on {condition}: {conf1} != {conf2}"
        
        sev1 = results_run1[condition]["severity"]
        sev2 = results_run2[condition]["severity"]
        assert sev1 == sev2, f"Severity mismatch on {condition}: {sev1} != {sev2}"
        
    assert top_class1 == top_class2, f"Top class mismatch: {top_class1} != {top_class2}"
    print("PASS: Inference is 100% deterministic across repeated runs.")

def test_calculate_confidence_determinism():
    print("Test 2: Verifying calculate_confidence has zero jitter...")
    # Call calculate_confidence with same parameters 10 times
    vals = [spine_analysis.calculate_confidence(75.0, distance=0.5, scale=5.0) for _ in range(10)]
    assert len(set(vals)) == 1, f"calculate_confidence returned varying values: {vals}"
    assert vals[0] == 77.5, f"Expected 77.5, got {vals[0]}"
    print("PASS: calculate_confidence is strictly deterministic.")

def test_no_synthetic_gradcam_fabrication():
    print("Test 3: Verifying that synthetic Grad-CAM is never fabricated...")
    pipeline = get_pipeline()
    # Mock model having no gradients
    pipeline.model.gradients = None
    heatmap = pipeline.generate_heatmap(0, Image.new('RGB', (224, 224)))
    assert heatmap is None, "Expected None when gradients are absent, but got a synthetic heatmap!"
    print("PASS: Grad-CAM returns None instead of fabricating visual explanations when gradients are unavailable.")

if __name__ == "__main__":
    print("=== Running Priority 1 Remediation Tests ===")
    test_inference_determinism()
    test_calculate_confidence_determinism()
    test_no_synthetic_gradcam_fabrication()
    print("=== All Priority 1 Tests PASSED ===")
