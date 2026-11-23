import React, { useMemo, useRef, useEffect, useState } from 'react';
import { useGLTF, Html } from '@react-three/drei';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { AnalysisResults, ClinicalFinding } from '@shared/schema';

export type SpineRegion = 'all' | 'cervical' | 'thoracic' | 'lumbar' | 'sacrum';

interface Spine3DModelProps {
    modelUrl: string;
    results?: AnalysisResults;
    visualMode?: 'standard' | 'perfusion' | 'signal' | 'neural';
    isProgressiveScanning?: boolean;
    scanProgress?: number; // 0 to 100
    activeRegion?: SpineRegion;
    showMarkers?: boolean;
}

/**
 * Spine3DModel V3 — Progressive Hospital-Grade Biomechanical Reconstruction
 * Features:
 * - Dynamic progressive scanning laser slice traversing vertebral levels
 * - Selective anatomical segment illumination (Cervical, Thoracic, Lumbar, Sacrum)
 * - Authentic defect localization with clinical targeting crosshairs & callouts
 */
const Spine3DModel: React.FC<Spine3DModelProps> = ({
    modelUrl,
    results,
    visualMode = 'standard',
    isProgressiveScanning = false,
    scanProgress = 0,
    activeRegion = 'all',
    showMarkers = true,
}) => {
    const { scene } = useGLTF(modelUrl);
    const groupRef = useRef<THREE.Group>(null);
    const laserRef = useRef<THREE.Group>(null);

    const [defectMarkers, setDefectMarkers] = useState<{ position: [number, number, number], label: string, severity: string, level: string }[]>([]);

    // 1. Scene Processing & Material Setup
    const clonedScene = useMemo(() => {
        const clone = scene.clone();

        clone.traverse((node) => {
            if ((node as THREE.Mesh).isMesh) {
                const mesh = node as THREE.Mesh;
                mesh.castShadow = true;
                mesh.receiveShadow = true;

                if (mesh.material instanceof THREE.MeshStandardMaterial) {
                    mesh.material = mesh.material.clone();
                    const mat = mesh.material as THREE.MeshStandardMaterial;
                    mat.roughness = 0.35;
                    mat.metalness = 0.15;
                    mat.envMapIntensity = 1.0;
                    mat.transparent = true;
                    mat.opacity = 1.0;
                    mat.color.set('#ffffff');
                    mat.depthWrite = true;
                }
            }
        });
        return clone;
    }, [scene]);

    // 2. Highlighting & Finding Mapping Logic with Anatomical Segmentation
    useEffect(() => {
        if (!clonedScene) return;

        const mappingTimer = setTimeout(() => {
            const rawFindings = results?.findings || [];
            const primaryFinding = results?.primaryFinding;

            const newMarkers: { position: [number, number, number], label: string, severity: string, level: string }[] = [];
            const box = new THREE.Box3();
            const center = new THREE.Vector3();

            clonedScene.traverse((node) => {
                if ((node as THREE.Mesh).isMesh) {
                    const mesh = node as THREE.Mesh;
                    const material = mesh.material as THREE.MeshStandardMaterial;
                    const name = mesh.name.toLowerCase();

                    mesh.userData.isDefect = false;

                    // Anatomical segment classification
                    const isCervical = name.startsWith('c') || name === 'atlas' || name === 'axis';
                    const isThoracic = name.startsWith('t') && !name.includes('ldisks');
                    const isLumbar = name.startsWith('l') || name.includes('ldisks');
                    const isSacrum = name.includes('sacrum') || name.includes('pelvis');
                    const isDisc = name.includes('disk') || name.includes('disc');

                    // Base Material Tuning
                    let baseColor = '#ffffff';
                    let baseOpacity = 1.0;
                    let emissiveColor = '#000000';
                    let emissiveIntensity = 0;

                    if (isDisc) {
                        baseColor = '#38bdf8'; // Soft cyan for intervertebral discs
                        emissiveColor = '#0284c7';
                        emissiveIntensity = 0.15;
                        baseOpacity = 0.92;
                    }

                    // Region Focus Filtering
                    if (activeRegion !== 'all') {
                        let matchesActiveRegion = false;
                        if (activeRegion === 'cervical' && isCervical) matchesActiveRegion = true;
                        if (activeRegion === 'thoracic' && isThoracic) matchesActiveRegion = true;
                        if (activeRegion === 'lumbar' && isLumbar) matchesActiveRegion = true;
                        if (activeRegion === 'sacrum' && isSacrum) matchesActiveRegion = true;

                        if (!matchesActiveRegion) {
                            baseOpacity = 0.25; // Dim non-active regions
                            material.transparent = true;
                        }
                    }

                    material.color.set(baseColor);
                    material.opacity = baseOpacity;
                    material.transparent = baseOpacity < 1.0 || isDisc;
                    material.emissive.set(emissiveColor);
                    material.emissiveIntensity = emissiveIntensity;

                    // ── Primary Pathology Detection & Highlight ──
                    if (primaryFinding && primaryFinding.severity !== 'normal') {
                        const loc = (primaryFinding.location || '').toLowerCase();
                        const cond = (primaryFinding.condition || '').toLowerCase();

                        let isMatch = false;
                        let matchedLevel = 'L4-L5';

                        // Check lumbar targets
                        if (loc.includes('l4') || loc.includes('l5') || cond.includes('herniation') || loc.includes('lumbar')) {
                            if (name === 'l4' || name === 'l5' || name === 'ldisks' || (name.includes('disc') && isLumbar)) {
                                isMatch = true;
                                matchedLevel = 'L4-L5 Lumbar Disc';
                            }
                        } else if (loc.includes('cervical') || loc.includes('c5') || loc.includes('c6')) {
                            if (name === 'c5' || name === 'c6' || name === 'cdisks') {
                                isMatch = true;
                                matchedLevel = 'C5-C6 Cervical';
                            }
                        } else if (loc.includes('thoracic') || loc.includes('t8') || loc.includes('t9')) {
                            if (name.includes('t8') || name.includes('t9') || name === 'tdisks') {
                                isMatch = true;
                                matchedLevel = 'T8-T9 Thoracic';
                            }
                        }

                        if (isMatch) {
                            mesh.userData.isDefect = true;
                            material.color.set('#ef4444'); // Clinical warning red
                            material.emissive.set('#dc2626');
                            material.emissiveIntensity = 0.8;
                            material.opacity = 1.0;
                            material.transparent = false;

                            mesh.updateMatrixWorld(true);
                            box.setFromObject(mesh);
                            box.getCenter(center);
                            if (groupRef.current) groupRef.current.worldToLocal(center);

                            const isDuplicate = newMarkers.some(m =>
                                Math.abs(m.position[0] - center.x) < 0.2 &&
                                Math.abs(m.position[1] - center.y) < 0.2 &&
                                Math.abs(m.position[2] - center.z) < 0.2
                            );

                            if (!isDuplicate && showMarkers) {
                                newMarkers.push({
                                    position: [center.x, center.y, center.z],
                                    label: primaryFinding.condition.toUpperCase(),
                                    severity: primaryFinding.severity,
                                    level: matchedLevel
                                });
                            }
                        }
                    }
                }
            });

            setDefectMarkers(newMarkers);
        }, 300);

        return () => clearTimeout(mappingTimer);
    }, [clonedScene, results, visualMode, activeRegion, showMarkers]);

    // 3. Dynamic Frame Updates (Breathing + Progressive Laser Plane Sweep)
    useFrame((state) => {
        if (!groupRef.current) return;
        const time = state.clock.getElapsedTime();

        // Subtle anatomical breathing
        groupRef.current.position.y = Math.sin(time * 0.8) * 0.03;

        // Progressive Laser Plane Y-Position Calculation
        if (laserRef.current) {
            if (isProgressiveScanning) {
                // Map scanProgress (0 to 100) from bottom (Sacrum y = -2.8) to top (Cervical y = 2.8)
                const yPos = -2.8 + (scanProgress / 100) * 5.6;
                laserRef.current.position.y = yPos;
                laserRef.current.visible = true;
            } else {
                // Idle gentle scanning sweep
                laserRef.current.position.y = Math.sin(time * 1.2) * 2.2;
                laserRef.current.visible = true;
            }
        }

        // Defect pulse
        clonedScene.traverse((node) => {
            if ((node as THREE.Mesh).isMesh && node.userData.isDefect) {
                const pulse = (Math.sin(time * 5) + 1) / 2;
                node.scale.setScalar(1 + pulse * 0.03);
            }
        });
    });

    return (
        <group ref={groupRef}>
            <primitive object={clonedScene} />

            {/* ═══════════════════════════════════════════════════════════════════ */}
            {/* PROGRESSIVE SCANNING LASER SLICE PLANE (CT/MRI RECONSTRUCTION)   */}
            {/* ═══════════════════════════════════════════════════════════════════ */}
            <group ref={laserRef} position={[0, 0, 0]}>
                {/* Horizontal Laser Scanning Disc */}
                <mesh rotation={[-Math.PI / 2, 0, 0]}>
                    <ringGeometry args={[0.05, 2.4, 64]} />
                    <meshStandardMaterial
                        color="#06b6d4" // Cyan-500
                        emissive="#06b6d4"
                        emissiveIntensity={3}
                        transparent={true}
                        opacity={isProgressiveScanning ? 0.45 : 0.25}
                        side={THREE.DoubleSide}
                        depthWrite={false}
                    />
                </mesh>

                {/* Outer Concentric Scanning Ring */}
                <mesh rotation={[-Math.PI / 2, 0, 0]}>
                    <ringGeometry args={[2.35, 2.42, 64]} />
                    <meshBasicMaterial
                        color="#38bdf8"
                        transparent={true}
                        opacity={0.8}
                        side={THREE.DoubleSide}
                    />
                </mesh>

                {/* Volumetric Laser Light Beam */}
                <pointLight
                    intensity={isProgressiveScanning ? 8 : 4}
                    distance={2.5}
                    decay={2}
                    color="#06b6d4"
                />
            </group>

            {/* ═══════════════════════════════════════════════════════════════════ */}
            {/* CLINICAL DEFECT MARKERS & LOCALIZED CALLOUTS                      */}
            {/* ═══════════════════════════════════════════════════════════════════ */}
            {showMarkers && defectMarkers.map((marker, idx) => (
                <group key={`defect-${idx}`} position={marker.position}>
                    {/* Pulsing Hotspot Sphere */}
                    <mesh>
                        <sphereGeometry args={[0.22, 32, 32]} />
                        <meshStandardMaterial
                            color="#ef4444"
                            emissive="#ef4444"
                            emissiveIntensity={10}
                            transparent={true}
                            opacity={0.7}
                            depthWrite={false}
                        />
                    </mesh>

                    {/* Concentric Aura */}
                    <mesh>
                        <sphereGeometry args={[0.45, 32, 32]} />
                        <meshStandardMaterial
                            color="#ef4444"
                            emissive="#ef4444"
                            emissiveIntensity={4}
                            transparent={true}
                            opacity={0.25}
                            depthWrite={false}
                        />
                    </mesh>

                    {/* High-visibility Warning Point Light */}
                    <pointLight
                        intensity={12}
                        distance={3}
                        decay={2}
                        color="#ef4444"
                    />

                    {/* HTML Callout Badge */}
                    <Html distanceFactor={7} center position={[0, 0.4, 0]}>
                        <div className="flex flex-col items-center pointer-events-none select-none">
                            <div className="px-3.5 py-2 bg-slate-950/90 backdrop-blur-xl border border-red-500/60 rounded-xl shadow-[0_0_25px_rgba(239,68,68,0.4)] animate-in zoom-in duration-300">
                                <div className="flex items-center gap-1.5 mb-0.5">
                                    <div className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                                    <span className="text-[9px] font-black text-red-400 uppercase tracking-widest">
                                        {marker.severity.toUpperCase()} HOTSPOT
                                    </span>
                                </div>
                                <div className="text-xs font-bold text-white whitespace-nowrap">
                                    {marker.label}
                                </div>
                                <div className="text-[9px] font-mono text-slate-400 mt-0.5">
                                    Target Level: {marker.level}
                                </div>
                            </div>
                            <div className="w-[1.5px] h-6 bg-gradient-to-b from-red-500 to-transparent" />
                        </div>
                    </Html>
                </group>
            ))}
        </group>
    );
};

export default Spine3DModel;
