import React, { useState, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Split,
  Columns,
  CheckCircle2,
  AlertCircle,
  ArrowLeftRight,
  Info,
  Maximize2,
  Layers,
  Sparkles,
  ShieldCheck,
  Stethoscope,
  Heart
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
  const [comparatorMode, setComparatorMode] = useState<"curtain" | "sideBySide">("curtain");
  const [activeModality, setActiveModality] = useState<"MRI" | "X-ray">(
    imageType.toLowerCase().includes("x") ? "X-ray" : "MRI"
  );
  const [curtainPos, setCurtainPos] = useState<number>(50); // percentage 0 - 100
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Reference images copied into client/public/images/
  const normalReferenceUrl =
    activeModality === "MRI"
      ? "/images/normal-spine-mri.png"
      : "/images/normal-spine-xray.png";

  const primaryCondition = results?.primaryFinding?.condition || "Spinal Pathology";
  const primarySeverity = results?.primaryFinding?.severity || "moderate";

  // Dragging interaction for split curtain
  const handleMouseDown = () => setIsDragging(true);
  const handleMouseUp = () => setIsDragging(false);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!isDragging || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
      const percentage = Math.round((x / rect.width) * 100);
      setCurtainPos(percentage);
    },
    [isDragging]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      if (!containerRef.current) return;
      const touch = e.touches[0];
      const rect = containerRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(touch.clientX - rect.left, rect.width));
      const percentage = Math.round((x / rect.width) * 100);
      setCurtainPos(percentage);
    },
    []
  );

  return (
    <Card className={`glass-card border border-white/10 overflow-hidden ${className}`}>
      <CardHeader className="pb-4 border-b border-white/5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <Split className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                Comparative Anatomy: Healthy Normal vs. Patient Study
                <Badge variant="outline" className="bg-indigo-500/10 text-indigo-400 border-indigo-500/20 text-[9px] font-mono">
                  ANATOMICAL_BENCHMARK
                </Badge>
              </CardTitle>
              <CardDescription className="text-xs">
                Inspect pathological divergence side-by-side or drag the split curtain to compare directly against a verified healthy spine
              </CardDescription>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            {/* Modality Selector */}
            <div className="flex rounded-xl p-0.5 bg-muted/60 border border-white/10 text-xs">
              <Button
                size="sm"
                variant={activeModality === "MRI" ? "secondary" : "ghost"}
                className={`h-7 text-xs px-2.5 rounded-lg ${activeModality === "MRI" ? "font-bold shadow-xs" : ""}`}
                onClick={() => setActiveModality("MRI")}
              >
                MRI Reference
              </Button>
              <Button
                size="sm"
                variant={activeModality === "X-ray" ? "secondary" : "ghost"}
                className={`h-7 text-xs px-2.5 rounded-lg ${activeModality === "X-ray" ? "font-bold shadow-xs" : ""}`}
                onClick={() => setActiveModality("X-ray")}
              >
                X-Ray Reference
              </Button>
            </div>

            {/* View Mode */}
            <div className="flex rounded-xl p-0.5 bg-muted/60 border border-white/10 text-xs">
              <Button
                size="sm"
                variant={comparatorMode === "curtain" ? "default" : "ghost"}
                className="h-7 text-xs px-2.5 rounded-lg"
                onClick={() => setComparatorMode("curtain")}
                title="Split Curtain Slider"
              >
                <ArrowLeftRight className="h-3.5 w-3.5 mr-1" /> Curtain
              </Button>
              <Button
                size="sm"
                variant={comparatorMode === "sideBySide" ? "default" : "ghost"}
                className="h-7 text-xs px-2.5 rounded-lg"
                onClick={() => setComparatorMode("sideBySide")}
                title="Side-by-Side View"
              >
                <Columns className="h-3.5 w-3.5 mr-1" /> Side-by-Side
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-5 space-y-6">
        {/* ═══ VIEWPORT AREA ═══ */}
        {comparatorMode === "curtain" ? (
          /* 1. INTERACTIVE SPLIT-SCREEN CURTAIN SLIDER */
          <div className="space-y-3">
            <div className="flex justify-between items-center text-xs px-1">
              <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>HEALTHY NORMAL BASELINE ({curtainPos}%)</span>
              </div>
              <div className="text-[11px] text-muted-foreground font-mono">
                ◄ Drag slider to compare anatomy ►
              </div>
              <div className="flex items-center gap-1.5 text-rose-400 font-semibold">
                <span>PATIENT STUDY ({100 - curtainPos}%)</span>
                <AlertCircle className="h-3.5 w-3.5" />
              </div>
            </div>

            <div
              ref={containerRef}
              className="relative rounded-2xl overflow-hidden border border-white/15 bg-black h-[420px] sm:h-[480px] select-none cursor-ew-resize"
              onMouseDown={handleMouseDown}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onMouseMove={handleMouseMove}
              onTouchMove={handleTouchMove}
            >
              {/* Background Layer: Patient's Study Scan */}
              <div className="absolute inset-0 flex items-center justify-center p-2 bg-slate-950">
                <img
                  src={patientImageUrl}
                  alt="Patient Medical Scan"
                  className="w-full h-full object-contain"
                  draggable={false}
                />
                <div className="absolute top-3 right-3 z-10 px-2.5 py-1 rounded-lg bg-rose-950/80 border border-rose-500/50 text-rose-300 text-[10px] font-mono shadow-lg flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                  PATIENT SCAN ({primaryCondition})
                </div>
              </div>

              {/* Foreground Layer (Clipped to curtainPos): Healthy Normal Reference */}
              <div
                className="absolute inset-0 overflow-hidden flex items-center justify-center p-2 bg-slate-950"
                style={{ width: `${curtainPos}%` }}
              >
                <div className="absolute inset-0 w-full h-full flex items-center justify-center p-2">
                  <img
                    src={normalReferenceUrl}
                    alt="Healthy Normal Reference"
                    className="w-full h-full object-contain"
                    style={{ minWidth: containerRef.current?.clientWidth || "100%" }}
                    draggable={false}
                  />
                </div>
                <div className="absolute top-3 left-3 z-10 px-2.5 py-1 rounded-lg bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-[10px] font-mono shadow-lg flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  HEALTHY NORMAL {activeModality}
                </div>
              </div>

              {/* Draggable Vertical Divider Line */}
              <div
                className="absolute top-0 bottom-0 w-1 bg-white shadow-[0_0_15px_#fff,0_0_30px_#22d3ee] z-20 pointer-events-none"
                style={{ left: `${curtainPos}%` }}
              >
                {/* Central Drag Handle Knob */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white text-slate-900 shadow-2xl flex items-center justify-center border-2 border-slate-900 pointer-events-auto cursor-ew-resize">
                  <ArrowLeftRight className="h-4 w-4" />
                </div>
              </div>
            </div>

            {/* Slider Control for Touch / Accessibility */}
            <div className="flex items-center gap-3 pt-1 px-2">
              <span className="text-[11px] text-muted-foreground whitespace-nowrap">Curtain Position:</span>
              <Slider
                value={[curtainPos]}
                min={5}
                max={95}
                step={1}
                onValueChange={(vals) => setCurtainPos(vals[0])}
                className="flex-1"
              />
              <span className="text-xs font-mono font-bold text-foreground w-12 text-right">{curtainPos}%</span>
            </div>
          </div>
        ) : (
          /* 2. SIDE-BY-SIDE DUAL VIEWPORT */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Left: Healthy Normal Baseline */}
            <div className="relative rounded-2xl overflow-hidden border border-emerald-500/30 bg-slate-950 h-[400px] flex flex-col items-center justify-center p-3">
              <div className="absolute top-3 left-3 z-10 px-2.5 py-1 rounded-lg bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-[10px] font-mono flex items-center gap-1.5">
                <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                HEALTHY NORMAL REFERENCE ({activeModality})
              </div>
              <img
                src={normalReferenceUrl}
                alt="Healthy Normal Reference"
                className="w-full h-full object-contain"
                draggable={false}
              />
              <div className="absolute bottom-3 inset-x-3 p-2 rounded-xl bg-black/75 border border-white/10 text-[10px] text-emerald-300/90 leading-tight">
                ✓ Preserved disc heights • Smooth vertebral lordosis • Wide, patent spinal canal (&gt;12mm)
              </div>
            </div>

            {/* Right: Patient's Diagnostic Scan */}
            <div className="relative rounded-2xl overflow-hidden border border-rose-500/30 bg-slate-950 h-[400px] flex flex-col items-center justify-center p-3">
              <div className="absolute top-3 right-3 z-10 px-2.5 py-1 rounded-lg bg-rose-950/80 border border-rose-500/40 text-rose-300 text-[10px] font-mono flex items-center gap-1.5">
                <AlertCircle className="h-3 w-3 text-rose-400" />
                PATIENT'S STUDY ({primaryCondition.toUpperCase()})
              </div>
              <img
                src={patientImageUrl}
                alt="Patient Study Scan"
                className="w-full h-full object-contain"
                draggable={false}
              />
              <div className="absolute bottom-3 inset-x-3 p-2 rounded-xl bg-black/75 border border-white/10 text-[10px] text-rose-300/90 leading-tight">
                ⚠ Pathological divergence identified • Focus on altered disc compression and canal space
              </div>
            </div>
          </div>
        )}

        {/* ═══ ANATOMICAL DISCREPANCY COMPARISON TABLE ═══ */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center gap-2 text-sm font-bold text-foreground">
            <Stethoscope className="h-4 w-4 text-primary" />
            <span>Key Anatomical Landmarks: What to Look For</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Feature 1: Disc Height */}
            <div className="p-3.5 rounded-xl border border-white/10 bg-muted/20 space-y-2">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-400" />
                1. Disc Cushion Height
              </span>
              <div className="space-y-1.5 text-[11px]">
                <div className="p-1.5 rounded-lg bg-emerald-950/30 border border-emerald-500/20 text-emerald-300">
                  <span className="font-bold block">Normal:</span> Plump, thick cushion (~10–12 mm) providing shock absorption.
                </div>
                <div className="p-1.5 rounded-lg bg-rose-950/30 border border-rose-500/20 text-rose-300">
                  <span className="font-bold block">Patient:</span> Reduced disc height with backward bulge pinching nearby nerves.
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
                  <span className="font-bold block">Normal:</span> Wide, clear tunnel (&gt;12–15 mm) with ample room for spinal fluid.
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
                  <span className="font-bold block">Normal:</span> Smooth, continuous vertical stack with natural inward curve.
                </div>
                <div className="p-1.5 rounded-lg bg-rose-950/30 border border-rose-500/20 text-rose-300">
                  <span className="font-bold block">Patient:</span> Bone slip or tilt, creating uneven mechanical load and stiffness.
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
                  <span className="font-bold block">Normal:</span> Clear, oval side windows where nerves leave the spine freely.
                </div>
                <div className="p-1.5 rounded-lg bg-rose-950/30 border border-rose-500/20 text-rose-300">
                  <span className="font-bold block">Patient:</span> Pinched exit hole causing sharp, tingling, or radiating pain.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Clinical Integrity & Educational Note */}
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
