import { Switch, Route } from "wouter";
import { useState, useEffect } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import Home from "@/pages/home";
import Upload from "@/pages/upload";
import CaseDetail from "@/pages/case-detail";
import Analysis from "@/pages/analysis";
import AIAnalysis from "@/pages/ai-analysis";
import Database from "@/pages/database";
import Reports from "@/pages/reports";
import Profile from "@/pages/profile";
import ClinicalAnalytics from "@/pages/clinical-analytics";
import LoginPage from "@/pages/LoginPage";
import NotFound from "@/pages/not-found";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { Loader2, Bell, User, Settings, LogOut, Plus, Search, Shield, Activity, Sparkles } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function AuthRedirect() {
  const [, setLocation] = useLocation();
  useEffect(() => {
    setLocation("/auth");
  }, [setLocation]);
  return null;
}

function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const style = {
    "--sidebar-width": "20rem",
    "--sidebar-width-icon": "4rem",
  };
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user, logoutMutation } = useAuth();

  const handleLogout = async () => {
    await logoutMutation.mutateAsync();
    toast({
      title: "Logged out successfully",
      description: "You have been logged out of your account.",
    });
    setLocation("/auth");
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <header className="flex items-center justify-between px-6 h-16 border-b border-border/60 bg-background/80 backdrop-blur-xl sticky top-0 z-40 transition-all">
            <div className="flex items-center gap-4 flex-1">
              <SidebarTrigger data-testid="button-sidebar-toggle" className="text-muted-foreground hover:text-foreground hover:bg-accent/60" />
              <div className="relative w-full max-w-md hidden sm:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/70" />
                <Input
                  placeholder="Search MRN, patient case, or DICOM study... (⌘K)"
                  className="pl-9 pr-12 h-9 bg-muted/40 border-border/50 text-xs focus:bg-background transition-all"
                  data-testid="input-search"
                />
                <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground/80 bg-background border rounded">
                  ⌘K
                </kbd>
              </div>

              {/* PACS Health Beacon */}
              <div className="hidden lg:flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-600 dark:text-emerald-400">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="font-medium text-[11px]">PACS Receiver Active</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button
                size="sm"
                className="hidden md:flex items-center gap-1.5 h-9 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-sm shadow-blue-500/20 text-xs"
                onClick={() => setLocation("/upload")}
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Ingest Study</span>
              </Button>

              <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-foreground" data-testid="button-notifications">
                <Bell className="h-4 w-4" />
              </Button>
              <ThemeToggle />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="flex items-center gap-2.5 pl-2.5 pr-2 py-1 h-10 rounded-xl hover:bg-accent/60 border border-border/40"
                    data-testid="button-profile"
                  >
                    <div className="text-right hidden sm:block">
                      <p className="text-xs font-semibold leading-tight">{user?.username || "Dr. Sarah Johnson"}</p>
                      <div className="flex items-center justify-end gap-1 mt-0.5">
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                        <p className="text-[10px] text-muted-foreground uppercase font-mono tracking-wider">
                          {user?.role || "Reviewer"}
                        </p>
                      </div>
                    </div>
                    <Avatar className="h-8 w-8 ring-2 ring-primary/20">
                      <AvatarFallback className="bg-gradient-to-br from-blue-600 to-indigo-600 text-white text-xs font-bold">
                        {(user?.username || "SJ").slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 glass-card p-1.5">
                  <DropdownMenuLabel className="px-2 py-1.5 text-xs text-muted-foreground">Clinical Account</DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-border/60" />
                  <DropdownMenuItem
                    data-testid="menu-profile"
                    className="text-xs cursor-pointer rounded-lg"
                    onClick={() => setLocation("/profile")}
                  >
                    <User className="mr-2 h-3.5 w-3.5 text-primary" />
                    <span>Practitioner Profile</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    data-testid="menu-settings"
                    className="text-xs cursor-pointer rounded-lg"
                    onClick={() => setLocation("/profile")}
                  >
                    <Settings className="mr-2 h-3.5 w-3.5 text-primary" />
                    <span>Station Settings</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-border/60" />
                  <DropdownMenuItem
                    data-testid="menu-logout"
                    className="text-xs cursor-pointer rounded-lg text-destructive focus:bg-destructive/10"
                    onClick={handleLogout}
                    disabled={logoutMutation.isPending}
                  >
                    <LogOut className="mr-2 h-3.5 w-3.5" />
                    <span>Sign Out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>
          <main className="flex-1 overflow-auto bg-background/60 clinical-gradient-bg">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function Router() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <Switch>
        <Route path="/auth" component={LoginPage} />
        <Route component={AuthRedirect} />
      </Switch>
    );
  }

  return (
    <AuthenticatedLayout>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/upload" component={Upload} />
        <Route path="/case/:id" component={CaseDetail} />
        <Route path="/analysis" component={Analysis} />
        <Route path="/ai-analysis/:scanId" component={AIAnalysis} />
        <Route path="/database" component={Database} />
        <Route path="/reports" component={Reports} />
        <Route path="/clinical-analytics" component={ClinicalAnalytics} />
        <Route path="/profile" component={Profile} />
        <Route path="/auth" component={LoginPage} />
        <Route component={NotFound} />
      </Switch>
    </AuthenticatedLayout>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Router />
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
