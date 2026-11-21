# SpinalGuard QA Automated Testing Suite

This directory contains the automated test suites for **SpinalGuard – Deep Learning-Based Spinal Cord Abnormalities Detection with Explainable AI**.

## Directory Structure

```
tests/
├── README.md                              # This test suite documentation
├── test_model_eval.py                    # Deep Learning model architecture, statistical metrics & determinism
├── test_xai_gradcam.py                   # Explainable AI (Grad-CAM) hooks, fidelity & edge cases
├── test_medical_image_robustness.py      # Input validation, corrupted files, noise & geometry stress
├── test_performance_benchmarks.py        # Latency profiling & memory consumption across 10 iterations
├── test_security_audit.py                # Live API security, auth barriers, traversal & PHI logging audit
└── results/                              # Output JSON artifact reports generated during test runs
    ├── model_eval_results.json
    ├── xai_gradcam_results.json
    ├── image_robustness_results.json
    ├── performance_results.json
    └── security_results.json
```

## Running the Automated Test Suites

### 1. Deep Learning Model Evaluation
Tests ResNet-50 layer configurations, parameters (23.5M), prediction determinism, multi-class predictions, confusion matrix, sensitivity, specificity, precision, and F1-score:
```bash
python tests/test_model_eval.py
```

### 2. Explainable AI (Grad-CAM) Testing
Verifies gradient hooks on `layer4[-1]`, activation caching, tensor dimensions (7x7x2048), colormap normalization, and edge-case inputs:
```bash
python tests/test_xai_gradcam.py
```

### 3. Medical Image Robustness Testing
Evaluates 10 input variations including valid scans, spoofed HTML/text, corrupted bitstreams, BMP formats, 32x32 low-res, blur, noise, extreme aspect ratios, and large files:
```bash
python tests/test_medical_image_robustness.py
```

### 4. Performance & Latency Benchmarks
Benchmarks image loading, forward inference, Grad-CAM backward pass, and morphological analysis over 10 iterations:
```bash
python tests/test_performance_benchmarks.py
```

### 5. Security & Vulnerability Audit
Tests authentication barriers, rate limiting, path traversal, cryptographic hashing, and medical image logging privacy:
```bash
python tests/test_security_audit.py
```

### 6. Backend Integration Tests (Vitest)
Executes Express route and API integration tests:
```bash
npm test
```
