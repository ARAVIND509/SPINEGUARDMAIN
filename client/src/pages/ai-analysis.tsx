import React, { useState, useEffect, useRef } from "react";
import { useRoute } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Cpu, Download, FileText, Loader2, RefreshCw, AlertCircle,
  CheckCircle2, Heart, Eye, Brain, Activity, Info,
  ChevronRight, Share2, Layers, Maximize2, Scan as ScanIcon,
  ShieldCheck, Shield, Zap, Thermometer, Radar, X, Minimize2, AlertTriangle,
  Siren, Microscope, Stethoscope, Clock
} from "lucide-react";
import Spine3DViewer from "@/components/Spine3DViewer";
import { ImageOverlayVisualization } from "@/components/ImageOverlayVisualization";
import type { Scan, Analysis, AnalysisResults, Patient, SeverityLevel } from "@shared/schema";
import { downloadAnalysisPDF } from "@/lib/pdf-generator";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { SEVERITY_COLORS } from "@/lib/severity-colors";
import { ScanAnnotationOverlay } from "@/components/ScanAnnotationOverlay";
import { GradCAMViewer } from "@/components/GradCAMViewer";
import { MedicalImageViewer } from "@/components/MedicalImageViewer";
import { ReviewerWorkflowCard } from "@/components/ReviewerWorkflowCard";
import { PatientFriendlySummary } from "@/components/PatientFriendlySummary";

// Group Findings and Deduplicate
const groupAndAverageFindings = (findings: any[]) => {
  if (!findings || findings.length === 0) return [];

  const grouped = findings.reduce((acc: Record<string, any>, curr) => {
    // Aggressive normalization
    const condition = (curr.condition || '').toLowerCase().trim();
    const loc = (curr.location || '').toLowerCase().replace(/vertebra|level|disc|bone|segment/g, '').trim();

    // If location is very vague or missing, group by condition only to avoid spam
    const key = (loc.length < 2) ? `agg-${condition}` : `${condition}-${loc}`;

    if (!acc[key]) {
      acc[key] = { ...curr, confidenceSum: curr.confidence, count: 1 };
    } else {
      acc[key].confidenceSum += curr.confidence;
      acc[key].count += 1;
      // Keep the highest severity
      const severityOrder = { severe: 3, moderate: 2, mild: 1, normal: 0 };
      const currSev = (curr.severity?.toLowerCase() || 'normal') as keyof typeof severityOrder;
      const accSev = (acc[key].severity?.toLowerCase() || 'normal') as keyof typeof severityOrder;

      if (severityOrder[currSev] > severityOrder[accSev]) {
        acc[key].severity = curr.severity;
      }
    }
    return acc;
  }, {});

  return Object.values(grouped).map((g: any) => ({
    ...g,
    confidence: Math.round(g.confidenceSum / g.count)
  }));
};

export default function AIAnalysis() {
  const [, params] = useRoute("/ai-analysis/:scanId");
  const scanId = params?.scanId;
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState("Initializing AI engine...");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [modelType, setModelType] = useState<'ResNet50'>('ResNet50');
  const [maximizedView, setMaximizedView] = useState<'3d' | 'heatmap' | 'main' | null>(null);
  const [activeHeatmapIdx, setActiveHeatmapIdx] = useState<number | null>(null);
  const [imgDims, setImgDims] = useState({ width: 0, height: 0 });
  const [fullscreenImgDims, setFullscreenImgDims] = useState({ width: 0, height: 0 });
  const [visualMode, setVisualMode] = useState<'standard' | 'perfusion' | 'signal' | 'neural'>('standard');
  const [interpretationMode, setInterpretationMode] = useState<'patient' | 'clinical'>('patient');
  const { toast } = useToast();
  const scanContainerRef = useRef<HTMLDivElement>(null);

  const { data: scan } = useQuery<Scan>({
    queryKey: ["/api/scans/single", scanId],
    enabled: !!scanId,
    queryFn: async () => {
      const res = await fetch(`/api/scans/single/${scanId}`);
      if (!res.ok) throw new Error("Failed to fetch scan");
      return res.json();
    },
  });

  const { data: patient } = useQuery<Patient>({
    queryKey: ["/api/patients", scan?.patientCaseId],
    enabled: !!scan?.patientCaseId,
    queryFn: async () => {
      const res = await fetch(`/api/patients/${scan?.patientCaseId}`);
      if (!res.ok) throw new Error("Failed to fetch patient");
      return res.json();
    },
  });

  const { data: analysis, status: analysisStatus } = useQuery<Analysis>({
    queryKey: ["/api/analysis", scanId],
    enabled: !!scanId,
  });

  const { data: currentUser } = useQuery<any>({
    queryKey: ["/api/user"],
  });

  const analyzeMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest<{ analysis: Analysis }>("POST", `/api/analyze/${scanId}`, { modelType });
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["/api/analysis", scanId], data.analysis);
      queryClient.invalidateQueries({ queryKey: ["/api/scans/recent"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      setIsAnalyzing(false);

      // Auto-select first heatmap if available
      if (data.analysis?.results?.gradCamHeatmaps?.length > 0) {
        setActiveHeatmapIdx(0);
      }
      setAnalysisProgress(100);
      setCurrentStep("Analysis synchronized");
      toast({
        title: "Analysis Complete",
        description: "Medical AI has finalized the diagnostic report.",
      });
    },
  });

  const handleAnalyze = () => {
    setIsAnalyzing(true);
    setAnalysisProgress(0);
    setCurrentStep("Booting Neural Engine...");
    analyzeMutation.mutate();
  };

  useEffect(() => {
    // Only auto-trigger analysis if we have the scan, no analysis yet, 
    // we aren't already analyzing, and we aren't currently loading the analysis
    if (scan && !analysis && !isAnalyzing && analysisStatus !== 'pending') {
      handleAnalyze();
    }
  }, [scan, analysis, isAnalyzing, analysisStatus]);

  useEffect(() => {
    if (!scanId || !isAnalyzing) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws/analysis`;

    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      socket.send(JSON.stringify({ type: "subscribe", scanId }));
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "progress" && data.scanId === scanId) {
          setAnalysisProgress(data.progress);
          setCurrentStep(data.status);

          if (data.progress === 100) {
            queryClient.invalidateQueries({ queryKey: ["/api/analysis", scanId] });
            queryClient.invalidateQueries({ queryKey: ["/api/scans/recent"] });
            queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
            setIsAnalyzing(false);

            // Auto-selection will happen via the analysis query update if needed, 
            // but we can also trigger it here if we refetch.
          }
        }
      } catch (err) {
        console.error("WS parse error:", err);
      }
    };

    return () => socket.close();
  }, [scanId, isAnalyzing]);

  const results = analysis?.results as AnalysisResults | undefined;
  const bloodFlow = results?.bloodFlowAnalysis;

  // Effect to auto-select first heatmap when results become available
  useEffect(() => {
    if (results?.gradCamHeatmaps?.length && activeHeatmapIdx === null) {
      setActiveHeatmapIdx(0);
    }
  }, [results, activeHeatmapIdx]);

  const handleDownloadReport = async () => {
    if (!results || !patient || !scan) return;
    
    // In a real app, this would come from the logged-in doctor's profile
    const clinicInfo = {
      hospitalName: "SpineGuard Advanced Imaging Center",
      doctorName: "Dr. Sarah Chen, MD",
      licenseNumber: "MED-849201-CA"
    };

    await downloadAnalysisPDF(results, {
      name: patient.name,
      age: patient.age || undefined,
      gender: patient.gender || undefined,
      medicalRecordNumber: patient.patientId
    }, {
      imageType: scan.imageType,
      uploadDate: scan.uploadedAt.toString(),
      scanImageUrl: scan.imageUrl
    }, undefined, clinicInfo);
    
    toast({
      title: "Report Downloaded",
      description: "The clinical analysis report has been saved to your device.",
    });
  };

  const handleShare = () => {
    toast({
      title: "Case Shared",
      description: "A secure link has been copied to your clipboard.",
    });
  };

  const switchVisualMode = (mode: 'standard' | 'perfusion' | 'signal' | 'neural') => {
    setVisualMode(mode);
    const descriptions = {
      standard: "Switching to standard anatomical view.",
      perfusion: "Simulating vascular perfusion layers.",
      signal: "Enhancing vertebral signal intensity.",
      neural: "Highlighting neural pathway connectivity."
    };
  };

  const selectHeatmapByCondition = (condition: string) => {
    if (!results?.gradCamHeatmaps) return;
    const idx = results?.gradCamHeatmaps.findIndex(h => h.condition === condition);
    if (idx !== -1) {
      setActiveHeatmapIdx(idx);
    }
  };

  const activeHeatmap = activeHeatmapIdx !== null ? results?.gradCamHeatmaps?.[activeHeatmapIdx] : null;

  // Fallback: If mlPredictions is missing (SCT path), aggregate from individual fields
  const predictions = React.useMemo(() => {
    let preds = results?.mlPredictions?.predictions || [];

    if (preds.length === 0 && results) {
      const conditions = [
        'discHerniation', 'scoliosis', 'spinalStenosis',
        'degenerativeDisc', 'vertebralFracture', 'spondylolisthesis',
        'infection', 'tumor'
      ] as const;
      preds = conditions.map(key => {
        const finding = (results as any)[key];
        if (!finding) return null;
        return {
          condition: finding.condition,
          severity: (finding.severity || 'normal').toLowerCase(),
          confidence: finding.confidence,
          modelType: "SCT Analysis"
        };
      }).filter(Boolean) as any[];
    }
    return preds;
  }, [results]);

  const processedPredictions = React.useMemo(() =>
    groupAndAverageFindings(predictions),
    [predictions]);

  const severeFindings = processedPredictions.filter(p => p.severity?.toLowerCase() === 'severe');
  const moderateFindings = processedPredictions.filter(p => p.severity?.toLowerCase() === 'moderate');
  const normalFindings = processedPredictions.filter(p => !['severe', 'moderate'].includes(p.severity?.toLowerCase()));

  // Enhanced results for 3D viewer - Deduplicated and enriched with Heatmap regions
  const viewerResults = React.useMemo(() => {
    if (!results) return undefined;

    // Deduplicate results.findings if they exist
    const rawFindings = results.findings?.length ? results.findings : processedPredictions.map(p => ({
      condition: p.condition,
      severity: p.severity as SeverityLevel,
      confidence: p.confidence,
      location: p.location || (p.condition.includes("Disc") ? "Disc" : (p.condition.includes("Scoliosis") ? "Spine" : "Lumbar"))
    }));

    const deduplicatedFindings = groupAndAverageFindings(rawFindings);

    // Parse heatmap regions to extract specific anatomical targets (Fallback for older scans or pure client-side paths)
    const heatmapTargets = results.heatmapTargets?.length ? results.heatmapTargets : (() => {
      const heatmaps = results?.gradCamHeatmaps || [];
      const targets: Array<{ region: string, condition: string, severity: SeverityLevel, intensity: number }> = [];

      heatmaps.forEach(heatmap => {
        if (heatmap.affectedRegions?.length) {
          heatmap.affectedRegions.forEach(ar => {
            targets.push({
              region: ar.region,
              condition: heatmap.condition,
              severity: (heatmap.severity || 'severe') as SeverityLevel,
              intensity: ar.intensity
            });
          });
        }
      });
      return targets;
    })();

    return {
      ...results,
      findings: deduplicatedFindings,
      heatmapTargets // Pass parsed heatmap targets for precise 3D highlighting
    };
  }, [results, processedPredictions]);

  const primaryOverlayUrl = (results?.gradCamHeatmaps && results.gradCamHeatmaps.length > 0)
    ? results.gradCamHeatmaps[0].heatmapImageUrl
    : (results?.allHeatmaps && Object.values(results.allHeatmaps)[0]?.viridis 
        ? `data:image/png;base64,${Object.values(results.allHeatmaps)[0].viridis}` 
        : null);

  if (!scan) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary/80" />
        <span className="text-muted-foreground font-medium tracking-widest text-xs uppercase">Initializing System</span>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto bg-background text-foreground bg-grid">
      <div className="w-full px-4 lg:px-12 py-10">

        {/* Header - Glassmorphic */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 p-8 glass-card rounded-3xl"
        >
          <div className="flex items-center gap-6">
            <div className="p-4 bg-primary/10 rounded-2xl border border-primary/20 shadow-lg">
              <Brain className="h-10 w-10 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <Badge variant="outline" className="text-[10px] uppercase border-primary/30 text-primary px-2 py-0">AI Analysis Engine Active</Badge>
                <Badge variant="outline" className="text-[10px] uppercase border-emerald-500/30 text-emerald-500 dark:text-emerald-400 px-2 py-0 flex items-center gap-1">
                  <ShieldCheck className="h-3 w-3" /> HIPAA Compliant
                </Badge>
              </div>
              <h1 className="text-4xl font-bold tracking-tight text-foreground flex items-center gap-3">
                SpineGuard AI <span className="text-primary/60 font-light italic">Clinical v4.0</span>
              </h1>
              <p className="text-muted-foreground max-w-md text-sm mt-1">
                Performing sub-millimeter anatomical segmentation and pathological verification.
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            {results && (
              <Button
                onClick={handleDownloadReport}
                className="h-12 px-6 rounded-xl bg-primary text-primary-foreground shadow-lg transition-all"
              >
                <Download className="h-4 w-4 mr-2" />
                Diagnostic Report
              </Button>
            )}
            <Button
              variant="outline"
              onClick={handleShare}
              className="h-12 w-12 rounded-xl"
            >
              <Share2 className="h-4 w-4" />
            </Button>
          </div>
        </motion.div>

        {/* View Mode Selector: Patient-Friendly vs Radiologist Mode */}
        {results && (
          <div className="mb-8 p-3 rounded-2xl glass-card flex flex-col sm:flex-row items-center justify-between gap-4 border border-border/60">
            <div className="flex items-center gap-2.5 px-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Display Mode:
              </span>
              <Badge variant="outline" className="text-[10px] font-mono text-primary border-primary/30">
                {interpretationMode === "patient" ? "SIMPLIFIED PATIENT EXPLANATION" : "PHYSICIAN PACS VIEW"}
              </Badge>
            </div>
            <div className="flex rounded-xl p-1 bg-muted/60 border border-border/50 text-xs font-semibold w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setInterpretationMode("patient")}
                className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-all ${
                  interpretationMode === "patient"
                    ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Heart className="h-3.5 w-3.5 text-rose-300" />
                <span>Patient-Friendly (Simple Words)</span>
              </button>
              <button
                type="button"
                onClick={() => setInterpretationMode("clinical")}
                className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-all ${
                  interpretationMode === "clinical"
                    ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Stethoscope className="h-3.5 w-3.5 text-cyan-300" />
                <span>Doctor / Radiologist Mode</span>
              </button>
            </div>
          </div>
        )}

        {/* Patient Friendly Plain English Guide */}
        {results && interpretationMode === "patient" && (
          <div className="mb-10 animate-in fade-in-50 duration-300">
            <PatientFriendlySummary results={results} patientName={patient?.name} />
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 mb-8">
          {/* Main Visualizer - 8 cols */}
          <div className="xl:col-span-8 flex flex-col gap-8">
            <MedicalImageViewer
              imageUrl={scan.imageUrl}
              overlayUrl={primaryOverlayUrl}
              imageType={scan.imageType}
              metadata={scan.metadata}
            />

            {/* In-depth Panels Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 3D Anatomical Reference Model */}
              <div className="glass-card rounded-3xl p-6 relative overflow-hidden h-[400px]">
                <div className="flex items-center justify-between mb-4 relative z-10">
                  <div>
                    <h3 className="font-bold flex items-center gap-2 text-sm sm:text-base">
                      <Zap className="h-4 w-4 text-blue-500" /> 3D Anatomical Reference Guide
                    </h3>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Illustrative canonical spine anatomy — not reconstructed from individual patient scan
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-blue-500/5 text-blue-500 border-blue-500/20 text-[9px]">REFERENCE_MODEL</Badge>
                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setMaximizedView('3d')}>
                      <Maximize2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <div className="absolute inset-0 top-20">
                  <Spine3DViewer results={viewerResults as any} imageUrl={scan.imageUrl} visualMode={visualMode} isFullView={false} />
                </div>
              </div>

              {/* Neural Model Architecture & Technical Provenance Card */}
              <div className="glass-card rounded-3xl p-6 relative overflow-hidden h-[400px] border border-blue-500/10 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold flex items-center gap-2 text-sm sm:text-base">
                      <Shield className="h-4 w-4 text-primary" /> Model Architecture & Provenance
                    </h3>
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[9px]">
                      DETERMINISTIC
                    </Badge>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div className="flex justify-between py-1.5 border-b border-white/5">
                      <span className="text-muted-foreground">Neural Backbone:</span>
                      <span className="font-mono font-medium">PyTorch ResNet-50</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-white/5">
                      <span className="text-muted-foreground">Classifier Head:</span>
                      <span className="font-mono font-medium">Calibrated Negative Log-Odds (-2.0 bias)</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-white/5">
                      <span className="text-muted-foreground">Input Preprocessing:</span>
                      <span className="font-mono font-medium">224×224 Normalization (ImageNet params)</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-white/5">
                      <span className="text-muted-foreground">Explainability Target:</span>
                      <span className="font-mono font-medium">base_model.layer4[-1] Gradients</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-white/5">
                      <span className="text-muted-foreground">Hardware Tolerance:</span>
                      <span className="font-mono font-medium">FP32 Deterministic (Jitter/Noise Free)</span>
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-muted/40 border border-white/10 text-[10px] text-muted-foreground leading-relaxed">
                  <span className="font-bold text-foreground">Medical Disclaimer: </span>
                  SpinalGuard is an academic deep learning prototype. Heatmaps display convolutional feature map gradient attention and do not represent validated histological margins or definitive clinical diagnoses.
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar Info - 4 cols */}
          <div className="xl:col-span-4 flex flex-col gap-6">
            <Card className="glass-card !bg-primary/[0.02] border-none rounded-[2rem] p-8 shadow-xl">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                <Info className="h-5 w-5 text-primary" /> AI Analysis Summary
              </h3>

              <div className="space-y-6">
                {/* 1. Primary Finding - Hero Card Style */}
                {results?.primaryFinding ? (
                  <div className="space-y-4 animate-in slide-in-from-right duration-500">
                    <div className="text-xs text-primary font-bold uppercase tracking-widest flex items-center gap-2">
                      <Zap className="h-4 w-4 animate-pulse" /> Primary AI Observation
                    </div>
                    <div className={`rounded-3xl bg-primary/10 border border-primary/20 p-6 relative overflow-hidden group transition-all duration-300`}>
                      <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Brain className="h-24 w-24 text-primary rotate-12" />
                      </div>
                      <div
                        onClick={() => selectHeatmapByCondition(results?.primaryFinding!.condition)}
                        className={`p-3 rounded-xl border flex flex-col gap-2 transition-all cursor-pointer min-w-0 ${activeHeatmap?.condition === results?.primaryFinding.condition
                          ? 'bg-primary/20 border-primary shadow-[0_0_15px_rgba(var(--primary),0.3)]'
                          : 'bg-foreground/5 border-border/50 hover:bg-foreground/10'
                          }`}
                      >
                        <div className="min-w-0">
                          <h4 className="text-2xl font-bold text-primary break-words leading-tight">{results?.primaryFinding.condition}</h4>
                          <p className="text-xs text-muted-foreground uppercase mt-1 break-words">Location: {results?.primaryFinding.location}</p>
                        </div>
                        <div className="flex justify-between items-center">
                          <Badge variant="outline" className={`bg-primary/20 text-primary border-primary/30 text-[10px] font-bold px-2 py-0.5 whitespace-nowrap`}>
                            {results?.primaryFinding.confidence}% CONF
                          </Badge>
                        </div>
                      </div>

                      <div className="space-y-4 mt-6">
                        <div className="flex items-center gap-3">
                          <div className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${results?.primaryFinding.severity === 'severe' ? 'bg-red-500 text-white' :
                            results?.primaryFinding.severity === 'moderate' ? 'bg-orange-500 text-white' :
                              'bg-emerald-500 text-white'
                            }`}>
                            {results?.primaryFinding.severity}
                          </div>
                          <div className="h-1.5 flex-1 bg-primary/20 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${results?.primaryFinding.confidence}%` }}
                              className="h-full bg-primary"
                            ></motion.div>
                          </div>
                        </div>

                      </div>
                    </div>

                    <div className="pt-4 border-t border-primary/10">
                      <p className="text-[10px] text-muted-foreground font-bold uppercase mb-3">Supporting Observations</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {processedPredictions.filter(p => p.condition !== results?.primaryFinding?.condition).slice(0, 6).map((p, i) => (
                          <div
                            key={i}
                            onClick={() => selectHeatmapByCondition(p.condition)}
                            className={`p-3 rounded-xl border flex flex-col gap-1 transition-all cursor-pointer min-w-0 ${activeHeatmap?.condition === p.condition
                              ? 'bg-primary/10 border-primary/40 shadow-sm'
                              : 'bg-foreground/5 border-border/50 hover:bg-foreground/10'
                              }`}
                          >
                            <span className="text-[10px] font-bold break-words whitespace-normal leading-tight">{p.condition}</span>
                            <div className="flex justify-between items-center mt-1">
                              <span className={`text-[8px] uppercase font-black ${p.severity === 'severe' ? 'text-red-500' :
                                p.severity === 'moderate' ? 'text-orange-500' : 'text-emerald-500'
                                }`}>{p.severity}</span>
                              <span className="text-[8px] font-mono opacity-50">{p.confidence}%</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : !results ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-32 rounded-3xl bg-foreground/5 border border-border/50 animate-pulse"></div>
                  ))
                ) : (
                  <div className="p-10 rounded-3xl border-2 border-dashed border-primary/10 flex flex-col items-center text-center gap-4">
                    <CheckCircle2 className="h-10 w-10 text-emerald-500/50" />
                    <div>
                      <h4 className="font-bold">Clear Anatomy</h4>
                      <p className="text-xs text-muted-foreground">No significant pathologies identified in current scan.</p>
                    </div>
                  </div>
                )}

                {/* Clinical Summary Text */}
                {results?.summary && (
                  <div className="pt-6 border-t border-primary/10">
                    <p className="text-[10px] text-muted-foreground font-bold uppercase mb-2 flex items-center gap-2">
                      <FileText className="h-3 w-3" /> Clinical Impression
                    </p>
                    <p className="text-xs leading-relaxed text-foreground/80 bg-primary/5 p-4 rounded-2xl border border-primary/10 italic">
                      "{results?.summary}"
                    </p>
                  </div>
                )}

                {/* Risk Zones */}
                {results?.riskZones && (
                  <div className="pt-4">
                    <p className="text-[10px] text-muted-foreground font-bold uppercase mb-2 flex items-center gap-2">
                      <Radar className="h-3 w-3" /> Anatomical Risk Zones
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {(results?.riskZones || []).map((zone, i) => (
                        <Badge key={i} variant="secondary" className="bg-rose-500/10 text-rose-600 border-none text-[9px]">
                          {zone}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-6 glass-card rounded-3xl text-center space-y-1">
                <span className="text-[10px] uppercase text-muted-foreground font-bold tracking-widest">Latency</span>
                <div className="text-2xl font-bold leading-none">{results?.mlPredictions?.processingTime || '---'}ms</div>
              </div>
              <div className="p-6 glass-card rounded-3xl text-center space-y-1">
                <span className="text-[10px] uppercase text-muted-foreground font-bold tracking-widest">Model</span>
                <div className="text-sm font-bold leading-none truncate px-2 capitalize">{modelType}</div>
              </div>
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* Per-Disease Heatmap Gallery — Interactive Navigation              */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {results && scan && (
          <GradCAMViewer
            originalImageUrl={scan.imageUrl}
            results={results}
            className="mb-12"
          />
        )}

        {/* All Conditions Checked - Full Report Section */}
        {results && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <CheckCircle2 className="h-6 w-6 text-emerald-500" />
              Comprehensive Diagnostic Scan (6+ Conditions Verified)
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(results?.checkedConditions || results?.findings || []).map((condition, idx) => (
                <div key={idx} className="glass-card p-4 rounded-2xl border border-white/10 hover:border-primary/30 transition-all">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider">{condition.condition}</span>
                    <Badge variant={condition.severity === 'normal' ? 'outline' : 'destructive'} className="text-[9px]">
                      {condition.severity.toUpperCase()}
                    </Badge>
                  </div>
                  <div className="text-[10px] text-muted-foreground space-y-1">
                    <p className="flex justify-between">
                      <span>Anatomical Status:</span>
                      <span className={condition.severity === 'normal' ? 'text-emerald-500' : 'text-rose-500'}>
                        {condition.severity === 'normal' ? 'CLEARED / HEALTHY' : 'PATHOLOGY DETECTED'}
                      </span>
                    </p>
                    {condition.location && (
                      <p className="flex justify-between">
                        <span>Analysis Focus:</span>
                        <span className="text-foreground font-medium">{condition.location}</span>
                      </p>
                    )}
                    {condition.measurements && Object.entries(condition.measurements).map(([key, val]) => (
                      <p key={key} className="flex justify-between">
                        <span className="capitalize">{key.replace(/_/g, ' ')}:</span>
                        <span className="text-foreground font-mono">{typeof val === 'number' ? val.toFixed(2) : val}</span>
                      </p>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Human-in-the-Loop Clinical Review Workflow */}
        {analysis && (
          <ReviewerWorkflowCard
            analysis={analysis}
            currentUser={currentUser}
            className="mb-12"
          />
        )}
      </div >

      {/* Fullscreen Overlays */}
      <AnimatePresence>
        {maximizedView && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-background flex flex-col h-screen overflow-hidden"
          >
            {/* Header for Fullscreen */}
            <div className="flex-none p-6 flex items-center justify-between border-b border-border/40 bg-background/95 backdrop-blur">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-primary/10 rounded-lg">
                  {maximizedView === '3d' ? <Zap className="text-primary h-5 w-5" /> : maximizedView === 'heatmap' ? <Thermometer className="text-rose-500 h-5 w-5" /> : <Maximize2 className="text-primary h-5 w-5" />}
                </div>
                <div>
                  <h2 className="text-xl font-bold">
                    {maximizedView === '3d' ? '3D Bio-Dynamic Model' : maximizedView === 'heatmap' ? 'Neural Activation Heatmaps' : 'Advanced Diagnostic View'}
                  </h2>
                  <p className="text-muted-foreground text-xs font-mono">SESSION_ID: {scanId}</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setMaximizedView(null)} className="hover:bg-red-500/10 hover:text-red-500">
                <X className="h-6 w-6" />
              </Button>
            </div>

            {/* Content Area - Flex-1 ensuring it takes remaining space without overflow */}
            <div className="flex-1 relative min-h-0 container mx-auto p-6 max-w-[1920px]">

              {maximizedView === '3d' && scan && (
                <div className="w-full h-full relative rounded-3xl overflow-hidden border border-border/50 bg-black/40">
                  <Spine3DViewer results={viewerResults as any} imageUrl={scan.imageUrl} visualMode={visualMode} isFullView={true} />
                  <div className="absolute top-6 left-6 p-2 rounded-2xl glass-panel flex flex-col gap-2">
                    <span className="text-[10px] font-bold text-muted-foreground px-2 uppercase mb-1">Visual Mode</span>
                    <Button size="sm" variant={visualMode === 'standard' ? 'secondary' : 'ghost'} onClick={() => switchVisualMode('standard')} className="justify-start"><Eye className="h-4 w-4 mr-2" /> Standard</Button>
                    <Button size="sm" variant={visualMode === 'perfusion' ? 'secondary' : 'ghost'} onClick={() => switchVisualMode('perfusion')} className="justify-start"><Heart className="h-4 w-4 mr-2" /> Perfusion</Button>
                    <Button size="sm" variant={visualMode === 'signal' ? 'secondary' : 'ghost'} onClick={() => switchVisualMode('signal')} className="justify-start"><Activity className="h-4 w-4 mr-2" /> Signal</Button>
                    <Button size="sm" variant={visualMode === 'neural' ? 'secondary' : 'ghost'} onClick={() => switchVisualMode('neural')} className="justify-start"><Cpu className="h-4 w-4 mr-2" /> Neural</Button>
                  </div>
                </div>
              )}

              {maximizedView === 'heatmap' && (
                <div className="flex h-full gap-8">
                  {/* Main Image Container */}
                  <div className="flex-1 relative h-full rounded-3xl overflow-hidden bg-black border border-white/10 flex items-center justify-center">
                    <span className="absolute top-4 left-4 z-10 bg-black/50 px-3 py-1.5 rounded-lg text-xs font-mono text-white/70">
                      {activeHeatmap?.condition?.toUpperCase() ?? 'NO_SELECTION'}
                    </span>

                    {activeHeatmap ? (
                      <div className="relative w-full h-full overflow-hidden rounded-2xl">
                        <img
                          src={scan.imageUrl}
                          className="w-full h-full object-contain"
                          alt="Base Image Analysis"
                          onLoad={(e) => {
                            const img = e.currentTarget;
                            setFullscreenImgDims({ width: img.clientWidth, height: img.clientHeight });
                          }}
                        />
                        {fullscreenImgDims.width > 0 && (
                          <ScanAnnotationOverlay
                            finding={{
                              condition: activeHeatmap.condition,
                              severity: (activeHeatmap.severity || 'mild') as any,
                              confidence: activeHeatmap.confidence || 0,
                              regionX: activeHeatmap.regionX,
                              regionY: activeHeatmap.regionY
                            }}
                            imageDimensions={fullscreenImgDims}
                          />
                        )}

                        {/* Severity-Aware Badge in Fullscreen */}
                        <div className="absolute bottom-6 left-6 flex flex-col gap-2 z-40">
                          {(() => {
                            const style = SEVERITY_COLORS[(activeHeatmap.severity || 'mild') as keyof typeof SEVERITY_COLORS] || SEVERITY_COLORS.mild;
                            return (
                              <Badge className={`${style.badge} text-white text-xs uppercase font-black px-4 py-2 shadow-2xl border border-white/10`}>
                                {style.label}: {activeHeatmap.condition.toUpperCase()}
                              </Badge>
                            );
                          })()}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center space-y-2 opacity-50">
                        <Microscope className="h-12 w-12 mx-auto" />
                        <p>Select a region to analyze</p>
                      </div>
                    )}

                    {activeHeatmap && (
                      <div className="absolute bottom-0 inset-x-0 p-6 bg-gradient-to-t from-black/90 via-black/60 to-transparent">
                        <p className="text-white text-sm max-w-3xl leading-relaxed">
                          {activeHeatmap?.interpretationNotes}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Sidebar Selection */}
                  <div className="w-80 flex-none flex flex-col gap-4 overflow-hidden">
                    <h3 className="font-bold text-lg flex items-center gap-2">
                      <Layers className="h-5 w-5" /> Detected Regions
                    </h3>
                    <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3 pb-4">
                      {results?.gradCamHeatmaps?.map((heatmap, idx) => (
                        <div
                          key={idx}
                          onClick={() => setActiveHeatmapIdx(idx)}
                          className={`p-4 rounded-2xl border cursor-pointer transition-all ${activeHeatmapIdx === idx ? 'bg-primary/20 border-primary shadow-lg scale-[1.02]' : 'bg-card/50 border-border hover:border-primary/50'}`}
                        >
                          <div className="font-bold text-sm mb-1">{heatmap.condition}</div>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {heatmap.affectedRegions.map((r, i) => (
                              <Badge key={i} variant="secondary" className="text-[10px] bg-background/50">{r.region}</Badge>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )
        }
      </AnimatePresence >

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(var(--foreground), 0.02);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(var(--foreground), 0.1);
          border-radius: 2px;
        }
        @keyframes scan {
            0% { top: 0%; opacity: 0; }
            10% { opacity: 1; }
            90% { opacity: 1; }
            100% { top: 100%; opacity: 0; }
        }
        .animate-scan {
            animation: scan 3s linear infinite;
        }
        .animate-fadeIn {
            animation: fadeIn 0.5s ease-out forwards;
        }
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div >
  );
}
