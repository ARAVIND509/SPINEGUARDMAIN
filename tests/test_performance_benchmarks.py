#!/usr/bin/env python3
"""
SpinalGuard Performance & Resource Benchmarking Suite
Evaluates:
- Image loading & normalization latency
- Morphological spine vertebra segmentation latency
- ResNet-50 model inference forward pass latency
- Grad-CAM backward pass & heatmap rendering latency
- Total end-to-end prediction response latency
- Process CPU & Memory usage (RSS)
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
from ml_pipeline import get_pipeline
import spine_analysis

def get_process_memory_mb():
    try:
        import psutil
        process = psutil.Process(os.getpid())
        return round(process.memory_info().rss / (1024 * 1024), 2)
    except Exception:
        return 0.0

def run_performance_benchmarks():
    print("=" * 70)
    print("SpinalGuard Performance & Latency Benchmarking Suite")
    print("=" * 70)

    base_image_path = os.path.join(os.path.dirname(__file__), '..', 'test-data', 'sample-spine.png')
    if not os.path.exists(base_image_path):
        print(f"[!] Error: Test image {base_image_path} not found.")
        return

    mem_init = get_process_memory_mb()
    print(f"[*] Initial Memory Footprint: {mem_init} MB")

    # 1. Warm-up
    print("[*] Warming up PyTorch ResNet-50 pipeline...")
    t0 = time.time()
    pipeline = get_pipeline()
    dummy_img = Image.open(base_image_path)
    _ = pipeline.predict(dummy_img)
    warmup_time = round((time.time() - t0) * 1000, 2)
    print(f"[*] Pipeline Warm-up Complete ({warmup_time} ms)")
    mem_post_warmup = get_process_memory_mb()
    print(f"[*] Memory after Model Load: {mem_post_warmup} MB (Delta: +{round(mem_post_warmup - mem_init, 2)} MB)")

    # 2. Benchmark Iterations (10 Runs)
    iterations = 10
    print(f"\n[*] Executing {iterations} Benchmark Iterations on Sagittal Spine Scan (1024x1024)...")

    timing_load = []
    timing_morph = []
    timing_forward = []
    timing_gradcam = []
    timing_total = []

    for i in range(iterations):
        t_start = time.time()

        # Step A: Image Loading & Transform
        t_a0 = time.time()
        img = Image.open(base_image_path)
        img_rgb = img.convert("RGB")
        tensor = pipeline.transform(img_rgb).unsqueeze(0).to(pipeline.device)
        t_load = (time.time() - t_a0) * 1000
        timing_load.append(t_load)

        # Step B: Model Forward Pass
        t_b0 = time.time()
        pipeline.model.eval()
        with torch.no_grad():
            outputs = pipeline.model(tensor)
            probs = torch.sigmoid(outputs).squeeze().cpu().numpy()
        t_fwd = (time.time() - t_b0) * 1000
        timing_forward.append(t_fwd)

        # Step C: Grad-CAM Backward Pass & Heatmap Generation
        t_c0 = time.time()
        pipeline.model.train()
        for p in pipeline.model.parameters():
            p.requires_grad = True
        pipeline.model.zero_grad()
        out_grad = pipeline.model(tensor)
        target_idx = np.argmax(probs)
        one_hot = torch.zeros_like(out_grad)
        one_hot[0][target_idx] = 1
        out_grad.backward(gradient=one_hot, retain_graph=True)
        hm = pipeline.generate_heatmap(target_idx, img_rgb)
        t_cam = (time.time() - t_c0) * 1000
        timing_gradcam.append(t_cam)

        # Step D: Morphological Spine & Vertebrae Segmentation
        t_d0 = time.time()
        img_arr, scale = spine_analysis.load_image(base_image_path, target_width=800)
        vertebrae = spine_analysis.detect_vertebrae(img_arr, scale)
        discs = spine_analysis.analyze_disc_metrics(vertebrae, img_arr)
        t_morph = (time.time() - t_d0) * 1000
        timing_morph.append(t_morph)

        t_tot = (time.time() - t_start) * 1000
        timing_total.append(t_tot)

        print(f"  - Iteration #{i+1:02d}: Load={t_load:5.1f}ms | Fwd={t_fwd:5.1f}ms | Grad-CAM={t_cam:5.1f}ms | Morph={t_morph:5.1f}ms | Total={t_tot:6.1f}ms")

    mem_final = get_process_memory_mb()

    # Statistical Aggregation
    def compute_stats(arr):
        return {
            "mean_ms": round(float(np.mean(arr)), 2),
            "median_ms": round(float(np.median(arr)), 2),
            "std_ms": round(float(np.std(arr)), 2),
            "min_ms": round(float(np.min(arr)), 2),
            "max_ms": round(float(np.max(arr)), 2),
            "p95_ms": round(float(np.percentile(arr, 95)), 2)
        }

    stats = {
        "image_loading_and_transform": compute_stats(timing_load),
        "model_forward_inference": compute_stats(timing_forward),
        "gradcam_backward_and_render": compute_stats(timing_gradcam),
        "morphological_spine_analysis": compute_stats(timing_morph),
        "end_to_end_pipeline": compute_stats(timing_total),
        "memory_profile_mb": {
            "initial_rss": mem_init,
            "post_warmup_rss": mem_post_warmup,
            "final_rss": mem_final,
            "net_model_allocation": round(mem_post_warmup - mem_init, 2)
        }
    }

    print("\n" + "=" * 70)
    print("BENCHMARK SUMMARY (Averaged over 10 iterations):")
    print(f"  1. Image Load & Tensor Prep:  {stats['image_loading_and_transform']['mean_ms']:>6.1f} ms (P95: {stats['image_loading_and_transform']['p95_ms']} ms)")
    print(f"  2. ResNet-50 Forward Pass:    {stats['model_forward_inference']['mean_ms']:>6.1f} ms (P95: {stats['model_forward_inference']['p95_ms']} ms)")
    print(f"  3. Grad-CAM XAI Generation:   {stats['gradcam_backward_and_render']['mean_ms']:>6.1f} ms (P95: {stats['gradcam_backward_and_render']['p95_ms']} ms)")
    print(f"  4. Morphological Analysis:    {stats['morphological_spine_analysis']['mean_ms']:>6.1f} ms (P95: {stats['morphological_spine_analysis']['p95_ms']} ms)")
    print(f"  --> TOTAL PREDICTION TIME:    {stats['end_to_end_pipeline']['mean_ms']:>6.1f} ms (P95: {stats['end_to_end_pipeline']['p95_ms']} ms)")
    print(f"  --> Peak Memory Usage:        {mem_final} MB")
    print("=" * 70)

    out_file = os.path.join(os.path.dirname(__file__), 'results', 'performance_results.json')
    with open(out_file, 'w', encoding='utf-8') as f:
        json.dump({
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "iterations": iterations,
            "hardware": str(pipeline.device),
            "benchmarks": stats
        }, f, indent=2)
    print(f"[+] Performance Results successfully saved to: {out_file}")

if __name__ == "__main__":
    run_performance_benchmarks()
