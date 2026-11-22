# SpineGuard AI — System Architecture & Design Specification

> **Status:** Academic Investigational Medical Imaging Platform  
> **Version:** 2.0.0 (Modernized)  
> **Date:** November 2026  
> **Compliance:** HIPAA Data Isolation & Academic Research Prototype Standard  

---

## 1. System Overview

SpineGuard AI is an academic neuroimaging and explainability platform engineered to assist clinical researchers in evaluating deep learning architectures for lumbar spine pathology detection. The system pairs deep convolutional neural networks (PyTorch ResNet-50) with authentic, class-specific gradient-weighted class activation mapping (Grad-CAM) and a human-in-the-loop review workflow.

```
+-------------------------------------------------------------------------------+
|                             CLIENT / VIEWPORT LAYER                           |
|  +---------------------------+  +-------------------+  +-------------------+  |
|  |   MedicalImageViewer      |  |   GradCAMViewer   |  | ReviewerWorkflow  |  |
|  |  (2D Canvas, WL/WW, Pan,  |  |  (Multi-Colormap, |  | (Accept, Reject,  |  |
|  |   Zoom, Caliper Tool)     |  |   Class Backprop) |  |  Modify, Finalize)|  |
|  +---------------------------+  +-------------------+  +-------------------+  |
|                                        ^                                      |
+----------------------------------------|--------------------------------------+
                                         | REST / HTTPS & WSS
+----------------------------------------v--------------------------------------+
|                           APPLICATION SERVER (Node/Express)                   |
|  +--------------------+  +----------------------+  +-----------------------+  |
|  | Auth & RBAC Guard  |  |  Scan Storage Engine |  | Analysis Controller   |  |
|  | (Passport, Session)|  |  (Disk/S3, Mime, Sz) |  | (Idempotency, Bridge) |  |
|  +--------------------+  +----------------------+  +-----------------------+  |
|  +--------------------+  +----------------------+  +-----------------------+  |
|  |   Audit Logger     |  |  DICOM Parser        |  | PDF Report Engine     |  |
|  |   (System Events)  |  |  (dcmjs Metadata)    |  | (jsPDF, Disclaimers)  |  |
|  +--------------------+  +----------------------+  +-----------------------+  |
+----------------------------------------|--------------------------------------+
                    |                    | HTTP Proxy (Port 8000)
                    v                    v
+-----------------------------+  +----------------------------------------------+
|     PERSISTENCE LAYER       |  |          AI INFERENCE ENGINE (Python)        |
|  +-----------------------+  |  |  +----------------------------------------+  |
|  | Prisma ORM (SQLite/PG)|  |  |  | FastAPI / PyTorch ResNet-50            |  |
|  | - Patients            |  |  |  | - Pure Deterministic Forward Pass     |  |
|  | - Scans & Metadata    |  |  |  | - Class-Specific Layer4 Grad-CAM       |  |
|  | - Analyses & Reviews  |  |  |  | - Colormaps: Viridis, Inferno, Turbo |  |
|  | - Audit Logs          |  |  |  +----------------------------------------+  |
|  +-----------------------+  |  +----------------------------------------------+
+-----------------------------+
```

---

## 2. Layer Separation & Modular Design

### A. Frontend Presentation Layer (`client/src/`)
- **`components/MedicalImageViewer.tsx`**: 2D medical viewport featuring canvas rendering, mouse-wheel zoom (0.3x–7.0x), drag-to-pan, 90° rotation, horizontal flip, image inversion (photometric simulation), Window Width / Window Level contrast sliders, presets (Default, Bone, Soft Tissue), and calibrated digital caliper tools.
- **`components/GradCAMViewer.tsx`**: Multi-class Explainable AI viewport supporting targeted backpropagation for all 6 pathology classes across 4 colormaps (Viridis, Inferno, Turbo, JET), synchronized zoom/pan, and opacity blending.
- **`components/ReviewerWorkflowCard.tsx`**: Human-in-the-loop review interface providing four-stage state tracking (AI Generated -> Awaiting Review -> Modified/Accepted/Rejected -> Finalized & Locked).
- **`lib/pdf-generator.ts`**: Clean vector PDF generation embedding patient identifiers, side-by-side original scans and Grad-CAM heatmaps, physician attestations, and academic prototype disclaimers without leaking private patient data.

### B. Backend API & Business Logic Layer (`server/`)
- **`routes.ts`**: Protected API endpoints enforcing session-based authentication, patient-level ownership checks (IDOR defense), and RBAC boundaries.
- **`storage.ts`**: Database abstraction via Prisma ORM optimizing queries to eliminate N+1 latency bottlenecks and ensuring ACID transaction consistency.
- **`scan-storage.ts`**: Binary file persistence saving medical scans directly to disk/object storage with UUID-based identifiers, avoiding large Base64 blobs in SQL.
- **`dicom-parser.ts`**: DICOM 3.0 metadata parser extracting native pixel spacing, window center/width, slice thickness, and orientation tags.

### C. Deep Learning Inference Microservice (`python-api/`)
- **`ml_pipeline.py`**: ResNet-50 inference pipeline evaluating 6 clinical conditions. Operates in pure deterministic evaluation mode (`eval()`, fixed seed, zero jitter).
- **`spine_analysis.py`**: Spinal coordination service bridging PyTorch outputs and anatomical landmark mapping.

---

## 3. Determinism & Scientific Reproducibility

Prior to modernization, synthetic random jitter (`get_image_salt()`, `random.uniform(-0.15, 0.15)`) was added to inference confidences. 

**Remediation:**
- All synthetic noise, random salts, and pseudorandom jitter have been permanently excised.
- The PyTorch pipeline evaluates input tensors with deterministic numerical operations.
- Repeated forward passes on identical inputs produce identical confidence scores across all conditions ($R^2 = 1.0$).

---

## 4. Explainable AI Architecture (Class-Specific Grad-CAM)

1. **Forward Pass:** The input image $I \in \mathbb{R}^{3 \times H \times W}$ is resized to $224 \times 224$, normalized with ImageNet statistics, and passed through ResNet-50.
2. **Targeted Backpropagation:** For each target class $c \in \{1, \dots, 6\}$:
   $$\alpha_k^c = \frac{1}{Z} \sum_{i} \sum_{j} \frac{\partial y^c}{\partial A_{i,j}^k}$$
   Where $A^k$ represents feature activation map $k$ of `layer4` and $y^c$ is the logits score for class $c$.
3. **Rectified Linear Combination:**
   $$L_{\text{Grad-CAM}}^c = \text{ReLU}\left(\sum_k \alpha_k^c A^k\right)$$
4. **Resolution Restoration:** The resulting heatmap is upsampled using cubic interpolation to the original scan dimensions, normalized to $[0, 1]$, and colormapped using OpenCV Viridis, Inferno, Turbo, or JET.
5. **No Synthetic Fallback:** If convolutional gradients are unavailable or invalid, the pipeline returns `None` rather than fabricating synthetic Gaussian blobs.
