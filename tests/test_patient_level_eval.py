#!/usr/bin/env python3
"""
Independent Patient-Level Evaluation Test Suite
Evaluates SpinalGuard on a structured, labelled, patient-level dataset.
Calculates:
- True Positives (TP), True Negatives (TN), False Positives (FP), False Negatives (FN)
- Accuracy, Precision, Sensitivity (Recall), Specificity, F1-Score
- Patient-level diagnosis breakdown
Never fabricates results.
"""

import os
import sys
import json
import time
import numpy as np
from PIL import Image

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'python-api')))

from ml_pipeline import get_pipeline
import spine_analysis

def run_patient_level_evaluation():
    print("=" * 75)
    print("SpinalGuard Independent Patient-Level Evaluation (Manifest-Driven)")
    print("=" * 75)

    manifest_path = os.path.join(os.path.dirname(__file__), 'evaluation_dataset', 'independent_test_manifest.json')
    if not os.path.exists(manifest_path):
        print(f"[!] Error: Evaluation manifest not found at {manifest_path}")
        return

    with open(manifest_path, 'r', encoding='utf-8') as f:
        manifest = json.load(f)

    pipeline = get_pipeline()
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))

    print(f"[*] Total Patient Cases in Evaluation Cohort: {len(manifest)}")

    y_true = []
    y_pred = []
    eval_details = []

    for patient in manifest:
        patient_id = patient["patient_id"]
        full_img_path = os.path.join(base_dir, patient["source_path"])
        is_abnormal_gt = patient["is_abnormal"]

        print(f"\nEvaluating Patient: {patient_id} ({patient['cohort']})")
        print(f"  - File: {patient['source_path']} | Modality: {patient['modality']}")
        print(f"  - Ground Truth Label: {patient['ground_truth_label']} (Abnormal={is_abnormal_gt})")

        if not os.path.exists(full_img_path):
            print(f"  [!] Missing image: {full_img_path}")
            continue

        img = Image.open(full_img_path)

        # 1. ResNet-50 Prediction
        ml_preds, heatmap_b64, top_class = pipeline.predict(img)

        # 2. Morphological Spine & Disc Analysis
        temp_dir = os.path.join(os.path.dirname(__file__), 'temp')
        full_analysis = spine_analysis.analyze_spine_image(full_img_path, temp_dir)

        # Determine predicted binary classification:
        # A patient is predicted abnormal if any condition is classified with severity != 'normal'
        abnormal_ml_conditions = [k for k, v in ml_preds.items() if v["severity"] != "normal"]
        morph_findings = full_analysis.get("findings", [])

        # Patient predicted abnormal if either ML model or morphological findings detect disorder
        predicted_abnormal = len(abnormal_ml_conditions) > 0 or len(morph_findings) > 0

        y_true.append(1 if is_abnormal_gt else 0)
        y_pred.append(1 if predicted_abnormal else 0)

        match = (is_abnormal_gt == predicted_abnormal)
        print(f"  -> Predicted Diagnosis: {'ABNORMAL' if predicted_abnormal else 'NORMAL'} | Top Condition: {top_class}")
        print(f"  -> Agreement with Ground Truth: {'CORRECT [MATCH]' if match else 'INCORRECT [MISMATCH]'}")

        eval_details.append({
            "patient_id": patient_id,
            "cohort": patient["cohort"],
            "ground_truth_label": patient["ground_truth_label"],
            "ground_truth_abnormal": is_abnormal_gt,
            "predicted_abnormal": predicted_abnormal,
            "is_correct": match,
            "top_ml_condition": top_class,
            "ml_predictions": ml_preds,
            "vertebrae_detected": full_analysis.get("vertebrae_detected", 0),
            "morphological_findings_count": len(morph_findings)
        })

    # Confusion Matrix
    tp = sum(1 for yt, yp in zip(y_true, y_pred) if yt == 1 and yp == 1)
    tn = sum(1 for yt, yp in zip(y_true, y_pred) if yt == 0 and yp == 0)
    fp = sum(1 for yt, yp in zip(y_true, y_pred) if yt == 0 and yp == 1)
    fn = sum(1 for yt, yp in zip(y_true, y_pred) if yt == 1 and yp == 0)

    total = len(y_true)
    accuracy = (tp + tn) / total if total > 0 else 0.0
    precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
    sensitivity = tp / (tp + fn) if (tp + fn) > 0 else 0.0
    specificity = tn / (tn + fp) if (tn + fp) > 0 else 0.0
    f1_score = (2 * precision * sensitivity) / (precision + sensitivity) if (precision + sensitivity) > 0 else 0.0

    print("\n" + "=" * 75)
    print("PATIENT-LEVEL EVALUATION SUMMARY:")
    print(f"  Confusion Matrix: TP={tp}, TN={tn}, FP={fp}, FN={fn}")
    print(f"  - Accuracy:             {accuracy * 100:.1f}%")
    print(f"  - Precision:            {precision * 100:.1f}%")
    print(f"  - Sensitivity (Recall): {sensitivity * 100:.1f}%")
    print(f"  - Specificity:          {specificity * 100:.1f}%")
    print(f"  - F1-Score:             {f1_score:.3f}")
    print("=" * 75)

    results_data = {
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "total_patients": total,
        "confusion_matrix": {
            "true_positives": tp,
            "true_negatives": tn,
            "false_positives": fp,
            "false_negatives": fn
        },
        "metrics": {
            "accuracy": round(accuracy, 4),
            "precision": round(precision, 4),
            "sensitivity_recall": round(sensitivity, 4),
            "specificity": round(specificity, 4),
            "f1_score": round(f1_score, 4)
        },
        "patients": eval_details
    }

    out_file = os.path.join(os.path.dirname(__file__), 'results', 'patient_level_eval_results.json')
    with open(out_file, 'w', encoding='utf-8') as f:
        json.dump(results_data, f, indent=2)

    print(f"\n[+] Patient-level evaluation saved to: {out_file}")

if __name__ == "__main__":
    run_patient_level_evaluation()
