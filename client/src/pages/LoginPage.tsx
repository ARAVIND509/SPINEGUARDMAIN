import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { insertUserSchema, InsertUser } from "@shared/schema";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Brain,
  Stethoscope,
  ShieldCheck,
  Loader2,
  Lock,
  Sparkles,
  Layers,
  Activity,
  Cpu,
  CheckCircle2
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";

export default function LoginPage() {
  const { user, loginMutation } = useAuth();
  const [, setLocation] = useLocation();

  if (user) {
    setLocation("/");
    return null;
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-12 bg-slate-950 text-slate-50 overflow-hidden relative">
      {/* Ambient background glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Left 7 Columns: Futuristic Clinical Brand Presentation */}
      <div className="relative hidden lg:flex lg:col-span-7 flex-col justify-between p-12 overflow-hidden border-r border-slate-800/60 bg-gradient-to-br from-slate-950 via-slate-900/90 to-slate-950">
        <div className="flex items-center gap-3 relative z-10">
          <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25">
            <Stethoscope className="h-5 w-5" />
          </div>
          <div>
            <span className="font-bold text-base tracking-tight text-white flex items-center gap-1.5">
              SpineGuard AI <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30 font-mono">PRO</span>
            </span>
            <p className="text-[11px] text-slate-400">Radiological Deep Learning Workstation</p>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="relative z-10 max-w-lg space-y-6 my-auto"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-blue-500/30 bg-blue-500/10 text-xs text-blue-400">
            <Sparkles className="h-3.5 w-3.5" />
            <span>ResNet-50 v2 • Layer4 Grad-CAM Attestation</span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Next-Generation <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-indigo-300 to-cyan-400">
              Spinal Diagnostics
            </span>
          </h1>

          <p className="text-sm text-slate-400 leading-relaxed">
            Engineered for board-certified radiologists and neurosurgeons. Real-time class-specific explainability heatmaps, multi-slice DICOM series cine navigation, and human-in-the-loop attestation.
          </p>

          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-800/60">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-slate-300 flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> Multi-Class
              </p>
              <p className="text-[11px] text-slate-500">6 spine pathologies with PyTorch gradients</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold text-slate-300 flex items-center gap-1">
                <Layers className="h-3.5 w-3.5 text-cyan-400" /> Cine Loop
              </p>
              <p className="text-[11px] text-slate-500">25 FPS volumetric multi-slice scrubber</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold text-slate-300 flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5 text-indigo-400" /> Audit Trail
              </p>
              <p className="text-[11px] text-slate-500">Cohen's Kappa (κ) reliability matrix</p>
            </div>
          </div>
        </motion.div>

        {/* Footer badges */}
        <div className="flex items-center gap-4 text-xs text-slate-500 relative z-10 font-mono text-[11px]">
          <span>HIPAA SECURITY RULE</span>
          <span>•</span>
          <span>DICOM 3.0 READY</span>
          <span>•</span>
          <span>RBAC TENANCY</span>
        </div>
      </div>

      {/* Right 5 Columns: Authentication Station */}
      <div className="lg:col-span-5 flex items-center justify-center p-6 sm:p-12 relative z-10 bg-slate-900/40 backdrop-blur-2xl">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-sm space-y-6"
        >
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center h-12 w-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 mb-2">
              <Lock className="h-6 w-6" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-white">
              Practitioner Portal
            </h2>
            <p className="text-xs text-slate-400">
              Sign in with your clinical credentials to access patient studies.
            </p>
          </div>

          <AuthForm
            onSubmit={(data) => loginMutation.mutate(data)}
            isLoading={loginMutation.isPending}
          />

          {/* Academic Prototype Notice */}
          <div className="p-3 rounded-lg border border-slate-800 bg-slate-950/60 text-[11px] text-slate-400 space-y-1">
            <p className="font-semibold text-slate-300 flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-blue-400" /> Investigational Academic Prototype
            </p>
            <p className="text-[10px] leading-relaxed">
              Default reviewer credentials: <code className="text-blue-400 font-mono">admin</code> / <code className="text-blue-400 font-mono">password123</code>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function AuthForm({
  onSubmit,
  isLoading
}: {
  onSubmit: (data: InsertUser) => void;
  isLoading: boolean;
}) {
  const form = useForm<InsertUser>({
    resolver: zodResolver(insertUserSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="username" className="text-xs font-medium text-slate-300">
            Username / Staff ID
          </Label>
          <Input
            id="username"
            {...form.register("username")}
            className="h-10 text-xs bg-slate-950 border-slate-800 text-white placeholder:text-slate-600 focus:border-blue-500 transition-colors"
            placeholder="e.g. dr_sarah"
          />
          {form.formState.errors.username && (
            <p className="text-[11px] text-rose-400 mt-1">{form.formState.errors.username.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password" className="text-xs font-medium text-slate-300">
            Password
          </Label>
          <Input
            id="password"
            type="password"
            {...form.register("password")}
            className="h-10 text-xs bg-slate-950 border-slate-800 text-white placeholder:text-slate-600 focus:border-blue-500 transition-colors"
            placeholder="••••••••••••"
          />
          {form.formState.errors.password && (
            <p className="text-[11px] text-rose-400 mt-1">{form.formState.errors.password.message}</p>
          )}
        </div>
      </div>

      <Button
        type="submit"
        className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 h-10 text-xs font-semibold transition-all duration-300 shadow-md shadow-blue-500/20"
        disabled={isLoading}
      >
        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        Authenticate to Station
      </Button>

      <Button
        type="button"
        variant="outline"
        className="w-full h-10 text-xs border-slate-700 hover:bg-slate-800 text-slate-300 gap-1.5"
        disabled={isLoading}
        onClick={() => {
          form.setValue("username", "admin");
          form.setValue("password", "password123");
          onSubmit({ username: "admin", password: "password123", role: "admin" });
        }}
      >
        <Sparkles className="h-3.5 w-3.5 text-blue-400" />
        <span>1-Click Reviewer Demo Sign-In</span>
      </Button>
    </form>
  );
}
