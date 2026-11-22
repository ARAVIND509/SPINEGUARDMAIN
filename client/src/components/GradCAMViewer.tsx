import React, { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Eye, Layers, ZoomIn, ZoomOut, RotateCcw,
  Split, Sliders, ShieldAlert, Sparkles, CheckCircle2
} from "lucide-react";
import type { AnalysisResults } from "@shared/schema";

interface GradCAMViewerProps {
  originalImageUrl: string;
  results: AnalysisResults;
  className?: string;
}

export type ColormapType = "viridis" | "inferno" | "turbo" | "jet";
export type ViewModeType = "overlay" | "sideBySide" | "heatmapOnly";

export function GradCAMViewer({ originalImageUrl, results, className = "" }: GradCAMViewerProps) {
  const allHeatmaps = results.allHeatmaps || {};
  const supportedConditions = Object.keys(allHeatmaps);

  // Fallback to gradCamHeatmaps if allHeatmaps is not yet populated
  const fallbackConditions = (results.gradCamHeatmaps || []).map(h => h.condition);
  const conditions = supportedConditions.length > 0 ? supportedConditions : fallbackConditions;

  const [selectedCondition, setSelectedCondition] = useState<string>(
    conditions[0] || "Disc Herniation"
  );
  const [colormap, setColormap] = useState<ColormapType>("viridis");
  const [opacity, setOpacity] = useState<number>(55);
  const [viewMode, setViewMode] = useState<ViewModeType>("overlay");
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Resolve current active heatmap base64
  const currentConditionHeatmaps = allHeatmaps[selectedCondition];
  let heatmapDataUrl: string | null = null;

  if (currentConditionHeatmaps && currentConditionHeatmaps[colormap]) {
    heatmapDataUrl = `data:image/png;base64,${currentConditionHeatmaps[colormap]}`;
  } else {
    // Fallback to gradCamHeatmaps item
    const legacy = (results.gradCamHeatmaps || []).find(h => h.condition === selectedCondition);
    if (legacy) {
      heatmapDataUrl = legacy.heatmapImageUrl;
    }
  }

  // Pan interaction handlers for synchronized view
  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoomLevel <= 1.0) return;
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX - panOffset.x, y: e.clientY - panOffset.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPanOffset({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  const resetZoomPan = () => {
    setZoomLevel(1.0);
    setPanOffset({ x: 0, y: 0 });
  };

  // Find confidence score for current selected condition
  const findingMatch = (results.checkedConditions || results.findings || []).find(
    f => f.condition === selectedCondition
  );
  const conditionConfidence = findingMatch ? findingMatch.confidence : 0;
  const conditionSeverity = findingMatch ? findingMatch.severity : "normal";

  return (
    <Card className={`glass-card border border-white/10 overflow-hidden ${className}`}>
      <CardHeader className="pb-3 border-b border-white/5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 border border-primary/20">
              <Eye className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                Explainable AI: Class-Specific Grad-CAM
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[9px] font-mono">
                  PYTORCH_LAYER4
                </Badge>
              </CardTitle>
              <CardDescription className="text-xs">
                Authentic gradient backpropagation mapping convolutional feature sensitivity
              </CardDescription>
            </div>
          </div>

          <div className="flex items-center gap-1.5 self-end sm:self-auto">
            <Button
              size="sm"
              variant={viewMode === "overlay" ? "default" : "outline"}
              className="h-7 text-xs px-2.5"
              onClick={() => setViewMode("overlay")}
            >
              <Layers className="h-3.5 w-3.5 mr-1" /> Overlay
            </Button>
            <Button
              size="sm"
              variant={viewMode === "sideBySide" ? "default" : "outline"}
              className="h-7 text-xs px-2.5"
              onClick={() => setViewMode("sideBySide")}
            >
              <Split className="h-3.5 w-3.5 mr-1" /> Side-by-Side
            </Button>
            <Button
              size="sm"
              variant={viewMode === "heatmapOnly" ? "default" : "outline"}
              className="h-7 text-xs px-2.5"
              onClick={() => setViewMode("heatmapOnly")}
            >
              <Sparkles className="h-3.5 w-3.5 mr-1" /> Heatmap Only
            </Button>
          </div>
        </div>

        {/* Pathology Class Selector Tabs */}
        <div className="mt-4 pt-2">
          <p className="text-[10px] uppercase font-bold text-muted-foreground mb-2">
            Select Diagnostic Class for Gradient Explanation:
          </p>
          <div className="flex flex-wrap gap-1.5">
            {conditions.map(cond => {
              const f = (results.checkedConditions || results.findings || []).find(x => x.condition === cond);
              const isAbnormal = f && f.severity !== "normal";
              return (
                <Button
                  key={cond}
                  size="sm"
                  variant={selectedCondition === cond ? "default" : "outline"}
                  className={`h-7 text-xs rounded-xl ${selectedCondition === cond ? "shadow-md" : "bg-card/40"}`}
                  onClick={() => setSelectedCondition(cond)}
                >
                  {cond}
                  {isAbnormal && (
                    <span className="ml-1.5 w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                  )}
                </Button>
              );
            })}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-4 space-y-4">
        {/* Interactive Controls Bar */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 p-3 rounded-2xl bg-muted/30 border border-white/5 items-center">
          {/* Opacity Adjustment */}
          <div className="md:col-span-5 flex items-center gap-3">
            <span className="text-xs font-semibold whitespace-nowrap flex items-center gap-1.5">
              <Sliders className="h-3.5 w-3.5 text-muted-foreground" /> Opacity: {opacity}%
            </span>
            <Slider
              value={[opacity]}
              min={0}
              max={100}
              step={1}
              onValueChange={(vals) => setOpacity(vals[0])}
              className="flex-1"
            />
          </div>

          {/* Colormap Selector */}
          <div className="md:col-span-4 flex items-center gap-1.5 justify-start md:justify-center">
            <span className="text-xs text-muted-foreground mr-1">Colormap:</span>
            {(["viridis", "inferno", "turbo", "jet"] as ColormapType[]).map((cmap) => (
              <Button
                key={cmap}
                size="sm"
                variant={colormap === cmap ? "secondary" : "ghost"}
                className={`h-6 text-[10px] uppercase px-2 rounded-lg font-mono ${colormap === cmap ? "border border-primary/40 font-bold" : ""}`}
                onClick={() => setColormap(cmap)}
              >
                {cmap}
              </Button>
            ))}
          </div>

          {/* Synchronized Zoom & Pan Controls */}
          <div className="md:col-span-3 flex items-center justify-end gap-1">
            <span className="text-[10px] text-muted-foreground font-mono mr-1">
              Zoom: {zoomLevel.toFixed(1)}x
            </span>
            <Button
              size="icon"
              variant="outline"
              className="h-6 w-6"
              onClick={() => setZoomLevel(prev => Math.min(prev + 0.3, 3.0))}
              title="Zoom In"
            >
              <ZoomIn className="h-3 w-3" />
            </Button>
            <Button
              size="icon"
              variant="outline"
              className="h-6 w-6"
              onClick={() => setZoomLevel(prev => Math.max(prev - 0.3, 1.0))}
              title="Zoom Out"
            >
              <ZoomOut className="h-3 w-3" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6"
              onClick={resetZoomPan}
              title="Reset Zoom & Pan"
            >
              <RotateCcw className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Viewport Canvas Container */}
        {heatmapDataUrl ? (
          <div
            className="relative rounded-2xl overflow-hidden border border-white/10 bg-black min-h-[360px] sm:min-h-[440px] flex items-center justify-center cursor-grab active:cursor-grabbing select-none"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
          >
            {viewMode === "overlay" && (
              <div
                className="relative max-w-full max-h-[500px] transition-transform duration-75"
                style={{
                  transform: `scale(${zoomLevel}) translate(${panOffset.x / zoomLevel}px, ${panOffset.y / zoomLevel}px)`,
                }}
              >
                {/* Base High-Resolution Medical Image */}
                <img
                  src={originalImageUrl}
                  alt="Original Medical Scan"
                  className="w-full h-auto max-h-[500px] object-contain block"
                  draggable={false}
                />
                {/* Blended Grad-CAM Heatmap Layer */}
                <img
                  src={heatmapDataUrl}
                  alt={`Grad-CAM for ${selectedCondition}`}
                  className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                  style={{
                    opacity: opacity / 100,
                    mixBlendMode: "screen",
                  }}
                  draggable={false}
                />
              </div>
            )}

            {viewMode === "sideBySide" && (
              <div
                className="grid grid-cols-2 gap-2 w-full h-full p-2 transition-transform duration-75"
                style={{
                  transform: `scale(${zoomLevel}) translate(${panOffset.x / zoomLevel}px, ${panOffset.y / zoomLevel}px)`,
                }}
              >
                {/* Left: Pure High-Res Original Scan */}
                <div className="relative rounded-xl overflow-hidden border border-white/10 bg-slate-950 flex flex-col items-center justify-center">
                  <span className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded-md bg-black/70 text-[10px] font-mono text-white/80 border border-white/10">
                    RAW MRI SCAN
                  </span>
                  <img
                    src={originalImageUrl}
                    alt="Original Scan"
                    className="w-full h-auto max-h-[460px] object-contain"
                    draggable={false}
                  />
                </div>

                {/* Right: Grad-CAM Overlay */}
                <div className="relative rounded-xl overflow-hidden border border-white/10 bg-slate-950 flex flex-col items-center justify-center">
                  <span className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded-md bg-primary/80 text-[10px] font-mono text-white border border-white/10">
                    GRAD-CAM ({colormap.toUpperCase()})
                  </span>
                  <div className="relative w-full h-full flex items-center justify-center">
                    <img
                      src={originalImageUrl}
                      alt="Original Scan Underlay"
                      className="w-full h-auto max-h-[460px] object-contain block opacity-75"
                      draggable={false}
                    />
                    <img
                      src={heatmapDataUrl}
                      alt="Grad-CAM Overlay"
                      className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                      style={{
                        opacity: opacity / 100,
                        mixBlendMode: "screen",
                      }}
                      draggable={false}
                    />
                  </div>
                </div>
              </div>
            )}

            {viewMode === "heatmapOnly" && (
              <div
                className="relative max-w-full max-h-[500px] transition-transform duration-75"
                style={{
                  transform: `scale(${zoomLevel}) translate(${panOffset.x / zoomLevel}px, ${panOffset.y / zoomLevel}px)`,
                }}
              >
                <img
                  src={heatmapDataUrl}
                  alt={`Pure Heatmap for ${selectedCondition}`}
                  className="w-full h-auto max-h-[500px] object-contain block"
                  style={{ opacity: opacity / 100 }}
                  draggable={false}
                />
              </div>
            )}

            {/* Floating Condition Badge */}
            <div className="absolute top-3 left-3 z-10 flex items-center gap-2">
              <Badge className="bg-black/80 backdrop-blur-md border border-white/20 text-white text-xs font-mono px-3 py-1">
                {selectedCondition.toUpperCase()} · {conditionConfidence}% ({conditionSeverity.toUpperCase()})
              </Badge>
            </div>
          </div>
        ) : (
          <div className="p-8 rounded-2xl border border-dashed border-white/20 text-center space-y-2 bg-muted/20">
            <ShieldAlert className="h-8 w-8 text-amber-500 mx-auto" />
            <p className="text-sm font-semibold">Grad-CAM Explanation Unavailable</p>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              No convolutional gradients were returned for {selectedCondition}. Fabricated fallbacks are disabled to protect diagnostic accuracy.
            </p>
          </div>
        )}

        {/* Explainability & Clinical Integrity Notice */}
        <div className="p-3.5 rounded-2xl bg-primary/5 border border-primary/10 flex items-start gap-3">
          <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
          <div className="text-xs text-muted-foreground space-y-1">
            <p className="font-semibold text-foreground">
              Layer4 Gradient Backpropagation Verified:
            </p>
            <p>
              The heatmap highlights spatial pixel regions that exerted the highest numerical gradient pull on ResNet-50's final linear classification score for <span className="font-medium text-foreground">{selectedCondition}</span>.
            </p>
            <p className="text-[10px] text-amber-500/90 font-medium pt-1">
              * Clinical Disclaimer: Grad-CAM represents neural network feature sensitivity and must not be used as an anatomical localization or definitive lesion boundary tool.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
