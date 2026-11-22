import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Heart,
  HelpCircle,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  Info,
  ChevronDown,
  ChevronUp,
  Stethoscope,
  ShieldAlert,
  ArrowRight,
  BookOpen,
  Activity,
  UserCheck,
  Split
} from "lucide-react";
import type { AnalysisResults, ClinicalFinding } from "@shared/schema";

interface PatientFriendlySummaryProps {
  results: AnalysisResults;
  patientName?: string;
}

// Plain-English glossary and translations
const PLAIN_ENGLISH_CONDITIONS: Record<string, {
  friendlyName: string;
  simpleExplanation: string;
  analogy: string;
  whyItHurts: string;
  commonSymptoms: string[];
  helpfulActions: string[];
  avoidActions: string[];
}> = {
  "Disc Herniation": {
    friendlyName: "Slipped or Bulging Disc",
    simpleExplanation: "A soft cushion between your spine bones has bulged out of its normal position and is pressing against nearby nerves.",
    analogy: "Think of your spinal disc like a jelly doughnut. Under pressure, some of the soft jelly is squeezing outward and touching the sensitive nerve wire next to it.",
    whyItHurts: "Even though the bulge is in your lower back, the pressed nerve travels down your leg — which is why you may feel pain in your buttock, thigh, or foot (Sciatica).",
    commonSymptoms: ["Sharp or burning pain down one leg", "Numbness or tingling in the foot or toes", "Pain that feels worse when coughing or sitting"],
    helpfulActions: ["Gentle walking for 15-20 minutes", "Ice pack on your lower back for 15 minutes", "Sleep on your side with a pillow between your knees"],
    avoidActions: ["Bending forward to lift heavy objects", "Sitting on soft, unsupported couches for long periods", "Sudden twisting of your waist"]
  },
  "Spinal Stenosis": {
    friendlyName: "Narrowing of the Nerve Tunnel",
    simpleExplanation: "The bony canal or tunnel where your spinal nerves travel has become narrower than normal, squeezing the nerves.",
    analogy: "Imagine traffic entering a tunnel where one lane is closed. The nerves don't have enough room to move freely, especially when standing straight.",
    whyItHurts: "When you stand or walk, the spine naturally pinches the tunnel more. Leaning forward (like pushing a shopping cart) opens the tunnel and brings relief.",
    commonSymptoms: ["Aching, heaviness, or weakness in both legs when walking", "Tingling or numbness in legs that improves when you sit down", "Lower back stiffness"],
    helpfulActions: ["Resting by sitting down or leaning slightly forward", "Low-impact stationary cycling or swimming", "Physical therapy for core support"],
    avoidActions: ["Walking long distances without resting", "Arching your back backwards", "High-impact running on hard pavement"]
  },
  "Degenerative Disc Disease": {
    friendlyName: "Natural Disc Wear and Tear",
    simpleExplanation: "The shock-absorbing cushions between your spine bones have dried out and thinned over time, similar to tires wearing down with mileage.",
    analogy: "Just like brake pads or shock absorbers on a car gradually wear thin after many years, your spinal cushions lose some of their water and thickness.",
    whyItHurts: "With less cushion between the bones, the spine joints experience more friction and pressure, leading to stiffness and inflammation.",
    commonSymptoms: ["Dull, constant ache in the lower back", "Morning back stiffness that eases as you move around", "Pain that worsens with prolonged sitting"],
    helpfulActions: ["Gentle morning stretching and hamstring stretches", "Staying well-hydrated throughout the day", "Using a lumbar roll behind your lower back while sitting"],
    avoidActions: ["Staying completely in bed all day (gentle movement is better)", "Heavy jarring jumps", "Slouching at a desk without back support"]
  },
  "Scoliosis": {
    friendlyName: "Curvature of the Spine",
    simpleExplanation: "Instead of running straight down the middle of your back, the spine has an 'S' or 'C' shaped sideways curve.",
    analogy: "Like a tree trunk that has grown with a gentle curve, one side of the back carries more weight and tension than the other side.",
    whyItHurts: "The muscles on one side of the curve work twice as hard to keep you upright, causing muscle fatigue, spasms, and uneven joint pressure.",
    commonSymptoms: ["One shoulder or hip appearing slightly higher than the other", "Muscle tightness or aches on one side of the back", "Uneven waistline"],
    helpfulActions: ["Postural physical therapy (Schroth exercises)", "Core and abdominal strengthening", "Swimming to gently elongate the back"],
    avoidActions: ["Carrying a heavy backpack or purse on only one shoulder", "Repetitive one-sided twisting sports without warm-up", "Poor ergonomic sitting"]
  },
  "Vertebral Fracture": {
    friendlyName: "Bone Crack or Compression Fracture",
    simpleExplanation: "One of the cylindrical bones in your spine has a small crack or has collapsed under pressure, often linked to an injury or osteoporosis.",
    analogy: "Think of an empty soda can that has been lightly stepped on — the bone height has compressed slightly.",
    whyItHurts: "The bone has tiny nerves inside it that signal pain when compressed, and surrounding back muscles tense up into a spasm to protect it.",
    commonSymptoms: ["Sudden, sharp onset of back pain after a fall, cough, or twist", "Pain that sharply intensifies when standing or walking", "Decreased height over time"],
    helpfulActions: ["Prompt evaluation by a physician or orthopedist", "Doctor-recommended back brace if prescribed", "Adequate calcium and Vitamin D under medical guidance"],
    avoidActions: ["Strenuous lifting, bending, or high-impact jarring", "Attempting to 'crack' or pop your own back", "Delaying doctor evaluation"]
  },
  "Spondylolisthesis": {
    friendlyName: "Slipped Spinal Bone",
    simpleExplanation: "One spinal vertebra has slid forward slightly over the bone directly beneath it, causing instability and stretching nearby nerves.",
    analogy: "Imagine a stack of building blocks where one block in the middle has nudged forward out of alignment.",
    whyItHurts: "The bone slippage can narrow the nerve exit holes and cause back muscles to work overtime trying to stabilize the joint.",
    commonSymptoms: ["Lower back tenderness and tight hamstrings", "Pain that increases when leaning backward", "Tingling or weakness in the legs"],
    helpfulActions: ["Core-strengthening exercises (planks, pelvic tilts)", "Hamstring flexibility stretching", "Consultation with a spine specialist"],
    avoidActions: ["Gymnastics backbends, arching backward", "Heavy deadlifts or powerlifting", "High-impact jumping without support"]
  }
};

export function PatientFriendlySummary({ results, patientName }: PatientFriendlySummaryProps) {
  const [expandedSection, setExpandedSection] = useState<string | null>("summary");

  const primary = results?.primaryFinding;
  const conditionName = primary?.condition || "Disc Herniation";
  const info = PLAIN_ENGLISH_CONDITIONS[conditionName] || {
    friendlyName: conditionName,
    simpleExplanation: "A change in spinal anatomy has been detected on your scan.",
    analogy: "Your spine bones and cushions are working under altered pressure.",
    whyItHurts: "Nerves and muscles in your back can become irritated by alignment or disc changes.",
    commonSymptoms: ["Lower back pain or stiffness", "Tingling or discomfort when sitting or standing"],
    helpfulActions: ["Consulting a qualified physician", "Gentle stretching and walking"],
    avoidActions: ["Heavy lifting and sudden twisting"]
  };

  const severity = (primary?.severity || "mild").toLowerCase();
  const severityConfig = {
    severe: {
      label: "Significant (Needs Doctor Attention)",
      color: "bg-rose-500 text-white",
      border: "border-rose-500/40 bg-rose-500/5",
      badge: "border-rose-500/30 text-rose-500 bg-rose-500/10",
      advice: "This scan shows significant nerve or bone involvement. We strongly advise sharing this report with your spine doctor, orthopedic specialist, or neurologist for a personalized treatment plan."
    },
    moderate: {
      label: "Moderate (Noticeable Finding)",
      color: "bg-amber-500 text-white",
      border: "border-amber-500/40 bg-amber-500/5",
      badge: "border-amber-500/30 text-amber-500 bg-amber-500/10",
      advice: "A clear condition was found that often responds well to non-surgical treatments like physical therapy, targeted exercises, and posture changes under medical guidance."
    },
    mild: {
      label: "Mild (Early or Minor Finding)",
      color: "bg-emerald-500 text-white",
      border: "border-emerald-500/40 bg-emerald-500/5",
      badge: "border-emerald-500/30 text-emerald-500 bg-emerald-500/10",
      advice: "This is an early or minor finding. Many people improve with simple daily lifestyle adjustments, ergonomic seating, and gentle core strengthening."
    },
    normal: {
      label: "Healthy / Cleared",
      color: "bg-emerald-500 text-white",
      border: "border-emerald-500/40 bg-emerald-500/5",
      badge: "border-emerald-500/30 text-emerald-500 bg-emerald-500/10",
      advice: "No major spinal problems were found on this scan. Your spine cushions and alignment look clear for this scan angle."
    }
  }[severity] || {
    label: "Noticeable Finding",
    color: "bg-blue-500 text-white",
    border: "border-blue-500/40 bg-blue-500/5",
    badge: "border-blue-500/30 text-blue-500 bg-blue-500/10",
    advice: "Please consult with your physician to review these findings in the context of your symptoms."
  };

  return (
    <div className="space-y-6">
      {/* Hero Plain English Card */}
      <div className={`p-6 sm:p-8 rounded-3xl border ${severityConfig.border} shadow-xl backdrop-blur-xl relative overflow-hidden space-y-6`}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20 flex items-center gap-1.5">
                <Heart className="h-3.5 w-3.5 text-rose-500 fill-rose-500" /> Patient-Friendly Guide
              </span>
              <span className="text-xs text-muted-foreground">• Clear English Translation</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
              What Does My Scan Mean?
            </h2>
          </div>

          <Badge className={`text-xs font-bold px-3 py-1.5 rounded-xl ${severityConfig.color} shadow-sm`}>
            {severityConfig.label}
          </Badge>
        </div>

        {/* Big Plain Summary Callout */}
        <div className="p-5 rounded-2xl bg-card/80 border border-border/60 space-y-3 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 mt-0.5">
              <Stethoscope className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Primary Diagnosis in Plain Words:
              </p>
              <h3 className="text-xl font-bold text-foreground">
                {info.friendlyName} <span className="text-sm font-normal text-muted-foreground font-mono">({conditionName})</span>
              </h3>
              <p className="text-sm text-foreground/90 leading-relaxed pt-1">
                {info.simpleExplanation}
              </p>
            </div>
          </div>

          {/* Everyday Analogy */}
          <div className="p-3.5 rounded-xl bg-muted/40 border border-border/40 text-xs text-muted-foreground leading-relaxed flex items-start gap-2.5">
            <Sparkles className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <strong className="text-foreground font-semibold">Everyday Analogy: </strong>
              {info.analogy}
            </div>
          </div>
        </div>

        {/* Why you might be feeling pain */}
        <div className="p-4 rounded-2xl bg-card/60 border border-border/50 text-xs space-y-1.5">
          <p className="font-bold text-foreground flex items-center gap-1.5">
            <Info className="h-4 w-4 text-blue-500" /> Why does this cause pain or tingling?
          </p>
          <p className="text-muted-foreground leading-relaxed">
            {info.whyItHurts}
          </p>
        </div>

        {/* What to do & what to avoid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Helpful actions */}
          <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 space-y-2.5">
            <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4" /> Helpful Self-Care Tips
            </p>
            <ul className="space-y-1.5 text-xs text-muted-foreground">
              {info.helpfulActions.map((act, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-emerald-500 font-bold">•</span>
                  <span>{act}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Things to avoid */}
          <div className="p-4 rounded-2xl bg-rose-500/5 border border-rose-500/20 space-y-2.5">
            <p className="text-xs font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
              <AlertTriangle className="h-4 w-4" /> What to Avoid for Now
            </p>
            <ul className="space-y-1.5 text-xs text-muted-foreground">
              {info.avoidActions.map((act, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-rose-500 font-bold">•</span>
                  <span>{act}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Doctor Advice Card */}
        <div className="p-4 rounded-2xl bg-primary/5 border border-primary/15 text-xs text-foreground space-y-1.5">
          <p className="font-bold text-primary flex items-center gap-1.5">
            <UserCheck className="h-4 w-4" /> Clinical Next Steps
          </p>
          <p className="text-muted-foreground leading-relaxed">
            {severityConfig.advice}
          </p>
        </div>
      </div>

      {/* Interactive Normal vs Affected Anatomy Visual Prompt */}
      <div className="p-5 rounded-3xl bg-gradient-to-r from-indigo-950/40 via-blue-950/30 to-purple-950/20 border border-indigo-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 shadow-inner">
            <Split className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
              See the Difference: Normal Spine vs. Your Scan
              <Badge variant="outline" className="bg-indigo-500/10 text-indigo-400 border-indigo-500/20 text-[9px] font-mono">
                SPLIT_CURTAIN
              </Badge>
            </h4>
            <p className="text-xs text-muted-foreground">
              Compare disc height, canal width, and nerve spacing directly against a verified healthy spine below.
            </p>
          </div>
        </div>
        <Button
          size="sm"
          onClick={() => {
            window.scrollBy({ top: 600, behavior: "smooth" });
          }}
          className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs whitespace-nowrap shadow-sm self-stretch sm:self-auto"
        >
          Compare Anatomy <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
        </Button>
      </div>

      {/* Questions to Ask Your Doctor Section */}
      <Card className="glass-card border-border/60">
        <CardHeader>
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-indigo-500" />
            Questions to Ask Your Doctor at Your Next Visit
          </CardTitle>
          <CardDescription className="text-xs">
            Print or save these questions to discuss your scan with your physician or spine specialist.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {[
              "Does this scan finding match the exact symptoms and pain I am feeling?",
              "What are my non-surgical treatment options, such as physical therapy or targeted injections?",
              "Are there specific exercises or daily activities I should temporarily stop?",
              "What signs would indicate that this condition is improving or getting worse?",
              "Do I need follow-up imaging in 6 to 12 months?"
            ].map((question, idx) => (
              <div key={idx} className="p-3 rounded-xl border border-border/50 bg-background/50 flex items-start gap-2.5">
                <span className="h-5 w-5 rounded-full bg-primary/10 text-primary font-bold text-[10px] flex items-center justify-center flex-shrink-0 mt-0.5">
                  {idx + 1}
                </span>
                <p className="text-muted-foreground font-medium leading-relaxed">
                  {question}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Red Flag Emergency Warning */}
      <div className="p-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 text-xs space-y-1.5">
        <div className="flex items-center gap-2 text-rose-500 font-bold">
          <ShieldAlert className="h-4 w-4" />
          <span>When to Seek Immediate Emergency Medical Care</span>
        </div>
        <p className="text-muted-foreground leading-relaxed text-[11px]">
          If you experience <strong>sudden loss of bowel or bladder control</strong>, sudden progressive weakness in your leg (inability to lift your foot / "foot drop"), or numbness in your inner groin area ("saddle anesthesia"), seek immediate emergency medical care, as these may be signs of severe nerve compression (Cauda Equina Syndrome).
        </p>
      </div>
    </div>
  );
}
