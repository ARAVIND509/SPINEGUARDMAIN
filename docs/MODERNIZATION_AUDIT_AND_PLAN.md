# SpineGuard — Engineering Modernization Audit & Implementation Plan

**Branch**: `modernization` (created from `main` @ `ce9f2b7`)  
**Status**: Pre-Implementation Source-Code Audit  
**Classification**: Academic Medical Imaging Platform (Not Clinically Validated)  
**Objective**: Transform SpinalGuard into a maintainable, secure, and deployment-ready academic medical imaging platform.

---

## 1. Source-Code Audit & File Inventory

| Modernization Priority | Component / Purpose | Exact Files Responsible | Current Status & Findings | Action Required |
| :--- | :--- | :--- | :--- | :--- |
| **P1: Remove Misleading Functionality** | Confidence Jitter | `python-api/spine_analysis.py` (lines 32–58) | `get_image_salt()` and `calculate_confidence()` inject artificial pseudorandom jitter (+/-5%) into outputs. | Excised. Replace with pure deterministic sigmoid/softmax probabilities. |
| **P1: Remove Misleading Functionality** | Simulated Hemodynamics & Soft Tissue | `server/analysis-utils.ts`<br>`client/src/pages/ai-analysis.tsx`<br>`shared/schema.ts` | Fabricates blood flow (68 ml/min), tissue hydration, and oxygenation without phase-contrast MRI. | Remove heuristic simulations; replace with authentic spinal canal geometry and true model outputs. |
| **P1: Remove Misleading Functionality** | MobileNet 1.15x Boost | `server/ml-model.ts` (lines 31–48) | MobileNet features are scaled by a 1.15x multiplier to "simulate ResNet". | Eliminate simulated boost. All inference routes to authentic PyTorch ResNet-50. |
| **P1: Remove Misleading Functionality** | Dead Synthetic Grad-CAM | `server/gradcam-generator.ts` (lines 120–220) | Remaining heuristic edge/attention tensors (`createConditionSpecificAttention`). | Remove dead code; return explicit `status: "unavailable"` when PyTorch Grad-CAM cannot be generated. |
| **P2: Professional Grad-CAM System** | Deep Learning Activation Maps | `python-api/ml_pipeline.py`<br>`python-api/spine_analysis.py`<br>`server/gradcam-generator.ts` | Only top predicted class generates a heatmap; suppressed if below 35%. | Compute genuine gradients & activations for all 6 output classes; expose class selector in API. |
| **P2: Professional Grad-CAM System** | Interactive Heatmap Controls | `client/src/components/GradCAMViewer.tsx`<br>`client/src/pages/ai-analysis.tsx` | Heatmap UI hidden if empty; no opacity or colormap controls. | Implement 0–100% opacity slider, colormaps (Viridis, Inferno, Turbo, JET), side-by-side split view. |
| **P3: Medical Image Viewport** | 2D PACS/DICOM Viewport | `client/src/components/MedicalImageViewer.tsx`<br>`server/dicom-parser.ts` | Generic HTML `<img>` tag; no window/level, invert, or zoom/pan. | Implement Pan, Zoom, Invert, Reset, and DICOM Window/Level (Bone/Soft Tissue) when metadata exists. |
| **P3: Medical Image Viewport** | 3D Skeleton Repositioning | `client/src/components/Spine3DModel.tsx`<br>`client/src/pages/ai-analysis.tsx` | Generic `spine.glb` static mesh presented as dynamic reconstruction. | Re-label clearly as "3D Anatomical Reference Guide"; do not present as patient-specific anatomy. |
| **P4: Human Review Workflow** | Reviewer Verification & Sign-off | `prisma/schema.prisma`<br>`shared/schema.ts`<br>`server/routes.ts`<br>`server/storage.ts` | No reviewer state machine; AI output is static and immutable. | Add review workflow: `awaiting_review` → `accepted` / `rejected` / `modified` → `finalized`. |
| **P5: Professional Report Generation** | Radiology PDF Report | `client/src/lib/pdf-generator.ts`<br>`client/src/pages/reports.tsx` | Fabricated clinic details and fake verification QR code. | Generate clean reports with original scan, genuine Grad-CAM, reviewer sign-off, and academic disclaimer. |
| **P6: Patient History & RBAC** | Role-Based Access Control | `prisma/schema.prisma`<br>`server/auth.ts`<br>`server/routes.ts` | Basic authentication without granular clinical roles (`admin`, `reviewer`, `viewer`). | Enforce backend role checks, audit logs, and IDOR validation. |
| **P7: Storage & Backend Reliability** | Persistent Medical Storage | `server/scan-storage.ts`<br>`render.yaml` | Local disk storage with basic path traversal protection. | Abstract storage layer with signed URLs, file validation, and transaction safety. |
| **P8: Code Modularization** | Maintainable Architecture | Entire repository | Mixed responsibilities in monolithic route files. | Refactor into modular services: `services/ai`, `services/dicom`, `services/reports`. |
| **P9: Verification & Testing** | Comprehensive Test Suite | `tests/` directory | 15 Vitest tests and Python benchmark scripts. | Add end-to-end tests for determinism, multi-class Grad-CAM, reviewer workflow, and DICOM metadata. |

---

## 2. Implementation Stages & Execution Order

```
[Stage 1: P1] Excising Heuristics & Determinism Hardening
      │
[Stage 2: P2] Multi-Class PyTorch Grad-CAM & Interactive Controls
      │
[Stage 3: P3] 2D Medical Image Viewport (PACS / DICOM)
      │
[Stage 4: P4] Human-in-the-Loop Reviewer Workflow & Audit Trail
      │
[Stage 5: P5] Professional PDF Clinical Report Generation
      │
[Stage 6: P6 & P7] RBAC, Query Optimization & Persistent Storage
      │
[Stage 7: P8 & P9] Modular Refactoring & Full Automated Verification
```

---

## 3. Risks & Dependencies

1. **Backwards Compatibility**: Existing scan analyses in the database reference older schema fields (`bloodFlowAnalysis`, `postureSimulation`). Migration scripts and schema fallbacks must prevent runtime crashes when viewing historical records.
2. **Computational Load**: Generating genuine Grad-CAM heatmaps for all 6 classes simultaneously in Python increases inference latency by ~1.5x. We will optimize tensor operations so heatmaps compute efficiently in a single backward pass loop or on demand.
3. **Medical Integrity**: Grad-CAM visualizes spatial gradient attention of feature maps; it must never be claimed as a definitive histological lesion boundary or anatomical vertebral level without validated segmentation.
