import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  CheckCircle2, XCircle, Edit3, ShieldAlert, Lock, UserCheck,
  AlertTriangle, Clock, FileCheck, Brain, ArrowRight, ShieldCheck
} from "lucide-react";
import type { Analysis, AnalysisResults, ClinicalFinding, HumanReview } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface ReviewerWorkflowCardProps {
  analysis: Analysis;
  currentUser?: { id: string; username: string; role?: string } | null;
  onReviewUpdated?: () => void;
  className?: string;
}

export function ReviewerWorkflowCard({
  analysis,
  currentUser,
  onReviewUpdated,
  className = ""
}: ReviewerWorkflowCardProps) {
  const { toast } = useToast();
  const results = (analysis?.results || {}) as AnalysisResults;
  const humanReview = results.humanReview;

  const [decisionMode, setDecisionMode] = useState<"accepted" | "rejected" | "modified" | null>(null);
  const [modificationReason, setModificationReason] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const isFinalized = Boolean(humanReview?.isFinalized);
  const userRole = currentUser?.role || "reviewer";
  const canReview = userRole === "admin" || userRole === "reviewer";

  const handleReviewAction = async (decision: "accepted" | "rejected" | "modified") => {
    if (decision === "modified" && !modificationReason.trim()) {
      toast({
        title: "Clinical Justification Required",
        description: "Please document the reason for modifying the AI diagnostic finding.",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsSubmitting(true);
      await apiRequest("POST", `/api/analysis/${analysis.id}/review`, {
        decision,
        reasonForModification: modificationReason,
        modifiedFindings: decision === "modified" ? results.findings : undefined
      });

      toast({
        title: "Review Submitted",
        description: `Analysis finding successfully marked as ${decision.toUpperCase()}.`
      });

      setDecisionMode(null);
      setModificationReason("");
      queryClient.invalidateQueries({ queryKey: [`/api/analysis/${analysis.scanId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/scans"] });
      if (onReviewUpdated) onReviewUpdated();
    } catch (err: any) {
      toast({
        title: "Submission Error",
        description: err.message || "Failed to submit clinical review.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFinalize = async () => {
    try {
      setIsSubmitting(true);
      await apiRequest("POST", `/api/analysis/${analysis.id}/finalize`, {});

      toast({
        title: "Report Finalized",
        description: "The medical diagnostic report is now finalized and locked."
      });

      queryClient.invalidateQueries({ queryKey: [`/api/analysis/${analysis.scanId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/scans"] });
      if (onReviewUpdated) onReviewUpdated();
    } catch (err: any) {
      toast({
        title: "Finalization Error",
        description: err.message || "Failed to finalize report.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className={`glass-card border border-white/10 rounded-2xl overflow-hidden shadow-2xl ${className}`}>
      <CardHeader className="py-4 px-6 border-b border-white/5 bg-black/40">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20 text-primary">
              <UserCheck className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                Human-in-the-Loop Clinical Review
                {isFinalized ? (
                  <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono">
                    FINALIZED & LOCKED
                  </Badge>
                ) : humanReview ? (
                  <Badge className="bg-blue-500/20 text-blue-400 border border-blue-500/30 text-[10px] font-mono">
                    {humanReview.status.toUpperCase()}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-mono">
                    AWAITING HUMAN REVIEW
                  </Badge>
                )}
              </CardTitle>
              <CardDescription className="text-xs">
                Clinical decision audit trail: authentic AI findings paired with authorized physician sign-off
              </CardDescription>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-muted-foreground">
              Reviewer: <strong className="text-foreground">{currentUser?.username || "Authorized Physician"}</strong> ({userRole})
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-6 flex flex-col gap-6">
        {/* Review Workflow Stepper */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
          <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex flex-col items-center">
            <Brain className="h-5 w-5 text-primary mb-1.5" />
            <span className="text-xs font-bold">1. AI Model Run</span>
            <span className="text-[10px] text-muted-foreground font-mono">Deterministic ResNet-50</span>
          </div>

          <div className={`p-3 rounded-xl border flex flex-col items-center ${
            !humanReview ? "bg-amber-500/10 border-amber-500/30 text-amber-300" : "bg-white/5 border-white/10"
          }`}>
            <Clock className="h-5 w-5 mb-1.5" />
            <span className="text-xs font-bold">2. Clinical Review</span>
            <span className="text-[10px] text-muted-foreground font-mono">
              {!humanReview ? "Pending Sign-off" : "Completed"}
            </span>
          </div>

          <div className={`p-3 rounded-xl border flex flex-col items-center ${
            humanReview && !isFinalized ? "bg-blue-500/10 border-blue-500/30 text-blue-300" : "bg-white/5 border-white/10"
          }`}>
            <Edit3 className="h-5 w-5 mb-1.5" />
            <span className="text-xs font-bold">3. Physician Verdict</span>
            <span className="text-[10px] text-muted-foreground font-mono">
              {humanReview ? humanReview.decision.toUpperCase() : "Awaiting Action"}
            </span>
          </div>

          <div className={`p-3 rounded-xl border flex flex-col items-center ${
            isFinalized ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300" : "bg-white/5 border-white/10 opacity-60"
          }`}>
            <Lock className="h-5 w-5 mb-1.5" />
            <span className="text-xs font-bold">4. Final Sign-off</span>
            <span className="text-[10px] text-muted-foreground font-mono">
              {isFinalized ? "Locked & Certified" : "Unfinalized"}
            </span>
          </div>
        </div>

        {/* Existing Human Review Audit Details */}
        {humanReview && (
          <div className="p-4 rounded-xl bg-black/40 border border-white/10 flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-2">
              <span className="text-xs font-bold flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                Physician Attestation Record
              </span>
              <span className="text-[10px] font-mono text-muted-foreground">
                Recorded: {new Date(humanReview.reviewedAt).toLocaleString()}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
              <div>
                <span className="text-[10px] text-muted-foreground uppercase block">Decision</span>
                <span className="font-bold text-foreground uppercase">{humanReview.decision}</span>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground uppercase block">Reviewed By</span>
                <span className="text-foreground">{humanReview.reviewerUsername}</span>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground uppercase block">Report Version</span>
                <span className="text-foreground">{humanReview.reportVersion}</span>
              </div>
            </div>

            {humanReview.reasonForModification && (
              <div className="mt-1 p-3 bg-white/5 rounded-lg border border-white/5 text-xs">
                <span className="text-[10px] font-bold text-muted-foreground block mb-1">CLINICAL NOTES / REASON FOR MODIFICATION:</span>
                <p className="text-foreground/90 italic">{humanReview.reasonForModification}</p>
              </div>
            )}
          </div>
        )}

        {/* Reviewer Action Buttons (Disabled if already finalized or viewer) */}
        {!isFinalized && canReview && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <Button
                variant={decisionMode === "accepted" ? "default" : "outline"}
                className="gap-2 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white border-emerald-500/30"
                onClick={() => handleReviewAction("accepted")}
                disabled={isSubmitting}
              >
                <CheckCircle2 className="h-4 w-4" />
                Accept AI Findings
              </Button>

              <Button
                variant={decisionMode === "modified" ? "default" : "outline"}
                className="gap-2 bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white border-blue-500/30"
                onClick={() => setDecisionMode("modified")}
                disabled={isSubmitting}
              >
                <Edit3 className="h-4 w-4" />
                Modify Findings
              </Button>

              <Button
                variant={decisionMode === "rejected" ? "default" : "outline"}
                className="gap-2 bg-rose-600/20 hover:bg-rose-600 text-rose-400 hover:text-white border-rose-500/30"
                onClick={() => setDecisionMode("rejected")}
                disabled={isSubmitting}
              >
                <XCircle className="h-4 w-4" />
                Reject Findings
              </Button>

              {humanReview && (
                <Button
                  className="gap-2 ml-auto bg-primary hover:bg-primary/90 text-primary-foreground font-bold"
                  onClick={handleFinalize}
                  disabled={isSubmitting}
                >
                  <Lock className="h-4 w-4" />
                  Finalize & Lock Report
                </Button>
              )}
            </div>

            {/* Input box for Modification / Rejection Reason */}
            {(decisionMode === "modified" || decisionMode === "rejected") && (
              <div className="p-4 rounded-xl bg-white/5 border border-white/10 flex flex-col gap-3">
                <span className="text-xs font-bold flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-400" />
                  Document Clinical Justification for {decisionMode === "modified" ? "Modification" : "Rejection"}
                </span>
                <Textarea
                  placeholder="Enter physician observations, anatomical disagreement, or clinical notes..."
                  value={modificationReason}
                  onChange={(e) => setModificationReason(e.target.value)}
                  className="text-xs bg-black/40 border-white/10 min-h-[80px]"
                />
                <div className="flex justify-end gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setDecisionMode(null);
                      setModificationReason("");
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    className="bg-primary hover:bg-primary/90"
                    onClick={() => handleReviewAction(decisionMode)}
                    disabled={isSubmitting || !modificationReason.trim()}
                  >
                    Confirm {decisionMode.toUpperCase()}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* View-only Warning if user is read-only */}
        {userRole === "viewer" && !isFinalized && (
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400 text-xs flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>You are logged in with read-only access (Viewer). Clinical review sign-off requires Reviewer or Administrator credentials.</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
