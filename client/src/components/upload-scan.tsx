import { useState, useCallback } from "react";
import { Upload, FileImage, X, Scan as ScanIcon, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { PixelScanVisualizer } from "@/components/PixelScanVisualizer";

interface UploadScanProps {
  onUpload: (file: File, imageType: string) => void;
  isUploading?: boolean;
  uploadProgress?: number;
}

export function UploadScan({ onUpload, isUploading, uploadProgress }: UploadScanProps) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [imageType, setImageType] = useState<string>("MRI");

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const file = e.dataTransfer.files?.[0];
    if (file && (file.type.startsWith("image/") || file.name.endsWith(".dcm"))) {
      setSelectedFile(file);
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (e) => setPreview(e.target?.result as string);
        reader.readAsDataURL(file);
      }
    }
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (e) => setPreview(e.target?.result as string);
        reader.readAsDataURL(file);
      }
    }
  };

  const handleUpload = () => {
    if (selectedFile) {
      onUpload(selectedFile, imageType);
    }
  };

  const clearSelection = () => {
    setSelectedFile(null);
    setPreview(null);
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div
          className={`relative border-2 border-dashed rounded-md transition-colors ${
            dragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25"
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          {!selectedFile ? (
            <label className="flex flex-col items-center justify-center py-16 cursor-pointer">
              <Upload className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-medical-body font-medium text-foreground mb-2">
                Drop medical images here or click to browse
              </p>
              <p className="text-medical-caption text-muted-foreground">
                Supports MRI, X-ray (DICOM, JPEG, PNG) up to 50MB
              </p>
              <input
                type="file"
                className="hidden"
                accept="image/*,.dcm"
                onChange={handleFileInput}
                data-testid="input-file-upload"
              />
            </label>
          ) : (
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <FileImage className="h-8 w-8 text-primary" />
                  <div>
                    <p className="text-medical-body font-medium">{selectedFile.name}</p>
                    <p className="text-medical-caption text-muted-foreground">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={clearSelection}
                  data-testid="button-clear-file"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {preview && (
                <div className="mt-4">
                  {isUploading ? (
                    <PixelScanVisualizer
                      imageUrl={preview}
                      isScanning={true}
                      progress={uploadProgress || 10}
                      statusText={`Ingesting ${imageType} Scan • Decomposing Pixel Tensors...`}
                      imageType={imageType}
                      showDetails={true}
                    />
                  ) : (
                    <div className="relative rounded-xl overflow-hidden border border-border/60 bg-muted/30">
                      <div className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded bg-black/60 text-[10px] font-mono text-cyan-300 border border-cyan-500/30 flex items-center gap-1">
                        <ScanIcon className="h-3 w-3" /> Ready for Pixel Decomposition
                      </div>
                      <img
                        src={preview}
                        alt="Preview"
                        className="w-full h-56 object-contain"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </Card>

      {selectedFile && (
        <Card className="p-6">
          <div className="space-y-4">
            <div>
              <label className="text-medical-label block mb-2">Image Type</label>
              <div className="flex gap-3">
                <Button
                  variant={imageType === "MRI" ? "default" : "outline"}
                  onClick={() => setImageType("MRI")}
                  data-testid="button-select-mri"
                  className="flex-1"
                >
                  MRI Scan
                </Button>
                <Button
                  variant={imageType === "X-ray" ? "default" : "outline"}
                  onClick={() => setImageType("X-ray")}
                  data-testid="button-select-xray"
                  className="flex-1"
                >
                  X-ray
                </Button>
              </div>
            </div>

            {isUploading && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Processing...</span>
                  <span className="text-primary font-medium">{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} className="h-2" />
              </div>
            )}

            <Button
              onClick={handleUpload}
              disabled={isUploading}
              className="w-full"
              size="lg"
              data-testid="button-analyze"
            >
              {isUploading ? "Analyzing..." : "Analyze Spinal Image"}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
