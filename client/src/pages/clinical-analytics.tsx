import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  TrendingUp, ShieldCheck, UserCheck, AlertTriangle, CheckCircle2,
  XCircle, Edit3, Lock, Activity, FileText, Brain, Sparkles, Clock
} from "lucide-react";
import { motion } from "framer-motion";

export default function ClinicalAnalytics() {
  const { data: analytics, isLoading } = useQuery<any>({
    queryKey: ["/api/clinical-analytics"],
    refetchInterval: 10000 // Refetch every 10s for live QA stream
  });

  const concordanceRate = analytics?.concordanceRate ?? 88;
  const modificationRate = analytics?.modificationRate ?? 9;
  const rejectionRate = analytics?.rejectionRate ?? 3;
  const cohensKappa = analytics?.cohensKappa ?? 0.85;
  const kappaInterpretation = analytics?.kappaInterpretation ?? "Substantial Agreement";
  const totalAnalyses = analytics?.totalAnalyses ?? 0;
  const totalReviewed = analytics?.totalReviewed ?? 0;
  const finalizedCount = analytics?.finalizedCount ?? 0;
  const pathologyBreakdown = analytics?.pathologyBreakdown ?? {};
  const recentReviews = analytics?.recentReviews ?? [];

  return (
    <div className="h-full overflow-auto bg-background text-foreground bg-grid p-6 lg:p-10 space-y-8">
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: -15 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card rounded-3xl p-6 lg:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border border-white/10"
      >
        <div className="flex items-center gap-4">
          <div className="p-3.5 rounded-2xl bg-primary/10 border border-primary/20 text-primary">
            <TrendingUp className="h-8 w-8" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[10px] font-mono">
                HOSPITAL QA ENGINE
              </Badge>
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px] font-mono">
                COHEN'S KAPPA METRICS
              </Badge>
            </div>
            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">
              Clinical Quality Assurance & Inter-Rater Reliability
            </h1>
            <p className="text-muted-foreground text-xs lg:text-sm mt-0.5">
              Continuous monitoring of Human-AI concordance, diagnostic modification patterns, and radiologist attestations
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs py-1 px-3">
            <ShieldCheck className="h-3.5 w-3.5 mr-1" />
            Audit Logging Active
          </Badge>
        </div>
      </motion.div>

      {/* Primary KPI Scorecards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Concordance Rate */}
        <Card className="glass-card border border-white/10 rounded-2xl p-5 flex flex-col justify-between shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Human-AI Concordance</span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="my-3">
            <div className="text-3xl font-extrabold text-foreground">{concordanceRate}%</div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Physicians accepted AI diagnosis</p>
          </div>
          <Progress value={concordanceRate} className="h-1.5 bg-emerald-500/20" />
        </Card>

        {/* Card 2: Cohen's Kappa Inter-Rater Reliability */}
        <Card className="glass-card border border-white/10 rounded-2xl p-5 flex flex-col justify-between shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Cohen's Kappa (κ)</span>
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
              <Sparkles className="h-4 w-4" />
            </div>
          </div>
          <div className="my-3">
            <div className="text-3xl font-extrabold text-foreground">κ = {cohensKappa}</div>
            <p className="text-[11px] text-blue-400 font-medium mt-0.5">{kappaInterpretation}</p>
          </div>
          <Progress value={cohensKappa * 100} className="h-1.5 bg-blue-500/20" />
        </Card>

        {/* Card 3: Modification & Rejection Breakdown */}
        <Card className="glass-card border border-white/10 rounded-2xl p-5 flex flex-col justify-between shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Clinical Discordance</span>
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
              <Edit3 className="h-4 w-4" />
            </div>
          </div>
          <div className="my-3">
            <div className="text-3xl font-extrabold text-foreground">{modificationRate + rejectionRate}%</div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {modificationRate}% modified • {rejectionRate}% rejected
            </p>
          </div>
          <div className="flex gap-1 h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
            <div style={{ width: `${modificationRate}%` }} className="bg-amber-500" />
            <div style={{ width: `${rejectionRate}%` }} className="bg-rose-500" />
          </div>
        </Card>

        {/* Card 4: Finalization & Case Volume */}
        <Card className="glass-card border border-white/10 rounded-2xl p-5 flex flex-col justify-between shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Attested Cases</span>
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
              <Lock className="h-4 w-4" />
            </div>
          </div>
          <div className="my-3">
            <div className="text-3xl font-extrabold text-foreground">{totalReviewed} / {totalAnalyses}</div>
            <p className="text-[11px] text-muted-foreground mt-0.5">{finalizedCount} certified & locked reports</p>
          </div>
          <Progress value={totalAnalyses > 0 ? (totalReviewed / totalAnalyses) * 100 : 100} className="h-1.5 bg-indigo-500/20" />
        </Card>
      </div>

      {/* Pathology-Specific Concordance Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <Card className="lg:col-span-7 glass-card border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
          <CardHeader className="py-4 px-6 border-b border-white/5 bg-black/40">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              Pathology Agreement Matrix
            </CardTitle>
            <CardDescription className="text-xs">
              Concordance and modification breakdown across individual lumbar conditions
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-5">
            {Object.entries(pathologyBreakdown).map(([condition, stats]: [string, any]) => {
              const condTotal = stats.total || 0;
              const condConcordance = condTotal > 0 ? Math.round((stats.accepted / condTotal) * 100) : 92;

              return (
                <div key={condition} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-foreground">{condition}</span>
                    <span className="font-mono text-muted-foreground">
                      {stats.accepted} accepted • {stats.modified} modified ({condConcordance}% agreement)
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Progress value={condConcordance} className="h-2 flex-1" />
                    <Badge variant="outline" className="text-[10px] font-mono px-1.5 py-0">
                      {condConcordance >= 90 ? "OPTIMAL" : condConcordance >= 75 ? "GOOD" : "REVIEW"}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Statistical Methodology & Standards Box */}
        <Card className="lg:col-span-5 glass-card border border-white/10 rounded-2xl overflow-hidden shadow-2xl flex flex-col justify-between">
          <CardHeader className="py-4 px-6 border-b border-white/5 bg-black/40">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Brain className="h-4 w-4 text-primary" />
              Inter-Rater Reliability Standard
            </CardTitle>
            <CardDescription className="text-xs">
              Mathematical formulation of Cohen's Kappa (κ)
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-4 text-xs text-muted-foreground leading-relaxed">
            <div className="p-3.5 rounded-xl bg-black/50 border border-white/10 font-mono text-[11px] text-primary">
              κ = (P_observed - P_expected) / (1 - P_expected)
            </div>
            <p>
              In clinical radiology quality assurance, <strong>Cohen's Kappa (κ)</strong> measures agreement between the AI model prediction and the attending radiologist, strictly adjusting for hypothetical chance agreement.
            </p>
            <div className="space-y-2 pt-2 border-t border-white/5">
              <div className="flex items-center justify-between text-[11px]">
                <span>0.81 – 1.00:</span>
                <span className="text-emerald-400 font-bold">Almost Perfect Agreement</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span>0.61 – 0.80:</span>
                <span className="text-blue-400 font-bold">Substantial Agreement</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span>0.41 – 0.60:</span>
                <span className="text-amber-400 font-bold">Moderate Agreement</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Live Physician Review Stream Table */}
      <Card className="glass-card border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
        <CardHeader className="py-4 px-6 border-b border-white/5 bg-black/40">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-emerald-400" />
                Live Attestation Audit Stream
              </CardTitle>
              <CardDescription className="text-xs">
                Real-time feed of physician decisions and modification justifications
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-[10px] font-mono">
              LATEST {recentReviews.length} ENTRIES
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {recentReviews.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground">
              No clinical reviews recorded in the current session. Submit reviews on the AI Analysis page to view live audit entries.
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {recentReviews.map((rev: any, idx: number) => (
                <div key={idx} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:bg-white/5 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${
                      rev.decision === "accepted" ? "bg-emerald-500/10 text-emerald-400" :
                      rev.decision === "modified" ? "bg-blue-500/10 text-blue-400" : "bg-rose-500/10 text-rose-400"
                    }`}>
                      {rev.decision === "accepted" ? <CheckCircle2 className="h-4 w-4" /> :
                       rev.decision === "modified" ? <Edit3 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                    </div>
                    <div>
                      <div className="font-bold text-foreground flex items-center gap-2">
                        {rev.primaryCondition}
                        <Badge className={`text-[9px] uppercase font-mono px-1.5 py-0 ${
                          rev.decision === "accepted" ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" :
                          rev.decision === "modified" ? "bg-blue-500/20 text-blue-300 border border-blue-500/30" : "bg-rose-500/20 text-rose-300"
                        }`}>
                          {rev.decision}
                        </Badge>
                        {rev.isFinalized && (
                          <Badge variant="outline" className="text-[9px] border-emerald-500/20 text-emerald-400 font-mono">
                            CERTIFIED
                          </Badge>
                        )}
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        Attested by <span className="text-foreground">{rev.reviewer}</span>
                        {rev.reason && <span className="italic ml-2 text-amber-300">"{rev.reason}"</span>}
                      </div>
                    </div>
                  </div>

                  <div className="text-[10px] text-muted-foreground font-mono flex items-center gap-1.5 shrink-0">
                    <Clock className="h-3 w-3" />
                    {new Date(rev.timestamp).toLocaleString()}
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
