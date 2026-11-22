import React, { useState, useRef, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import {
  ZoomIn, ZoomOut, RotateCcw, FlipHorizontal, Contrast,
  Ruler, Eye, EyeOff, Info, Layers, Split, SunMedium,
  Maximize2, Minimize2, Check, AlertTriangle, ShieldCheck
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

interface MedicalImageViewerProps {
  imageUrl: string;
  overlayUrl?: string | null;
  imageType?: string;
  metadata?: MedicalImageMetadata | null;
  className?: string;
}

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
  const [contrast, setContrast] = useState<number>(100); // 10% to 300%
  const [brightness, setBrightness] = useState<number>(100); // 10% to 200%
  const [preset, setPreset] = useState<"default" | "bone" | "softTissue">("default");

  // Comparison & Overlay Mode
  const [viewMode, setViewMode] = useState<"original" | "overlay" | "sideBySide">("original");
  const [overlayOpacity, setOverlayOpacity] = useState<number>(65);

  // Caliper Measurement Mode
  const [isMeasuring, setIsMeasuring] = useState<boolean>(false);
  const [caliperPoints, setCaliperPoints] = useState<{ x: number; y: number }[]>([]);
  const [activeMeasurement, setActiveMeasurement] = useState<CaliperMeasurement | null>(null);

  // Canvas & Interaction references
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
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

  // Window/Level presets
  const applyPreset = (type: "default" | "bone" | "softTissue") => {
    setPreset(type);
    if (type === "default") {
      setContrast(100);
      setBrightness(100);
    } else if (type === "bone") {
      setContrast(185);
      setBrightness(115);
    } else if (type === "softTissue") {
      setContrast(140);
      setBrightness(95);
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
  };

  // Mouse wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.15 : 0.85;
    setZoom(prev => Math.min(Math.max(0.3, prev * factor), 7.0));
  };

  // Mouse pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (isMeasuring) {
      handleCaliperClick(e);
      return;
    }
    isDraggingRef.current = true;
    dragStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isMeasuring && caliperPoints.length === 1 && containerRef.current) {
      // Live caliper preview
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

    if (!isDraggingRef.current) return;
    setPan({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y
    });
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  // Caliper measurement click handler
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

  // Render view
  return (
    <Card className={`glass-card border border-white/10 rounded-2xl overflow-hidden shadow-2xl ${className}`}>
      {/* Viewport Top Header & Toolbar */}
      <CardHeader className="py-3 px-4 border-b border-white/5 bg-black/40">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="bg-primary/10 border-primary/20 text-primary font-mono text-[10px]">
              {isDicom ? "DICOM 3.0" : (metadata?.format || "STANDARD RASTER")}
            </Badge>
            <Badge variant="secondary" className="text-[10px] font-mono">
              MODALITY: {metadata?.modality || imageType}
            </Badge>
            {naturalDims.width > 0 && (
              <span className="text-[10px] text-muted-foreground font-mono">
                {naturalDims.width} × {naturalDims.height} px
              </span>
            )}
            {hasPhysicalSpacing && pixelSpacing ? (
              <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-mono">
                SPACING: {pixelSpacing[0]}×{pixelSpacing[1]} mm
              </Badge>
            ) : (
              <Badge variant="outline" className="text-muted-foreground text-[9px] font-mono border-white/10">
                PIXEL-ONLY (NO DICOM SPACING)
              </Badge>
            )}
          </div>

          {/* Quick Tool Action Buttons */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <Button
              size="sm"
              variant="outline"
              className="h-8 px-2.5 text-xs gap-1 border-white/10 hover:bg-white/10"
              onClick={() => setZoom(prev => Math.min(prev * 1.25, 7.0))}
              title="Zoom In"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 px-2.5 text-xs gap-1 border-white/10 hover:bg-white/10"
              onClick={() => setZoom(prev => Math.max(prev * 0.8, 0.3))}
              title="Zoom Out"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="sm"
              variant={isInverted ? "default" : "outline"}
              className="h-8 px-2.5 text-xs gap-1 border-white/10 hover:bg-white/10"
              onClick={() => setIsInverted(!isInverted)}
              title="Invert Grayscale (Negative Contrast)"
            >
              <Contrast className="h-3.5 w-3.5" />
              Invert
            </Button>
            <Button
              size="sm"
              variant={isFlippedH ? "default" : "outline"}
              className="h-8 px-2.5 text-xs gap-1 border-white/10 hover:bg-white/10"
              onClick={() => setIsFlippedH(!isFlippedH)}
              title="Flip Horizontal"
            >
              <FlipHorizontal className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="sm"
              variant={isMeasuring ? "default" : "outline"}
              className={`h-8 px-2.5 text-xs gap-1 border-white/10 ${isMeasuring ? "bg-amber-500 text-black hover:bg-amber-400" : "hover:bg-white/10"}`}
              onClick={() => {
                setIsMeasuring(!isMeasuring);
                setCaliperPoints([]);
              }}
              title="Digital Caliper Distance Measurement"
            >
              <Ruler className="h-3.5 w-3.5" />
              {isMeasuring ? "Measuring..." : "Caliper"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 px-2.5 text-xs gap-1 text-muted-foreground hover:text-foreground"
              onClick={resetViewport}
              title="Reset Viewport (Zoom, Pan & Windowing)"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset
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

        {/* Viewport Canvas Container */}
        <div
          ref={containerRef}
          className={`w-full h-[520px] relative flex items-center justify-center overflow-hidden ${
            isMeasuring ? "cursor-crosshair" : "cursor-grab active:cursor-grabbing"
          }`}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {/* View Mode 1: Single View (Original or Overlay) */}
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

              {/* AI Overlay Layer (Grad-CAM or SCT mask) */}
              {viewMode === "overlay" && overlayUrl && (
                <img
                  src={overlayUrl}
                  alt="AI Diagnostic Overlay"
                  className="absolute inset-0 w-full h-full object-contain pointer-events-none mix-blend-screen"
                  style={{ opacity: overlayOpacity / 100 }}
                  draggable={false}
                />
              )}

              {/* Caliper Measurement Drawing Overlay */}
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
            </div>
          ) : (
            /* View Mode 2: Synchronized Side-by-Side Comparison */
            <div className="w-full h-full flex divide-x divide-white/10">
              {/* Left pane: Original Scan */}
              <div className="w-1/2 h-full relative overflow-hidden flex items-center justify-center p-2 bg-black/60">
                <span className="absolute top-3 left-3 z-20 text-[10px] font-mono bg-black/70 px-2 py-0.5 rounded text-white/70">
                  BASELINE (RAW)
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

              {/* Right pane: AI Heatmap Overlay */}
              <div className="w-1/2 h-full relative overflow-hidden flex items-center justify-center p-2 bg-black/80">
                <span className="absolute top-3 left-3 z-20 text-[10px] font-mono bg-rose-500/20 text-rose-300 border border-rose-500/30 px-2 py-0.5 rounded">
                  AI EXPLAINABILITY OVERLAY
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
                    alt="Original Scan Background"
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

          {/* Caliper Live Readout Badge */}
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
                  ? "Calculated from calibrated DICOM PixelSpacing metadata."
                  : "Raw pixel distance (physical mm requires DICOM PixelSpacing tag)."}
              </div>
            </div>
          )}

          {/* Measuring instruction banner */}
          {isMeasuring && (
            <div className="absolute top-4 left-4 z-30 bg-amber-500/90 text-black font-semibold text-xs px-3 py-1.5 rounded-lg backdrop-blur flex items-center gap-2">
              <Ruler className="h-3.5 w-3.5 animate-pulse" />
              {caliperPoints.length === 0
                ? "Click first point on anatomy"
                : "Click second point to measure distance"}
            </div>
          )}
        </div>

        {/* Viewport Bottom Controls Panel (Windowing, Opacity, Presets) */}
        <div className="p-4 bg-black/60 border-t border-white/5 flex flex-col lg:flex-row items-center justify-between gap-4 text-xs">
          {/* Window / Level (Contrast & Brightness) Sliders */}
          <div className="flex items-center gap-6 w-full lg:w-auto">
            {/* Contrast (Window Width) */}
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

            {/* Brightness (Window Level) */}
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

            {/* Overlay Opacity if overlay available */}
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

          {/* Window Preset Buttons */}
          <div className="flex items-center gap-1.5 self-end lg:self-auto">
            <span className="text-[10px] text-muted-foreground uppercase font-bold mr-1">Presets:</span>
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
          </div>
        </div>
      </CardContent>

      {/* Anatomical Reference & Prototype Disclaimer Footer */}
      <div className="py-2 px-4 bg-muted/20 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between text-[10px] text-muted-foreground gap-2">
        <div className="flex items-center gap-2">
          <Info className="h-3 w-3 text-primary shrink-0" />
          <span>
            {isDicom
              ? "DICOM viewport active: Physical millimeter calibration enabled via native PixelSpacing header."
              : "Standard raster mode (PNG/JPEG): Physical millimeter calibration unavailable without DICOM header. All calipers render in raw pixels (px)."}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge variant="outline" className="text-[9px] border-amber-500/20 text-amber-500 font-mono">
            3D Skeleton: Biomechanical Reference Only
          </Badge>
        </div>
      </div>
    </Card>
  );
}
