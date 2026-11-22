import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Search,
  Users,
  FileText,
  ChevronDown,
  ChevronUp,
  Brain,
  HardDrive,
  Calendar,
  Layers,
  ArrowUpRight,
  ShieldCheck,
  Activity,
  Scan as ScanIcon
} from "lucide-react";
import { Link, useLocation } from "wouter";
import type { Patient, Scan } from "@shared/schema";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

export default function Database() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterMode, setFilterMode] = useState<"all" | "recent">("all");
  const [expandedPatients, setExpandedPatients] = useState<Set<string>>(new Set());
  const [, navigate] = useLocation();

  const { data: patients = [] } = useQuery<Patient[]>({
    queryKey: ["/api/patients"],
  });

  const filteredPatients = patients.filter(patient => {
    const matchesSearch =
      patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient.patientId.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;

    if (filterMode === "recent") {
      const monthAgo = new Date();
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      return new Date(patient.createdAt) > monthAgo;
    }
    return true;
  });

  const togglePatient = (patientId: string) => {
    setExpandedPatients(prev => {
      const newSet = new Set(prev);
      if (newSet.has(patientId)) {
        newSet.delete(patientId);
      } else {
        newSet.add(patientId);
      }
      return newSet;
    });
  };

  const monthAgo = new Date();
  monthAgo.setMonth(monthAgo.getMonth() - 1);
  const thisMonthCount = patients.filter(p => new Date(p.createdAt) > monthAgo).length;

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="text-xs font-semibold px-2 py-0.5 border-primary/30 text-primary bg-primary/5">
              <HardDrive className="h-3 w-3 mr-1" /> PACS Clinical Archive
            </Badge>
            <span className="text-xs text-muted-foreground">• RBAC Secured</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            Patient & DICOM Database
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Longitudinal spinal study archive, metadata indexing, and multi-slice scan registry.
          </p>
        </div>

        <Button
          onClick={() => navigate("/upload")}
          className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md shadow-blue-500/20 text-xs sm:text-sm"
        >
          <Plus className="h-4 w-4 mr-2" />
          Register New Patient
        </Button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
        <Card className="glass-card-hover border-border/60">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total Patients
            </CardTitle>
            <div className="h-9 w-9 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Users className="h-4 w-4 text-blue-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold tracking-tight" data-testid="stat-total-patients">
              {patients.length}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Indexed with role-based access authorization
            </p>
          </CardContent>
        </Card>

        <Card className="glass-card-hover border-border/60">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Active Cases
            </CardTitle>
            <div className="h-9 w-9 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <FileText className="h-4 w-4 text-emerald-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold tracking-tight text-emerald-500" data-testid="stat-active-cases">
              {patients.length}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Active spinal monitoring & evaluation cohorts
            </p>
          </CardContent>
        </Card>

        <Card className="glass-card-hover border-border/60">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              This Month
            </CardTitle>
            <div className="h-9 w-9 rounded-lg bg-indigo-500/10 flex items-center justify-center">
              <Calendar className="h-4 w-4 text-indigo-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold tracking-tight text-indigo-500" data-testid="stat-this-month">
              {thisMonthCount}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              New admissions in the last 30 days
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <Card className="glass-card border-border/60">
        <CardHeader className="p-4 sm:p-6 border-b border-border/50">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="text-base font-bold">Clinical Registry Index</CardTitle>
              <CardDescription className="text-xs">
                Search by patient legal name, clinical record number (MRN), or diagnostic case ID.
              </CardDescription>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex rounded-lg border border-border/60 p-0.5 bg-muted/40 text-xs">
                <button
                  type="button"
                  onClick={() => setFilterMode("all")}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                    filterMode === "all" ? "bg-background shadow-xs text-foreground font-semibold" : "text-muted-foreground"
                  }`}
                >
                  All Patients ({patients.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterMode("recent")}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                    filterMode === "recent" ? "bg-background shadow-xs text-foreground font-semibold" : "text-muted-foreground"
                  }`}
                >
                  Past 30 Days ({thisMonthCount})
                </button>
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Filter by name or MRN..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 h-9 w-52 sm:w-64 text-xs bg-muted/30 border-border/50"
                  data-testid="input-search-patients"
                />
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-6">
          {filteredPatients.length === 0 ? (
            <div className="text-center py-16 space-y-3">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground">
                <Users className="h-6 w-6" />
              </div>
              <p className="text-sm font-medium text-foreground">
                {searchTerm ? "No patient records match the search filter" : "No patient records registered yet"}
              </p>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                {searchTerm ? "Try modifying your query or clearing the filter." : "Create your first clinical case to begin storing and analyzing spinal studies."}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredPatients.map((patient) => (
                <PatientRow
                  key={patient.id}
                  patient={patient}
                  isExpanded={expandedPatients.has(patient.id)}
                  onToggle={() => togglePatient(patient.id)}
                  onNavigate={navigate}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

interface PatientRowProps {
  patient: Patient;
  isExpanded: boolean;
  onToggle: () => void;
  onNavigate: (path: string) => void;
}

function PatientRow({ patient, isExpanded, onToggle, onNavigate }: PatientRowProps) {
  const { data: scans = [] } = useQuery<Scan[]>({
    queryKey: ["/api/scans", patient.id],
    enabled: isExpanded,
  });

  return (
    <Collapsible open={isExpanded} onOpenChange={onToggle}>
      <div className={`rounded-xl border transition-all duration-200 overflow-hidden ${
        isExpanded ? "border-primary/50 bg-card shadow-md" : "border-border/60 bg-card/60 hover:border-primary/30"
      }`}>
        <CollapsibleTrigger className="w-full text-left" data-testid={`patient-row-${patient.id}`}>
          <div className="flex items-center justify-between p-4 sm:p-5">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-blue-600 via-indigo-600 to-cyan-500 text-white font-bold text-xs flex items-center justify-center shadow-sm flex-shrink-0">
                {patient.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-bold text-sm text-foreground truncate">{patient.name}</p>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-muted text-muted-foreground border">
                    MRN: {patient.patientId}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  {patient.gender || "Patient"} {patient.age ? `• ${patient.age} years old` : ""}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 flex-shrink-0">
              <div className="text-right hidden sm:block">
                <p className="text-[11px] text-muted-foreground">
                  Registered {format(new Date(patient.createdAt), "MMM d, yyyy")}
                </p>
                {scans.length > 0 && (
                  <p className="text-xs text-primary font-semibold">
                    {scans.length} DICOM {scans.length === 1 ? "study" : "studies"}
                  </p>
                )}
              </div>
              <div className="h-8 w-8 rounded-lg bg-muted/60 flex items-center justify-center text-muted-foreground">
                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </div>
            </div>
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="border-t border-border/50 p-4 sm:p-5 bg-muted/20 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground">
                  Associated Radiological Studies
                </h4>
                <Badge variant="secondary" className="text-[10px]">
                  {scans.length} Total
                </Badge>
              </div>

              <div className="flex items-center gap-2">
                <Link href={`/case/${patient.id}`}>
                  <Button size="sm" variant="outline" className="h-8 text-xs" data-testid={`button-view-case-${patient.id}`}>
                    Clinical Case View
                  </Button>
                </Link>
                <Link href={`/upload`}>
                  <Button size="sm" className="h-8 text-xs bg-primary" data-testid={`button-upload-scan-${patient.id}`}>
                    <Plus className="h-3.5 w-3.5 mr-1" /> Add Scan
                  </Button>
                </Link>
              </div>
            </div>

            {scans.length === 0 ? (
              <div className="text-center py-8 rounded-lg border border-dashed border-border/60 bg-background/50 space-y-2">
                <ScanIcon className="h-7 w-7 text-muted-foreground/60 mx-auto" />
                <p className="text-xs text-muted-foreground">No scans uploaded for this patient yet.</p>
                <Link href={`/case/${patient.id}`}>
                  <Button size="sm" variant="outline" className="text-xs">
                    Ingest Scan Study
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {scans.map((scan) => (
                  <div
                    key={scan.id}
                    className="flex items-center justify-between p-3.5 rounded-xl border border-border/60 bg-card hover:border-primary/40 transition-all shadow-xs"
                    data-testid={`scan-row-${scan.id}`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-14 w-14 rounded-lg overflow-hidden bg-black/80 border flex-shrink-0 relative">
                        <img
                          src={scan.imageUrl}
                          alt="Scan thumbnail"
                          className="h-full w-full object-cover"
                        />
                        <span className="absolute bottom-0 right-0 px-1 text-[8px] bg-black/75 text-white font-mono">
                          {scan.imageType.slice(0, 3)}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="font-semibold text-xs text-foreground truncate">{scan.imageType}</p>
                          <Badge variant="outline" className="text-[9px] px-1 py-0">
                            Sagittal
                          </Badge>
                        </div>
                        <p className="text-[10px] text-muted-foreground font-mono mt-0.5 truncate">
                          {format(new Date(scan.uploadedAt), "MMM d, yyyy 'at' h:mm a")}
                        </p>
                      </div>
                    </div>

                    <Button
                      size="sm"
                      className="h-8 text-xs bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all flex-shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        onNavigate(`/ai-analysis/${scan.id}`);
                      }}
                      data-testid={`button-analyze-${scan.id}`}
                    >
                      <Brain className="h-3.5 w-3.5 mr-1" />
                      Viewport
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
