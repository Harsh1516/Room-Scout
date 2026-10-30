import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// ── 1. The Red Wooden Boat ──
function RedBoat() {
  const boatGroup = useRef();

  // Create canoe/rowboat hull shape
  const { hullGeometry, interiorGeometry, benches } = useMemo(() => {
    // Outer hull shape
    const outerShape = new THREE.Shape();
    outerShape.moveTo(0, -1.9);
    outerShape.bezierCurveTo(0.48, -0.9, 0.52, 0.9, 0, 1.9);
    outerShape.bezierCurveTo(-0.52, 0.9, -0.48, -0.9, 0, -1.9);

    // Inner cavity cutout (hollow hull)
    const innerHole = new THREE.Path();
    innerHole.moveTo(0, -1.75);
    innerHole.bezierCurveTo(-0.4, -0.8, -0.44, 0.8, 0, 1.75);
    innerHole.bezierCurveTo(0.44, 0.8, 0.4, -0.8, 0, -1.75);
    outerShape.holes.push(innerHole);

    const extrudeSettings = {
      depth: 0.28,
      bevelEnabled: true,
      bevelSegments: 3,
      steps: 1,
      bevelSize: 0.04,
      bevelThickness: 0.04,
    };

    const hullGeom = new THREE.ExtrudeGeometry(outerShape, extrudeSettings);
    hullGeom.rotateX(Math.PI / 2);

    // Interior bottom floor
    const floorShape = new THREE.Shape();
    floorShape.moveTo(0, -1.7);
    floorShape.bezierCurveTo(0.38, -0.8, 0.42, 0.8, 0, 1.7);
    floorShape.bezierCurveTo(-0.42, 0.8, -0.38, -0.8, 0, -1.7);
    const floorGeom = new THREE.ShapeGeometry(floorShape);
    floorGeom.rotateX(-Math.PI / 2);

    // Bench seats (3 cross benches)
    const benchList = [
      { z: -0.8, width: 0.62 },
      { z: 0.0, width: 0.78 },
      { z: 0.8, width: 0.64 },
    ];

    return { hullGeometry: hullGeom, interiorGeometry: floorGeom, benches: benchList };
  }, []);

  return (
    <group ref={boatGroup} position={[0.2, 0.04, 0.15]} rotation={[0, 0, Math.PI / 2]}>
      {/* Soft Sand Contact Shadow */}
      <mesh position={[0, -0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1.2, 4.2]} />
        <meshBasicMaterial color="#0b0c0d" transparent opacity={0.65} />
      </mesh>

      {/* Red Painted Outer Hull */}
      <mesh geometry={hullGeometry} castShadow receiveShadow>
        <meshStandardMaterial
          color="#b8332a"
          roughness={0.55}
          metalness={0.1}
        />
      </mesh>

      {/* Inner Natural Wood Floor */}
      <mesh geometry={interiorGeometry} position={[0, 0.05, 0]} receiveShadow>
        <meshStandardMaterial
          color="#aa8355"
          roughness={0.7}
        />
      </mesh>

      {/* Wooden Benches */}
      {benches.map((b, idx) => (
        <mesh key={idx} position={[0, 0.16, b.z]} castShadow receiveShadow>
          <boxGeometry args={[b.width, 0.04, 0.22]} />
          <meshStandardMaterial color="#ba8d5a" roughness={0.65} />
        </mesh>
      ))}

      {/* Gunwale Rim Trim */}
      <mesh position={[0, 0.26, 0]}>
        <torusGeometry args={[0.9, 0.025, 4, 32]} />
        <meshStandardMaterial color="#8e221b" roughness={0.5} />
      </mesh>
    </group>
  );
}

// ── 2. The Coastal Villa House ──
function CoastalVilla() {
  return (
    <group position={[0, 0.2, -4.6]}>
      {/* House Base Platform / Foundation */}
      <mesh position={[0, 0.15, 0]} castShadow receiveShadow>
        <boxGeometry args={[4.8, 0.3, 2.4]} />
        <meshStandardMaterial color="#2c2621" roughness={0.9} />
      </mesh>

      {/* Terracotta Tiled Roof (Sloped Gabled Roof) */}
      <group position={[0, 0.6, 0]}>
        {/* Main Gable Roof Pitch */}
        <mesh rotation={[0, 0, 0]} castShadow receiveShadow>
          <boxGeometry args={[5.2, 0.45, 2.6]} />
          <meshStandardMaterial
            color="#8c4331"
            roughness={0.75}
          />
        </mesh>

        {/* Roof Ridge Beam */}
        <mesh position={[0, 0.26, 0]} castShadow>
          <boxGeometry args={[5.3, 0.1, 0.18]} />
          <meshStandardMaterial color="#572418" roughness={0.8} />
        </mesh>

        {/* Roof Tile Texture Ridges (Horizontal slats giving realistic terracotta look) */}
        {[-0.8, -0.4, 0.0, 0.4, 0.8].map((zPos, idx) => (
          <mesh key={idx} position={[0, 0.24, zPos]} castShadow>
            <boxGeometry args={[5.18, 0.03, 0.08]} />
            <meshStandardMaterial color="#6e2e20" roughness={0.8} />
          </mesh>
        ))}
      </group>

      {/* Front Wooden Veranda / Porch Extension */}
      <group position={[0, 0.15, 1.45]}>
        {/* Veranda Deck Planks */}
        <mesh position={[0, 0.05, 0]} receiveShadow>
          <boxGeometry args={[3.8, 0.08, 1.1]} />
          <meshStandardMaterial color="#6a5242" roughness={0.8} />
        </mesh>

        {/* Veranda Posts / Beams */}
        {[-1.6, -0.55, 0.55, 1.6].map((xPos, idx) => (
          <mesh key={idx} position={[xPos, 0.35, 0.45]} castShadow>
            <boxGeometry args={[0.08, 0.65, 0.08]} />
            <meshStandardMaterial color="#443226" roughness={0.85} />
          </mesh>
        ))}

        {/* Porch Corrugated Sunshade Roof */}
        <mesh position={[0, 0.72, 0.2]} rotation={[0.15, 0, 0]} castShadow>
          <boxGeometry args={[3.9, 0.05, 1.25]} />
          <meshStandardMaterial color="#524b45" roughness={0.7} />
        </mesh>
      </group>
    </group>
  );
}

// ── 3. Tropical Palm Trees & Green Foliage ──
function PalmTree({ position, scale = 1, rotationZ = 0 }) {
  const frondsGroup = useRef();

  // Create fan fronds
  const fronds = useMemo(() => {
    const list = [];
    const count = 10;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      list.push({
        angle,
        length: 1.6 + (i % 3) * 0.2,
        tilt: 0.35 + (i % 2) * 0.15,
      });
    }
    return list;
  }, []);

  useFrame((state) => {
    if (!frondsGroup.current) return;
    const t = state.clock.getElapsedTime();
    // Gentle natural breeze sway
    frondsGroup.current.rotation.z = rotationZ + Math.sin(t * 1.5 + position[0]) * 0.035;
    frondsGroup.current.rotation.x = Math.cos(t * 1.2 + position[2]) * 0.025;
  });

  return (
    <group position={position} scale={scale}>
      {/* Palm Trunk */}
      <mesh position={[0, 1.2, 0]} rotation={[0.08, 0, rotationZ]} castShadow>
        <cylinderGeometry args={[0.12, 0.2, 2.5, 7]} />
        <meshStandardMaterial color="#554131" roughness={0.9} />
      </mesh>

      {/* Crown Fronds Cluster */}
      <group ref={frondsGroup} position={[0, 2.45, 0]}>
        {fronds.map((f, i) => (
          <group key={i} rotation={[0, f.angle, 0]}>
            {/* Arching Frond Stem & Leaf Fan */}
            <mesh
              position={[f.length * 0.45, -0.25, 0]}
              rotation={[0, 0, -f.tilt]}
              castShadow
            >
              <planeGeometry args={[f.length, 0.45]} />
              <meshStandardMaterial
                color={i % 2 === 0 ? '#38783d' : '#2b6530'}
                roughness={0.7}
                side={THREE.DoubleSide}
              />
            </mesh>
          </group>
        ))}
      </group>
    </group>
  );
}

function TropicalCanopy() {
  return (
    <group>
      {/* Left Palm Tree */}
      <PalmTree position={[-4.1, 0, -4.2]} scale={1.25} rotationZ={0.12} />
      {/* Right Palm Tree */}
      <PalmTree position={[3.6, 0, -3.8]} scale={1.2} rotationZ={-0.1} />
      {/* Secondary accent palm tree */}
      <PalmTree position={[-3.2, 0, -2.8]} scale={0.95} rotationZ={0.06} />

      {/* Lush Green Forest Canopy Clusters surrounding the house */}
      {/* Left side canopy mounds */}
      <mesh position={[-5.0, 0.7, -4.6]} castShadow>
        <dodecahedronGeometry args={[1.7, 1]} />
        <meshStandardMaterial color="#1f4c24" roughness={0.85} />
      </mesh>
      <mesh position={[-4.5, 0.8, -3.2]} castShadow>
        <dodecahedronGeometry args={[1.3, 1]} />
        <meshStandardMaterial color="#265e2d" roughness={0.8} />
      </mesh>
      <mesh position={[-2.4, 0.5, -4.5]} castShadow>
        <dodecahedronGeometry args={[1.1, 1]} />
        <meshStandardMaterial color="#2c6934" roughness={0.85} />
      </mesh>

      {/* Right side canopy mounds */}
      <mesh position={[4.8, 0.8, -4.5]} castShadow>
        <dodecahedronGeometry args={[1.8, 1]} />
        <meshStandardMaterial color="#1e4a23" roughness={0.85} />
      </mesh>
      <mesh position={[4.4, 0.7, -3.0]} castShadow>
        <dodecahedronGeometry args={[1.35, 1]} />
        <meshStandardMaterial color="#296331" roughness={0.8} />
      </mesh>
      <mesh position={[2.5, 0.5, -4.4]} castShadow>
        <dodecahedronGeometry args={[1.0, 1]} />
        <meshStandardMaterial color="#25582c" roughness={0.85} />
      </mesh>
    </group>
  );
}

// ── 4. Volcanic Sand Beach (Dark Granular Shore) ──
function VolcanicBeach() {
  return (
    <mesh position={[0, -0.01, -1.2]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[26, 14]} />
      <meshStandardMaterial
        color="#17181c"
        roughness={0.96}
        metalness={0.05}
      />
    </mesh>
  );
}

// ── 5. Living Ocean Waves & Foaming Tidal Surf ──
// Strictly autonomous natural wave rhythm — NO cursor water interaction
function LivingOceanSurf() {
  const oceanMesh = useRef();
  const foamMesh = useRef();

  // Custom wave shader uniforms
  const uniforms = useMemo(() => {
    return {
      uTime: { value: 0 },
      uDeepColor: { value: new THREE.Color('#004353') },
      uShallowColor: { value: new THREE.Color('#0094a9') },
      uFoamColor: { value: new THREE.Color('#ffffff') },
    };
  }, []);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    uniforms.uTime.value = t;

    if (foamMesh.current) {
      // Natural tidal surge: foam gently washes up onto the sand and recedes
      // Cycle: ~4.6 seconds period
      const surge = Math.sin(t * 1.35) * 0.22;
      foamMesh.current.position.z = 1.3 + surge;
    }
  });

  return (
    <group position={[0, 0.02, 3.2]}>
      {/* Deep Turquoise Water Surface */}
      <mesh
        ref={oceanMesh}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, 0]}
        receiveShadow
      >
        <planeGeometry args={[26, 7.5, 64, 32]} />
        <shaderMaterial
          uniforms={uniforms}
          vertexShader={`
            uniform float uTime;
            varying vec2 vUv;
            varying float vWave;
            void main() {
              vUv = uv;
              vec3 pos = position;
              // Autonomous multi-frequency ocean rolling swells
              float wave1 = sin(pos.y * 3.5 - uTime * 2.2 + sin(pos.x * 2.0)) * 0.08;
              float wave2 = cos(pos.y * 5.0 - uTime * 3.0) * 0.04;
              pos.z += wave1 + wave2;
              vWave = pos.z;
              gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
            }
          `}
          fragmentShader={`
            uniform vec3 uDeepColor;
            uniform vec3 uShallowColor;
            uniform vec3 uFoamColor;
            varying vec2 vUv;
            varying float vWave;
            void main() {
              // Deep to turquoise shallow gradient
              vec3 water = mix(uDeepColor, uShallowColor, vUv.y * 0.8 + vWave * 2.0);
              // Crest highlights
              if (vWave > 0.06) {
                water = mix(water, uFoamColor, smoothstep(0.06, 0.11, vWave) * 0.65);
              }
              gl_FragColor = vec4(water, 1.0);
            }
          `}
        />
      </mesh>

      {/* Dynamic White Crashing Foam Wave Surf Front */}
      <mesh
        ref={foamMesh}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.015, 1.3]}
      >
        <planeGeometry args={[26, 1.6, 64, 16]} />
        <shaderMaterial
          transparent
          uniforms={uniforms}
          vertexShader={`
            uniform float uTime;
            varying vec2 vUv;
            void main() {
              vUv = uv;
              vec3 pos = position;
              // Organic scalloped foam line shape
              float scallops = sin(pos.x * 2.4) * 0.18 + cos(pos.x * 4.8) * 0.08;
              pos.y += scallops;
              gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
            }
          `}
          fragmentShader={`
            uniform float uTime;
            varying vec2 vUv;
            void main() {
              // Intricate lace foam transparency with bubbling noise
              float foamShape = smoothstep(0.0, 0.35, vUv.y) * smoothstep(1.0, 0.45, vUv.y);
              float lace = sin(vUv.x * 35.0 + uTime * 2.0) * cos(vUv.y * 28.0 - uTime * 1.5);
              float alpha = clamp(foamShape * 1.2 + lace * 0.25, 0.0, 0.95);
              gl_FragColor = vec4(1.0, 1.0, 1.0, alpha);
            }
          `}
        />
      </mesh>
    </group>
  );
}

// ── 6. Master Three.js Scene Component ──
export function CoastalVilla3DScene() {
  return (
    <div className="fixed inset-0 w-full h-full pointer-events-none z-0 overflow-hidden select-none bg-[#141517]">
      <Canvas
        camera={{ position: [0, 14.5, 1.8], fov: 38 }}
        onCreated={({ camera }) => {
          camera.lookAt(0, 0, -0.4);
        }}
        gl={{
          antialias: true,
          powerPreference: 'high-performance',
          alpha: false,
        }}
        dpr={[1, 1.5]}
      >
        {/* Sky Ambient Light */}
        <ambientLight intensity={1.1} color="#dbeafe" />

        {/* Sunlight Directional Light casting gentle shadows */}
        <directionalLight
          position={[6, 16, 4]}
          intensity={1.75}
          color="#fff8ed"
          castShadow
          shadow-mapSize={[1024, 1024]}
        />

        {/* Tropical Blue Water Bounce Light */}
        <directionalLight
          position={[0, -2, 6]}
          intensity={0.4}
          color="#06b6d4"
        />

        {/* 3D Scene Components */}
        <VolcanicBeach />
        <LivingOceanSurf />
        <RedBoat />
        <CoastalVilla />
        <TropicalCanopy />
      </Canvas>

      {/* Subtle Atmospheric Top Shading for 100% Typography Crispness */}
      <div className="absolute inset-x-0 top-0 h-44 bg-gradient-to-b from-black/60 via-black/25 to-transparent pointer-events-none" />

      {/* Subtle Bottom Vignette */}
      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/45 to-transparent pointer-events-none" />
    </div>
  );
}

export default CoastalVilla3DScene;
