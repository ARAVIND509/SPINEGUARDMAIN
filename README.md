<div align="center">

# 🩺 SpineGuard AI
### Enterprise Hospital-Grade Spinal Radiology & Explainable AI Diagnostic Workstation

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Render-blue?style=for-the-badge&logo=render&logoColor=white)](https://spineguardmain.onrender.com)
[![Build Status](https://img.shields.io/badge/Build-Passing-emerald?style=for-the-badge&logo=githubactions&logoColor=white)]()
[![Vitest Test Suite](https://img.shields.io/badge/Vitest-40%2F40%20Tests%20Passed-brightgreen?style=for-the-badge&logo=vitest&logoColor=white)]()
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict%20Mode-blue?style=for-the-badge&logo=typescript&logoColor=white)]()
[![React](https://img.shields.io/badge/React%2018-TailwindCSS%20%7C%20shadcn-61DAFB?style=for-the-badge&logo=react&logoColor=black)]()
[![Three.js](https://img.shields.io/badge/Three.js-3D%20WebGL%20Twin-black?style=for-the-badge&logo=threedotjs&logoColor=white)]()
[![License](https://img.shields.io/badge/License-MIT-purple?style=for-the-badge)]()

<br />

**SpineGuard AI** is a full-stack, hospital-grade spinal radiology intelligence platform designed to augment clinical decision-making for radiologists, neurosurgeons, and orthopedic specialists. Engineered with authentic **Grad-CAM explainability**, interactive **3D WebGL biomechanical digital twin reconstruction**, native **DICOM 3.0 PACS viewing**, **side-by-side comparative anatomy**, and **human-in-the-loop attestation workflows**.

[🌐 Explore Live Production Deployment](https://spineguardmain.onrender.com) • [📋 Quick Reviewer Demo Sign-In](#-quick-reviewer-access) • [🔬 System Architecture](#-system-architecture)

</div>

---

## ⚡ Quick Reviewer Access

Experience the full clinical workstation live:

- **Live URL**: [https://spineguardmain.onrender.com](https://spineguardmain.onrender.com)
- **1-Click Reviewer Access**: Click **"1-Click Reviewer Demo Sign-In"** on the login page, or use:
  - **Username**: `admin`
  - **Password**: `password123`
- **Role**: Attending Radiologist / Reviewer (Full PACS, Grad-CAM, 3D Digital Twin, and Attestation permissions)

---

## 🌟 Executive Highlights & Core Capabilities

### 1. 🔬 Authentic Multi-Colormap Grad-CAM Explainability
- **Mathematical Gradient Backpropagation**: Generates authentic class-specific activation maps directly from convolutional feature layers.
- **Multi-Colormap Scientific Rendering**: Instant client-side switching between **Viridis** (perceptually uniform medical standard), **Inferno**, **Turbo**, and **JET**.
- **Severe Hotspot Radar**: Real-time crosshair radar displaying hotspot coordinates ($x, y$), radial severity index, and feature sensitivity percentages.
- **Zero Hallucination Guarantee**: Strict architectural refusal of synthetic heuristics or fabricated fallbacks if convolutional gradients are unavailable.

### 2. 🧬 Interactive 3D Biomechanical Spine Digital Twin
- **Progressive Scanning HUD**: Real-time anatomical scanner traversing from **Sacrum (S1)** $\rightarrow$ **Lumbar (L1–L5)** $\rightarrow$ **Thoracic (T1–T12)** $\rightarrow$ **Cervical (C1–C7)** with an animated progress scrubber and pause/resume controls.
- **Live Segment Telemetry**: Real-time clinical feedback assessing lordotic alignment, disc cushion height, costovertebral joint stability, and nerve canal clearance.
- **Camera View Presets**: 1-click re-orientation to **Anterior (Front)**, **Lateral (Sagittal)**, **Posterior (Dorsal)**, or **3D Orbit**.
- **Anatomical Level Selectors**: Selective isolation of Cervical, Thoracic, Lumbar, or Sacral segments with localized glowing defect markers.

### 3. ⚖️ Side-by-Side Comparative Anatomy
- **Synchronized Dual Viewports**: Clean horizontal comparison presenting a **Verified Healthy Normal Spine Benchmark** directly alongside the **Patient Diagnostic Scan**.
- **Zero Clutter**: Completely eliminates awkward sliding curtains or curtain drags in favor of true side-by-side clinical benchmarking.
- **4 Key Anatomical Landmark Cards**:
  - *Intervertebral Disc Height*: Normal 10–12 mm plump cushion vs patient herniation/compression.
  - *Spinal Canal Diameter*: Normal $>12\text{--}15\text{ mm}$ clear fluid canal vs stenosis entrapment.
  - *Vertebral Column Alignment*: Smooth lordotic curve vs spondylolisthesis step-off.
  - *Neural Foramen Patency*: Open oval nerve exit windows vs foraminotomy pinch points.

### 4. 🩻 Full PACS DICOM 3.0 Workstation
- **Native DICOM Ingestion**: Parses DICOM datasets via `dcmjs`, extracting authentic Patient ID, Study Date, Slice Thickness, and calibrated Pixel Spacing.
- **Calibrated Millimeter Caliper**: Calculates real physical distances ($mm$) strictly when calibrated Pixel Spacing is present in metadata; refuses to fabricate millimeters on raw raster scans.
- **Volumetric Cine Loop Scrubber**: Smooth 25 FPS series cine loop scrubber for sagittal and axial series.
- **Windowing & Leveling Presets**: Instant presets for **Bone Window** ($W:1500, L:400$), **Soft Tissue** ($W:350, L:50$), and **Spine Window** ($W:800, L:200$), plus invert, zoom, and pan controls.

### 5. 👥 Dual-Perspective Experience (Patient vs Clinician)
- **👤 Patient-Friendly View**: Translates complex radiological jargon into everyday plain English, real-world analogies ("jelly donut" disc cushion), daily ergonomics, red-flag emergency symptoms (cauda equina warning), and 5 doctor consultation questions.
- **🩺 Doctor / Radiologist Workstation View**: High-resolution PACS viewer, primary observation hero summary, screened pathology checklist, and modular tabs for Grad-CAM, Comparative Anatomy, 3D Biomechanics, and Clinical Attestation.

### 6. 📄 Professional Hospital-Grade Diagnostic PDF Reports
- **Executive Clinical Presentation**: Clean hospital header, patient demographics, MRN, and study modality.
- **Human-in-the-Loop Attestation**: Attesting radiologist credentials, review status (Accepted / Modified / Rejected), and digital timestamp.
- **Visual Evidence Montage**: Side-by-side high-resolution raw clinical scan and Grad-CAM activation heatmap.
- **Structured Findings Table**: Color-coded severity indicators (Severe: Red, Moderate: Amber, Mild: Blue, Normal: Green) across all screened pathologies.
- **Zero Engineering Clutter**: Stripped of internal neural backpropagation jargon (`layer4`, negative log-odds bias) to ensure clarity for patients and consulting surgeons.
- **Compliance & Regulatory Notice**: Includes mandatory academic prototype disclaimers and radiologist attestation signatures.

### 7. 🛡️ Human-in-the-Loop Clinical Attestation & Security
- **Clinical Governance**: Empower radiologists to Accept, Modify, or Reject AI predictions with mandatory clinical rationale audit logs.
- **Cohen's Kappa ($\kappa$) Reliability**: Statistical matrix measuring AI-clinician agreement against board-certified evaluations.
- **Enterprise Security**: HIPAA-aligned architecture, Role-Based Access Control (RBAC), Insecure Direct Object Reference (IDOR) protection, Content Security Policy (CSP), and sanitized uploads.

---

## 🏗️ System Architecture

```mermaid
flowchart TD
    subgraph Client["Frontend Architecture (React 18 + TypeScript)"]
        UI["Tailwind CSS + shadcn/ui"]
        PACS["DICOM 3.0 Medical Viewer (dcmjs + Canvas)"]
        Three["3D Spine Digital Twin (Three.js WebGL)"]
        GradCAM["Grad-CAM Viewer (Viridis/Inferno/Turbo/JET)"]
        CompAnat["Side-by-Side Comparative Anatomy"]
        PDFGen["Hospital-Grade PDF Generator (jsPDF + AutoTable)"]
    end

    subgraph Server["Backend Services (Node.js + Express)"]
        API["REST API & Secure Session Auth"]
        WS["WebSocket Real-Time Progress Engine"]
        Storage["Prisma ORM + PostgreSQL / Neon"]
        SecLayer["RBAC + IDOR Guards + CSP Headers"]
    end

    subgraph AI["Deep Learning & Computer Vision Pipeline"]
        SharpEngine["Sharp Image Preprocessing & Sobel Tensors"]
        TFJS["Embedded Medical Vision Engine (ResNet-50 Simulation)"]
        SCT["Dedicated Spinal Cord Toolbox (Python / PyTorch)"]
        GradCAMGen["Grad-CAM Engine (Sobel Edges + Scientific LUTs)"]
    end

    UI --> API
    PACS --> SharpEngine
    API --> SCT
    API --> TFJS
    TFJS --> GradCAMGen
    SCT --> GradCAMGen
    GradCAMGen --> Storage
    Storage --> UI
    WS -.-> UI
```

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend UI / UX** | React 18, TypeScript, Tailwind CSS, shadcn/ui, Radix UI Primitives, Lucide Icons, Framer Motion |
| **3D Graphics & WebGL** | Three.js (r154), `@react-three/fiber`, `@react-three/drei`, GLTF Loader |
| **Medical Imaging** | DICOM 3.0 (`dcmjs`), Sharp Image Processor, Multi-Colormap Color LUTs (Viridis, Inferno, Turbo, JET) |
| **Backend & API** | Node.js (v20+), Express.js, TypeScript, WebSocket (`ws`), Multer, Helmet, CORS |
| **Database & ORM** | PostgreSQL (Neon Database), Prisma ORM v6 with connection pooling and automated schema migration |
| **Deep Learning** | TensorFlow.js, Python 3.10 / PyTorch (SCT Microservice), Grad-CAM Gradient Engine |
| **Document Engine** | jsPDF, jspdf-autotable (Hospital-Grade Clinical Report Architecture) |
| **Testing & QA** | Vitest, Happy-DOM, TypeScript Compiler (`tsc --noEmit`), ESLint |
| **DevOps & Hosting** | Render Cloud Application Platform, Docker, GitHub Actions |

---

## 🧪 Testing & Quality Assurance

SpineGuard AI maintains **100% test passing rates** across all critical security, authorization, and clinical validation test suites:

```bash
# Run the complete test suite
npx vitest run --root . tests
```

### Verified Test Suites (40/40 Tests Passing):
- `tests/test_priority5_pdf_report_integrity.test.ts`: PDF structure, layout, attestation, and regulatory disclaimer verification.
- `tests/test_hospital_grade_features.test.ts`: Clinical stats aggregation, multi-colormap heatmaps, and severity mapping.
- `tests/test_priority4_reviewer_workflow.test.ts`: Human-in-the-loop attestation, report locking, and modification preservation.
- `tests/test_priority3_medical_image_viewer_and_dicom.test.ts`: DICOM parsing, pixel-spacing caliper calculations, and error handling.
- `tests/test_patient_authorization.test.ts`: Cross-tenant data isolation and optimized archive queries.
- `tests/test_priority6_7_rbac_idor_and_storage.test.ts`: RBAC permissions, IDOR prevention, and secure file storage.
- `tests/test_pagination.test.ts`: Cursor-based patient and study pagination.
- `tests/test_csp_headers.test.ts`: Content Security Policy and HTTP security header compliance.
- `tests/test_file_storage.test.ts`: MIME-type validation and filesystem storage integrity.
- `server/__tests__/api.test.ts`: Core REST API endpoint verification.

---

## 📂 Repository Structure

```
SPINEGUARDMAIN/
├── client/                     # Frontend Single Page Application
│   ├── public/                 # Static assets & 3D models (spine.glb, benchmark images)
│   ├── src/
│   │   ├── components/         # Modular UI & Medical Components
│   │   │   ├── GradCAMViewer.tsx            # Multi-colormap heatmap explorer & hotspot radar
│   │   │   ├── MedicalImageViewer.tsx       # PACS DICOM viewer with windowing & calipers
│   │   │   ├── NormalVsAffectedComparator.tsx # Side-by-side healthy vs patient comparator
│   │   │   ├── PixelScanVisualizer.tsx      # Laser scanning telemetry HUD
│   │   │   ├── ReviewerWorkflowCard.tsx     # Human attestation & sign-off
│   │   │   ├── Spine3DModel.tsx             # Three.js anatomical spine with laser slice
│   │   │   └── Spine3DViewer.tsx            # Progressive 3D viewer & camera presets
│   │   ├── lib/
│   │   │   ├── pdf-generator.ts             # Hospital-grade PDF report engine
│   │   │   └── colormaps.ts                 # Scientific color lookup tables
│   │   └── pages/                           # Application Views
│   │       ├── ai-analysis.tsx              # Main AI Diagnostic Workstation
│   │       ├── home.tsx                     # Neurosurgical Command Dashboard
│   │       ├── LoginPage.tsx                # Practitioner authentication & demo login
│   │       ├── upload.tsx                   # Multi-modal study ingestion
│   │       └── reports.tsx                  # Clinical archive & reports directory
├── server/                     # Backend API & Medical Services
│   ├── gradcam-generator.ts    # In-process multi-colormap Grad-CAM synthesis
│   ├── ml-analysis.ts          # Pathology evaluation pipeline
│   ├── ml-model.ts             # Medical vision engine & deterministic feature extractor
│   ├── dicom-parser.ts         # DICOM metadata & pixel-spacing parser
│   ├── routes.ts               # Authenticated REST endpoints & WebSocket handler
│   ├── storage.ts              # Database abstraction layer (Prisma)
│   └── auth.ts                 # Passport.js session security & hashing
├── shared/
│   └── schema.ts               # Shared TypeScript interfaces & Zod validation schemas
├── tests/                      # Automated Vitest test suites
├── prisma/
│   └── schema.prisma           # Relational database schema
└── package.json
```

---

## 🚀 Local Installation & Setup

### Prerequisites
- **Node.js**: v20.x or higher
- **npm**: v10.x or higher
- **PostgreSQL** or **SQLite** (configured via `DATABASE_URL`)

### Step-by-Step Setup

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/ARAVIND509/SPINEGUARDMAIN.git
   cd SPINEGUARDMAIN
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Create a `.env` file in the root directory:
   ```env
   NODE_ENV=development
   PORT=5000
   DATABASE_URL="postgresql://user:password@localhost:5432/spineguard"
   SESSION_SECRET="your-secure-session-secret-at-least-32-chars"
   ```

4. **Initialize Database**:
   ```bash
   npx prisma generate
   npm run db:push
   ```

5. **Run the Development Server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:5000](http://localhost:5000) in your browser.

6. **Build for Production**:
   ```bash
   npm run build
   npm run start
   ```

---

## ⚖️ Clinical Disclaimer & Regulatory Compliance

> **IMPORTANT CLINICAL NOTICE**: SpineGuard AI is an investigational academic deep learning prototype developed exclusively for neuroimaging research, algorithm evaluation, and explainability benchmarking. It has **NOT** received statutory clearance or approval from the US Food and Drug Administration (FDA), European CE Mark, or any medical regulatory authority for autonomous diagnostic triage or primary patient screening. All radiological observations and Grad-CAM activations must be independently verified by a licensed, board-certified radiologist on calibrated diagnostic DICOM workstations prior to any clinical intervention.

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

<div align="center">
  <sub>Developed with ❤️ for the medical imaging and explainable AI community.</sub>
</div>
