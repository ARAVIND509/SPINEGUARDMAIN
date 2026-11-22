# SpineGuard AI — Model Card: PyTorch ResNet-50 Lumbar Spine Pathology Classifier

> **Document Type:** Model Card for Academic & Medical Research  
> **Model Version:** ResNet-50 v2 (Layer4 Multi-Class Grad-CAM)  
> **Framework:** PyTorch 2.6.0  
> **Checkpoint:** `python-api/models/spine_resnet50.pth`  
> **Evaluation Mode:** Pure Deterministic Evaluation (`torch.no_grad()`, zero-jitter)  

---

## 1. Model Architecture & Parameters

- **Base Architecture:** ResNet-50 (Deep Residual Learning with 50 layers)
- **Input Dimensions:** $3 \times 224 \times 224$ (RGB float32 tensor)
- **Normalization:** ImageNet mean $[0.485, 0.456, 0.406]$ and std $[0.229, 0.224, 0.225]$
- **Target Feature Layer for XAI:** `model.layer4` (2048 feature maps)
- **Head Structure:** Global Average Pooling $\to$ Linear $(2048 \to 6)$
- **Activation Function:** Sigmoid for multi-label pathology probabilities

---

## 2. Supported Pathology Classes

The model evaluates lumbar spine MRI scans across six clinical diagnostic categories:

1. **Disc Herniation:** Intervertebral disc displacement beyond the disc space boundary.
2. **Spinal Stenosis:** Narrowing of the central spinal canal with thecal sac compression.
3. **Degenerative Disc Disease:** Loss of disc hydration, disc space height reduction, or osteophytosis.
4. **Scoliosis:** Coronal plane spinal deviation and abnormal curvature.
5. **Vertebral Fracture:** Cortical disruption or compression deformity of lumbar vertebral bodies.
6. **Spondylolisthesis:** Anterior or posterior slippage of a vertebral body relative to adjacent segment.

---

## 3. Explainability Engine (Authentic Class-Specific Grad-CAM)

- **Gradient Backpropagation:** Computed with respect to specific class logit $y^c$:
  $$\alpha_k^c = \frac{1}{Z} \sum_{i,j} \frac{\partial y^c}{\partial A_{i,j}^k}$$
- **Rectification:** Positive gradient activations ($\text{ReLU}$) identify regions contributing positively to class confidence.
- **Medical Colormaps:**
  - `Viridis`: Perceptually uniform medical gold-standard; optimal for color-vision deficiency.
  - `Inferno`: High-contrast black-purple-orange map for fine gradient distinction.
  - `Turbo`: Smooth, perceptually corrected rainbow alternative.
  - `JET`: Classic radiological visualization.
- **Strict Anti-Fabrication Guarantee:** When activations or gradients are uncomputable, the pipeline returns explicit `None`. The system never fabricates synthetic Gaussian blobs.

---

## 4. Evaluation & Determinism Standards

- **Numerical Determinism:** Prior prototypes added pseudorandom confidence jitter. The modernized pipeline guarantees $100\%$ reproducible outputs: identical inputs yield bit-exact probabilities across repeated inferences.
- **Independence of Test Datasets:** Demonstration patient cases are solely illustrative and are never used to claim independent statistical clinical accuracy.

---

## 5. Regulatory & Clinical Limitations

> [!WARNING]
> **ACADEMIC INVESTIGATIONAL PROTOTYPE — NOT CLINICALLY VALIDATED FOR DIAGNOSIS**
> 
> SpineGuard AI is an investigational academic research system. It has **NOT** received 510(k) clearance or De Novo authorization from the United States Food and Drug Administration (FDA), CE-mark certification under EU Medical Device Regulation (MDR), or approval from any statutory health authority.
> 
> - Grad-CAM heatmaps represent convolutional feature attribution sensitivities, NOT validated anatomical segmentations or physical vertebral levels.
> - The model must NOT be used for autonomous clinical diagnosis, surgical navigation, patient triage, or direct therapy selection.
> - All outputs require independent review and validation by a licensed, board-certified radiologist or physician using calibrated DICOM PACS workstations.
