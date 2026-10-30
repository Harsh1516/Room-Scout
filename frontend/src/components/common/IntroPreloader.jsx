import React, { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import gsap from 'gsap';

// =========================================================
// EXACT PHYSICAL MOUSE (TOP-DOWN VIEW)
// =========================================================
const ExactPhysicalMouse = ({ isClicking, scrollWheelRef }) => {
  return (
    <div className="relative flex items-center justify-center select-none pointer-events-none">
      {/* Soft Ground Shadow */}
      <div className="absolute w-44 h-36 rounded-full bg-slate-900/30 blur-xl" />

      <svg
        width="160"
        height="110"
        viewBox="0 0 160 110"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="relative z-10 drop-shadow-[0_18px_30px_rgba(0,0,0,0.45)]"
      >
        <defs>
          <linearGradient id="mouseWhiteMatte" x1="15" y1="12" x2="145" y2="98" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="60%" stopColor="#F1F5F9" />
            <stop offset="100%" stopColor="#CBD5E1" />
          </linearGradient>

          <linearGradient id="leftClickTint" x1="85" y1="15" x2="140" y2="55" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#E2E8F0" />
            <stop offset="100%" stopColor="#94A3B8" />
          </linearGradient>

          <linearGradient id="wheelCylinderGrad" x1="83" y1="47" x2="109" y2="47" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#0F172A" />
            <stop offset="20%" stopColor="#334155" />
            <stop offset="50%" stopColor="#64748B" />
            <stop offset="80%" stopColor="#334155" />
            <stop offset="100%" stopColor="#0F172A" />
          </linearGradient>

          <clipPath id="wheelCylinderClip">
            <rect x="83" y="47" width="26" height="16" rx="8" />
          </clipPath>
        </defs>

        {/* Mouse Outer Body Frame */}
        <rect x="16" y="15" width="128" height="80" rx="40" fill="url(#mouseWhiteMatte)" stroke="#94A3B8" strokeWidth="1.5" />
        <path d="M 76 15 C 120 15, 144 32, 144 55 C 144 78, 120 95, 76 95 Z" fill="#F8FAFC" stroke="#CBD5E1" strokeWidth="1.2" />

        {/* Left Primary Click Button */}
        <path
          d="M 85 17 C 115 17, 138 30, 138 55 L 76 55 L 76 17 Z"
          fill={isClicking ? 'url(#leftClickTint)' : '#FFFFFF'}
          stroke="#E2E8F0"
          strokeWidth="1"
        />

        {/* Right Click Button */}
        <path d="M 85 93 C 115 93, 138 80, 138 55 L 76 55 L 76 93 Z" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="1" />

        {/* Button Seam Dividers */}
        <line x1="76" y1="55" x2="138" y2="55" stroke="#94A3B8" strokeWidth="1.5" />
        <path d="M 76 17 Q 82 55 76 93" stroke="#94A3B8" strokeWidth="1.5" fill="none" />

        {/* DPI Toggle Button */}
        <circle cx="66" cy="55" r="8" fill="#FFFFFF" stroke="#94A3B8" strokeWidth="1.2" />
        <circle cx="66" cy="55" r="4" fill="#64748B" />

        {/* Scroll Wheel Casing Slot */}
        <rect x="80" y="45" width="32" height="20" rx="10" fill="#CBD5E1" stroke="#94A3B8" strokeWidth="1.2" />

        {/* Cylindrical Wheel Body (Stationary in top-down slot) */}
        <rect x="83" y="47" width="26" height="16" rx="8" fill="url(#wheelCylinderGrad)" />

        {/* Rubber Treads Rolling in XZ Plane (Translates purely along X inside clipped cylinder) */}
        <g clipPath="url(#wheelCylinderClip)">
          <g ref={scrollWheelRef} style={{ willChange: 'transform' }}>
            {[-18, -12, -6, 0, 6, 12, 18, 24, 30, 36, 42].map((d) => (
              <line
                key={d}
                x1={83 + d}
                y1="47"
                x2={83 + d}
                y2="63"
                stroke="#0F172A"
                strokeWidth="1.6"
              />
            ))}
          </g>
          {/* Specular Highlight Overlay */}
          <rect
            x="83"
            y="47"
            width="26"
            height="16"
            rx="8"
            fill="url(#wheelCylinderGrad)"
            opacity="0.35"
            style={{ mixBlendMode: 'screen' }}
          />
        </g>

        {/* Metallic Palm Rest Accent */}
        <g transform="translate(36, 42) scale(0.9)" opacity="0.82">
          <path
            d="M 6 4 L 16 4 C 20 4, 22 6, 22 10 L 22 22 C 22 24, 20 26, 16 26 L 12 26 L 12 16 L 16 16 L 16 10 L 10 10 L 10 26 L 6 26 Z"
            fill="#475569"
          />
        </g>
      </svg>
    </div>
  );
};

// =========================================================
// GEOMETRIC LINE CURVE HELPERS
// =========================================================
function arcXZ(cx, cy, cz, r, aStart, aEnd, steps = 18) {
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const angle = aStart + (i / steps) * (aEnd - aStart);
    pts.push([cx + Math.cos(angle) * r, cy, cz + Math.sin(angle) * r]);
  }
  return pts;
}

function arcXY(cx, cy, cz, r, aStart, aEnd, steps = 18) {
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const angle = aStart + (i / steps) * (aEnd - aStart);
    pts.push([cx + Math.cos(angle) * r, cy + Math.sin(angle) * r, cz]);
  }
  return pts;
}

function arcZY(cx, cy, cz, r, aStart, aEnd, steps = 18) {
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const angle = aStart + (i / steps) * (aEnd - aStart);
    pts.push([cx, cy + Math.sin(angle) * r, cz + Math.cos(angle) * r]);
  }
  return pts;
}

// Subdivides line segments so they physically DRAW across their length
function addSubdividedLine(p1, p2, targetArray, stepSize = 0.16) {
  const dx = p2[0] - p1[0];
  const dy = p2[1] - p1[1];
  const dz = p2[2] - p1[2];
  const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
  const steps = Math.max(1, Math.ceil(dist / stepSize));

  for (let s = 0; s < steps; s++) {
    const tStart = s / steps;
    const tEnd = (s + 1) / steps;
    targetArray.push(
      p1[0] + dx * tStart, p1[1] + dy * tStart, p1[2] + dz * tStart,
      p1[0] + dx * tEnd, p1[1] + dy * tEnd, p1[2] + dz * tEnd
    );
  }
}

function addPolylineSubdivided(pts, targetArray, stepSize = 0.16) {
  if (!pts || pts.length < 2) return;
  for (let i = 0; i < pts.length - 1; i++) {
    addSubdividedLine(pts[i], pts[i + 1], targetArray, stepSize);
  }
}

// =========================================================
// PROGRESSIVELY DRAWN 3D NEOCLASSICAL PALACE VILLA SCENE
// (Every line constructs sequentially like an architectural drawing)
// =========================================================
const NeoclassicalVillaScene = ({ onVillaReady }) => {
  const villaGroup = useRef(null);
  const geometryRef = useRef(null);
  const totalVerticesRef = useRef(0);

  const onVillaReadyRef = useRef(onVillaReady);
  onVillaReadyRef.current = onVillaReady;
  const canTurntable = useRef(false);

  const pillarRefs = [
    useRef(null),
    useRef(null),
    useRef(null),
    useRef(null),
  ];

  // 1. Four Independent Screen Outer Corner Entry Positions
  const entryPositions = [
    [-7.2, 4.2, 0],   // Dot 0: Enters from Top-Left Screen Corner
    [7.2, 4.2, 0],    // Dot 1: Enters from Top-Right Screen Corner
    [7.2, -3.8, 0],   // Dot 2: Enters from Bottom-Right Screen Corner
    [-7.2, -3.8, 0],  // Dot 3: Enters from Bottom-Left Screen Corner
  ];

  // 2. Center Meeting Positions (Symmetric convergence right in screen center)
  const centerPositions = [
    [-0.15, 0.15, 0],
    [0.15, 0.15, 0],
    [0.15, -0.15, 0],
    [-0.15, -0.15, 0],
  ];

  // 3. Villa Foundation Perimeter Corner Anchors
  const cornerPositions = [
    [-2.5, -1.3, 1.8],  // Front-Left Garden Forecourt Anchor
    [2.5, -1.3, 1.8],   // Front-Right Balustrade Ramp Anchor
    [2.5, -1.3, -1.6],  // Back-Right Estate Anchor
    [-2.5, -1.3, -1.6], // Back-Left Estate Anchor
  ];

  // Assemble all lines strictly in architectural construction sequence
  const lineSegmentsGeometry = useMemo(() => {
    const cFL = [-2.5, -1.3, 1.8];
    const cFR = [2.5, -1.3, 1.8];
    const cBR = [2.5, -1.3, -1.6];
    const cBL = [-2.5, -1.3, -1.6];

    const lBayBase = arcXZ(-1.75, -1.3, 0.6, 0.85, 0, Math.PI);
    const lBayMid = arcXZ(-1.75, -0.15, 0.6, 0.85, 0, Math.PI);
    const lBayRoof = arcXZ(-1.75, 1.25, 0.6, 0.85, 0, Math.PI);
    const lBayBalustrade = arcXZ(-1.75, 1.45, 0.6, 0.85, 0, Math.PI);

    const rBayBase = arcXZ(1.75, -1.3, 0.6, 0.85, 0, Math.PI);
    const rBayMid = arcXZ(1.75, -0.15, 0.6, 0.85, 0, Math.PI);
    const rBayRoof = arcXZ(1.75, 1.25, 0.6, 0.85, 0, Math.PI);
    const rBayBalustrade = arcXZ(1.75, 1.45, 0.6, 0.85, 0, Math.PI);

    const mainArch = arcXY(0, -0.65, 1.15, 0.42, 0, Math.PI);
    const mainArchInner = arcXY(0, -0.65, 1.15, 0.38, 0, Math.PI);
    const mainArchMolding = arcXY(0, -0.65, 1.15, 0.48, 0, Math.PI);

    const lDomeXY = arcXY(-1.75, 1.35, 0.6, 0.55, 0, Math.PI);
    const lDomeZY = arcZY(-1.75, 1.35, 0.6, 0.55, 0, Math.PI);
    const rDomeXY = arcXY(1.75, 1.35, 0.6, 0.55, 0, Math.PI);
    const rDomeZY = arcZY(1.75, 1.35, 0.6, 0.55, 0, Math.PI);

    const lDormerArch = arcXY(-1.75, 1.7, 0.95, 0.16, 0, Math.PI);
    const rDormerArch = arcXY(1.75, 1.7, 0.95, 0.16, 0, Math.PI);

    const nicheWindowArch = arcXY(0, 0.75, 0.55, 0.28, 0, Math.PI);
    const rearArch = arcXY(0, -0.7, -1.6, 0.38, 0, Math.PI);

    const polylines = [
      // ── STEP 1: FOUNDATION & GROUND PERIMETER (CONNECTING 4 ANCHOR DOTS) ──
      [cFL, [-0.9, -1.3, 1.8]],
      [[0.9, -1.3, 1.8], cFR],
      [cFR, cBR],
      [cBR, cBL],
      [cBL, cFL],
      lBayBase,
      rBayBase,

      // ── STEP 2: PEDESTALS, ENTRANCE STEPS & FRONT PORTAL ──
      [[-0.42, -1.3, 1.15], [-0.42, -0.65, 1.15]],
      [[0.42, -1.3, 1.15], [0.42, -0.65, 1.15]],
      mainArch,
      mainArchInner,
      mainArchMolding,
      [[-0.38, -1.3, 1.15], [-0.38, -0.65, 1.15], [0.38, -0.65, 1.15], [0.38, -1.3, 1.15]],
      [[0, -1.3, 1.15], [0, -0.65, 1.15]],
      [[-0.05, -0.98, 1.18], [-0.05, -0.82, 1.18]],
      [[0.05, -0.98, 1.18], [0.05, -0.82, 1.18]],

      // ── STEP 3: MAIN COLUMNS GROWING UPWARDS FROM GROUND ──
      [cBL, [-2.5, 1.45, -1.6]],
      [cBR, [2.5, 1.45, -1.6]],
      [[-2.5, -1.3, 0.6], [-2.5, 1.45, 0.6]],
      [[2.5, -1.3, 0.6], [2.5, 1.45, 0.6]],
      [[-2.6, -1.3, 0.6], [-2.6, 1.25, 0.6]],
      [[-2.35, -1.3, 1.2], [-2.35, 1.25, 1.2]],
      [[-1.15, -1.3, 1.2], [-1.15, 1.25, 1.2]],
      [[-0.9, -1.3, 0.6], [-0.9, 1.25, 0.6]],
      [[0.9, -1.3, 0.6], [0.9, 1.25, 0.6]],
      [[1.15, -1.3, 1.2], [1.15, 1.25, 1.2]],
      [[2.35, -1.3, 1.2], [2.35, 1.25, 1.2]],
      [[2.6, -1.3, 0.6], [2.6, 1.25, 0.6]],

      // Ground floor window frames
      [[-2.25, -1.15, 1.22], [-2.25, -0.25, 1.22], [-1.45, -0.25, 1.22], [-1.45, -1.15, 1.22], [-2.25, -1.15, 1.22]],
      [[-1.85, -1.15, 1.22], [-1.85, -0.25, 1.22]],
      [[1.45, -1.15, 1.22], [1.45, -0.25, 1.22], [2.25, -0.25, 1.22], [2.25, -1.15, 1.22], [1.45, -1.15, 1.22]],
      [[1.85, -1.15, 1.22], [1.85, -0.25, 1.22]],
      [[-2.5, -1.05, 0.1], [-2.5, -0.35, 0.1], [-2.5, -0.35, -0.3], [-2.5, -1.05, -0.3], [-2.5, -1.05, 0.1]],
      [[2.5, -1.05, 0.1], [2.5, -0.35, 0.1], [2.5, -0.35, -0.3], [2.5, -1.05, -0.3], [2.5, -1.05, 0.1]],
      [[-2.5, -1.05, -0.7], [-2.5, -0.35, -0.7], [-2.5, -0.35, -1.3], [-2.5, -1.05, -1.3], [-2.5, -1.05, -0.7]],
      [[2.5, -1.05, -0.7], [2.5, -0.35, -0.7], [2.5, -0.35, -1.3], [2.5, -1.05, -1.3], [2.5, -1.05, -0.7]],

      // ── STEP 4: 2ND FLOOR BELT SLAB & BALCONY ──
      [[-2.5, -0.15, -1.6], [2.5, -0.15, -1.6], [2.5, -0.15, 0.6], [-2.5, -0.15, 0.6], [-2.5, -0.15, -1.6]],
      lBayMid,
      rBayMid,
      [[-1.15, 0.15, 1.05], [-0.45, 0.15, 1.05]],
      [[-1.15, -0.15, 1.05], [-0.45, -0.15, 1.05]],
      [[0.45, 0.15, 1.05], [1.15, 0.15, 1.05]],
      [[0.45, -0.15, 1.05], [1.15, -0.15, 1.05]],

      // ── STEP 5: 2ND FLOOR ARCHITECTURE, CHANDELIER & WINDOWS ──
      [[-0.28, -0.15, 0.55], [-0.28, 0.75, 0.55]],
      [[0.28, -0.15, 0.55], [0.28, 0.75, 0.55]],
      nicheWindowArch,
      [[-0.28, 0.35, 0.55], [0.28, 0.35, 0.55]],
      [[0, -0.15, 0.55], [0, 0.75, 0.55]],

      // Hanging Crystal Chandelier
      [[0, 1.48, 1.1], [0, 0.95, 1.1]],
      [[-0.18, 0.95, 1.1], [0.18, 0.95, 1.1]],
      [[-0.28, 0.75, 1.1], [0, 0.65, 1.1], [0.28, 0.75, 1.1]],
      [[-0.35, 0.82, 1.1], [-0.28, 0.75, 1.1]],
      [[0.35, 0.82, 1.1], [0.28, 0.75, 1.1]],
      [[0, 0.65, 1.1], [0, 0.52, 1.1]],

      // Upper floor windows
      [[-2.25, 0.05, 1.22], [-2.25, 1.05, 1.22], [-1.45, 1.05, 1.22], [-1.45, 0.05, 1.22], [-2.25, 0.05, 1.22]],
      [[-1.85, 0.05, 1.22], [-1.85, 1.05, 1.22]],
      [[1.45, 0.05, 1.22], [1.45, 1.05, 1.22], [2.25, 1.05, 1.22], [2.25, 0.05, 1.22], [1.45, 0.05, 1.22]],
      [[1.85, 0.05, 1.22], [1.85, 1.05, 1.22]],
      [[-2.5, 0.15, 0.1], [-2.5, 0.95, 0.1], [-2.5, 0.95, -0.3], [-2.5, 0.15, -0.3], [-2.5, 0.15, 0.1]],
      [[2.5, 0.15, 0.1], [2.5, 0.95, 0.1], [2.5, 0.95, -0.3], [2.5, 0.15, -0.3], [2.5, 0.15, 0.1]],
      [[-2.5, 0.15, -0.7], [-2.5, 0.95, -0.7], [-2.5, 0.95, -1.3], [-2.5, 0.15, -1.3], [-2.5, 0.15, -0.7]],
      [[2.5, 0.15, -0.7], [2.5, 0.95, -0.7], [2.5, 0.95, -1.3], [2.5, 0.15, -1.3], [2.5, 0.15, -0.7]],

      // ── STEP 6: ROOF CORNICE, PARAPET & BALUSTRADES ──
      [[-2.5, 1.25, -1.6], [2.5, 1.25, -1.6], [2.5, 1.25, 0.6], [-2.5, 1.25, 0.6], [-2.5, 1.25, -1.6]],
      [[-2.5, 1.45, -1.6], [2.5, 1.45, -1.6], [2.5, 1.45, 0.6], [-2.5, 1.45, 0.6], [-2.5, 1.45, -1.6]],
      lBayRoof,
      lBayBalustrade,
      rBayRoof,
      rBayBalustrade,

      // ── STEP 7: CLASSICAL ENTABLATURE, PEDIMENT & 3D DOMES ──
      [[-1.15, 1.48, 1.65], [1.15, 1.48, 1.65], [1.15, 1.58, 1.65], [-1.15, 1.58, 1.65], [-1.15, 1.48, 1.65]],
      [[-1.1, 1.58, 1.6], [1.1, 1.58, 1.6], [1.1, 1.95, 1.6], [-1.1, 1.95, 1.6], [-1.1, 1.58, 1.6]],
      [[-0.7, 1.82, 1.62], [0, 1.68, 1.62], [0.7, 1.82, 1.62]],
      [[-0.4, 1.76, 1.62], [0, 1.88, 1.62], [0.4, 1.76, 1.62]],
      [[-1.25, 1.95, 1.7], [1.25, 1.95, 1.7], [1.25, 2.05, 1.7], [-1.25, 2.05, 1.7], [-1.25, 1.95, 1.7]],
      [[-1.25, 2.05, 1.7], [0, 2.65, 1.7], [1.25, 2.05, 1.7]],
      [[-1.05, 2.05, 1.68], [0, 2.52, 1.68], [1.05, 2.05, 1.68]],
      [[-0.3, 2.15, 1.72], [0, 2.42, 1.72], [0.3, 2.15, 1.72], [0, 2.22, 1.72], [-0.3, 2.15, 1.72]],
      [[-1.2, 2.05, 1.7], [-1.2, 2.22, 1.7]],
      [[1.2, 2.05, 1.7], [1.2, 2.22, 1.7]],
      [[0, 2.65, 1.7], [0, 2.85, 1.7]],
      [[-1.15, 1.48, 1.65], [-1.15, 1.48, 0.55]],
      [[1.15, 1.48, 1.65], [1.15, 1.48, 0.55]],

      // 3D Ribbed Domes
      lDomeXY,
      lDomeZY,
      [[-1.91, 1.35, 0.95], [-1.91, 1.7, 0.95]],
      [[-1.59, 1.35, 0.95], [-1.59, 1.7, 0.95]],
      lDormerArch,
      [[-1.75, 1.86, 0.95], [-1.75, 2.05, 0.95]],

      rDomeXY,
      rDomeZY,
      [[1.59, 1.35, 0.95], [1.59, 1.7, 0.95]],
      [[1.91, 1.35, 0.95], [1.91, 1.7, 0.95]],
      rDormerArch,
      [[1.75, 1.86, 0.95], [1.75, 2.05, 0.95]],

      // Roof Rafters
      [[0, 1.95, 0.5], [0, 1.95, -1.3]],
      [[-2.5, 1.25, 0.6], [0, 1.95, 0.5]],
      [[2.5, 1.25, 0.6], [0, 1.95, 0.5]],
      [[-2.5, 1.25, -1.6], [0, 1.95, -1.3]],
      [[2.5, 1.25, -1.6], [0, 1.95, -1.3]],
      [[0, 2.65, 1.7], [0, 2.15, 0.5]],
      [[-1.25, 2.05, 1.7], [-0.8, 1.7, 0.5]],
      [[1.25, 2.05, 1.7], [0.8, 1.7, 0.5]],

      // Rear Elevation Details
      [[-0.38, -1.3, -1.6], [-0.38, -0.7, -1.6]],
      [[0.38, -1.3, -1.6], [0.38, -0.7, -1.6]],
      rearArch,
      [[0, -1.3, -1.6], [0, -0.32, -1.6]],
      [[-1.4, -1.05, -1.6], [-1.4, -0.35, -1.6], [-0.85, -0.35, -1.6], [-0.85, -1.05, -1.6], [-1.4, -1.05, -1.6]],
      [[0.85, -1.05, -1.6], [0.85, -0.35, -1.6], [1.4, -0.35, -1.6], [1.4, -1.05, -1.6], [0.85, -1.05, -1.6]],
      [[-0.7, 0.15, -1.75], [0.7, 0.15, -1.75]],
      [[-0.7, -0.15, -1.75], [0.7, -0.15, -1.75]],
      [[-0.7, -0.15, -1.6], [-0.7, 0.15, -1.6], [-0.7, 0.15, -1.75], [-0.7, -0.15, -1.75], [-0.7, -0.15, -1.6]],
      [[0.7, -0.15, -1.6], [0.7, 0.15, -1.6], [0.7, 0.15, -1.75], [0.7, -0.15, -1.75], [0.7, -0.15, -1.6]],
      [[-0.4, 0.15, -1.6], [-0.4, 0.95, -1.6], [0.4, 0.95, -1.6], [0.4, 0.15, -1.6]],
      [[-1.4, 0.15, -1.6], [-1.4, 0.95, -1.6], [-0.85, 0.95, -1.6], [-0.85, 0.15, -1.6], [-1.4, 0.15, -1.6]],
      [[0.85, 0.15, -1.6], [0.85, 0.95, -1.6], [1.4, 0.95, -1.6], [1.4, 0.15, -1.6], [0.85, 0.15, -1.6]],
      [[-0.6, 1.45, -1.6], [0, 1.75, -1.6], [0.6, 1.45, -1.6]],
      [[-2.0, -1.3, -1.6], [-2.0, -1.3, -2.2], [2.0, -1.3, -2.2], [2.0, -1.3, -1.6]],

      // ── STEP 8: FORECOURT LANDSCAPE, STAIRS & BALUSTRADE RAMP ──
      [[-1.15, -1.3, 1.65], [-1.0, -1.3, 1.65], [-1.02, -1.15, 1.65], [-1.13, -1.15, 1.65], [-1.15, -1.3, 1.65]],
      arcXY(-1.07, -1.03, 1.65, 0.12, 0, Math.PI * 2),
      [[1.0, -1.3, 1.65], [1.15, -1.3, 1.65], [1.13, -1.15, 1.65], [1.02, -1.15, 1.65], [1.0, -1.3, 1.65]],
      arcXY(1.07, -1.03, 1.65, 0.12, 0, Math.PI * 2),
      [[1.2, -1.1, 1.8], [2.5, -1.35, 2.8]],
      [[1.2, -1.3, 1.8], [2.5, -1.55, 2.8]],
      [[-1.4, -1.3, 2.1], [-1.55, -0.6, 2.1], [-1.4, 0.7, 2.1]],
      [[-1.4, -1.3, 2.1], [-1.25, -0.6, 2.1], [-1.4, 0.7, 2.1]],
      [[-1.55, -0.6, 2.1], [-1.25, -0.6, 2.1]],
      [[-1.5, 0.05, 2.1], [-1.3, 0.05, 2.1]],
      [[-1.9, -1.3, 2.3], [-2.02, -0.7, 2.3], [-1.9, 0.1, 2.3]],
      [[-1.9, -1.3, 2.3], [-1.78, -0.7, 2.3], [-1.9, 0.1, 2.3]],
      [[-2.02, -0.7, 2.3], [-1.78, -0.7, 2.3]],
      [[-2.4, -1.3, 2.4], [-1.2, -1.3, 2.4], [-1.2, -1.3, 1.8]],
      [[-2.4, -1.18, 2.4], [-1.2, -1.18, 2.4], [-1.2, -1.18, 1.8]],
    ];

    // Colonnade Columns
    [-0.92, -0.68, 0.68, 0.92].forEach((cx) => {
      polylines.push([[cx - 0.12, -1.3, 1.6], [cx + 0.12, -1.3, 1.6], [cx + 0.12, -0.85, 1.6], [cx - 0.12, -0.85, 1.6], [cx - 0.12, -1.3, 1.6]]);
      polylines.push([[cx - 0.12, -0.85, 1.6], [cx - 0.12, -0.85, 1.4], [cx + 0.12, -0.85, 1.4], [cx + 0.12, -0.85, 1.6]]);
      polylines.push([[cx - 0.08, -0.85, 1.55], [cx - 0.08, 1.35, 1.55]]);
      polylines.push([[cx + 0.08, -0.85, 1.55], [cx + 0.08, 1.35, 1.55]]);
      polylines.push([[cx, -0.85, 1.58], [cx, 1.35, 1.58]]);
      polylines.push([[cx - 0.14, 1.35, 1.55], [cx - 0.16, 1.45, 1.55], [cx + 0.16, 1.45, 1.55], [cx + 0.14, 1.35, 1.55]]);
    });

    // Chandelier Lights
    [-0.28, -0.14, 0, 0.14, 0.28].forEach((lx) => {
      polylines.push([[lx, 0.78, 1.1], [lx, 0.85, 1.1]]);
    });

    // Balcony Balusters
    [-1.0, -0.85, -0.7, -0.55, 0.55, 0.7, 0.85, 1.0].forEach((bx) => {
      polylines.push([[bx, -0.15, 1.05], [bx, 0.15, 1.05]]);
    });

    // Rear Balusters
    [-1.6, -0.65, 0.65, 1.6].forEach((rx) => {
      polylines.push([[rx, -1.3, -1.6], [rx, 1.45, -1.6]]);
    });
    [-0.5, -0.25, 0, 0.25, 0.5].forEach((bx) => {
      polylines.push([[bx, -0.15, -1.75], [bx, 0.15, -1.75]]);
    });

    // Steps
    [
      { z: 1.2, w: 0.7, y: -1.22 },
      { z: 1.35, w: 0.8, y: -1.24 },
      { z: 1.5, w: 0.9, y: -1.26 },
      { z: 1.65, w: 1.0, y: -1.28 },
      { z: 1.8, w: 1.1, y: -1.3 },
    ].forEach((step) => {
      polylines.push([[-step.w, step.y, step.z], [step.w, step.y, step.z]]);
      polylines.push([[-step.w, step.y, step.z], [-step.w, step.y - 0.02, step.z]]);
      polylines.push([[step.w, step.y, step.z], [step.w, step.y - 0.02, step.z]]);
    });

    // Balustrade Ramp Posts
    [0, 0.2, 0.4, 0.6, 0.8, 1.0].forEach((t) => {
      const x = 1.2 + t * 1.3;
      const z = 1.8 + t * 1.0;
      const yTop = -1.1 - t * 0.25;
      const yBot = -1.3 - t * 0.25;
      polylines.push([[x, yBot, z], [x, yTop, z]]);
    });

    // Forecourt Paths
    [-0.8, -0.4, 0, 0.4, 0.8].forEach((px) => {
      polylines.push([[px, -1.3, 1.8], [px * 1.3, -1.3, 2.8]]);
    });
    [2.05, 2.35, 2.65].forEach((pz) => {
      polylines.push([[-0.9 * (pz / 1.8), -1.3, pz], [0.9 * (pz / 1.8), -1.3, pz]]);
    });

    // Convert into subdivided line segments so lines physically draw across their length
    const coords = [];
    polylines.forEach((line) => {
      addPolylineSubdivided(line, coords, 0.16);
    });

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.Float32BufferAttribute(coords, 3));
    geom.computeBoundingSphere();
    geom.setDrawRange(0, 0); // Initially hidden!
    totalVerticesRef.current = coords.length / 3;
    return geom;
  }, []);

  const lineSegmentsRef = useRef(null);
  const drawProgress = useRef({ val: 0 });

  useEffect(() => {
    // Reset villa group rotation to 0 during entry
    if (villaGroup.current) {
      villaGroup.current.rotation.set(0, 0, 0);
    }
    // Initially ensure zero lines are visible before dots reach corners
    drawProgress.current.val = 0;
    if (lineSegmentsRef.current && lineSegmentsRef.current.geometry) {
      lineSegmentsRef.current.geometry.setDrawRange(0, 0);
    }

    const tl = gsap.timeline({
      onComplete: () => {
        // ONLY call onVillaReady after the complete villa is built and showcased!
        if (onVillaReadyRef.current) {
          onVillaReadyRef.current();
        }
      },
    });

    // ── STAGE 1: 4 CIRCULAR DOTS TAKE ENTRY FROM EACH CORNER INDEPENDENTLY AT THE SAME TIME (0.0s - 0.95s) ──
    pillarRefs.forEach((ref, i) => {
      if (!ref.current) return;
      ref.current.position.set(entryPositions[i][0], entryPositions[i][1], entryPositions[i][2]);
      ref.current.scale.set(0.1, 0.1, 0.1);

      tl.to(
        ref.current.scale,
        {
          x: 1,
          y: 1,
          z: 1,
          duration: 0.35,
          ease: 'power2.out',
        },
        0.0
      );

      tl.to(
        ref.current.position,
        {
          x: centerPositions[i][0],
          y: centerPositions[i][1],
          z: centerPositions[i][2],
          duration: 0.95,
          ease: 'power3.out',
        },
        0.0
      );
    });

    // ── STAGE 2: ANTI-GRAVITY CONVERGENCE PULSE AT SCREEN CENTER (0.95s - 1.2s) ──
    pillarRefs.forEach((ref, i) => {
      if (!ref.current) return;
      tl.to(
        ref.current.scale,
        {
          x: 1.35,
          y: 1.35,
          z: 1.35,
          duration: 0.15,
          yoyo: true,
          repeat: 1,
          ease: 'sine.inOut',
        },
        0.95 + i * 0.02
      );
    });

    // ── STAGE 3: EXPAND FROM CENTER TO 4 VILLA FOUNDATION CORNERS (1.2s - 2.0s) ──
    pillarRefs.forEach((ref, i) => {
      if (!ref.current) return;
      tl.to(
        ref.current.position,
        {
          x: cornerPositions[i][0],
          y: cornerPositions[i][1],
          z: cornerPositions[i][2],
          duration: 0.8,
          ease: 'expo.inOut',
        },
        1.2
      );
    });

    // ── STAGE 4: ARCHITECTURAL PROGRESSIVE TIMELAPSE (2.0s - 4.6s) ──
    // Every line constructs one by one in series across the screen like a true timelapse
    tl.to(
      drawProgress.current,
      {
        val: 1,
        duration: 2.6,
        ease: 'power1.inOut',
      },
      2.0
    );

    // Symmetrical 3D perspective tilt while villa is constructing
    if (villaGroup.current) {
      tl.to(
        villaGroup.current.rotation,
        {
          x: 0.16,
          y: 0.48,
          duration: 2.2,
          ease: 'power2.inOut',
        },
        2.4
      );
    }

    // ── STAGE 5: SHOWCASE COMPLETED VILLA (4.6s - 5.2s) ──
    // Allow user to admire the fully built palace before uncovering
    tl.call(() => {
      canTurntable.current = true;
    }, [], 4.6);

    // Pause briefly so the full villa is visible before uncover begins
    tl.to({}, { duration: 0.6 }, 4.6);

    return () => {
      tl.kill();
    };
  }, []);

  // Update draw range directly in Three.js render loop every frame with zero lag
  useFrame((_, delta) => {
    if (lineSegmentsRef.current && lineSegmentsRef.current.geometry) {
      const geom = lineSegmentsRef.current.geometry;
      const count = Math.floor(drawProgress.current.val * totalVerticesRef.current);
      const evenCount = count - (count % 2);
      geom.setDrawRange(0, evenCount);
    }
    if (canTurntable.current && villaGroup.current) {
      villaGroup.current.rotation.y += delta * 0.22;
    }
  });

  return (
    <group ref={villaGroup} position={[0, 0, 0]}>
      {/* 1. THE 4 CIRCULAR CORNER BOUNDARY DOTS */}
      <group>
        {entryPositions.map((pos, idx) => (
          <mesh key={idx} ref={pillarRefs[idx]} position={pos}>
            <sphereGeometry args={[0.13, 24, 24]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
        ))}
      </group>

      {/* 2. COMPLETE 360-DEGREE FULL 3D PALACE WIREFRAME MODEL (TIMELAPSE PROGRESSIVE DRAWING) */}
      <lineSegments ref={lineSegmentsRef} geometry={lineSegmentsGeometry} frustumCulled={false}>
        <lineBasicMaterial
          color="#FFFFFF"
          transparent={false}
          depthTest={true}
        />
      </lineSegments>
    </group>
  );
};

// =========================================================
// MAIN COMPONENT: ULTRA-SMOOTH GPU-ACCELERATED MOUSE WIPE
// =========================================================
export function IntroPreloader({ onComplete }) {
  const [showMouse, setShowMouse] = useState(false);
  const [isClicking, setIsClicking] = useState(false);
  const [unmountLoader, setUnmountLoader] = useState(false);

  // Direct DOM references for 100% lock-step 60FPS sync
  const wipeLayerRef = useRef(null);
  const mouseSlideContainerRef = useRef(null);
  const scrollWheelRef = useRef(null);

  const isWipingRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const startMouseWipe = () => {
    if (isWipingRef.current) return;
    isWipingRef.current = true;
    setShowMouse(true);

    const proxy = { progress: -15 };

    const updateScrollWheel = (p) => {
      if (scrollWheelRef.current) {
        const treadPitch = 6;
        const raw = (p * 3.2) % treadPitch;
        const offset = (raw + treadPitch) % treadPitch;
        scrollWheelRef.current.style.transform = `translate3d(${offset}px, 0, 0)`;
      }
    };

    const tl = gsap.timeline({
      onComplete: () => {
        setIsClicking(false);
        setShowMouse(false);
        setUnmountLoader(true);
        if (onCompleteRef.current) {
          onCompleteRef.current();
        }
      },
    });

    // 1. Mouse smoothly glides into view from off-screen left (GPU transform, zero pop-in)
    tl.to(
      proxy,
      {
        progress: 0,
        duration: 0.5,
        ease: 'power2.out',
        onUpdate: () => {
          if (mouseSlideContainerRef.current) {
            mouseSlideContainerRef.current.style.transform = `translate3d(${proxy.progress}vw, 0, 0)`;
          }
          updateScrollWheel(proxy.progress);
        },
      },
      0.0
    );

    // 2. Click down as the mouse nose reaches the left screen boundary
    tl.call(() => setIsClicking(true), [], 0.5);

    // 3. Super smooth horizontal slide across the screen uncovering the landing page in 1:1 lock-step
    tl.to(
      proxy,
      {
        progress: 112,
        duration: 2.0,
        ease: 'power2.inOut',
        onUpdate: () => {
          const p = proxy.progress;
          const clamped = Math.max(0, Math.min(100, p));

          // Direct lock-step GPU clip-path
          if (wipeLayerRef.current) {
            wipeLayerRef.current.style.clipPath = `inset(0 0 0 ${clamped}%)`;
          }

          // Direct lock-step GPU translate3d (strictly straight horizontal, zero layout recalc)
          if (mouseSlideContainerRef.current) {
            mouseSlideContainerRef.current.style.transform = `translate3d(${p}vw, 0, 0)`;
          }

          // Rotating treads in XZ plane along direction of travel
          updateScrollWheel(p);
        },
      },
      0.55
    );
  };

  const handleSkip = () => {
    setIsClicking(false);
    setShowMouse(false);
    setUnmountLoader(true);
    if (onCompleteRef.current) {
      onCompleteRef.current();
    }
  };

  // Keyboard shortcut (ESC) to skip intro
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        handleSkip();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (unmountLoader) return null;

  return (
    <>
      {/* 1. BLACK 3D PALACE LAYER (CENTERED ON SCREEN, SLICED DIRECTLY BY MOUSE WIPE) */}
      <div
        ref={wipeLayerRef}
        style={{
          clipPath: 'inset(0 0 0 0%)',
          willChange: 'clip-path',
          transform: 'translateZ(0)',
          backfaceVisibility: 'hidden',
        }}
        className="fixed inset-0 z-40 bg-black pointer-events-none select-none overflow-hidden transition-none"
      >
        {/* Skip button on the intro overlay */}
        <button
          type="button"
          onClick={handleSkip}
          className="absolute top-5 right-6 z-50 px-3.5 py-1.5 rounded-full text-xs font-medium text-white/60 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-all duration-200 backdrop-blur-md cursor-pointer pointer-events-auto"
          aria-label="Skip Intro Animation"
        >
          Skip Intro <span className="opacity-40 text-[10px] ml-1">ESC</span>
        </button>

        {/* Centered camera framing the complete 3D neoclassical palace */}
        <Canvas
          gl={{
            antialias: true,
            alpha: false,
            powerPreference: 'high-performance',
            stencil: false,
            depth: true,
          }}
          dpr={[1, 1.5]}
          camera={{ position: [0, 0.45, 8.4], fov: 45 }}
        >
          <NeoclassicalVillaScene onVillaReady={startMouseWipe} />
        </Canvas>
      </div>

      {/* 2. TOP-VIEW HARDWARE MOUSE & SEAM (ZERO SUDDEN ENTRY, ZERO PURPLE GLOW, STRAIGHT HORIZONTAL PATH) */}
      {showMouse && (
        <div
          ref={mouseSlideContainerRef}
          style={{
            left: 0,
            transform: 'translate3d(-15vw, 0, 0)',
            willChange: 'transform',
          }}
          className="fixed top-0 bottom-0 z-50 pointer-events-none transition-none"
        >
          {/* Razor-clean Minimalist Cut Hairline (Purple glow completely eliminated) */}
          <div className="relative h-full w-[1.5px] -translate-x-1/2 bg-white/60 shadow-[0_0_8px_rgba(255,255,255,0.4)]" />

          {/* Mouse locked on a 100% straight horizontal trajectory at vertical center (50%) */}
          <div
            style={{ top: '50%' }}
            className={`absolute -translate-x-[120px] -translate-y-1/2 transition-none ${
              isClicking ? 'scale-95' : 'scale-100'
            }`}
          >
            <ExactPhysicalMouse isClicking={isClicking} scrollWheelRef={scrollWheelRef} />
          </div>
        </div>
      )}
    </>
  );
}

export default IntroPreloader;
