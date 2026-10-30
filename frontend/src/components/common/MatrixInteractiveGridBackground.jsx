import React, { useRef, useEffect } from 'react';

/**
 * MatrixInteractiveGridBackground
 * - Completely dark pure black background (#000000)
 * - Ultra-thin, cybernetic matrix grid lines
 * - Interactive circular distortion & concentric rings that follow and warp where the mouse pointer slides
 * - Data packets streaming along grid lines
 * - 60/120 FPS hardware-accelerated WebGL shader with smooth mouse physics & inertia
 */
export function MatrixInteractiveGridBackground({ className = '' } = {}) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let animId;
    let resizeObserver = null;

    // High-DPI canvas resolution synchronization
    function syncSize() {
      if (!canvas) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = window.innerWidth;
      const h = window.innerHeight;
      if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr)) {
        canvas.width = Math.floor(w * dpr);
        canvas.height = Math.floor(h * dpr);
      }
    }

    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(syncSize);
      resizeObserver.observe(document.body);
    }
    window.addEventListener('resize', syncSize, { passive: true });
    syncSize();

    const gl = canvas.getContext('webgl', {
      alpha: false,
      antialias: true,
      depth: false,
      powerPreference: 'high-performance',
    }) || canvas.getContext('experimental-webgl');

    if (!gl) return;

    const vs = `
      attribute vec2 a_position;
      void main() {
        gl_Position = vec4(a_position, 0.0, 1.0);
      }
    `;

    const fs = `
      precision highp float;
      uniform vec2 u_resolution;
      uniform float u_time;
      uniform vec2 u_mouse;
      uniform float u_speed;
      uniform float u_active;

      // Antialiased thin grid line drawing helper
      float drawLine(float coord, float lineWidth) {
        float f = abs(fract(coord - 0.5) - 0.5);
        float df = fwidth(coord);
        return 1.0 - smoothstep(0.0, max(df * lineWidth, 0.0001), f);
      }

      // Hash function for random data pulse generation
      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
      }

      void main() {
        // Normalized pixel space
        vec2 fragCoord = gl_FragCoord.xy;
        vec2 res = u_resolution;
        float minDim = min(res.x, res.y);

        // Aspect-ratio-corrected UV (-1 to 1 at edges)
        vec2 uv = (fragCoord - 0.5 * res) / minDim;
        vec2 mouse = (u_mouse - 0.5 * res) / minDim;

        // Invert Y for OpenGL coordinate space
        mouse.y = -mouse.y;

        // Mouse distance & angle
        vec2 delta = uv - mouse;
        float dist = length(delta);
        float angle = atan(delta.y, delta.x);

        // Dynamic circle radius: expands smoothly as mouse slides faster
        float circleRadius = 0.22 + clamp(u_speed * 0.045, 0.0, 0.14);
        
        // Influence field of the mouse pointer circle
        float circleArea = smoothstep(circleRadius * 1.5, circleRadius * 0.15, dist);

        // ── 1. MATRIX CARTESIAN GRID (Straight Thin Lines) ──
        float gridScale = 24.0;
        vec2 st = uv * gridScale;
        
        // Subtle perspective / curved tangential lens distortion as mouse slides
        float lensPush = sin(dist * 16.0 - u_time * 2.5) * 0.04 * circleArea;
        vec2 warpedUV = uv + vec2(cos(angle + 1.5708), sin(angle + 1.5708)) * lensPush;
        vec2 warpedSt = warpedUV * gridScale;

        // Thin horizontal and vertical matrix lines
        float lineX = drawLine(warpedSt.x, 1.15);
        float lineY = drawLine(warpedSt.y, 1.15);
        float cartesianGrid = max(lineX, lineY);

        // Subtle matrix coordinate intersections (micro dots)
        float dotIntersection = lineX * lineY * 1.5;

        // Traveling data packets along matrix lines
        vec2 cellId = floor(warpedSt);
        float pulseSeedX = hash(vec2(cellId.x, floor(u_time * 1.2)));
        float pulseSeedY = hash(vec2(floor(u_time * 1.2), cellId.y));
        float packetX = lineX * smoothstep(0.92, 1.0, sin(warpedSt.y * 3.0 - u_time * 5.0 + pulseSeedX * 6.28));
        float packetY = lineY * smoothstep(0.92, 1.0, sin(warpedSt.x * 3.0 - u_time * 5.0 + pulseSeedY * 6.28));
        float dataPackets = max(packetX, packetY) * 0.8;

        // ── 2. CIRCULAR WARP & CONCENTRIC MATRIX RINGS AROUND MOUSE POINTER ──
        float ringFrequency = 32.0;
        float spokeFrequency = 16.0;

        // Concentric circular contour lines inside and around the mouse circle
        float circleRings = drawLine(dist * ringFrequency - u_time * 0.6, 1.3);
        
        // Thin radial spoke lines radiating from the mouse center
        float circleSpokes = drawLine(angle * (spokeFrequency / 6.2831853), 1.15);

        // Combined polar matrix circle lines
        float polarCircleLines = max(circleRings * 1.3, circleSpokes * 0.45);

        // ── 3. SHARP PERIMETER CIRCLE CREATED AT MOUSE SLIDE ──
        // Crisp circular boundary ring
        float circleRim = 1.0 - smoothstep(0.0, 0.005, abs(dist - circleRadius));
        
        // Secondary harmonic inner ring
        float innerCircleRim = 1.0 - smoothstep(0.0, 0.004, abs(dist - circleRadius * 0.58));
        
        // Concentric shockwave ripple when sliding
        float rippleRadius = circleRadius * (1.1 + 0.3 * sin(u_time * 4.0 - dist * 10.0));
        float rippleRing = (1.0 - smoothstep(0.0, 0.008, abs(dist - rippleRadius))) * clamp(u_speed * 0.3, 0.0, 0.8);

        // Focal pinpoint center beacon under mouse pointer
        float centerDot = 1.0 - smoothstep(0.0, 0.008, dist);
        float centerAura = 1.0 - smoothstep(0.0, 0.035, dist);

        // ── 4. SMOOTH COMBINATION (Cartesian Grid -> Circular Rings at Pointer) ──
        // The straight matrix lines morph into the circular structure within the mouse radius
        float matrixStructure = mix(cartesianGrid, polarCircleLines, circleArea * 0.88);
        matrixStructure = max(matrixStructure, dotIntersection * 0.7);
        matrixStructure = max(matrixStructure, circleRim * 1.6);
        matrixStructure = max(matrixStructure, innerCircleRim * 0.9);
        matrixStructure = max(matrixStructure, rippleRing * 1.2);
        matrixStructure = max(matrixStructure, centerDot * 1.8);
        matrixStructure += dataPackets * 0.65;

        // ── 5. CYBERNETIC COLOR PALETTE ON PURE BLACK ──
        // Pitch-black void background
        vec3 col = vec3(0.0);

        // Matrix Emerald & Neon Cyan chromatic tones
        vec3 matrixGreen = vec3(0.0, 1.0, 0.55);      // Vibrant Matrix Neon Green
        vec3 matrixCyan = vec3(0.0, 0.85, 1.0);       // Holographic Cyber Cyan
        vec3 coreWhite = vec3(0.85, 1.0, 0.95);       // Brilliant white core laser

        // Distant background grid intensity (ultra-subtle, razor-thin lines)
        vec3 gridColor = mix(matrixGreen * 0.35, matrixCyan * 0.3, sin(uv.x * 2.0 + u_time * 0.3) * 0.5 + 0.5);

        // Mouse circle aura color (luminous emerald-cyan bloom)
        vec3 circleGlowColor = mix(matrixCyan, matrixGreen, sin(angle * 2.0 + u_time) * 0.5 + 0.5);

        // Blend colors based on mouse proximity
        vec3 activeLineColor = mix(gridColor, circleGlowColor, circleArea * 0.85);

        // Add brightness to circle rims and center focal point
        col += activeLineColor * matrixStructure;
        col += coreWhite * (circleRim * 0.9 + centerDot * 1.2 + innerCircleRim * 0.4);
        col += matrixCyan * centerAura * 0.4;

        // Subtle vignette at extreme edges
        float vignette = smoothstep(1.6, 0.4, length(uv));
        col *= vignette;

        gl_FragColor = vec4(col, 1.0);
      }
    `;

    function compileShader(type, src) {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, src);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.warn('Shader compile failed:', gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    }

    const vertexShader = compileShader(gl.VERTEX_SHADER, vs);
    const fragmentShader = compileShader(gl.FRAGMENT_SHADER, fs);
    if (!vertexShader || !fragmentShader) return;

    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.warn('Program link failed:', gl.getProgramInfoLog(program));
      return;
    }
    gl.useProgram(program);

    // Quad geometry covering full clip space
    const quadBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW
    );
    const posLoc = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    // Uniform locations
    const uRes = gl.getUniformLocation(program, 'u_resolution');
    const uTime = gl.getUniformLocation(program, 'u_time');
    const uMouse = gl.getUniformLocation(program, 'u_mouse');
    const uSpeed = gl.getUniformLocation(program, 'u_speed');
    const uActive = gl.getUniformLocation(program, 'u_active');

    // Smooth Mouse State with spring damping & velocity estimation
    const mouse = {
      currX: window.innerWidth * 0.5,
      currY: window.innerHeight * 0.5,
      targetX: window.innerWidth * 0.5,
      targetY: window.innerHeight * 0.5,
      prevX: window.innerWidth * 0.5,
      prevY: window.innerHeight * 0.5,
      speed: 0,
      active: 1.0,
    };

    const handleMouseMove = (e) => {
      mouse.targetX = e.clientX;
      mouse.targetY = e.clientY;
      mouse.active = 1.0;
    };

    const handleMouseLeave = () => {
      mouse.active = 0.4;
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('mouseleave', handleMouseLeave, { passive: true });

    let lastFrameTime = performance.now();

    function render(currentTime) {
      if (!canvas) return;

      const dt = Math.max(0.001, Math.min(0.1, (currentTime - lastFrameTime) * 0.001));
      lastFrameTime = currentTime;

      // Smooth inertia interpolation for buttery liquid tracking
      const lerpFactor = Math.min(1.0, dt * 12.0);
      mouse.currX += (mouse.targetX - mouse.currX) * lerpFactor;
      mouse.currY += (mouse.targetY - mouse.currY) * lerpFactor;

      // Compute mouse movement velocity / sliding speed
      const dx = mouse.currX - mouse.prevX;
      const dy = mouse.currY - mouse.prevY;
      const instantSpeed = Math.sqrt(dx * dx + dy * dy);
      mouse.speed += (instantSpeed - mouse.speed) * Math.min(1.0, dt * 8.0);
      mouse.prevX = mouse.currX;
      mouse.prevY = mouse.currY;

      gl.viewport(0, 0, canvas.width, canvas.height);

      if (uTime) gl.uniform1f(uTime, currentTime * 0.001);
      if (uRes) gl.uniform2f(uRes, canvas.width, canvas.height);

      // Pass device-pixel-scaled coordinates to shader
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      if (uMouse) gl.uniform2f(uMouse, mouse.currX * dpr, mouse.currY * dpr);
      if (uSpeed) gl.uniform1f(uSpeed, mouse.speed);
      if (uActive) gl.uniform1f(uActive, mouse.active);

      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

      animId = requestAnimationFrame(render);
    }

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', syncSize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      if (resizeObserver) resizeObserver.disconnect();
      if (gl) {
        gl.deleteProgram(program);
        gl.deleteShader(vertexShader);
        gl.deleteShader(fragmentShader);
        gl.deleteBuffer(quadBuffer);
      }
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className={`fixed inset-0 w-full h-full pointer-events-none z-0 overflow-hidden select-none bg-black hidden dark:block ${className}`}
    >
      <canvas
        ref={canvasRef}
        className="block w-full h-full pointer-events-none"
        style={{ width: '100%', height: '100%', display: 'block' }}
      />
    </div>
  );
}

export default MatrixInteractiveGridBackground;
