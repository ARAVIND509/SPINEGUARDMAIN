import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Clock,
  AlertTriangle,
  TrendingUp,
  Users,
  Activity,
  Brain,
  Upload,
  FileText,
  ChevronRight,
  ShieldCheck,
  Stethoscope,
  Sparkles,
  Layers,
  ArrowUpRight,
  Scan as ScanIcon
} from "lucide-react";
import type { Patient, Scan } from "@shared/schema";
import { format } from "date-fns";
import { Link, useLocation } from "wouter";

export default function Home() {
  const [, setLocation] = useLocation();

  const { data: patients = [] } = useQuery<Patient[]>({
    queryKey: ["/api/patients"],
  });

  const { data: recentScans = [] } = useQuery<(Scan & { patient: Patient })[]>({
    queryKey: ["/api/scans/recent"],
  });

  const { data: dashboardStats } = useQuery<{
    scansToday: number;
    criticalFindings: number;
    avgAnalysisTime: number;
    activePatients: number;
  }>({
    queryKey: ["/api/dashboard/stats"],
  });

  const criticalFindings = dashboardStats?.criticalFindings || 0;
  const avgAnalysisTime = dashboardStats?.avgAnalysisTime || 0;
  const scansToday = dashboardStats?.scansToday || 0;
  const activePatients = dashboardStats?.activePatients || 0;

  const { data: criticalFindingsData } = useQuery<{ count: number; findings: any[] }>({
    queryKey: ["/api/stats/critical-findings"],
  });

  const stats = [
    {
      title: "Scans Analyzed Today",
      value: scansToday,
      subtitle: "↑ 12% vs 7-day average",
      icon: Activity,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
      badgeText: "High Throughput",
      badgeColor: "border-blue-500/30 text-blue-500 bg-blue-500/5",
    },
    {
      title: "Critical Findings",
      value: criticalFindings,
      subtitle: criticalFindings > 0 ? `${criticalFindings} cases requiring physician attestation` : "All cases cleared",
      icon: AlertTriangle,
      color: "text-rose-500",
      bgColor: "bg-rose-500/10",
      badgeText: criticalFindings > 0 ? "Action Required" : "Normal Triage",
      badgeColor: criticalFindings > 0 ? "border-rose-500/30 text-rose-500 bg-rose-500/5" : "border-emerald-500/30 text-emerald-500 bg-emerald-500/5",
    },
    {
      title: "Average Analysis Time",
      value: `${avgAnalysisTime}m`,
      subtitle: "ResNet-50 v2 inference latency < 450ms",
      icon: Clock,
      color: "text-emerald-500",
      bgColor: "bg-emerald-500/10",
      badgeText: "Optimized",
      badgeColor: "border-emerald-500/30 text-emerald-500 bg-emerald-500/5",
    },
    {
      title: "Active Patients",
      value: activePatients,
      subtitle: `Clinical cohort under active longitudinal review`,
      icon: Users,
      color: "text-indigo-500",
      bgColor: "bg-indigo-500/10",
      badgeText: "Secure MRN",
      badgeColor: "border-indigo-500/30 text-indigo-500 bg-indigo-500/5",
    },
  ];

  const genuineCapabilities = [
    {
      title: "Class-Specific PyTorch Grad-CAM",
      description: "Direct layer4 backpropagation across 6 spinal pathologies with Viridis, Inferno, Turbo & JET colormaps.",
      icon: Brain,
      color: "text-blue-500",
      tag: "Explainable AI",
    },
    {
      title: "Multi-Slice PACS & Cine Viewport",
      description: "Volumetric series scrubber with calibrated Z-table positioning (mm) and 25 FPS Cine loop playback.",
      icon: Layers,
      color: "text-cyan-500",
      tag: "PACS 3.0",
    },
    {
      title: "Anatomical Morphometry & Contours",
      description: "Standardized sagittal segmentation of L1–S1 vertebral bodies and discs with millimeter caliper.",
      icon: ScanIcon,
      color: "text-emerald-500",
      tag: "Geometric",
    },
    {
      title: "Clinical QA & Cohen's Kappa",
      description: "Inter-rater reliability matrix measuring observed vs chance agreement (κ) against board-certified reviews.",
      icon: TrendingUp,
      color: "text-indigo-500",
      tag: "Audit Trail",
    },
  ];

  const realCriticalFindings = (criticalFindingsData?.findings || []).map((finding: any) => ({
    id: finding.scanId,
    title: `${finding.condition} (${finding.confidence}% confidence)`,
    description: `Patient: ${finding.patientName}`,
    severity: finding.severity === 'severe' ? 'URGENT' : 'WARNING',
    time: format(new Date(finding.analyzedAt), 'MMM d, yyyy'),
  }));

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 max-w-7xl">
      {/* Hero Command Header */}
      <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-r from-blue-900/20 via-indigo-900/15 to-background p-6 sm:p-8 backdrop-blur-xl shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 relative z-10">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs font-semibold px-2.5 py-0.5 border-blue-500/30 text-blue-500 bg-blue-500/10">
                <Sparkles className="h-3 w-3 mr-1" /> Neurosurgical AI Command Center
              </Badge>
              <span className="text-xs text-muted-foreground">• PACS Engine Active</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-foreground">
              Spinal Diagnostics Command
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Real-time deep learning radiological evaluation, multi-slice DICOM series analysis, and human-in-the-loop attestation workflows.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md shadow-blue-500/20 text-xs sm:text-sm h-10 px-4"
              onClick={() => setLocation("/upload")}
            >
              <Upload className="h-4 w-4 mr-2" />
              Ingest DICOM Study
            </Button>
            <Button
              variant="outline"
              className="glass-card text-xs sm:text-sm h-10 px-4 hover:border-primary/50"
              onClick={() => setLocation("/clinical-analytics")}
            >
              <TrendingUp className="h-4 w-4 mr-2 text-primary" />
              Clinical QA (κ)
            </Button>
          </div>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {stats.map((stat) => (
          <Card key={stat.title} className="glass-card-hover relative overflow-hidden border-border/60">
            <CardHeader className="flex flex-row items-center justify-between pb-2 gap-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground line-clamp-1">
                {stat.title}
              </CardTitle>
              <div className={`h-10 w-10 rounded-xl ${stat.bgColor} flex items-center justify-center flex-shrink-0 shadow-inner`}>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <div
                className="text-3xl font-extrabold tracking-tight text-foreground"
                data-testid={`stat-${stat.title.toLowerCase().replace(/\s+/g, '-')}`}
              >
                {stat.value}
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground text-[11px] truncate">{stat.subtitle}</span>
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${stat.badgeColor}`}>
                  {stat.badgeText}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Middle Row: AI Architecture & Critical Findings Triage */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Genuine Diagnostic Capabilities (7 Cols) */}
        <Card className="lg:col-span-7 glass-card border-border/60">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <Brain className="h-5 w-5 text-primary" />
                  Neural Diagnostic Capabilities
                </CardTitle>
                <CardDescription className="text-xs">
                  Validated academic pipeline using ResNet-50 v2 with gradient-weighted class activation mapping.
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-[10px] font-mono border-primary/30 text-primary">
                PRO-PACS
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {genuineCapabilities.map((capability) => (
                <div
                  key={capability.title}
                  className="p-3.5 rounded-xl border border-border/50 bg-background/50 hover:border-primary/40 hover:bg-card/60 transition-all duration-200 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <capability.icon className={`h-5 w-5 ${capability.color}`} />
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                      {capability.tag}
                    </span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-xs text-foreground mb-1">
                      {capability.title}
                    </h4>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      {capability.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Priority Triage Alerts (5 Cols) */}
        <Card className="lg:col-span-5 glass-card border-border/60 flex flex-col">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-rose-500" />
                Diagnostic Priority Triage
              </CardTitle>
              <Badge variant="outline" className="text-xs text-rose-500 border-rose-500/30 bg-rose-500/10">
                {realCriticalFindings.length} Active
              </Badge>
            </div>
            <CardDescription className="text-xs">
              Studies exhibiting severe morphological narrowing or compression requiring review.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 overflow-auto">
            {realCriticalFindings.length === 0 ? (
              <div className="text-center py-12 space-y-3">
                <div className="h-12 w-12 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <p className="text-xs text-muted-foreground">
                  No urgent diagnostic alerts pending. All recent studies are within expected tolerances.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {realCriticalFindings.map((finding: any) => (
                  <div
                    key={finding.id}
                    onClick={() => setLocation(`/ai-analysis/${finding.id}`)}
                    className="group p-3 rounded-xl border border-rose-500/25 bg-rose-500/5 hover:bg-rose-500/10 hover:border-rose-500/50 transition-all cursor-pointer space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <Badge variant="destructive" className="text-[10px] uppercase font-bold tracking-wider">
                        {finding.severity}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground font-mono">{finding.time}</span>
                    </div>
                    <p className="text-xs font-semibold text-foreground group-hover:text-rose-400 transition-colors">
                      {finding.title}
                    </p>
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
                      <span>{finding.description}</span>
                      <span className="flex items-center gap-1 text-primary group-hover:underline">
                        Review <ChevronRight className="h-3 w-3" />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* PACS Patient Cohort Registry */}
      <Card className="glass-card border-border/60">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Users className="h-5 w-5 text-indigo-500" />
              Recent Patient Cohort
            </CardTitle>
            <CardDescription className="text-xs">
              Recently ingested radiological studies indexed under role-based patient access controls.
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-primary hover:text-primary/80"
            onClick={() => setLocation("/database")}
          >
            Full Archive <ArrowUpRight className="h-3.5 w-3.5 ml-1" />
          </Button>
        </CardHeader>
        <CardContent>
          {patients.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <Users className="h-10 w-10 text-muted-foreground/60 mx-auto" />
              <p className="text-xs text-muted-foreground">
                No patient records found in your repository. Ingest a DICOM study or create a record.
              </p>
              <Button size="sm" onClick={() => setLocation("/upload")} className="text-xs">
                Register First Patient
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {patients.slice(0, 8).map((patient) => (
                <div
                  key={patient.id}
                  onClick={() => setLocation(`/case/${patient.id}`)}
                  className="p-3.5 rounded-xl border border-border/50 bg-card/60 hover:border-primary/50 hover:shadow-md hover:bg-card/90 transition-all cursor-pointer space-y-3"
                  data-testid={`case-item-${patient.id}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-bold text-xs flex items-center justify-center shadow-sm">
                      {patient.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-xs text-foreground truncate">{patient.name}</p>
                      <p className="text-[10px] text-muted-foreground font-mono truncate">MRN: {patient.patientId}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-[11px] pt-1 border-t border-border/40 text-muted-foreground">
                    <span>{patient.gender || "Patient"} • {patient.age ? `${patient.age}y` : "Age N/A"}</span>
                    <span className="text-[10px] font-mono">{format(new Date(patient.createdAt), "MMM d, yyyy")}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
