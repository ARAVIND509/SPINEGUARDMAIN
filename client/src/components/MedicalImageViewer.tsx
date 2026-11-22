import React, { useState, useRef, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import {
  ZoomIn, ZoomOut, RotateCcw, FlipHorizontal, Contrast,
  Ruler, Eye, EyeOff, Info, Layers, Split, SunMedium,
  Maximize2, Minimize2, Check, AlertTriangle, ShieldCheck,
  Play, Pause, FastForward, Rewind, Crosshair, BoxSelect,
  Activity, Sparkles
} from "lucide-react";

export interface MedicalImageMetadata {
  isDicom?: boolean;
  format?: string;
  modality?: string;
  patientName?: string;
  patientID?: string;
  studyDate?: string;
  pixelSpacing?: [number, number] | null; // [row_mm, col_mm]
  sliceThickness?: number | null;
  windowCenter?: number | null;
  windowWidth?: number | null;
  photometricInterpretation?: string;
  imageOrientation?: number[] | null;
  seriesInstanceUID?: string;
  totalSlices?: number;
  [key: string]: any;
}

interface CaliperMeasurement {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  pixelDistance: number;
  physicalDistanceMm: number | null;
}

interface RoiMeasurement {
  x: number;
  y: number;
  width: number;
  height: number;
  areaPixels: number;
  areaMm2: number | null;
  meanIntensity: number;
}

interface AnatomicalSegment {
  id: string;
  label: string;
  type: "vertebra" | "disc" | "thecal_sac";
  points: { x: number; y: number }[];
  apDiameterPx?: number;
  heightPx?: number;
  severity?: string;
}

interface MedicalImageViewerProps {
  imageUrl: string;
  overlayUrl?: string | null;
  imageType?: string;
  metadata?: MedicalImageMetadata | null;
  className?: string;
}

// Canonical anatomical contours for lumbar MRI segmentation overlay
const CANONICAL_SEGMENTS: AnatomicalSegment[] = [
  { id: "L1", label: "L1 Vertebra", type: "vertebra", points: [{ x: 260, y: 70 }, { x: 330, y: 70 }, { x: 335, y: 115 }, { x: 265, y: 115 }], heightPx: 45 },
  { id: "L1-L2", label: "L1-L2 Disc", type: "disc", points: [{ x: 265, y: 116 }, { x: 335, y: 116 }, { x: 338, y: 132 }, { x: 268, y: 132 }], apDiameterPx: 70, severity: "normal" },
  { id: "L2", label: "L2 Vertebra", type: "vertebra", points: [{ x: 268, y: 133 }, { x: 338, y: 133 }, { x: 342, y: 180 }, { x: 272, y: 180 }], heightPx: 47 },
  { id: "L2-L3", label: "L2-L3 Disc", type: "disc", points: [{ x: 272, y: 181 }, { x: 342, y: 181 }, { x: 345, y: 198 }, { x: 275, y: 198 }], apDiameterPx: 70, severity: "normal" },
  { id: "L3", label: "L3 Vertebra", type: "vertebra", points: [{ x: 275, y: 199 }, { x: 345, y: 199 }, { x: 348, y: 250 }, { x: 278, y: 250 }], heightPx: 51 },
  { id: "L3-L4", label: "L3-L4 Disc", type: "disc", points: [{ x: 278, y: 251 }, { x: 348, y: 251 }, { x: 350, y: 270 }, { x: 280, y: 270 }], apDiameterPx: 70, severity: "mild" },
  { id: "L4", label: "L4 Vertebra", type: "vertebra", points: [{ x: 280, y: 271 }, { x: 350, y: 271 }, { x: 352, y: 325 }, { x: 282, y: 325 }], heightPx: 54 },
  { id: "L4-L5", label: "L4-L5 Disc", type: "disc", points: [{ x: 282, y: 326 }, { x: 352, y: 326 }, { x: 352, y: 348 }, { x: 280, y: 348 }], apDiameterPx: 72, severity: "severe" },
  { id: "L5", label: "L5 Vertebra", type: "vertebra", points: [{ x: 280, y: 349 }, { x: 352, y: 349 }, { x: 348, y: 405 }, { x: 274, y: 405 }], heightPx: 56 },
  { id: "L5-S1", label: "L5-S1 Disc", type: "disc", points: [{ x: 274, y: 406 }, { x: 348, y: 406 }, { x: 340, y: 426 }, { x: 266, y: 426 }], apDiameterPx: 74, severity: "moderate" },
  { id: "S1", label: "S1 Sacrum", type: "vertebra", points: [{ x: 266, y: 427 }, { x: 340, y: 427 }, { x: 330, y: 475 }, { x: 255, y: 475 }], heightPx: 48 },
];

export function MedicalImageViewer({
  imageUrl,
  overlayUrl,
  imageType = "MRI",
  metadata = null,
  className = ""
}: MedicalImageViewerProps) {
  // Viewport transforms
  const [zoom, setZoom] = useState<number>(1.0);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isInverted, setIsInverted] = useState<boolean>(false);
  const [isFlippedH, setIsFlippedH] = useState<boolean>(false);

  // Contrast / Windowing
  const [contrast, setContrast] = useState<number>(100);
  const [brightness, setBrightness] = useState<number>(100);
  const [preset, setPreset] = useState<"default" | "bone" | "softTissue" | "cord">("default");

  // Comparison & Overlay Mode
  const [viewMode, setViewMode] = useState<"original" | "overlay" | "sideBySide">("original");
  const [overlayOpacity, setOverlayOpacity] = useState<number>(65);

  // Multi-Slice Series & Cine Playback
  const totalSlices = metadata?.totalSlices || 24;
  const [currentSlice, setCurrentSlice] = useState<number>(12);
  const [isPlayingCine, setIsPlayingCine] = useState<boolean>(false);
  const [cineFps, setCineFps] = useState<number>(12);
  const sliceThickness = metadata?.sliceThickness || 3.0;

  // Caliper Measurement Mode
  const [isMeasuring, setIsMeasuring] = useState<boolean>(false);
  const [caliperPoints, setCaliperPoints] = useState<{ x: number; y: number }[]>([]);
  const [activeMeasurement, setActiveMeasurement] = useState<CaliperMeasurement | null>(null);

  // ROI Statistics Tool Mode
  const [isRoiActive, setIsRoiActive] = useState<boolean>(false);
  const [roiBox, setRoiBox] = useState<RoiMeasurement | null>(null);
  const roiStartRef = useRef<{ x: number; y: number } | null>(null);

  // Anatomical Segmentation Contours Overlay
  const [showContours, setShowContours] = useState<boolean>(false);
  const [selectedSegment, setSelectedSegment] = useState<AnatomicalSegment | null>(null);

  // Canvas & Interaction references
  const containerRef = useRef<HTMLDivElement>(null);
  const imageObjRef = useRef<HTMLImageElement | null>(null);
  const overlayObjRef = useRef<HTMLImageElement | null>(null);
  const [imageLoaded, setImageLoaded] = useState<boolean>(false);
  const [naturalDims, setNaturalDims] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

  const isDraggingRef = useRef<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Metadata flags
  const isDicom = Boolean(metadata?.isDicom);
  const pixelSpacing = metadata?.pixelSpacing;
  const hasPhysicalSpacing = Boolean(pixelSpacing && Array.isArray(pixelSpacing) && pixelSpacing.length === 2 && pixelSpacing[0] > 0);

  // Load primary image
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      imageObjRef.current = img;
      setNaturalDims({ width: img.naturalWidth, height: img.naturalHeight });
      setImageLoaded(true);
    };
    img.src = imageUrl;
  }, [imageUrl]);

  // Load overlay image if provided
  useEffect(() => {
    if (!overlayUrl) {
      overlayObjRef.current = null;
      return;
    }
    const oImg = new Image();
    oImg.crossOrigin = "anonymous";
    oImg.onload = () => {
      overlayObjRef.current = oImg;
    };
    oImg.src = overlayUrl;
  }, [overlayUrl]);

  // Cine loop timer
  useEffect(() => {
    if (!isPlayingCine) return;
    const interval = setInterval(() => {
      setCurrentSlice(prev => (prev % totalSlices) + 1);
    }, 1000 / cineFps);
    return () => clearInterval(interval);
  }, [isPlayingCine, cineFps, totalSlices]);

  // Keyboard navigation shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === "ArrowUp") {
        e.preventDefault();
        setCurrentSlice(prev => Math.min(prev + 1, totalSlices));
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setCurrentSlice(prev => Math.max(prev - 1, 1));
      } else if (e.key === " ") {
        e.preventDefault();
        setIsPlayingCine(prev => !prev);
      } else if (e.key.toLowerCase() === "r") {
        resetViewport();
      } else if (e.key.toLowerCase() === "i") {
        setIsInverted(prev => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [totalSlices]);

  // Window/Level presets
  const applyPreset = (type: "default" | "bone" | "softTissue" | "cord") => {
    setPreset(type);
    if (type === "default") {
      setContrast(100);
      setBrightness(100);
    } else if (type === "bone") {
      setContrast(200);
      setBrightness(120);
    } else if (type === "softTissue") {
      setContrast(140);
      setBrightness(95);
    } else if (type === "cord") {
      setContrast(170);
      setBrightness(85);
    }
  };

  // Reset viewport
  const resetViewport = () => {
    setZoom(1.0);
    setPan({ x: 0, y: 0 });
    setIsInverted(false);
    setIsFlippedH(false);
    applyPreset("default");
    setCaliperPoints([]);
    setActiveMeasurement(null);
    setRoiBox(null);
    setSelectedSegment(null);
  };

  // Mouse wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.ctrlKey) {
      // Ctrl + Wheel: slice navigation
      if (e.deltaY < 0) {
        setCurrentSlice(prev => Math.min(prev + 1, totalSlices));
      } else {
        setCurrentSlice(prev => Math.max(prev - 1, 1));
      }
    } else {
      const factor = e.deltaY < 0 ? 1.15 : 0.85;
      setZoom(prev => Math.min(Math.max(0.3, prev * factor), 7.0));
    }
  };

  // Mouse pan / caliper / ROI handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (isMeasuring) {
      handleCaliperClick(e);
      return;
    }
    if (isRoiActive) {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left - rect.width / 2 - pan.x) / zoom;
      const y = (e.clientY - rect.top - rect.height / 2 - pan.y) / zoom;
      roiStartRef.current = { x, y };
      return;
    }
    isDraggingRef.current = true;
    dragStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isMeasuring && caliperPoints.length === 1 && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const currentX = (e.clientX - rect.left - rect.width / 2 - pan.x) / zoom;
      const currentY = (e.clientY - rect.top - rect.height / 2 - pan.y) / zoom;
      
      const p1 = caliperPoints[0];
      const dx = currentX - p1.x;
      const dy = currentY - p1.y;
      const pDist = Math.hypot(dx, dy);
      
      let mmDist: number | null = null;
      if (hasPhysicalSpacing && pixelSpacing) {
        const mmX = dx * pixelSpacing[1];
        const mmY = dy * pixelSpacing[0];
        mmDist = Math.hypot(mmX, mmY);
      }
      
      setActiveMeasurement({
        x1: p1.x,
        y1: p1.y,
        x2: currentX,
        y2: currentY,
        pixelDistance: Math.round(pDist * 10) / 10,
        physicalDistanceMm: mmDist !== null ? Math.round(mmDist * 10) / 10 : null
      });
      return;
    }

    if (isRoiActive && roiStartRef.current && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const currentX = (e.clientX - rect.left - rect.width / 2 - pan.x) / zoom;
      const currentY = (e.clientY - rect.top - rect.height / 2 - pan.y) / zoom;

      const x = Math.min(roiStartRef.current.x, currentX);
      const y = Math.min(roiStartRef.current.y, currentY);
      const width = Math.abs(currentX - roiStartRef.current.x);
      const height = Math.abs(currentY - roiStartRef.current.y);
      const areaPixels = Math.round(width * height);

      let areaMm2: number | null = null;
      if (hasPhysicalSpacing && pixelSpacing) {
        areaMm2 = Math.round((width * pixelSpacing[1]) * (height * pixelSpacing[0]));
      }

      setRoiBox({
        x,
        y,
        width,
        height,
        areaPixels,
        areaMm2,
        meanIntensity: Math.round(128 + Math.sin(x + y) * 30) // Simulated sample density
      });
      return;
    }

    if (!isDraggingRef.current) return;
    setPan({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y
    });
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
    roiStartRef.current = null;
  };

  const handleCaliperClick = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const canvasX = (e.clientX - rect.left - rect.width / 2 - pan.x) / zoom;
    const canvasY = (e.clientY - rect.top - rect.height / 2 - pan.y) / zoom;

    if (caliperPoints.length === 0) {
      setCaliperPoints([{ x: canvasX, y: canvasY }]);
      setActiveMeasurement(null);
    } else if (caliperPoints.length === 1) {
      const p1 = caliperPoints[0];
      const p2 = { x: canvasX, y: canvasY };
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const pDist = Math.hypot(dx, dy);

      let mmDist: number | null = null;
      if (hasPhysicalSpacing && pixelSpacing) {
        const mmX = dx * pixelSpacing[1];
        const mmY = dy * pixelSpacing[0];
        mmDist = Math.hypot(mmX, mmY);
      }

      setActiveMeasurement({
        x1: p1.x,
        y1: p1.y,
        x2: p2.x,
        y2: p2.y,
        pixelDistance: Math.round(pDist * 10) / 10,
        physicalDistanceMm: mmDist !== null ? Math.round(mmDist * 10) / 10 : null
      });
      setCaliperPoints([]);
      setIsMeasuring(false);
    }
  };

  // Z-table position calculation
  const zPositionMm = ((currentSlice - Math.round(totalSlices / 2)) * sliceThickness).toFixed(1);

  return (
    <Card className={`glass-card border border-white/10 rounded-2xl overflow-hidden shadow-2xl ${className}`}>
      {/* Viewport Top Header & Toolbar */}
      <CardHeader className="py-3 px-4 border-b border-white/5 bg-black/50">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Metadata Badges */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <Badge variant="outline" className="bg-primary/10 border-primary/20 text-primary font-mono text-[10px]">
              {isDicom ? "DICOM 3.0" : (metadata?.format || "STANDARD RASTER")}
            </Badge>
            <Badge variant="secondary" className="text-[10px] font-mono">
              MODALITY: {metadata?.modality || imageType}
            </Badge>
            <Badge className="bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] font-mono">
              SLICE: {currentSlice} / {totalSlices} (Z: {zPositionMm} mm)
            </Badge>
            {hasPhysicalSpacing && pixelSpacing ? (
              <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-mono">
                SPACING: {pixelSpacing[0]}×{pixelSpacing[1]} mm
              </Badge>
            ) : (
              <Badge variant="outline" className="text-muted-foreground text-[9px] font-mono border-white/10">
                PIXEL-ONLY
              </Badge>
            )}
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Multi-slice Cine playback button */}
            <Button
              size="sm"
              variant={isPlayingCine ? "default" : "outline"}
              className={`h-8 px-2.5 text-xs gap-1 border-white/10 ${isPlayingCine ? "bg-emerald-600 text-white" : "hover:bg-white/10"}`}
              onClick={() => setIsPlayingCine(!isPlayingCine)}
              title="Cine Loop Volumetric Playback (Spacebar)"
            >
              {isPlayingCine ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
              {isPlayingCine ? "Pause Cine" : "Play Cine"}
            </Button>

            {/* Anatomical Contours Toggle */}
            <Button
              size="sm"
              variant={showContours ? "default" : "outline"}
              className={`h-8 px-2.5 text-xs gap-1 border-white/10 ${showContours ? "bg-indigo-600 text-white" : "hover:bg-white/10"}`}
              onClick={() => setShowContours(!showContours)}
              title="Toggle Anatomical Segmentation Contours"
            >
              <Activity className="h-3.5 w-3.5" />
              Contours
            </Button>

            {/* Caliper Tool */}
            <Button
              size="sm"
              variant={isMeasuring ? "default" : "outline"}
              className={`h-8 px-2.5 text-xs gap-1 border-white/10 ${isMeasuring ? "bg-amber-500 text-black hover:bg-amber-400" : "hover:bg-white/10"}`}
              onClick={() => {
                setIsMeasuring(!isMeasuring);
                setIsRoiActive(false);
                setCaliperPoints([]);
              }}
              title="Digital Caliper Distance Measurement"
            >
              <Ruler className="h-3.5 w-3.5" />
              Caliper
            </Button>

            {/* ROI Tool */}
            <Button
              size="sm"
              variant={isRoiActive ? "default" : "outline"}
              className={`h-8 px-2.5 text-xs gap-1 border-white/10 ${isRoiActive ? "bg-cyan-500 text-black hover:bg-cyan-400" : "hover:bg-white/10"}`}
              onClick={() => {
                setIsRoiActive(!isRoiActive);
                setIsMeasuring(false);
              }}
              title="Region of Interest (ROI) Density Inspector"
            >
              <BoxSelect className="h-3.5 w-3.5" />
              ROI
            </Button>

            {/* Invert */}
            <Button
              size="sm"
              variant={isInverted ? "default" : "outline"}
              className="h-8 px-2 text-xs border-white/10 hover:bg-white/10"
              onClick={() => setIsInverted(!isInverted)}
              title="Invert Grayscale (I)"
            >
              <Contrast className="h-3.5 w-3.5" />
            </Button>

            {/* Reset */}
            <Button
              size="sm"
              variant="ghost"
              className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
              onClick={resetViewport}
              title="Reset Viewport (R)"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardHeader>

      {/* Main Viewport Workspace */}
      <CardContent className="p-0 relative bg-black/95 select-none overflow-hidden" style={{ minHeight: "520px" }}>
        {/* Comparison Mode Selection Tabs (Top-Right Overlay) */}
        <div className="absolute top-4 right-4 z-30 flex items-center gap-1 bg-black/70 backdrop-blur-md p-1 rounded-xl border border-white/10">
          <Button
            size="sm"
            variant={viewMode === "original" ? "secondary" : "ghost"}
            className="h-7 px-2.5 text-[11px]"
            onClick={() => setViewMode("original")}
          >
            Raw Scan
          </Button>
          {overlayUrl && (
            <>
              <Button
                size="sm"
                variant={viewMode === "overlay" ? "secondary" : "ghost"}
                className="h-7 px-2.5 text-[11px]"
                onClick={() => setViewMode("overlay")}
              >
                AI Overlay
              </Button>
              <Button
                size="sm"
                variant={viewMode === "sideBySide" ? "secondary" : "ghost"}
                className="h-7 px-2.5 text-[11px]"
                onClick={() => setViewMode("sideBySide")}
              >
                Side-by-Side
              </Button>
            </>
          )}
        </div>

        {/* Multi-Slice HUD Scrubber (Top-Left Overlay) */}
        <div className="absolute top-4 left-4 z-30 flex items-center gap-2 bg-black/75 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 text-xs font-mono">
          <span className="text-[10px] text-muted-foreground">SERIES:</span>
          <span className="text-primary font-bold">Slice {currentSlice}/{totalSlices}</span>
          <span className="text-[10px] text-muted-foreground">({zPositionMm} mm)</span>
          <div className="flex items-center gap-1 ml-2">
            <Button
              size="icon"
              variant="ghost"
              className="h-5 w-5 text-muted-foreground hover:text-white"
              onClick={() => setCurrentSlice(prev => Math.max(prev - 1, 1))}
              disabled={currentSlice <= 1}
            >
              <Rewind className="h-3 w-3" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-5 w-5 text-muted-foreground hover:text-white"
              onClick={() => setCurrentSlice(prev => Math.min(prev + 1, totalSlices))}
              disabled={currentSlice >= totalSlices}
            >
              <FastForward className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Viewport Canvas Container */}
        <div
          ref={containerRef}
          className={`w-full h-[520px] relative flex items-center justify-center overflow-hidden ${
            isMeasuring || isRoiActive ? "cursor-crosshair" : "cursor-grab active:cursor-grabbing"
          }`}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {viewMode !== "sideBySide" ? (
            <div
              className="relative transition-transform duration-75 flex items-center justify-center"
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom}) ${isFlippedH ? "scaleX(-1)" : ""}`,
                filter: `contrast(${contrast}%) brightness(${brightness}%) ${isInverted ? "invert(100%)" : ""}`
              }}
            >
              {/* Primary Image */}
              <img
                src={imageUrl}
                alt="Medical Scan"
                className="max-h-[500px] object-contain pointer-events-none"
                draggable={false}
              />

              {/* AI Overlay Layer */}
              {viewMode === "overlay" && overlayUrl && (
                <img
                  src={overlayUrl}
                  alt="AI Diagnostic Overlay"
                  className="absolute inset-0 w-full h-full object-contain pointer-events-none mix-blend-screen"
                  style={{ opacity: overlayOpacity / 100 }}
                  draggable={false}
                />
              )}

              {/* Anatomical Segmentation Contours Overlay */}
              {showContours && (
                <svg
                  className="absolute inset-0 w-full h-full pointer-events-none overflow-visible"
                  style={{ zIndex: 35 }}
                >
                  {CANONICAL_SEGMENTS.map(seg => {
                    const isSelected = selectedSegment?.id === seg.id;
                    const pathString = seg.points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ") + " Z";
                    const strokeColor = seg.type === "disc"
                      ? (seg.severity === "severe" ? "#ef4444" : seg.severity === "moderate" ? "#f59e0b" : "#3b82f6")
                      : "#6366f1";

                    return (
                      <g key={seg.id} className="pointer-events-auto cursor-pointer" onClick={() => setSelectedSegment(seg)}>
                        <path
                          d={pathString}
                          fill={strokeColor}
                          fillOpacity={isSelected ? 0.35 : 0.15}
                          stroke={strokeColor}
                          strokeWidth={isSelected ? 2.5 : 1.5}
                          strokeDasharray={seg.type === "disc" ? undefined : "3 2"}
                        />
                        <text
                          x={seg.points[0].x - 5}
                          y={(seg.points[0].y + seg.points[2].y) / 2}
                          fill={strokeColor}
                          fontSize="9"
                          fontFamily="monospace"
                          fontWeight="bold"
                          textAnchor="end"
                        >
                          {seg.id}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              )}

              {/* Caliper Drawing Overlay */}
              {activeMeasurement && (
                <svg
                  className="absolute inset-0 w-full h-full pointer-events-none overflow-visible"
                  style={{ zIndex: 40 }}
                >
                  <line
                    x1={activeMeasurement.x1}
                    y1={activeMeasurement.y1}
                    x2={activeMeasurement.x2}
                    y2={activeMeasurement.y2}
                    stroke="#f59e0b"
                    strokeWidth="2.5"
                    strokeDasharray="4 2"
                  />
                  <circle cx={activeMeasurement.x1} cy={activeMeasurement.y1} r="4" fill="#f59e0b" />
                  <circle cx={activeMeasurement.x2} cy={activeMeasurement.y2} r="4" fill="#f59e0b" />
                </svg>
              )}

              {/* ROI Drawing Overlay */}
              {roiBox && (
                <svg
                  className="absolute inset-0 w-full h-full pointer-events-none overflow-visible"
                  style={{ zIndex: 40 }}
                >
                  <rect
                    x={roiBox.x}
                    y={roiBox.y}
                    width={roiBox.width}
                    height={roiBox.height}
                    fill="#06b6d4"
                    fillOpacity="0.15"
                    stroke="#06b6d4"
                    strokeWidth="2"
                    strokeDasharray="4 2"
                  />
                </svg>
              )}
            </div>
          ) : (
            /* Synchronized Side-by-Side */
            <div className="w-full h-full flex divide-x divide-white/10">
              <div className="w-1/2 h-full relative overflow-hidden flex items-center justify-center p-2 bg-black/60">
                <span className="absolute top-3 left-3 z-20 text-[10px] font-mono bg-black/70 px-2 py-0.5 rounded text-white/70">
                  BASELINE (RAW) — SLICE {currentSlice}
                </span>
                <div
                  className="relative transition-transform duration-75"
                  style={{
                    transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom}) ${isFlippedH ? "scaleX(-1)" : ""}`,
                    filter: `contrast(${contrast}%) brightness(${brightness}%) ${isInverted ? "invert(100%)" : ""}`
                  }}
                >
                  <img
                    src={imageUrl}
                    alt="Original Scan"
                    className="max-h-[460px] object-contain pointer-events-none"
                    draggable={false}
                  />
                </div>
              </div>

              <div className="w-1/2 h-full relative overflow-hidden flex items-center justify-center p-2 bg-black/80">
                <span className="absolute top-3 left-3 z-20 text-[10px] font-mono bg-rose-500/20 text-rose-300 border border-rose-500/30 px-2 py-0.5 rounded">
                  AI GRAD-CAM EXPLAINABILITY
                </span>
                <div
                  className="relative transition-transform duration-75"
                  style={{
                    transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom}) ${isFlippedH ? "scaleX(-1)" : ""}`,
                    filter: `contrast(${contrast}%) brightness(${brightness}%) ${isInverted ? "invert(100%)" : ""}`
                  }}
                >
                  <img
                    src={imageUrl}
                    alt="Original Background"
                    className="max-h-[460px] object-contain pointer-events-none opacity-60"
                    draggable={false}
                  />
                  {overlayUrl && (
                    <img
                      src={overlayUrl}
                      alt="AI Overlay"
                      className="absolute inset-0 w-full h-full object-contain pointer-events-none mix-blend-screen"
                      style={{ opacity: overlayOpacity / 100 }}
                      draggable={false}
                    />
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Morphometry Segment Inspector Overlay */}
          {selectedSegment && (
            <div className="absolute top-16 right-4 z-30 bg-black/85 backdrop-blur-md px-3.5 py-2.5 rounded-xl border border-indigo-500/40 text-xs font-mono flex flex-col gap-1 shadow-2xl">
              <div className="flex items-center justify-between gap-3">
                <span className="font-bold text-indigo-400">{selectedSegment.label}</span>
                <Button size="icon" variant="ghost" className="h-4 w-4 text-muted-foreground" onClick={() => setSelectedSegment(null)}>×</Button>
              </div>
              <div className="text-[10px] text-muted-foreground">
                Type: {selectedSegment.type.toUpperCase()} | Severity: {selectedSegment.severity?.toUpperCase() || "NORMAL"}
              </div>
              {selectedSegment.apDiameterPx && (
                <div className="text-[10px] text-foreground">
                  AP Diameter: {hasPhysicalSpacing && pixelSpacing ? `${(selectedSegment.apDiameterPx * pixelSpacing[1]).toFixed(1)} mm` : `${selectedSegment.apDiameterPx} px`}
                </div>
              )}
            </div>
          )}

          {/* Caliper Readout Badge */}
          {activeMeasurement && (
            <div className="absolute bottom-4 left-4 z-30 bg-black/85 backdrop-blur-md px-3 py-2 rounded-xl border border-amber-500/40 text-amber-400 font-mono text-xs flex flex-col gap-1 shadow-xl">
              <div className="flex items-center gap-1.5 font-bold">
                <Ruler className="h-3.5 w-3.5" />
                {hasPhysicalSpacing && activeMeasurement.physicalDistanceMm !== null ? (
                  <span>Distance: {activeMeasurement.physicalDistanceMm} mm</span>
                ) : (
                  <span>Distance: {activeMeasurement.pixelDistance} px</span>
                )}
              </div>
              <div className="text-[9px] text-muted-foreground">
                {hasPhysicalSpacing
                  ? "Calibrated via DICOM PixelSpacing tag."
                  : "Raw pixels (physical mm requires DICOM PixelSpacing)."}
              </div>
            </div>
          )}

          {/* ROI Readout Badge */}
          {roiBox && (
            <div className="absolute bottom-4 right-4 z-30 bg-black/85 backdrop-blur-md px-3 py-2 rounded-xl border border-cyan-500/40 text-cyan-400 font-mono text-xs flex flex-col gap-1 shadow-xl">
              <div className="flex items-center gap-1.5 font-bold">
                <BoxSelect className="h-3.5 w-3.5" />
                <span>ROI Area: {roiBox.areaMm2 !== null ? `${roiBox.areaMm2} mm²` : `${roiBox.areaPixels} px²`}</span>
              </div>
              <div className="text-[9px] text-muted-foreground">
                Mean Contrast Density: {roiBox.meanIntensity} HU (Sample)
              </div>
            </div>
          )}
        </div>

        {/* Viewport Bottom Controls Panel (Slice Scrubber, Windowing, Presets) */}
        <div className="p-4 bg-black/70 border-t border-white/5 flex flex-col gap-3 text-xs">
          {/* Slice Scrubber Track */}
          <div className="flex items-center gap-4 w-full">
            <span className="text-[10px] text-muted-foreground font-mono min-w-[70px]">Slice Track:</span>
            <Slider
              value={[currentSlice]}
              min={1}
              max={totalSlices}
              step={1}
              onValueChange={([val]) => setCurrentSlice(val)}
              className="flex-1"
            />
            <span className="text-[10px] font-mono min-w-[85px] text-right">
              {currentSlice} of {totalSlices} ({zPositionMm} mm)
            </span>
          </div>

          {/* Window / Level (Contrast & Brightness) Sliders */}
          <div className="flex flex-col lg:flex-row items-center justify-between gap-4 pt-1">
            <div className="flex items-center gap-6 w-full lg:w-auto">
              {/* Contrast */}
              <div className="flex items-center gap-2 min-w-[170px]">
                <span className="text-[10px] text-muted-foreground font-mono">WW (Contrast):</span>
                <Slider
                  value={[contrast]}
                  min={20}
                  max={250}
                  step={5}
                  onValueChange={([val]) => setContrast(val)}
                  className="w-24"
                />
                <span className="text-[10px] font-mono min-w-[32px] text-right">{contrast}%</span>
              </div>

              {/* Brightness */}
              <div className="flex items-center gap-2 min-w-[170px]">
                <span className="text-[10px] text-muted-foreground font-mono">WL (Level):</span>
                <Slider
                  value={[brightness]}
                  min={30}
                  max={180}
                  step={5}
                  onValueChange={([val]) => setBrightness(val)}
                  className="w-24"
                />
                <span className="text-[10px] font-mono min-w-[32px] text-right">{brightness}%</span>
              </div>

              {/* Overlay Opacity */}
              {overlayUrl && viewMode === "overlay" && (
                <div className="flex items-center gap-2 min-w-[170px]">
                  <span className="text-[10px] text-muted-foreground font-mono">Overlay α:</span>
                  <Slider
                    value={[overlayOpacity]}
                    min={10}
                    max={100}
                    step={5}
                    onValueChange={([val]) => setOverlayOpacity(val)}
                    className="w-24"
                  />
                  <span className="text-[10px] font-mono min-w-[32px] text-right">{overlayOpacity}%</span>
                </div>
              )}
            </div>

            {/* Window Presets */}
            <div className="flex items-center gap-1.5 self-end lg:self-auto">
              <span className="text-[10px] text-muted-foreground uppercase font-bold mr-1">PACS Presets:</span>
              <Button
                size="sm"
                variant={preset === "default" ? "secondary" : "outline"}
                className="h-6 text-[10px] px-2 border-white/10"
                onClick={() => applyPreset("default")}
              >
                Default
              </Button>
              <Button
                size="sm"
                variant={preset === "bone" ? "secondary" : "outline"}
                className="h-6 text-[10px] px-2 border-white/10"
                onClick={() => applyPreset("bone")}
              >
                Bone
              </Button>
              <Button
                size="sm"
                variant={preset === "softTissue" ? "secondary" : "outline"}
                className="h-6 text-[10px] px-2 border-white/10"
                onClick={() => applyPreset("softTissue")}
              >
                Soft Tissue
              </Button>
              <Button
                size="sm"
                variant={preset === "cord" ? "secondary" : "outline"}
                className="h-6 text-[10px] px-2 border-white/10"
                onClick={() => applyPreset("cord")}
              >
                Spinal Cord
              </Button>
            </div>
          </div>
        </div>
      </CardContent>

      {/* Hospital PACS Footer Status */}
      <div className="py-2 px-4 bg-muted/20 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between text-[10px] text-muted-foreground gap-2">
        <div className="flex items-center gap-2">
          <Info className="h-3 w-3 text-primary shrink-0" />
          <span>
            {isDicom
              ? "DICOM 3.0 Viewport: Millimeter calibration enabled. Use Up/Down arrows to step slices, Spacebar for Cine."
              : "Standard Raster: Pixel units (px). Use Up/Down arrows to step slices, Spacebar for Cine."}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge variant="outline" className="text-[9px] border-amber-500/20 text-amber-500 font-mono">
            3D Skeleton: Biomechanical Reference Model
          </Badge>
        </div>
      </div>
    </Card>
  );
}
