import {
  Activity,
  FileText,
  Database,
  LayoutDashboard,
  Upload,
  TrendingUp,
  Shield,
  Layers,
  Cpu,
  CheckCircle2,
  Stethoscope,
  Sparkles,
  Search,
  HardDrive
} from "lucide-react";
import { Link, useLocation } from "wouter";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";

const primaryNav = [
  {
    title: "Command Center",
    url: "/",
    icon: LayoutDashboard,
    badge: null,
  },
  {
    title: "Scan Ingestion",
    url: "/upload",
    icon: Upload,
    badge: "DICOM",
  },
  {
    title: "Diagnostic Viewport",
    url: "/analysis",
    icon: Activity,
    badge: "XAI",
  },
];

const intelligenceNav = [
  {
    title: "Clinical QA & Kappa",
    url: "/clinical-analytics",
    icon: TrendingUp,
    badge: "κ 0.85",
  },
  {
    title: "Diagnostic Reports",
    url: "/reports",
    icon: FileText,
    badge: "PDF",
  },
];

const registryNav = [
  {
    title: "Patient & PACS Archive",
    url: "/database",
    icon: Database,
    badge: null,
  },
];

export function AppSidebar() {
  const [location] = useLocation();

  return (
    <Sidebar className="border-r border-border/60 bg-sidebar/95 backdrop-blur-xl">
      <SidebarHeader className="border-b border-sidebar-border/60 p-5">
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center h-11 w-11 rounded-xl bg-gradient-to-br from-blue-600 via-indigo-600 to-cyan-500 text-white shadow-md shadow-blue-500/20">
            <Stethoscope className="h-6 w-6" />
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold tracking-tight text-sidebar-foreground truncate">
                SpineGuard
              </h2>
              <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-primary/15 text-primary border border-primary/30 rounded">
                PRO
              </span>
            </div>
            <p className="text-xs text-muted-foreground truncate">
              Radiology Neural PACS
            </p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-3 py-4 space-y-6">
        {/* Clinical Core Group */}
        <SidebarGroup className="p-0">
          <SidebarGroupLabel className="text-[11px] font-semibold tracking-wider uppercase text-muted-foreground/80 px-3 mb-1">
            Clinical Workspace
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {primaryNav.map((item) => {
                const isActive = location === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      className={`h-10 px-3 rounded-lg transition-all duration-200 ${
                        isActive
                          ? "bg-primary text-primary-foreground font-medium shadow-sm shadow-primary/25"
                          : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/60"
                      }`}
                      data-testid={`nav-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
                    >
                      <Link href={item.url} className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-3">
                          <item.icon className={`h-4 w-4 ${isActive ? "text-primary-foreground" : "text-muted-foreground"}`} />
                          <span className="text-sm">{item.title}</span>
                        </div>
                        {item.badge && (
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                              isActive
                                ? "bg-white/20 text-white"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Quality & Intelligence */}
        <SidebarGroup className="p-0">
          <SidebarGroupLabel className="text-[11px] font-semibold tracking-wider uppercase text-muted-foreground/80 px-3 mb-1">
            Governance & Quality
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {intelligenceNav.map((item) => {
                const isActive = location === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      className={`h-10 px-3 rounded-lg transition-all duration-200 ${
                        isActive
                          ? "bg-primary text-primary-foreground font-medium shadow-sm shadow-primary/25"
                          : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/60"
                      }`}
                      data-testid={`nav-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
                    >
                      <Link href={item.url} className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-3">
                          <item.icon className={`h-4 w-4 ${isActive ? "text-primary-foreground" : "text-muted-foreground"}`} />
                          <span className="text-sm">{item.title}</span>
                        </div>
                        {item.badge && (
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                              isActive
                                ? "bg-white/20 text-white"
                                : "bg-primary/10 text-primary font-medium"
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Registry & Archive */}
        <SidebarGroup className="p-0">
          <SidebarGroupLabel className="text-[11px] font-semibold tracking-wider uppercase text-muted-foreground/80 px-3 mb-1">
            Patient Repositories
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {registryNav.map((item) => {
                const isActive = location === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      className={`h-10 px-3 rounded-lg transition-all duration-200 ${
                        isActive
                          ? "bg-primary text-primary-foreground font-medium shadow-sm shadow-primary/25"
                          : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/60"
                      }`}
                      data-testid={`nav-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
                    >
                      <Link href={item.url} className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-3">
                          <item.icon className={`h-4 w-4 ${isActive ? "text-primary-foreground" : "text-muted-foreground"}`} />
                          <span className="text-sm">{item.title}</span>
                        </div>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Telemetry Status Card */}
        <div className="p-3.5 rounded-xl border border-border/60 bg-card/60 backdrop-blur-md space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5">
              <Cpu className="h-3.5 w-3.5 text-primary" /> Inference Engine
            </span>
            <Badge variant="outline" className="text-[10px] text-emerald-500 border-emerald-500/30 bg-emerald-500/10">
              Online
            </Badge>
          </div>
          <div className="space-y-1.5 text-[11px]">
            <div className="flex items-center justify-between text-muted-foreground">
              <span>Model</span>
              <span className="font-mono text-foreground font-medium">ResNet-50 v2</span>
            </div>
            <div className="flex items-center justify-between text-muted-foreground">
              <span>Backprop</span>
              <span className="font-mono text-foreground font-medium">Layer4 XAI</span>
            </div>
            <div className="flex items-center justify-between text-muted-foreground">
              <span>PACS Pipeline</span>
              <span className="font-mono text-emerald-500 font-medium">DICOM 3.0</span>
            </div>
          </div>
        </div>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border/60 p-4">
        <div className="rounded-lg p-3 bg-muted/40 border border-border/50 text-[11px] space-y-1">
          <div className="flex items-center gap-1.5 font-semibold text-foreground">
            <Shield className="h-3.5 w-3.5 text-blue-500" />
            <span>Investigational Medical Device</span>
          </div>
          <p className="text-muted-foreground leading-relaxed text-[10px]">
            Academic research prototype. AI predictions require clinical physician attestation before diagnostic use.
          </p>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
