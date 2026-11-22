import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UploadScan } from "@/components/upload-scan";
import { DatabaseScanFetch } from "@/components/database-scan-fetch";
import { PatientForm } from "@/components/patient-form";
import { useToast } from "@/hooks/use-toast";
import {
  Upload as UploadIcon,
  Database,
  UserPlus,
  ShieldCheck,
  HardDrive,
  FileCheck,
  Layers,
  Sparkles
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import type { InsertPatient, Patient, Scan } from "@shared/schema";

export default function Upload() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [uploadProgress, setUploadProgress] = useState(0);

  // Create patient mutation
  const createPatientMutation = useMutation({
    mutationFn: async (data: InsertPatient) => {
      return await apiRequest<Patient>("POST", "/api/patients", data);
    },
    onSuccess: (patient) => {
      queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
      toast({
        title: "Patient registered",
        description: `Patient ${patient.name} created. You may now upload DICOM studies.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Registration Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Direct upload mutation
  const uploadMutation = useMutation({
    mutationFn: async ({ file, imageType, patientId }: { file: File; imageType: string; patientId: string }) => {
      const formData = new FormData();
      formData.append("image", file);
      formData.append("patientCaseId", patientId);
      formData.append("imageType", imageType);

      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.upload.addEventListener("progress", (event) => {
          if (event.lengthComputable) {
            const progress = Math.round((event.loaded * 100) / event.total);
            setUploadProgress(progress);
          }
        });

        xhr.addEventListener("load", () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(JSON.parse(xhr.responseText));
          } else {
            reject(new Error("Study upload failed"));
          }
        });

        xhr.addEventListener("error", () => {
          reject(new Error("Network transmission error"));
        });

        xhr.open("POST", "/api/upload");
        xhr.send(formData);
      });
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/scans"] });
      toast({
        title: "Scan Ingested Successfully",
        description: "PACS storage verified. Opening diagnostic viewport...",
      });
      setUploadProgress(0);
      setLocation(`/ai-analysis/${data.scan.id}`);
    },
    onError: (error: Error) => {
      toast({
        title: "Upload Failed",
        description: error.message,
        variant: "destructive",
      });
      setUploadProgress(0);
    },
  });

  const handleDirectUpload = async (file: File, imageType: string) => {
    const tempPatientData = {
      patientId: `PAT-${Date.now().toString().slice(-6)}`,
      name: file.name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " "),
    };

    try {
      const patient = await createPatientMutation.mutateAsync(tempPatientData);
      uploadMutation.mutate({ file, imageType, patientId: patient.id });
    } catch (error) {
      // Error handled in mutation
    }
  };

  const handleDatabaseScanSelect = (scan: Scan, patient: Patient) => {
    toast({
      title: "Study Selected",
      description: `Loaded ${scan.imageType} scan for ${patient.name}`,
    });
    setLocation(`/ai-analysis/${scan.id}`);
  };

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 max-w-5xl">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Badge variant="outline" className="text-xs font-semibold px-2 py-0.5 border-primary/30 text-primary bg-primary/5">
            <UploadIcon className="h-3 w-3 mr-1" /> PACS Study Ingestion
          </Badge>
          <span className="text-xs text-muted-foreground">• DICOM 3.0 / Raster Compliant</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
          Upload & Ingest Medical Imaging
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Import sagittal MRI or CT spine studies directly for automatic PyTorch ResNet-50 feature analysis and Grad-CAM generation.
        </p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="direct" className="space-y-6">
        <div className="flex justify-center">
          <TabsList className="grid w-full max-w-xl grid-cols-3 h-11 p-1 bg-muted/50 border border-border/60 rounded-xl">
            <TabsTrigger
              value="direct"
              data-testid="tab-direct-upload"
              className="text-xs font-medium rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-xs transition-all"
            >
              <UploadIcon className="h-3.5 w-3.5 mr-2" />
              Direct Upload
            </TabsTrigger>
            <TabsTrigger
              value="database"
              data-testid="tab-database-fetch"
              className="text-xs font-medium rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-xs transition-all"
            >
              <Database className="h-3.5 w-3.5 mr-2" />
              PACS Registry
            </TabsTrigger>
            <TabsTrigger
              value="new-patient"
              data-testid="tab-new-patient"
              className="text-xs font-medium rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-xs transition-all"
            >
              <UserPlus className="h-3.5 w-3.5 mr-2" />
              New Patient
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Tab 1: Direct Upload */}
        <TabsContent value="direct" className="space-y-6 animate-in fade-in-50 duration-200">
          <Card className="glass-card border-border/60">
            <CardHeader>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <FileCheck className="h-4 w-4 text-primary" /> Direct Medical Scan Ingestion
              </CardTitle>
              <CardDescription className="text-xs">
                Upload DICOM (.dcm) volumetric slices or high-resolution clinical images (PNG/JPEG).
              </CardDescription>
            </CardHeader>
            <CardContent>
              <UploadScan
                onUpload={handleDirectUpload}
                isUploading={uploadMutation.isPending || createPatientMutation.isPending}
                uploadProgress={uploadProgress}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Existing Database */}
        <TabsContent value="database" className="space-y-6 animate-in fade-in-50 duration-200">
          <DatabaseScanFetch onScanSelect={handleDatabaseScanSelect} />
        </TabsContent>

        {/* Tab 3: New Patient Form */}
        <TabsContent value="new-patient" className="space-y-6 animate-in fade-in-50 duration-200">
          <Card className="glass-card border-border/60">
            <CardHeader>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-primary" /> Register Patient Case
              </CardTitle>
              <CardDescription className="text-xs">
                Establish an isolated patient record with unique MRN identifier prior to attaching radiological series.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PatientForm
                onSubmit={(data) => {
                  createPatientMutation.mutate(data, {
                    onSuccess: (patient) => {
                      setLocation(`/case/${patient.id}`);
                    }
                  });
                }}
                isSubmitting={createPatientMutation.isPending}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Compliance / Security Info Banner */}
      <div className="p-4 rounded-xl border border-border/50 bg-card/60 backdrop-blur-md flex items-start gap-3">
        <ShieldCheck className="h-5 w-5 text-emerald-500 mt-0.5 flex-shrink-0" />
        <div className="space-y-1 text-xs">
          <p className="font-semibold text-foreground">Encrypted Clinical Payload Ingestion</p>
          <p className="text-muted-foreground leading-relaxed text-[11px]">
            DICOM header tags and pixel arrays are sanitized on ingest. Spacing metadata (PixelSpacing, SliceThickness) is preserved without modification to ensure diagnostic measurement accuracy.
          </p>
        </div>
      </div>
    </div>
  );
}
