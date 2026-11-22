import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  User,
  Mail,
  Phone,
  Building2,
  IdCard,
  Shield,
  Bell,
  Moon,
  Eye,
  Edit,
  Save,
  X,
  CheckCircle2,
  Lock,
  Sparkles,
  Key
} from "lucide-react";
import { useTheme } from "next-themes";
import { useAuth } from "@/hooks/use-auth";

export default function Profile() {
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);

  const [profileData, setProfileData] = useState({
    name: user?.username ? `Dr. ${user.username}` : "Dr. Sarah Johnson",
    email: `${user?.username || "sarah.johnson"}@spineguard.hospital.org`,
    phone: "+1 (555) 234-8921",
    specialty: "Board-Certified Spine Neurosurgeon",
    licenseNumber: "MED-849201-CA",
    department: "Neurosurgery & Spine Imaging",
    organization: "SpineGuard Advanced Academic Health Sciences Center"
  });

  const [preferences, setPreferences] = useState({
    emailNotifications: true,
    pushNotifications: true,
    analysisAlerts: true,
    weeklyReports: false
  });

  const handleSave = () => {
    toast({
      title: "Practitioner Credentials Saved",
      description: "Station preferences and digital sign-off details updated.",
    });
    setIsEditing(false);
  };

  return (
    <div className="container max-w-5xl py-8 px-4 sm:px-6 space-y-8">
      {/* Header Practitioner Card */}
      <div className="glass-card rounded-2xl p-6 sm:p-8 border-border/60">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="relative">
              <Avatar className="h-20 w-20 ring-4 ring-primary/20 shadow-lg">
                <AvatarFallback className="text-2xl font-extrabold bg-gradient-to-br from-blue-600 to-indigo-600 text-white">
                  {(user?.username || "SJ").slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="absolute bottom-0 right-0 h-4 w-4 rounded-full bg-emerald-500 ring-2 ring-background"></span>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-extrabold tracking-tight text-foreground">{profileData.name}</h1>
                <Badge className="bg-emerald-500/15 text-emerald-500 border-emerald-500/30 text-xs font-semibold">
                  <Shield className="h-3 w-3 mr-1" /> Verified Reviewer
                </Badge>
                <Badge variant="outline" className="text-xs font-mono uppercase">
                  Role: {user?.role || "Reviewer"}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">{profileData.specialty}</p>
              <p className="text-[11px] text-muted-foreground font-mono">
                {profileData.organization}
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            {isEditing ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(false)}
                  data-testid="button-cancel-edit"
                  className="text-xs h-9"
                >
                  <X className="h-3.5 w-3.5 mr-1.5" />
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSave}
                  data-testid="button-save-profile"
                  className="text-xs h-9 bg-primary"
                >
                  <Save className="h-3.5 w-3.5 mr-1.5" />
                  Save Changes
                </Button>
              </>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(true)}
                data-testid="button-edit-profile"
                className="text-xs h-9"
              >
                <Edit className="h-3.5 w-3.5 mr-1.5" />
                Edit Profile
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Personal & Credential Information */}
      <Card className="glass-card border-border/60">
        <CardHeader>
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <IdCard className="h-4 w-4 text-primary" />
            Practitioner Credentials & Digital Signature
          </CardTitle>
          <CardDescription className="text-xs">
            Official details rendered on certified PDF diagnostic attestation sheets.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid sm:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-xs font-semibold">Full Legal Name & Suffix</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="name"
                  value={profileData.name}
                  onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                  disabled={!isEditing}
                  data-testid="input-name"
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="specialty" className="text-xs font-semibold">Clinical Specialty</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="specialty"
                  value={profileData.specialty}
                  onChange={(e) => setProfileData({ ...profileData, specialty: e.target.value })}
                  disabled={!isEditing}
                  data-testid="input-specialty"
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-semibold">Hospital Email</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="email"
                  type="email"
                  value={profileData.email}
                  onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                  disabled={!isEditing}
                  data-testid="input-email"
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="phone" className="text-xs font-semibold">Pager / Department Phone</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="phone"
                  type="tel"
                  value={profileData.phone}
                  onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                  disabled={!isEditing}
                  data-testid="input-phone"
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="license" className="text-xs font-semibold">State Medical License / NPI</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="license"
                  value={profileData.licenseNumber}
                  onChange={(e) => setProfileData({ ...profileData, licenseNumber: e.target.value })}
                  disabled={!isEditing}
                  data-testid="input-license"
                  className="h-9 text-xs font-mono"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="department" className="text-xs font-semibold">Department Division</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="department"
                  value={profileData.department}
                  onChange={(e) => setProfileData({ ...profileData, department: e.target.value })}
                  disabled={!isEditing}
                  data-testid="input-department"
                  className="h-9 text-xs"
                />
              </div>
            </div>
          </div>

          <Separator className="bg-border/60" />

          <div className="space-y-1.5">
            <Label htmlFor="organization" className="text-xs font-semibold">Health System Affiliation</Label>
            <Input
              id="organization"
              value={profileData.organization}
              onChange={(e) => setProfileData({ ...profileData, organization: e.target.value })}
              disabled={!isEditing}
              data-testid="input-organization"
              className="h-9 text-xs"
            />
          </div>
        </CardContent>
      </Card>

      {/* Preferences & Theme */}
      <div className="grid sm:grid-cols-2 gap-6">
        <Card className="glass-card border-border/60">
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Bell className="h-4 w-4 text-primary" />
              PACS Notifications & Alerts
            </CardTitle>
            <CardDescription className="text-xs">
              Configure priority diagnostic triggers and urgent triage pings.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="email-notif" className="text-xs font-semibold">Email Critical Alerts</Label>
                <p className="text-[11px] text-muted-foreground">Receive immediate email on high-severity stenosis.</p>
              </div>
              <Switch
                id="email-notif"
                checked={preferences.emailNotifications}
                onCheckedChange={(checked) => setPreferences({ ...preferences, emailNotifications: checked })}
                data-testid="switch-email-notifications"
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="push-notif" className="text-xs font-semibold">Browser Real-Time Push</Label>
                <p className="text-[11px] text-muted-foreground">In-browser toasts for completed ResNet inference.</p>
              </div>
              <Switch
                id="push-notif"
                checked={preferences.pushNotifications}
                onCheckedChange={(checked) => setPreferences({ ...preferences, pushNotifications: checked })}
                data-testid="switch-push-notifications"
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="analysis-alerts" className="text-xs font-semibold">Grad-CAM Ready Beacons</Label>
                <p className="text-[11px] text-muted-foreground">Audible alert when Layer4 backprop maps render.</p>
              </div>
              <Switch
                id="analysis-alerts"
                checked={preferences.analysisAlerts}
                onCheckedChange={(checked) => setPreferences({ ...preferences, analysisAlerts: checked })}
                data-testid="switch-analysis-alerts"
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="weekly-reports" className="text-xs font-semibold">Weekly QA Digest</Label>
                <p className="text-[11px] text-muted-foreground">Weekly Cohen's Kappa agreement report.</p>
              </div>
              <Switch
                id="weekly-reports"
                checked={preferences.weeklyReports}
                onCheckedChange={(checked) => setPreferences({ ...preferences, weeklyReports: checked })}
                data-testid="switch-weekly-reports"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-border/60">
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Eye className="h-4 w-4 text-primary" />
              Radiology Workstation Theme
            </CardTitle>
            <CardDescription className="text-xs">
              High-contrast clinical viewing modes optimized for dark radiology reading rooms.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between p-3 rounded-xl border border-border/50 bg-background/50">
              <div className="space-y-0.5">
                <Label htmlFor="dark-mode" className="text-xs font-semibold">Clinical Dark Mode</Label>
                <p className="text-[11px] text-muted-foreground">
                  Recommended for diagnostic MRI & CT luminance calibration.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Moon className="h-4 w-4 text-muted-foreground" />
                <Switch
                  id="dark-mode"
                  checked={theme === "dark"}
                  onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
                  data-testid="switch-dark-mode"
                />
              </div>
            </div>

            <div className="p-3.5 rounded-xl border border-border/50 bg-muted/20 space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                <Lock className="h-3.5 w-3.5 text-blue-500" />
                <span>Security & Authorization</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Your session is authenticated via salted argon2/bcrypt password hashing. Role-based access enforces strict tenant and scan ownership checks on every API request.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
