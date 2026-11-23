import React, { Suspense, useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AnalysisResults } from '@shared/schema';
import {
  Box,
  Activity,
  Zap,
  RotateCcw,
  Play,
  Pause,
  Scan,
  Compass,
  Layers,
  Eye,
  AlertTriangle,
  ChevronRight,
  Maximize2
} from 'lucide-react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stage, Float, Html } from '@react-three/drei';
import Spine3DModel, { SpineRegion } from './Spine3DModel';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';

interface Spine3DViewerProps {
  results?: AnalysisResults;
  imageUrl?: string;
  visualMode?: 'standard' | 'perfusion' | 'signal' | 'neural';
  isFullView?: boolean;
  onMaximize?: () => void;
  className?: string;
}

export const Spine3DViewer: React.FC<Spine3DViewerProps> = ({
  results,
  visualMode = 'standard',
  isFullView = false,
  onMaximize,
  className = ''
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [activeRegion, setActiveRegion] = useState<SpineRegion>('all');
  const [isScanning, setIsScanning] = useState(true);
  const [scanProgress, setScanProgress] = useState(35);
  const [autoRotate, setAutoRotate] = useState(true);
  const [showMarkers, setShowMarkers] = useState(true);
  const controlsRef = useRef<any>(null);

  // Progressive scan timer loop
  useEffect(() => {
    if (!isScanning) return;
    const interval = setInterval(() => {
      setScanProgress((prev) => {
        if (prev >= 100) {
          return 0; // Loop or loop back smoothly
        }
        return prev + 1;
      });
    }, 80);
    return () => clearInterval(interval);
  }, [isScanning]);

  useEffect(() => {
    if (results) setIsLoading(false);
  }, [results]);

  // Telemetry phase computation based on scan progress
  const currentTelemetry = React.useMemo(() => {
    if (scanProgress < 25) {
      return {
        segment: 'SACRUM & COCCYX (S1-S4)',
        status: 'Sacroiliac Articulation: Intact',
        color: 'text-sky-400',
        badge: 'PELVIC_AXIS'
      };
    } else if (scanProgress < 60) {
      const isHerniation = results?.primaryFinding?.condition?.toLowerCase().includes('herniation');
      return {
        segment: 'LUMBAR VERTEBRAE (L1–L5)',
        status: isHerniation
          ? 'CRITICAL: Severe disc height loss & posterior herniation at L4-L5'
          : 'Lordotic Curvature: Anatomical, Disc Cushions Normal',
        color: isHerniation ? 'text-rose-400 font-bold' : 'text-emerald-400',
        badge: isHerniation ? 'SEVERITY_HOTSPOT' : 'LUMBAR_SEGMENT'
      };
    } else if (scanProgress < 85) {
      return {
        segment: 'THORACIC VERTEBRAE (T1–T12)',
        status: 'Costovertebral Joints: Stable, Canal Diameter: 14.8mm',
        color: 'text-indigo-400',
        badge: 'THORACIC_SERIES'
      };
    } else {
      return {
        segment: 'CERVICAL SPINE (C1–C7)',
        status: 'Atlantoaxial Alignment: Normal, Lordosis Intact',
        color: 'text-teal-400',
        badge: 'CERVICAL_AXIS'
      };
    }
  }, [scanProgress, results]);

  // Camera presets
  const handleSetCameraView = (view: 'anterior' | 'lateral' | 'posterior' | 'isometric') => {
    if (!controlsRef.current) return;
    setAutoRotate(false);

    if (view === 'anterior') {
      controlsRef.current.setAzimuthalAngle(0);
      controlsRef.current.setPolarAngle(Math.PI / 2);
    } else if (view === 'lateral') {
      controlsRef.current.setAzimuthalAngle(Math.PI / 2);
      controlsRef.current.setPolarAngle(Math.PI / 2);
    } else if (view === 'posterior') {
      controlsRef.current.setAzimuthalAngle(Math.PI);
      controlsRef.current.setPolarAngle(Math.PI / 2);
    } else if (view === 'isometric') {
      controlsRef.current.setAzimuthalAngle(Math.PI / 4);
      controlsRef.current.setPolarAngle(Math.PI / 3);
    }
  };

  const primaryFinding = results?.primaryFinding;

  return (
    <div
      className={`relative w-full h-full min-h-[460px] bg-[#020617] rounded-3xl overflow-hidden border border-white/10 shadow-2xl flex flex-col ${className}`}
      data-testid="spine-3d-viewer"
    >
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* TOP HUD BAR: TITLE, PROGRESS STATUS & ACTION CONTROLS               */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div className="absolute top-4 left-4 right-4 z-20 flex flex-wrap items-center justify-between gap-3 pointer-events-none">
        {/* Left Title Badge */}
        <div className="flex items-center gap-2.5 bg-slate-900/80 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-white/10 shadow-lg pointer-events-auto">
          <div className="p-1.5 bg-blue-500/20 rounded-xl border border-blue-500/30 text-blue-400">
            <Box className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white tracking-wide">3D Biomechanical Spine Model</span>
              <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/20 text-[9px] font-mono py-0">
                {currentTelemetry.badge}
              </Badge>
            </div>
            <p className="text-[10px] text-slate-400">
              Interactive 3D Anatomical Reference • Stage Reconstruction
            </p>
          </div>
        </div>

        {/* Right Controls: Auto-Rotate, Markers, View Angles, Maximize */}
        <div className="flex items-center gap-1.5 pointer-events-auto bg-slate-900/80 backdrop-blur-md p-1.5 rounded-2xl border border-white/10 shadow-lg">
          <Button
            size="sm"
            variant={autoRotate ? 'default' : 'ghost'}
            className="h-7 px-2.5 text-[10px] font-mono gap-1"
            onClick={() => setAutoRotate(!autoRotate)}
            title="Toggle Continuous Turntable Rotation"
          >
            <RotateCcw className={`w-3 h-3 ${autoRotate ? 'animate-spin' : ''}`} />
            <span>{autoRotate ? 'ROTATE: ON' : 'ROTATE: OFF'}</span>
          </Button>

          <Button
            size="sm"
            variant={showMarkers ? 'default' : 'ghost'}
            className="h-7 px-2.5 text-[10px] font-mono gap-1"
            onClick={() => setShowMarkers(!showMarkers)}
            title="Toggle Clinical Defect Markers"
          >
            <Eye className="w-3 h-3" />
            <span>{showMarkers ? 'MARKERS: ON' : 'MARKERS: OFF'}</span>
          </Button>

          {onMaximize && (
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 text-slate-300 hover:text-white"
              onClick={onMaximize}
              title="Expand 3D Workspace Fullscreen"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* 3D WEBGL CANVAS SCENE                                              */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div className="w-full flex-1 relative">
        <Canvas
          shadows
          dpr={[1, 2]}
          gl={{ antialias: true, alpha: true }}
        >
          <color attach="background" args={['#020617']} />

          <Suspense
            fallback={
              <Html center>
                <div className="flex flex-col items-center gap-3">
                  <div className="w-10 h-10 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                  <span className="text-[10px] font-mono text-primary uppercase tracking-[0.2em]">
                    Constructing_3D_Spine...
                  </span>
                </div>
              </Html>
            }
          >
            <Stage
              intensity={1.2}
              environment="city"
              adjustCamera={2.2}
              shadows={false}
              center={{ precise: true }}
            >
              <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.2}>
                <Spine3DModel
                  modelUrl="/models/spine.glb"
                  results={results}
                  visualMode={visualMode}
                  isProgressiveScanning={isScanning}
                  scanProgress={scanProgress}
                  activeRegion={activeRegion}
                  showMarkers={showMarkers}
                />
              </Float>
            </Stage>

            <ambientLight intensity={0.5} />
            <pointLight position={[10, 20, 10]} intensity={3} color="#ffffff" />
            <pointLight position={[-10, 10, -10]} intensity={1.5} color="#ffffff" />
            <spotLight position={[0, 35, 0]} angle={0.3} penumbra={1} intensity={10} color="#ffffff" />
          </Suspense>

          <OrbitControls
            ref={controlsRef}
            enablePan={false}
            enableZoom={true}
            minDistance={2}
            maxDistance={14}
            autoRotate={autoRotate}
            autoRotateSpeed={0.6}
            makeDefault
          />
        </Canvas>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* BOTTOM CONTROL & TELEMETRY HUD                                      */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div className="z-20 p-4 border-t border-white/10 bg-slate-950/85 backdrop-blur-xl flex flex-col gap-3">
        {/* Row 1: Progressive Scan HUD & Telemetry */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-2xl border border-white/5">
          {/* Scan Play/Pause & Progress */}
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Button
              size="sm"
              variant={isScanning ? 'default' : 'outline'}
              className="h-8 px-3 text-xs font-semibold gap-1.5 shrink-0"
              onClick={() => setIsScanning(!isScanning)}
            >
              {isScanning ? (
                <>
                  <Pause className="w-3.5 h-3.5 text-sky-400" />
                  <span>Pause Scan</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Resume Scan</span>
                </>
              )}
            </Button>

            <div className="flex flex-col min-w-[140px] flex-1 sm:flex-initial">
              <div className="flex justify-between items-center text-[10px] font-mono text-slate-400 mb-1">
                <span className="flex items-center gap-1">
                  <Scan className="w-3 h-3 text-cyan-400 animate-spin" />
                  <span>PROGRESSIVE SCAN</span>
                </span>
                <span className="font-bold text-cyan-300">{scanProgress}%</span>
              </div>
              <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-blue-500 via-cyan-400 to-teal-300"
                  style={{ width: `${scanProgress}%` }}
                />
              </div>
            </div>
          </div>

          {/* Live Segment Telemetry */}
          <div className="flex items-center gap-2.5 text-xs overflow-hidden">
            <div className="p-1 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 shrink-0">
              <Activity className="w-3.5 h-3.5" />
            </div>
            <div className="truncate">
              <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                Active Level: <span className="text-white font-bold">{currentTelemetry.segment}</span>
              </div>
              <p className={`text-[11px] truncate ${currentTelemetry.color}`}>
                {currentTelemetry.status}
              </p>
            </div>
          </div>
        </div>

        {/* Row 2: Anatomical Level Selector & Camera View Presets */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
          {/* Level Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mr-1 flex items-center gap-1 shrink-0">
              <Layers className="w-3 h-3" />
              <span>LEVEL:</span>
            </span>
            {(
              [
                { id: 'all', label: 'Full Spine' },
                { id: 'lumbar', label: 'Lumbar (L1–L5)' },
                { id: 'thoracic', label: 'Thoracic (T1–T12)' },
                { id: 'cervical', label: 'Cervical (C1–C7)' },
                { id: 'sacrum', label: 'Sacrum' }
              ] as const
            ).map((seg) => (
              <Button
                key={seg.id}
                size="sm"
                variant={activeRegion === seg.id ? 'default' : 'ghost'}
                className={`h-7 px-2.5 text-[10px] rounded-lg font-medium shrink-0 ${
                  activeRegion === seg.id
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
                onClick={() => setActiveRegion(seg.id)}
              >
                {seg.label}
              </Button>
            ))}
          </div>

          {/* Camera View Angle Presets */}
          <div className="flex items-center gap-1 shrink-0">
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mr-1 flex items-center gap-1">
              <Compass className="w-3 h-3" />
              <span>VIEW:</span>
            </span>
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2 text-[10px] border-white/10 hover:bg-slate-800 text-slate-300"
              onClick={() => handleSetCameraView('anterior')}
            >
              Anterior
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2 text-[10px] border-white/10 hover:bg-slate-800 text-slate-300"
              onClick={() => handleSetCameraView('lateral')}
            >
              Lateral
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2 text-[10px] border-white/10 hover:bg-slate-800 text-slate-300"
              onClick={() => handleSetCameraView('posterior')}
            >
              Posterior
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2 text-[10px] border-white/10 hover:bg-slate-800 text-slate-300"
              onClick={() => handleSetCameraView('isometric')}
            >
              3D Orbit
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Spine3DViewer;
