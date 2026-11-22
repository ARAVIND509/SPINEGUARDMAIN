import React, { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Activity,
  Cpu,
  Layers,
  Scan as ScanIcon,
  Crosshair,
  Radar,
  Radio,
  Sparkles,
  Zap
} from "lucide-react";

interface PixelScanVisualizerProps {
  imageUrl?: string | null;
  isScanning: boolean;
  progress?: number;
  statusText?: string;
  imageType?: string;
  className?: string;
  showDetails?: boolean;
}

export function PixelScanVisualizer({
  imageUrl,
  isScanning,
  progress = 0,
  statusText = "Analyzing Pixel Arrays & Convolutional Matrices...",
  imageType = "MRI",
  className = "",
  showDetails = true,
}: PixelScanVisualizerProps) {
  const [telemetry, setTelemetry] = useState({
    x: 248,
    y: 312,
    hu: 145,
    snr: 21.8,
    activeKernel: "ResNet-50 Layer4 Conv",
    gradientNorm: "0.842",
  });

  // Dynamic telemetry simulator during scanning
  useEffect(() => {
    if (!isScanning) return;

    const interval = setInterval(() => {
      setTelemetry({
        x: Math.floor(180 + Math.random() * 160),
        y: Math.floor(200 + Math.random() * 240),
        hu: Math.floor(90 + Math.random() * 190),
        snr: +(20 + Math.random() * 4).toFixed(1),
        activeKernel: [
          "ResNet-50 Layer 4 Backprop",
          "3×3 Bilateral Spatial Smoothing",
          "Vertebral Canal Boundary Tensor",
          "Intervertebral Disc Height Matrix",
          "Gradient Attribution Mapping"
        ][Math.floor(Math.random() * 5)],
        gradientNorm: (0.75 + Math.random() * 0.22).toFixed(3),
      });
    }, 450);

    return () => clearInterval(interval);
  }, [isScanning]);

  const stages = [
    { name: "Pixel Normalization", threshold: 20 },
    { name: "Vertebral Segmentation", threshold: 45 },
    { name: "ResNet-50 Tensor Pass", threshold: 75 },
    { name: "Grad-CAM Heatmap Gen", threshold: 95 },
  ];

  return (
    <div
      className={`relative rounded-2xl overflow-hidden border border-cyan-500/30 bg-slate-950 shadow-2xl select-none ${className}`}
      data-testid="pixel-scan-visualizer"
    >
      {/* Background Matrix Grid */}
      <div className="absolute inset-0 bg-grid opacity-30 pointer-events-none" />

      {/* Medical Image Underlay */}
      <div className="relative w-full h-full min-h-[320px] flex items-center justify-center p-3">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt="Scanned Medical Subject"
            className={`w-full h-auto max-h-[440px] object-contain transition-all duration-300 ${
              isScanning ? "contrast-125 brightness-95" : ""
            }`}
            draggable={false}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground gap-3">
            <ScanIcon className="h-12 w-12 text-cyan-500/50 animate-pulse" />
            <p className="text-xs font-mono">STANDBY FOR IMAGING STREAM...</p>
          </div>
        )}

        {/* ═══ ACTIVE SCANNING OVERLAY ═══ */}
        {isScanning && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {/* 1. Sweeping Vertical Laser Beam (Cyan Glow) */}
            <div className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_15px_#22d3ee,0_0_30px_#06b6d4] animate-laser-v">
              {/* Laser Core Node */}
              <div className="absolute left-1/2 -top-1 w-2 h-3 bg-white rounded-full -translate-x-1/2 blur-[1px]" />
            </div>

            {/* 2. Sweeping Horizontal Tracker Line */}
            <div className="absolute top-0 bottom-0 w-[1px] bg-gradient-to-b from-transparent via-cyan-300/40 to-transparent animate-laser-h" />

            {/* 3. Dynamic Animated Sampling Reticles (Simulating pixel inspection) */}
            <div
              className="absolute transition-all duration-300 -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${(telemetry.x / 512) * 100}%`, top: `${(telemetry.y / 512) * 100}%` }}
            >
              {/* Outer Pulsing Reticle */}
              <div className="w-16 h-16 rounded-full border border-cyan-400/60 animate-radar-ping -translate-x-1/2 -translate-y-1/2" />
              {/* Inner Crosshair Target */}
              <div className="relative -translate-x-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center">
                <div className="absolute w-full h-[1px] bg-cyan-400" />
                <div className="absolute h-full w-[1px] bg-cyan-400" />
                <div className="w-3 h-3 border border-cyan-300 rounded-sm bg-cyan-400/20" />
              </div>
              {/* Floating Coordinate Tag */}
              <div className="absolute left-6 -top-3 px-1.5 py-0.5 rounded bg-black/85 border border-cyan-500/60 text-[9px] font-mono text-cyan-300 whitespace-nowrap shadow-lg">
                PX [{telemetry.x}, {telemetry.y}] • {telemetry.hu} HU
              </div>
            </div>

            {/* Secondary Vertebral Column Target Reticle */}
            <div
              className="absolute transition-all duration-500"
              style={{ left: "50%", top: `${40 + (progress % 40)}%` }}
            >
              <div className="w-12 h-6 border-2 border-dashed border-cyan-400/50 rounded -translate-x-1/2 -translate-y-1/2 flex items-center justify-center">
                <span className="text-[8px] font-mono text-cyan-300 bg-black/70 px-1 rounded">
                  ANALYZING
                </span>
              </div>
            </div>

            {/* Corner Viewport Framing Brackets */}
            <div className="absolute top-3 left-3 w-6 h-6 border-t-2 border-l-2 border-cyan-400/70" />
            <div className="absolute top-3 right-3 w-6 h-6 border-t-2 border-r-2 border-cyan-400/70" />
            <div className="absolute bottom-3 left-3 w-6 h-6 border-b-2 border-l-2 border-cyan-400/70" />
            <div className="absolute bottom-3 right-3 w-6 h-6 border-b-2 border-r-2 border-cyan-400/70" />

            {/* Top-Left Live HUD Telemetry */}
            <div className="absolute top-3 left-10 flex flex-col gap-1">
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-black/75 border border-cyan-500/40 text-[9px] font-mono text-cyan-300">
                <Radio className="h-2.5 w-2.5 text-cyan-400 animate-pulse" />
                <span>PIXEL SCAN MATRIX ACTIVE</span>
              </div>
              <div className="text-[8px] font-mono text-cyan-200/80 pl-1">
                FOV: 240mm • MATRIX: 512×512 • SNR: {telemetry.snr}dB
              </div>
            </div>

            {/* Top-Right Active Kernel Indicator */}
            <div className="absolute top-3 right-10 text-right">
              <div className="px-2 py-0.5 rounded bg-black/75 border border-cyan-500/40 text-[9px] font-mono text-cyan-300">
                GRAD_NORM: {telemetry.gradientNorm}
              </div>
              <div className="text-[8px] font-mono text-cyan-400/80 mt-1">
                {telemetry.activeKernel}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ═══ BOTTOM STATUS & PROGRESS TELEMETRY BAR ═══ */}
      {showDetails && (
        <div className="p-3.5 bg-slate-900/90 border-t border-cyan-500/20 backdrop-blur-md space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Cpu className="h-3.5 w-3.5 text-cyan-400 animate-spin" />
              <span className="font-semibold text-slate-200 text-[11px] sm:text-xs">
                {isScanning ? statusText : "Imaging Ingest Complete • Ready for Diagnostic Review"}
              </span>
            </div>
            <div className="flex items-center gap-2 font-mono">
              <Badge
                variant="outline"
                className="bg-cyan-500/10 text-cyan-400 border-cyan-500/30 text-[9px] px-1.5 py-0"
              >
                {imageType} 512×512
              </Badge>
              <span className="text-cyan-400 font-bold text-xs">{progress}%</span>
            </div>
          </div>

          {/* Progress Bar with Cyan Glow */}
          <div className="relative w-full">
            <Progress
              value={progress}
              className="h-2 bg-slate-800 [&>div]:bg-gradient-to-r [&>div]:from-cyan-500 [&>div]:to-blue-600 [&>div]:shadow-[0_0_12px_#06b6d4]"
            />
          </div>

          {/* Analytical Pipeline Stage Checkpoints */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-1">
            {stages.map((stage, idx) => {
              const isDone = progress >= stage.threshold;
              const isCurrent = progress < stage.threshold && (idx === 0 || progress >= stages[idx - 1].threshold);

              return (
                <div
                  key={stage.name}
                  className={`px-2 py-1 rounded text-[9px] font-mono border transition-all ${
                    isDone
                      ? "bg-cyan-950/40 border-cyan-500/40 text-cyan-300"
                      : isCurrent
                      ? "bg-blue-900/30 border-blue-400/60 text-white animate-pulse"
                      : "bg-slate-900/40 border-slate-800 text-slate-500"
                  }`}
                >
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-current" />
                    <span className="truncate">{stage.name}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
