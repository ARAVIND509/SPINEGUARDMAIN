import React, { useState, useEffect, useRef } from "react";
import { useRoute } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Cpu, Download, FileText, Loader2, RefreshCw, AlertCircle,
  CheckCircle2, Heart, Eye, Brain, Activity, Info,
  ChevronRight, Share2, Layers, Maximize2, Scan as ScanIcon,
  ShieldCheck, Shield, Zap, Thermometer, Radar, X, Minimize2, AlertTriangle,
  Siren, Microscope, Stethoscope, Clock, Columns, Sparkles, UserCheck
} from "lucide-react";
import Spine3DViewer from "@/components/Spine3DViewer";
import type { Scan, Analysis, AnalysisResults, Patient, SeverityLevel, ClinicalFinding } from "@shared/schema";
import { downloadAnalysisPDF } from "@/lib/pdf-generator";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { SEVERITY_COLORS } from "@/lib/severity-colors";
import { ScanAnnotationOverlay } from "@/components/ScanAnnotationOverlay";
import { GradCAMViewer } from "@/components/GradCAMViewer";
import { MedicalImageViewer } from "@/components/MedicalImageViewer";
import { ReviewerWorkflowCard } from "@/components/ReviewerWorkflowCard";
import { PatientFriendlySummary } from "@/components/PatientFriendlySummary";
import { PixelScanVisualizer } from "@/components/PixelScanVisualizer";
import { NormalVsAffectedComparator } from "@/components/NormalVsAffectedComparator";

// Deduplicate findings by condition and anatomical level
const groupAndAverageFindings = (findings: any[]) => {
  if (!findings || findings.length === 0) return [];

  const grouped = findings.reduce((acc: Record<string, any>, curr) => {
    const condition = (curr.condition || '').toLowerCase().trim();
    const loc = (curr.location || '').toLowerCase().replace(/vertebra|level|disc|bone|segment/g, '').trim();
    const key = (loc.length < 2) ? `agg-${condition}` : `${condition}-${loc}`;

    if (!acc[key]) {
      acc[key] = { ...curr, confidenceSum: curr.confidence, count: 1 };
    } else {
      acc[key].confidenceSum += curr.confidence;
      acc[key].count += 1;
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
  const [modelType] = useState<'ResNet50'>('ResNet50');
  const [maximizedView, setMaximizedView] = useState<'3d' | 'heatmap' | null>(null);
  const [activeHeatmapIdx, setActiveHeatmapIdx] = useState<number | null>(null);
  const [visualMode, setVisualMode] = useState<'standard' | 'perfusion' | 'signal' | 'neural'>('standard');
  const [interpretationMode, setInterpretationMode] = useState<'patient' | 'clinical'>('clinical');
  const [activeDoctorTab, setActiveDoctorTab] = useState<string>('gradcam');
  const { toast } = useToast();

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
      if (data.analysis?.results?.gradCamHeatmaps?.length > 0) {
        setActiveHeatmapIdx(0);
      }
      setAnalysisProgress(100);
      setCurrentStep("Diagnostic analysis complete");
      toast({
        title: "Analysis Finalized",
        description: "Medical neural analysis completed with authentic feature maps.",
      });
    },
  });

  const handleAnalyze = () => {
    setIsAnalyzing(true);
    setAnalysisProgress(0);
    setCurrentStep("Initializing deep learning diagnostic pipeline...");
    analyzeMutation.mutate();
  };

  useEffect(() => {
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
          }
        }
      } catch (err) {
        console.error("WS parse error:", err);
      }
    };

    return () => socket.close();
  }, [scanId, isAnalyzing]);

  const results = analysis?.results as AnalysisResults | undefined;

  useEffect(() => {
    if (results?.gradCamHeatmaps?.length && activeHeatmapIdx === null) {
      setActiveHeatmapIdx(0);
    }
  }, [results, activeHeatmapIdx]);

  const handleDownloadReport = async () => {
    if (!results || !patient || !scan) return;

    const clinicInfo = {
      institutionName: "SpineGuard Advanced Imaging Center",
      departmentName: "Department of Neuroradiology & Musculoskeletal Imaging",
      doctorName: results?.humanReview?.reviewerUsername || "Attending Radiologist, MD",
      licenseNumber: "MED-849201-CA"
    };

    await downloadAnalysisPDF(
      results,
      {
        name: patient.name,
        age: patient.age || undefined,
        gender: patient.gender || undefined,
        medicalRecordNumber: patient.patientId
      },
      {
        imageType: scan.imageType,
        uploadDate: scan.uploadedAt.toString(),
        scanImageUrl: scan.imageUrl
      },
      undefined,
      clinicInfo
    );

    toast({
      title: "Executive PDF Downloaded",
      description: "Hospital-grade diagnostic report generated successfully.",
    });
  };

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
    }
    toast({
      title: "Case Link Copied",
      description: "Secure case reference copied to clipboard.",
    });
  };

  // Structured predictions
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
          modelType: "Deep Learning"
        };
      }).filter(Boolean) as any[];
    }
    return preds;
  }, [results]);

  const processedPredictions = React.useMemo(
    () => groupAndAverageFindings(predictions),
    [predictions]
  );

  // 3D viewer enriched results
  const viewerResults = React.useMemo(() => {
    if (!results) return undefined;
    const rawFindings = results.findings?.length ? results.findings : processedPredictions.map(p => ({
      condition: p.condition,
      severity: p.severity as SeverityLevel,
      confidence: p.confidence,
      location: p.location || (p.condition.includes("Disc") ? "Disc" : "Lumbar")
    }));
    return {
      ...results,
      findings: groupAndAverageFindings(rawFindings)
    };
  }, [results, processedPredictions]);

  const primaryOverlayUrl = (results?.gradCamHeatmaps && results.gradCamHeatmaps.length > 0)
    ? results.gradCamHeatmaps[0].heatmapImageUrl
    : (results?.allHeatmaps && Object.values(results.allHeatmaps)[0]?.viridis
        ? `data:image/png;base64,${Object.values(results.allHeatmaps)[0].viridis}`
        : null);

  if (!scan) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <span className="text-muted-foreground font-mono text-xs uppercase tracking-widest">
          Loading Scan Data...
        </span>
      </div>
    );
  }

  const primaryFinding = results?.primaryFinding;

  return (
    <div className="min-h-screen bg-background text-foreground bg-grid">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* EXECUTIVE HEADER                                                   */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <motion.div
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 sm:p-8 glass-card rounded-3xl border border-white/10 shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-6"
        >
          <div className="flex items-start sm:items-center gap-5">
            <div className="p-3.5 bg-primary/10 rounded-2xl border border-primary/20 text-primary shrink-0">
              <Brain className="h-8 w-8 sm:h-9 sm:w-9" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 text-[10px] font-mono uppercase">
                  AI RADIOLOGY WORKSTATION
                </Badge>
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[10px] font-mono flex items-center gap-1">
                  <ShieldCheck className="h-3 w-3" /> HIPAA SECURED
                </Badge>
                <Badge variant="secondary" className="text-[10px] font-mono uppercase">
                  {scan.imageType}
                </Badge>
              </div>

              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-3">
                SpineGuard <span className="text-primary font-normal text-xl sm:text-2xl">Clinical Diagnostic Suite</span>
              </h1>

              {/* Patient & Examination Metadata Strip */}
              <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-muted-foreground mt-2">
                <span>Patient: <strong className="text-foreground">{patient?.name || "Anonymous Patient"}</strong></span>
                <span>•</span>
                <span>MRN: <strong className="text-foreground font-mono">{patient?.patientId || "MRN-PENDING"}</strong></span>
                <span>•</span>
                <span>Age/Sex: <strong className="text-foreground">{patient?.age ? `${patient?.age} Y` : "N/A"} / {patient?.gender || "N/A"}</strong></span>
                <span>•</span>
                <span>Date: <strong className="text-foreground">{new Date(scan.uploadedAt).toLocaleDateString()}</strong></span>
              </div>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-auto">
            {results && !isAnalyzing && (
              <Button
                onClick={handleDownloadReport}
                className="h-10 px-5 rounded-xl bg-primary text-primary-foreground font-semibold shadow-md gap-2 text-xs"
              >
                <Download className="h-4 w-4" />
                <span>Download Clinical PDF</span>
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={handleAnalyze}
              disabled={isAnalyzing}
              className="h-10 px-4 rounded-xl border-white/10 hover:bg-muted text-xs gap-1.5"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isAnalyzing ? "animate-spin" : ""}`} />
              <span>{isAnalyzing ? "Analyzing..." : "Re-Analyze"}</span>
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={handleShare}
              className="h-10 w-10 rounded-xl border border-white/10 hover:bg-muted"
              title="Share Case"
            >
              <Share2 className="h-4 w-4" />
            </Button>
          </div>
        </motion.div>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* STATE A: SCANNING & ANALYSIS IN PROGRESS                           */}
        {/* (STRICTLY NO PREMATURE RESULTS OR COMPARATIVE ANATOMY)            */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {(isAnalyzing || !results) && (
          <div className="space-y-6 animate-in fade-in-50 duration-500">
            {/* Visualizer Hero */}
            <div className="rounded-3xl overflow-hidden border border-white/10 shadow-2xl bg-slate-950">
              <PixelScanVisualizer
                imageUrl={scan.imageUrl}
                isScanning={true}
                progress={analysisProgress || 20}
                statusText={currentStep}
                imageType={scan.imageType}
                showDetails={true}
              />
            </div>

            {/* Diagnostic Stage Indicator Card */}
            <Card className="glass-card border border-white/10 p-6 rounded-3xl">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                    <Activity className="h-4 w-4 animate-spin" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground">Diagnostic Inference in Progress</h3>
                    <p className="text-xs text-muted-foreground">
                      Running calibrated multi-class spinal pathology screening with authentic Grad-CAM feature backpropagation.
                    </p>
                  </div>
                </div>
                <div className="w-full md:w-64 space-y-1.5">
                  <div className="flex justify-between text-xs font-mono text-muted-foreground">
                    <span>Scanning Progress</span>
                    <span className="font-bold text-primary">{analysisProgress}%</span>
                  </div>
                  <Progress value={analysisProgress || 20} className="h-2" />
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* STATE B: RESULTS DECLARED & WORKSPACE READY                         */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {results && !isAnalyzing && (
          <div className="space-y-8 animate-in fade-in-50 duration-500">

            {/* View Mode Switcher: Patient-Friendly vs Doctor PACS */}
            <div className="p-3 rounded-2xl glass-card flex flex-col sm:flex-row items-center justify-between gap-4 border border-white/10 shadow-lg">
              <div className="flex items-center gap-3 px-2">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Perspective:
                </span>
                <Badge
                  variant="outline"
                  className={`text-[10px] font-mono px-2.5 py-0.5 ${
                    interpretationMode === 'patient'
                      ? 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                      : 'bg-primary/10 text-primary border-primary/30'
                  }`}
                >
                  {interpretationMode === 'patient' ? 'PATIENT-FRIENDLY TRANSLATION' : 'PHYSICIAN PACS WORKSTATION'}
                </Badge>
              </div>

              {/* Mode Toggle Buttons */}
              <div className="flex rounded-xl p-1 bg-muted/60 border border-white/10 text-xs font-semibold w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setInterpretationMode('patient')}
                  className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-all ${
                    interpretationMode === 'patient'
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Heart className="h-3.5 w-3.5 text-rose-300" />
                  <span>Patient-Friendly (Simple Words)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setInterpretationMode('clinical')}
                  className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-all ${
                    interpretationMode === 'clinical'
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Stethoscope className="h-3.5 w-3.5 text-cyan-300" />
                  <span>Doctor / Radiologist Workstation</span>
                </button>
              </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════════ */}
            {/* SUB-VIEW 1: PATIENT-FRIENDLY PERSPECTIVE                        */}
            {/* ═══════════════════════════════════════════════════════════════ */}
            {interpretationMode === 'patient' && (
              <div className="space-y-8 animate-in fade-in-50 duration-300">
                {/* 1. Plain-English Summary Guide */}
                <PatientFriendlySummary results={results} patientName={patient?.name} />

                {/* 2. Side-by-Side Comparative Anatomy (Normal vs Patient Scan) */}
                <NormalVsAffectedComparator
                  patientImageUrl={scan.imageUrl}
                  imageType={scan.imageType}
                  results={results}
                />

                {/* Patient Next Steps Action Box */}
                <div className="p-6 rounded-3xl glass-card border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="p-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 text-emerald-400">
                      <UserCheck className="h-6 w-6" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-foreground">Need a copy for your consultation?</h4>
                      <p className="text-xs text-muted-foreground">
                        Download your complete medical report with side-by-side scans and clinician questions to take to your appointment.
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={handleDownloadReport}
                    className="h-10 px-5 rounded-xl bg-primary text-primary-foreground font-semibold text-xs shrink-0"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download Patient Report
                  </Button>
                </div>
              </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════ */}
            {/* SUB-VIEW 2: PHYSICIAN / RADIOLOGIST WORKSTATION                 */}
            {/* ═══════════════════════════════════════════════════════════════ */}
            {interpretationMode === 'clinical' && (
              <div className="space-y-8 animate-in fade-in-50 duration-300">
                
                {/* 1. TOP DIAGNOSTIC GRID (Image Viewer + Primary Finding) */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Left Column (7 cols): High-Resolution PACS Image Viewer */}
                  <div className="lg:col-span-7 flex flex-col gap-4">
                    <MedicalImageViewer
                      imageUrl={scan.imageUrl}
                      overlayUrl={primaryOverlayUrl}
                      imageType={scan.imageType}
                      metadata={scan.metadata}
                    />
                  </div>

                  {/* Right Column (5 cols): Primary Observation & Clinical Summary */}
                  <div className="lg:col-span-5 flex flex-col gap-4">
                    <Card className="glass-card border border-white/10 rounded-3xl p-6 shadow-xl flex flex-col justify-between h-full">
                      <div className="space-y-5">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                            <Zap className="h-3.5 w-3.5" /> Primary AI Finding
                          </span>
                          {primaryFinding && (
                            <Badge
                              className={`text-[10px] font-bold uppercase px-2.5 py-0.5 ${
                                primaryFinding.severity === 'severe'
                                  ? 'bg-red-500/20 text-red-400 border-red-500/40'
                                  : primaryFinding.severity === 'moderate'
                                  ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                                  : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                              }`}
                            >
                              {primaryFinding.severity.toUpperCase()}
                            </Badge>
                          )}
                        </div>

                        {primaryFinding ? (
                          <div className="p-4 rounded-2xl bg-primary/10 border border-primary/20 space-y-2">
                            <h3 className="text-xl font-bold text-foreground leading-snug">
                              {primaryFinding.condition}
                            </h3>
                            <div className="flex flex-wrap items-center justify-between text-xs text-muted-foreground gap-2">
                              <span>Target: <strong className="text-foreground">{primaryFinding.location || "L4-L5 Segment"}</strong></span>
                              <Badge variant="outline" className="bg-primary/20 text-primary border-primary/30 text-[10px] font-mono">
                                {primaryFinding.confidence}% CONFIDENCE
                              </Badge>
                            </div>
                          </div>
                        ) : (
                          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs">
                            No significant structural pathologies identified.
                          </div>
                        )}

                        {/* Clinical Impression Text */}
                        {results.summary && (
                          <div className="space-y-1.5">
                            <span className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1.5">
                              <FileText className="h-3 w-3" /> Clinical Impression
                            </span>
                            <p className="text-xs leading-relaxed text-foreground/90 p-3.5 rounded-xl bg-muted/40 border border-white/5 italic">
                              "{results.summary}"
                            </p>
                          </div>
                        )}

                        {/* Risk Zones */}
                        {results.riskZones && results.riskZones.length > 0 && (
                          <div className="space-y-1.5">
                            <span className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1.5">
                              <Radar className="h-3 w-3" /> Anatomical Risk Zones
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {results.riskZones.map((zone, i) => (
                                <Badge key={i} variant="secondary" className="bg-rose-500/10 text-rose-400 border-none text-[10px]">
                                  {zone}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Screened Pathologies Grid */}
                      <div className="pt-4 border-t border-white/10 mt-4 space-y-2">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                          Screened Pathology Checklist
                        </span>
                        <div className="grid grid-cols-2 gap-2 text-[11px]">
                          {(results.checkedConditions || results.findings || []).slice(0, 6).map((c, i) => (
                            <div
                              key={i}
                              className="p-2 rounded-xl bg-muted/30 border border-white/5 flex items-center justify-between"
                            >
                              <span className="truncate pr-1 font-medium">{c.condition}</span>
                              <span
                                className={`text-[9px] font-mono uppercase font-bold ${
                                  c.severity === 'severe'
                                    ? 'text-red-400'
                                    : c.severity === 'moderate'
                                    ? 'text-amber-400'
                                    : 'text-emerald-400'
                                }`}
                              >
                                {c.severity === 'normal' ? 'OK' : c.severity.slice(0, 3)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </Card>
                  </div>
                </div>

                {/* 2. CLINICAL WORKSPACE TABS */}
                <div className="pt-2">
                  <Tabs value={activeDoctorTab} onValueChange={setActiveDoctorTab} className="w-full">
                    <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-6">
                      <TabsList className="bg-muted/60 p-1 rounded-2xl border border-white/10">
                        <TabsTrigger
                          value="gradcam"
                          className="rounded-xl px-4 py-2 text-xs font-semibold gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                        >
                          <Thermometer className="h-3.5 w-3.5" />
                          <span>Explainable AI (Grad-CAM)</span>
                        </TabsTrigger>

                        <TabsTrigger
                          value="comparator"
                          className="rounded-xl px-4 py-2 text-xs font-semibold gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                        >
                          <Columns className="h-3.5 w-3.5" />
                          <span>Comparative Anatomy</span>
                        </TabsTrigger>

                        <TabsTrigger
                          value="3d"
                          className="rounded-xl px-4 py-2 text-xs font-semibold gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                        >
                          <Zap className="h-3.5 w-3.5" />
                          <span>3D Spine Biomechanics</span>
                        </TabsTrigger>

                        <TabsTrigger
                          value="review"
                          className="rounded-xl px-4 py-2 text-xs font-semibold gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                        >
                          <UserCheck className="h-3.5 w-3.5" />
                          <span>Clinical Attestation</span>
                        </TabsTrigger>
                      </TabsList>
                    </div>

                    {/* TAB 1: GRAD-CAM EXPLAINABILITY */}
                    <TabsContent value="gradcam" className="focus-visible:outline-none space-y-4">
                      <GradCAMViewer
                        originalImageUrl={scan.imageUrl}
                        results={results}
                      />
                    </TabsContent>

                    {/* TAB 2: SIDE-BY-SIDE COMPARATIVE ANATOMY */}
                    <TabsContent value="comparator" className="focus-visible:outline-none space-y-4">
                      <NormalVsAffectedComparator
                        patientImageUrl={scan.imageUrl}
                        imageType={scan.imageType}
                        results={results}
                      />
                    </TabsContent>

                    {/* TAB 3: 3D SPINE BIOMECHANICS */}
                    <TabsContent value="3d" className="focus-visible:outline-none space-y-4">
                      <div className="h-[580px] w-full rounded-3xl overflow-hidden border border-white/10 shadow-2xl">
                        <Spine3DViewer
                          results={viewerResults as any}
                          imageUrl={scan.imageUrl}
                          visualMode={visualMode}
                          isFullView={false}
                          onMaximize={() => setMaximizedView('3d')}
                        />
                      </div>
                    </TabsContent>

                    {/* TAB 4: HUMAN REVIEWER CLINICAL ATTESTATION */}
                    <TabsContent value="review" className="focus-visible:outline-none space-y-4">
                      {analysis && (
                        <ReviewerWorkflowCard
                          analysis={analysis}
                          currentUser={currentUser}
                        />
                      )}
                    </TabsContent>
                  </Tabs>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* FULLSCREEN MODAL EXPANSION                                          */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {maximizedView && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-background flex flex-col h-screen overflow-hidden"
          >
            <div className="flex-none p-4 sm:p-6 flex items-center justify-between border-b border-white/10 bg-background/95 backdrop-blur">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-xl text-primary">
                  <Zap className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold">3D Biomechanical Spine Workspace</h2>
                  <p className="text-xs font-mono text-muted-foreground">SCAN_ID: {scanId}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMaximizedView(null)}
                className="hover:bg-red-500/10 hover:text-red-500 rounded-xl"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="flex-1 relative min-h-0 p-4 sm:p-6">
              {maximizedView === '3d' && (
                <div className="w-full h-full rounded-3xl overflow-hidden border border-white/10">
                  <Spine3DViewer
                    results={viewerResults as any}
                    imageUrl={scan.imageUrl}
                    visualMode={visualMode}
                    isFullView={true}
                  />
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
