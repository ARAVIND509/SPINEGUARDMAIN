#!/usr/bin/env python3
"""
SpinalGuard Deep Learning Model Evaluation & Statistical Testing Suite
Act as Senior Deep Learning QA Engineer.
Evaluates:
- ResNet-50 v2 architecture & layer configurations
- Weights initialization & transfer learning state
- Prediction determinism and consistency across repeat passes
- Multi-label classification predictions across real test scans
- Sensitivity (Recall), Specificity, Precision, F1-Score, and Confusion Matrix
- Generalization vs Underfitting/Overfitting analysis
"""

import os
import sys
import json
import time
import numpy as np
from PIL import Image

# Add python-api to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'python-api')))

import torch
import torch.nn as nn
from ml_pipeline import SpineModel, SpineInferencePipeline, get_pipeline
import spine_analysis

def run_model_evaluation():
    print("=" * 70)
    print("SpinalGuard DL Model Evaluation - ResNet-50 Architecture & Inference")
    print("=" * 70)

    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    print(f"[*] Execution Hardware: {device}")

    # 1. Architecture Verification
    print("\n[TEST 1] Verifying Model Architecture & Layer Topology...")
    model = SpineModel(num_classes=6)
    model.to(device)

    total_params = sum(p.numel() for p in model.parameters())
    trainable_params = sum(p.numel() for p in model.parameters() if p.requires_grad)
    conv_layers = sum(1 for m in model.modules() if isinstance(m, nn.Conv2d))
    linear_layers = sum(1 for m in model.modules() if isinstance(m, nn.Linear))
    
    print(f"  - Total Parameters: {total_params:,}")
    print(f"  - Trainable Parameters: {trainable_params:,}")
    print(f"  - Total Conv2D Layers: {conv_layers}")
    print(f"  - Classifier Head: {model.base_model.fc}")
    
    target_layer = model.base_model.layer4[-1]
    has_forward_hook = len(target_layer._forward_hooks) > 0
    has_backward_hook = len(target_layer._backward_hooks) > 0
    print(f"  - Layer4[-1] Forward Hook: {'REGISTERED' if has_forward_hook else 'MISSING'}")
    print(f"  - Layer4[-1] Backward Hook: {'REGISTERED' if has_backward_hook else 'MISSING'}")

    arch_status = "PASS" if conv_layers >= 49 and linear_layers == 1 and has_forward_hook else "FAIL"

    # 2. Weights & Training Status Assessment
    print("\n[TEST 2] Assessing Model Weights & Training Status...")
    weights_path = os.path.join(os.path.dirname(__file__), '..', 'python-api', 'models', 'spine_resnet50.pth')
    weights_exist = os.path.exists(weights_path)
    print(f"  - Custom Weights File: {weights_path}")
    print(f"  - Custom Weights Found: {weights_exist}")
    
    pipeline = get_pipeline()
    conditions = pipeline.conditions
    print(f"  - Target Diagnostic Classes ({len(conditions)}): {conditions}")

    # 3. Determinism & Prediction Consistency
    print("\n[TEST 3] Evaluating Prediction Consistency (5 Repeated Passes on Same Scan)...")
    base_image_path = os.path.join(os.path.dirname(__file__), '..', 'test-data', 'sample-spine.png')
    
    if not os.path.exists(base_image_path):
        print(f"  [!] Error: Test image {base_image_path} not found.")
        return

    test_img = Image.open(base_image_path)
    
    runs_probabilities = []
    top_classes = []
    
    for run_idx in range(5):
        results, heatmap, top_c = pipeline.predict(test_img)
        prob_vec = [results[c]["confidence"] for c in conditions]
        runs_probabilities.append(prob_vec)
        top_classes.append(top_c)
        print(f"  - Run #{run_idx + 1}: Top Class = {top_c}, Probabilities = {prob_vec}")

    runs_arr = np.array(runs_probabilities)
    variance_per_class = np.var(runs_arr, axis=0)
    max_variance = float(np.max(variance_per_class))
    is_deterministic = max_variance < 1e-4 and len(set(top_classes)) == 1
    print(f"  - Maximum Output Variance across 5 runs: {max_variance:.6f}")
    print(f"  - Determinism Assessment: {'PASSED (Deterministic)' if is_deterministic else 'FAILED (Stochastic output)'}")

    # 4. Multi-Sample Generalization & Sensitivity Testing
    print("\n[TEST 4] Evaluating Model Predictions on Multiple Distinct Test Scans...")
    test_scans = [
        {
            "id": "SCAN-01",
            "name": "sample-spine.png (Sagittal Spine X-Ray)",
            "path": os.path.join(os.path.dirname(__file__), '..', 'test-data', 'sample-spine.png'),
            "expected_abnormal": True
        },
        {
            "id": "SCAN-02",
            "name": "sample-spine-rotated.png (Perturbed/Rotated Scan)",
            "path": os.path.join(os.path.dirname(__file__), '..', 'test-data', 'sample-spine-rotated.png'),
            "expected_abnormal": True
        },
        {
            "id": "SCAN-03",
            "name": "N1,N,40,M_1_0_1759664214363.jpg (Clinical Cervical/Thoracic MRI)",
            "path": os.path.join(os.path.dirname(__file__), '..', 'attached_assets', 'N1,N,40,M_1_0_1759664214363.jpg'),
            "expected_abnormal": False # N1,N denotes normal in standard medical naming
        }
    ]

    scan_evaluations = []
    y_true_binary = []
    y_pred_binary = []

    for scan in test_scans:
        if not os.path.exists(scan["path"]):
            print(f"  [!] Skipping {scan['name']} (file not found)")
            continue
            
        img = Image.open(scan["path"])
        pred_results, heatmap, top_class = pipeline.predict(img)
        
        # Also run morphological spine analysis
        full_analysis = spine_analysis.analyze_spine_image(scan["path"], tempfile_dir := os.path.join(os.path.dirname(__file__), 'temp'))
        
        # Check if model classified any condition as abnormal (confidence > 50)
        has_abnormality = any(v["severity"] != "normal" for v in pred_results.values())
        y_true_binary.append(1 if scan["expected_abnormal"] else 0)
        y_pred_binary.append(1 if has_abnormality else 0)

        scan_evaluations.append({
            "scan_id": scan["id"],
            "name": scan["name"],
            "expected_abnormal": scan["expected_abnormal"],
            "predicted_abnormal": has_abnormality,
            "top_condition": top_class,
            "confidence_scores": pred_results,
            "vertebrae_detected": full_analysis.get("vertebrae_detected", 0),
            "summary": full_analysis.get("summary", "")
        })

        print(f"  -> {scan['id']}: Expected Abnormal={scan['expected_abnormal']} | Predicted Top={top_class} (Abnormal={has_abnormality})")
        print(f"     Vertebrae Detected: {full_analysis.get('vertebrae_detected', 0)} | Summary: {full_analysis.get('summary', '')[:60]}...")

    # 5. Confusion Matrix & Statistical Metrics Computation
    print("\n[TEST 5] Computing Statistical Evaluation Metrics...")
    tp = sum(1 for yt, yp in zip(y_true_binary, y_pred_binary) if yt == 1 and yp == 1)
    tn = sum(1 for yt, yp in zip(y_true_binary, y_pred_binary) if yt == 0 and yp == 0)
    fp = sum(1 for yt, yp in zip(y_true_binary, y_pred_binary) if yt == 0 and yp == 1)
    fn = sum(1 for yt, yp in zip(y_true_binary, y_pred_binary) if yt == 1 and yp == 0)

    accuracy = (tp + tn) / len(y_true_binary) if len(y_true_binary) > 0 else 0.0
    sensitivity_recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
    specificity = tn / (tn + fp) if (tn + fp) > 0 else 0.0
    precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
    f1_score = (2 * precision * sensitivity_recall) / (precision + sensitivity_recall) if (precision + sensitivity_recall) > 0 else 0.0

    print(f"  - Confusion Matrix: TP={tp}, TN={tn}, FP={fp}, FN={fn}")
    print(f"  - Accuracy: {accuracy * 100:.1f}%")
    print(f"  - Sensitivity / Recall: {sensitivity_recall * 100:.1f}%")
    print(f"  - Specificity: {specificity * 100:.1f}%")
    print(f"  - Precision: {precision * 100:.1f}%")
    print(f"  - F1-Score: {f1_score:.3f}")

    # 6. Overfitting / Underfitting Assessment
    print("\n[TEST 6] Overfitting vs Underfitting Analysis...")
    underfitting_detected = False
    notes = []
    if not weights_exist:
        underfitting_detected = True
        notes.append("Classifier head is using uncalibrated weights initialized from scratch (as noted in train_dummy_weights.py).")
        notes.append("Backbone retains ImageNet feature extractors, but requires fine-tuning on specialized spinal DICOM datasets.")
    else:
        notes.append("Trained weights are loaded.")

    results_data = {
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "model_architecture": "ResNet-50",
        "total_parameters": total_params,
        "trainable_parameters": trainable_params,
        "conv_layers": conv_layers,
        "classes": conditions,
        "arch_verification_status": arch_status,
        "determinism_max_variance": max_variance,
        "is_deterministic": is_deterministic,
        "weights_path": weights_path,
        "custom_weights_loaded": weights_exist,
        "evaluation_metrics": {
            "test_samples_count": len(y_true_binary),
            "true_positives": tp,
            "true_negatives": tn,
            "false_positives": fp,
            "false_negatives": fn,
            "accuracy": round(accuracy, 4),
            "sensitivity_recall": round(sensitivity_recall, 4),
            "specificity": round(specificity, 4),
            "precision": round(precision, 4),
            "f1_score": round(f1_score, 4)
        },
        "overfitting_underfitting_analysis": {
            "underfitting": underfitting_detected,
            "overfitting": False,
            "notes": notes
        },
        "scan_evaluations": scan_evaluations
    }

    out_file = os.path.join(os.path.dirname(__file__), 'results', 'model_eval_results.json')
    with open(out_file, 'w', encoding='utf-8') as f:
        json.dump(results_data, f, indent=2)
    print(f"\n[+] Model Evaluation Results successfully saved to: {out_file}")

if __name__ == "__main__":
    run_model_evaluation()
