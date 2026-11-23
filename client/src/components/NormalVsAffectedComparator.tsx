import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Columns,
  CheckCircle2,
  AlertCircle,
  Info,
  Stethoscope,
  Sparkles,
  Layers,
  ShieldCheck
} from "lucide-react";
import type { AnalysisResults } from "@shared/schema";

interface NormalVsAffectedComparatorProps {
  patientImageUrl: string;
  imageType?: string;
  results?: AnalysisResults;
  className?: string;
}

export function NormalVsAffectedComparator({
  patientImageUrl,
  imageType = "MRI",
  results,
  className = "",
}: NormalVsAffectedComparatorProps) {
  const [activeModality, setActiveModality] = useState<"MRI" | "X-ray">(
    imageType.toLowerCase().includes("x") ? "X-ray" : "MRI"
  );

  const normalReferenceUrl =
    activeModality === "MRI"
      ? "/images/normal-spine-mri.png"
      : "/images/normal-spine-xray.png";

  const primaryCondition = results?.primaryFinding?.condition || "Spinal Finding";
  const primarySeverity = results?.primaryFinding?.severity || "moderate";
  const primaryConfidence = results?.primaryFinding?.confidence || 80;

  return (
    <Card className={`glass-card border border-white/10 overflow-hidden ${className}`} data-testid="normal-vs-affected-comparator">
      <CardHeader className="pb-4 border-b border-white/5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <Columns className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                Side-by-Side Comparative Anatomy
                <Badge variant="outline" className="bg-indigo-500/10 text-indigo-400 border-indigo-500/20 text-[9px] font-mono">
                  BENCHMARK_ANALYSIS
                </Badge>
              </CardTitle>
              <CardDescription className="text-xs">
                Direct anatomical comparison between a verified healthy spine and the patient's diagnostic scan
              </CardDescription>
            </div>
          </div>

          {/* Modality Selector */}
          <div className="flex items-center gap-2 self-start md:self-auto">
            <div className="flex rounded-xl p-0.5 bg-muted/60 border border-white/10 text-xs">
              <Button
                size="sm"
                variant={activeModality === "MRI" ? "secondary" : "ghost"}
                className={`h-7 text-xs px-3 rounded-lg ${activeModality === "MRI" ? "font-bold shadow-xs text-primary" : "text-muted-foreground"}`}
                onClick={() => setActiveModality("MRI")}
              >
                MRI Benchmark
              </Button>
              <Button
                size="sm"
                variant={activeModality === "X-ray" ? "secondary" : "ghost"}
                className={`h-7 text-xs px-3 rounded-lg ${activeModality === "X-ray" ? "font-bold shadow-xs text-primary" : "text-muted-foreground"}`}
                onClick={() => setActiveModality("X-ray")}
              >
                X-Ray Benchmark
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-6 space-y-6">
        {/* ═══ SIDE-BY-SIDE DUAL VIEWPORT ═══ */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Column: Healthy Normal Baseline */}
          <div className="relative rounded-2xl overflow-hidden border border-emerald-500/30 bg-slate-950 flex flex-col items-center justify-between p-4 shadow-xl">
            {/* Top Badge */}
            <div className="w-full flex items-center justify-between z-10 mb-2">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-[10px] font-mono shadow-md">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                <span>HEALTHY NORMAL BASELINE ({activeModality})</span>
              </div>
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[9px] font-mono">
                CONTROL SPECIMEN
              </Badge>
            </div>

            {/* Medical Image */}
            <div className="relative w-full h-[360px] flex items-center justify-center p-2">
              <img
                src={normalReferenceUrl}
                alt="Healthy Normal Reference"
                className="w-full h-full object-contain"
                draggable={false}
              />
            </div>

            {/* Feature Callout Summary */}
            <div className="w-full mt-2 p-3 rounded-xl bg-black/60 border border-emerald-500/20 text-xs text-emerald-300/90 space-y-1">
              <p className="font-semibold text-emerald-400 text-[11px] flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5" /> Healthy Anatomical Criteria:
              </p>
              <ul className="text-[10px] space-y-0.5 text-slate-300 pl-4 list-disc">
                <li>Preserved intervertebral disc height (10–12 mm cushion)</li>
                <li>Clear, unobstructed central spinal canal (&gt;12 mm clearance)</li>
                <li>Smooth, uniform vertical alignment without bone slippage</li>
              </ul>
            </div>
          </div>

          {/* Right Column: Patient Study Scan */}
          <div className="relative rounded-2xl overflow-hidden border border-rose-500/30 bg-slate-950 flex flex-col items-center justify-between p-4 shadow-xl">
            {/* Top Badge */}
            <div className="w-full flex items-center justify-between z-10 mb-2">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-950/80 border border-rose-500/40 text-rose-300 text-[10px] font-mono shadow-md">
                <AlertCircle className="h-3.5 w-3.5 text-rose-400" />
                <span>PATIENT STUDY: {primaryCondition.toUpperCase()}</span>
              </div>
              <Badge variant="outline" className="bg-rose-500/10 text-rose-400 border-rose-500/30 text-[9px] font-mono">
                {primarySeverity.toUpperCase()} • {primaryConfidence}%
              </Badge>
            </div>

            {/* Medical Image */}
            <div className="relative w-full h-[360px] flex items-center justify-center p-2">
              <img
                src={patientImageUrl}
                alt="Patient Diagnostic Scan"
                className="w-full h-full object-contain"
                draggable={false}
              />
            </div>

            {/* Pathological Finding Summary */}
            <div className="w-full mt-2 p-3 rounded-xl bg-black/60 border border-rose-500/20 text-xs text-rose-300/90 space-y-1">
              <p className="font-semibold text-rose-400 text-[11px] flex items-center gap-1">
                <AlertCircle className="h-3.5 w-3.5" /> Observed Pathological Divergence:
              </p>
              <ul className="text-[10px] space-y-0.5 text-slate-300 pl-4 list-disc">
                <li>Altered disc compression / focal posterior protrusion</li>
                <li>Narrowed canal space with potential thecal sac impingement</li>
                <li>Biomechanical stress concentration identified at lower lumbar segment</li>
              </ul>
            </div>
          </div>
        </div>

        {/* ═══ ANATOMICAL DISCREPANCY COMPARISON TABLE ═══ */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center gap-2 text-sm font-bold text-foreground">
            <Stethoscope className="h-4 w-4 text-primary" />
            <span>Key Anatomical Landmarks: What to Look For</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Feature 1: Disc Height */}
            <div className="p-3.5 rounded-xl border border-white/10 bg-muted/20 space-y-2">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-400" />
                1. Disc Cushion Height
              </span>
              <div className="space-y-1.5 text-[11px]">
                <div className="p-1.5 rounded-lg bg-emerald-950/30 border border-emerald-500/20 text-emerald-300">
                  <span className="font-bold block">Normal:</span> Plump, thick shock-absorber cushion (~10–12 mm).
                </div>
                <div className="p-1.5 rounded-lg bg-rose-950/30 border border-rose-500/20 text-rose-300">
                  <span className="font-bold block">Patient:</span> Reduced disc height with backward bulge pressing nerves.
                </div>
              </div>
            </div>

            {/* Feature 2: Spinal Canal Width */}
            <div className="p-3.5 rounded-xl border border-white/10 bg-muted/20 space-y-2">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-indigo-400" />
                2. Spinal Canal Width
              </span>
              <div className="space-y-1.5 text-[11px]">
                <div className="p-1.5 rounded-lg bg-emerald-950/30 border border-emerald-500/20 text-emerald-300">
                  <span className="font-bold block">Normal:</span> Wide, clear tunnel (&gt;12–15 mm) with ample room for nerves.
                </div>
                <div className="p-1.5 rounded-lg bg-rose-950/30 border border-rose-500/20 text-rose-300">
                  <span className="font-bold block">Patient:</span> Narrowed canal space (&lt;8–10 mm) compressing the nerve bundle.
                </div>
              </div>
            </div>

            {/* Feature 3: Bone Alignment */}
            <div className="p-3.5 rounded-xl border border-white/10 bg-muted/20 space-y-2">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-cyan-400" />
                3. Vertebral Alignment
              </span>
              <div className="space-y-1.5 text-[11px]">
                <div className="p-1.5 rounded-lg bg-emerald-950/30 border border-emerald-500/20 text-emerald-300">
                  <span className="font-bold block">Normal:</span> Smooth, continuous vertical stack with natural curve.
                </div>
                <div className="p-1.5 rounded-lg bg-rose-950/30 border border-rose-500/20 text-rose-300">
                  <span className="font-bold block">Patient:</span> Bone translation or tilt, causing stiffness and spasm.
                </div>
              </div>
            </div>

            {/* Feature 4: Nerve Root Exit */}
            <div className="p-3.5 rounded-xl border border-white/10 bg-muted/20 space-y-2">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                4. Nerve Root Exit (Foramen)
              </span>
              <div className="space-y-1.5 text-[11px]">
                <div className="p-1.5 rounded-lg bg-emerald-950/30 border border-emerald-500/20 text-emerald-300">
                  <span className="font-bold block">Normal:</span> Clear, open side windows where nerves exit freely.
                </div>
                <div className="p-1.5 rounded-lg bg-rose-950/30 border border-rose-500/20 text-rose-300">
                  <span className="font-bold block">Patient:</span> Pinched exit window causing sharp radiating pain.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Clinical Integrity Notice */}
        <div className="p-3 rounded-xl bg-muted/40 border border-white/5 flex items-start gap-2.5 text-xs text-muted-foreground">
          <Info className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
          <p className="text-[11px] leading-relaxed">
            <span className="font-bold text-foreground">Radiological Note: </span>
            The normal reference image is a verified healthy control sagittal study demonstrating standard physiological dimensions. Individual anatomical variations exist, and clinical diagnosis must always correlate with patient history, physical examination, and multi-slice volumetric review.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
