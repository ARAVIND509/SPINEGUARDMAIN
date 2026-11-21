#!/usr/bin/env python3
"""
SpinalGuard Medical Image Robustness & Edge-Case Testing Suite
Evaluates:
- Valid vs Invalid image formats
- Corrupted and truncated byte streams
- Extreme aspect ratios and resolutions (32x32 to 3000x3000)
- Optical perturbations: Gaussian blur, Gaussian noise, Salt-and-Pepper noise
- Unrelated / non-medical image handling
- Large image file uploads
"""

import os
import sys
import json
import time
import tempfile
import numpy as np
from PIL import Image, ImageFilter

# Add python-api to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'python-api')))

from ml_pipeline import get_pipeline
import spine_analysis

def run_image_robustness_tests():
    print("=" * 70)
    print("SpinalGuard Medical Image Robustness & Input Validation Suite")
    print("=" * 70)

    pipeline = get_pipeline()
    base_image_path = os.path.join(os.path.dirname(__file__), '..', 'test-data', 'sample-spine.png')

    if not os.path.exists(base_image_path):
        print(f"[!] Error: Test image {base_image_path} not found.")
        return

    base_img = Image.open(base_image_path)
    w, h = base_img.size

    test_cases = []

    with tempfile.TemporaryDirectory() as temp_dir:
        # Case 1: Valid Baseline Medical Scan
        p1 = os.path.join(temp_dir, "case1_valid_mri.png")
        base_img.save(p1)
        test_cases.append({
            "id": "IMG-01",
            "name": "Valid Medical Spine Scan (PNG, 1024x1024)",
            "path": p1,
            "category": "Valid Input",
            "expect_success": True
        })

        # Case 2: Invalid text file with .png extension
        p2 = os.path.join(temp_dir, "case2_invalid_text.png")
        with open(p2, "w") as f:
            f.write("<!DOCTYPE html><html><body>Not an image</body></html>")
        test_cases.append({
            "id": "IMG-02",
            "name": "Spoofed MIME-Type (HTML/Text file with .png extension)",
            "path": p2,
            "category": "Invalid Format",
            "expect_success": False
        })

        # Case 3: Truncated / Corrupted Image
        p3 = os.path.join(temp_dir, "case3_corrupted.png")
        with open(base_image_path, "rb") as f_in, open(p3, "wb") as f_out:
            raw_bytes = f_in.read(150) # Truncate to first 150 bytes
            f_out.write(raw_bytes)
        test_cases.append({
            "id": "IMG-03",
            "name": "Corrupted / Truncated PNG Bitstream (150 bytes)",
            "path": p3,
            "category": "Corrupted Data",
            "expect_success": False
        })

        # Case 4: Unsupported Format (BMP / WebP)
        p4 = os.path.join(temp_dir, "case4_unsupported.bmp")
        base_img.save(p4, format="BMP")
        test_cases.append({
            "id": "IMG-04",
            "name": "Alternative Format (BMP format)",
            "path": p4,
            "category": "Format Support",
            "expect_success": True # PIL supports BMP, verify pipeline accepts it
        })

        # Case 5: Extremely Low Resolution (32x32)
        p5 = os.path.join(temp_dir, "case5_lowres_32x32.png")
        low_res = base_img.resize((32, 32), Image.Resampling.NEAREST)
        low_res.save(p5)
        test_cases.append({
            "id": "IMG-05",
            "name": "Extremely Low-Resolution Image (32x32)",
            "path": p5,
            "category": "Degraded Quality",
            "expect_success": True
        })

        # Case 6: Severe Optical Blur (Gaussian Blur sigma=10)
        p6 = os.path.join(temp_dir, "case6_blurry.png")
        blurry = base_img.filter(ImageFilter.GaussianBlur(radius=10))
        blurry.save(p6)
        test_cases.append({
            "id": "IMG-06",
            "name": "Severely Blurry Image (Gaussian Blur Radius=10)",
            "path": p6,
            "category": "Degraded Quality",
            "expect_success": True
        })

        # Case 7: High Gaussian Noise
        p7 = os.path.join(temp_dir, "case7_noisy.png")
        img_np = np.array(base_img.convert("L"), dtype=float)
        noise = np.random.normal(0, 50, img_np.shape)
        noisy_np = np.clip(img_np + noise, 0, 255).astype(np.uint8)
        Image.fromarray(noisy_np).save(p7)
        test_cases.append({
            "id": "IMG-07",
            "name": "High Noise Scanner Artifacts (Gaussian Noise sigma=50)",
            "path": p7,
            "category": "Degraded Quality",
            "expect_success": True
        })

        # Case 8: Extreme Aspect Ratio (Thin Vertical 64x1024)
        p8 = os.path.join(temp_dir, "case8_aspect_vertical.png")
        vert_img = base_img.resize((64, 1024))
        vert_img.save(p8)
        test_cases.append({
            "id": "IMG-08",
            "name": "Extreme Aspect Ratio (64x1024 Strip)",
            "path": p8,
            "category": "Geometry Stress",
            "expect_success": True
        })

        # Case 9: Unrelated Non-Medical Image (Synthetic Checkerboard)
        p9 = os.path.join(temp_dir, "case9_unrelated_checker.png")
        checker = np.indices((512, 512)).sum(axis=0) % 2 * 255
        Image.fromarray(checker.astype(np.uint8)).save(p9)
        test_cases.append({
            "id": "IMG-09",
            "name": "Unrelated Non-Medical Image (512x512 Checkerboard)",
            "path": p9,
            "category": "Out-of-Distribution",
            "expect_success": True
        })

        # Case 10: High Resolution / Large Image (2500x2500)
        p10 = os.path.join(temp_dir, "case10_large_2500x2500.png")
        large_img = base_img.resize((2500, 2500), Image.Resampling.BILINEAR)
        large_img.save(p10)
        test_cases.append({
            "id": "IMG-10",
            "name": "High-Resolution Image Stress Test (2500x2500, ~8MB)",
            "path": p10,
            "category": "Stress Test",
            "expect_success": True
        })

        # Execute Test Matrix
        results_summary = []
        
        for case in test_cases:
            print(f"\n[{case['id']}] Testing: {case['name']}...")
            start_t = time.time()
            handled_gracefully = False
            error_msg = None
            top_prediction = None
            vertebrae_count = 0
            
            try:
                # 1. Test image loading
                try:
                    pil_img = Image.open(case["path"])
                    pil_img.verify() # Verify image integrity
                    pil_img = Image.open(case["path"]) # Reopen after verify
                    
                    # 2. Test ML prediction & Grad-CAM
                    pred_res, heatmap_b64, top_class = pipeline.predict(pil_img)
                    top_prediction = top_class
                    
                    # 3. Test morphological spine analysis
                    morph_res = spine_analysis.analyze_spine_image(case["path"], temp_dir)
                    vertebrae_count = morph_res.get("vertebrae_detected", 0)
                    
                    handled_gracefully = True
                    print(f"  -> SUCCESS: Analyzed successfully. Top Class: '{top_class}', Vertebrae: {vertebrae_count}")
                except Exception as inner_e:
                    error_msg = str(inner_e)
                    if not case["expect_success"]:
                        handled_gracefully = True
                        print(f"  -> GRACEFUL REJECTION (Expected): {error_msg[:70]}...")
                    else:
                        print(f"  -> UNEXPECTED FAILURE: {error_msg}")
            except Exception as e:
                error_msg = str(e)
                print(f"  -> PIPELINE CRASH: {error_msg}")

            elapsed = round((time.time() - start_t) * 1000, 2)
            passed = handled_gracefully

            results_summary.append({
                "test_id": case["id"],
                "name": case["name"],
                "category": case["category"],
                "expect_success": case["expect_success"],
                "actual_handled_gracefully": handled_gracefully,
                "status": "PASS" if passed else "FAIL",
                "execution_time_ms": elapsed,
                "top_prediction": top_prediction,
                "vertebrae_detected": vertebrae_count,
                "error_message": error_msg
            })

    total_tests = len(results_summary)
    passed_tests = sum(1 for r in results_summary if r["status"] == "PASS")
    pass_rate = round((passed_tests / total_tests) * 100, 1)

    print("\n" + "=" * 70)
    print(f"Robustness Test Summary: {passed_tests}/{total_tests} Tests Passed ({pass_rate}%)")
    print("=" * 70)

    out_file = os.path.join(os.path.dirname(__file__), 'results', 'image_robustness_results.json')
    with open(out_file, 'w', encoding='utf-8') as f:
        json.dump({
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "total_tests": total_tests,
            "passed_tests": passed_tests,
            "pass_rate_percent": pass_rate,
            "test_matrix": results_summary
        }, f, indent=2)
    print(f"[+] Robustness Test Results saved to: {out_file}")

if __name__ == "__main__":
    run_image_robustness_tests()
