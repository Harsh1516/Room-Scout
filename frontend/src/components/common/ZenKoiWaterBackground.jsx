import React, { useRef, useEffect } from 'react';

/**
 * ZenKoiWaterBackground
 * 60-120FPS Zero-Lag WebGL Water Ripple & Caustic Motion Engine
 * Features:
 * - Fluid organic sinusoidal & multi-octave water wave displacement.
 * - Dynamic interactive mouse ripple wakes with physics-based inertia.
 * - Shimmering sunlight caustics reflecting through crystal turquoise water.
 * - Native 16:9 aspect-ratio cover projection across all viewport sizes.
 * - Ultra-lightweight: single WebGL quad, zero garbage collection in render loop.
 * - Graceful fallback to CSS background if WebGL is unavailable.
 */
export function ZenKoiWaterBackground() {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let animId;
    let resizeObserver = null;
    let isDestroyed = false;

    const gl =
      canvas.getContext('webgl', { alpha: false, depth: false, antialias: false, powerPreference: 'high-performance' }) ||
      canvas.getContext('experimental-webgl');

    if (!gl) return;

    const vsSource = `
      attribute vec2 a_position;
      varying vec2 v_texCoord;
      void main() {
        v_texCoord = a_position * 0.5 + 0.5;
        v_texCoord.y = 1.0 - v_texCoord.y;
        gl_Position = vec4(a_position, 0.0, 1.0);
      }
    `;

    const fsSource = `
      precision highp float;
      uniform sampler2D u_image;
      uniform vec2 u_resolution;
      uniform vec2 u_imageResolution;
      uniform float u_time;
      uniform vec2 u_mouse;
      uniform float u_mouseSpeed;
      varying vec2 v_texCoord;

      void main() {
        // Aspect-ratio cover correction (no distortion on any screen size)
        vec2 s = u_resolution;
        vec2 i = u_imageResolution;
        float r_canvas = s.x / max(1.0, s.y);
        float r_image = i.x / max(1.0, i.y);
        vec2 uv = v_texCoord;

        if (r_canvas > r_image) {
          float scale = r_canvas / r_image;
          uv.y = (uv.y - 0.5) / scale + 0.5;
        } else {
          float scale = r_image / r_canvas;
          uv.x = (uv.x - 0.5) / scale + 0.5;
        }

        // 1. Organic layered water wave ripples
        float t = u_time * 0.9;
        vec2 p = uv * 9.0;

        float w1 = sin(p.x * 2.2 + t * 1.3 + sin(p.y * 1.9 + t * 0.8));
        float w2 = cos(p.y * 2.7 - t * 1.1 + cos(p.x * 1.4 - t * 0.7));
        float w3 = sin((p.x + p.y) * 1.5 + t * 1.6);
        float w4 = cos((p.x - p.y) * 2.4 - t * 1.2);

        vec2 waterFlow = vec2(w1 + w3 * 0.6, w2 + w4 * 0.6) * 0.0035;

        // 2. Interactive mouse wave perturbation
        vec2 mouseUV = u_mouse / u_resolution;
        vec2 mouseNorm = mouseUV;
        if (r_canvas > r_image) {
          float scale = r_canvas / r_image;
          mouseNorm.y = (mouseNorm.y - 0.5) / scale + 0.5;
        } else {
          float scale = r_image / r_canvas;
          mouseNorm.x = (mouseNorm.x - 0.5) / scale + 0.5;
        }

        float dist = length(uv - mouseNorm);
        float mouseWave = sin(dist * 38.0 - u_time * 5.0) * smoothstep(0.32, 0.0, dist);
        vec2 mouseDistort = normalize(uv - mouseNorm + 0.0001) * mouseWave * (0.004 + clamp(u_mouseSpeed * 0.015, 0.0, 0.009));

        // 3. Composite displaced UV coordinates
        vec2 finalUV = clamp(uv + waterFlow + mouseDistort, 0.001, 0.999);
        vec4 color = texture2D(u_image, finalUV);

        // 4. Shimmering sunlight caustics reflection over turquoise water
        float caustic1 = sin(p.x * 4.2 + w2 * 2.5 + t * 1.4) * cos(p.y * 4.2 + w1 * 2.5 - t * 1.4);
        float caustic2 = sin(p.y * 5.1 - w3 * 2.0 + t * 1.2) * cos(p.x * 5.1 + w4 * 2.0 + t * 1.2);
        float causticIntensity = pow(max(0.0, caustic1 * 0.5 + caustic2 * 0.5 + 0.2), 3.2);

        vec3 sunlightGlint = vec3(0.55, 0.98, 0.92) * causticIntensity * 0.16;

        gl_FragColor = vec4(color.rgb + sunlightGlint, 1.0);
      }
    `;

    function createShader(type, src) {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return s;
    }

    const vs = createShader(gl.VERTEX_SHADER, vsSource);
    const fs = createShader(gl.FRAGMENT_SHADER, fsSource);
    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW
    );
    const aPos = gl.getAttribLocation(prog, 'a_position');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const uRes = gl.getUniformLocation(prog, 'u_resolution');
    const uImgRes = gl.getUniformLocation(prog, 'u_imageResolution');
    const uTime = gl.getUniformLocation(prog, 'u_time');
    const uMouse = gl.getUniformLocation(prog, 'u_mouse');
    const uMouseSpeed = gl.getUniformLocation(prog, 'u_mouseSpeed');

    // Create & upload texture from image
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    // Placeholder 1x1 turquoise pixel while loading
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      1,
      1,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      new Uint8Array([5, 80, 105, 255])
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    let imageWidth = 1376;
    let imageHeight = 768;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = '/zen_koi_water_landscape.jpg';
    img.onload = () => {
      if (isDestroyed) return;
      imageWidth = img.naturalWidth || 1376;
      imageHeight = img.naturalHeight || 768;
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    };

    function syncSize() {
      if (!canvas) return;
      const w = canvas.clientWidth || window.innerWidth || 1280;
      const h = canvas.clientHeight || window.innerHeight || 720;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
    }
    syncSize();

    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(syncSize);
      resizeObserver.observe(canvas);
    }

    // Smooth mouse coordinates with inertia
    let targetMouse = { x: canvas.width * 0.45, y: canvas.height * 0.5 };
    let currentMouse = { x: targetMouse.x, y: targetMouse.y };
    let lastMouse = { x: targetMouse.x, y: targetMouse.y };
    let mouseSpeed = 0;

    const handleMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      targetMouse.x = e.clientX - rect.left;
      targetMouse.y = e.clientY - rect.top;
    };
    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    let lastTime = performance.now();
    let totalTime = 0;

    function render(now) {
      if (isDestroyed) return;

      const dt = Math.min((now - lastTime) * 0.001, 0.06);
      lastTime = now;
      totalTime += dt;

      // Inertial mouse interpolation for silky-smooth response
      const lerpFactor = 0.08;
      currentMouse.x += (targetMouse.x - currentMouse.x) * lerpFactor;
      currentMouse.y += (targetMouse.y - currentMouse.y) * lerpFactor;

      const dx = currentMouse.x - lastMouse.x;
      const dy = currentMouse.y - lastMouse.y;
      const speed = Math.sqrt(dx * dx + dy * dy);
      mouseSpeed = mouseSpeed * 0.9 + speed * 0.1;
      lastMouse.x = currentMouse.x;
      lastMouse.y = currentMouse.y;

      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform2f(uImgRes, imageWidth, imageHeight);
      gl.uniform1f(uTime, totalTime);
      gl.uniform2f(uMouse, currentMouse.x, currentMouse.y);
      gl.uniform1f(uMouseSpeed, mouseSpeed);

      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

      animId = requestAnimationFrame(render);
    }

    animId = requestAnimationFrame(render);

    return () => {
      isDestroyed = true;
      cancelAnimationFrame(animId);
      window.removeEventListener('mousemove', handleMouseMove);
      if (resizeObserver) resizeObserver.disconnect();
      if (buf) gl.deleteBuffer(buf);
      if (texture) gl.deleteTexture(texture);
      if (prog) gl.deleteProgram(prog);
      if (vs) gl.deleteShader(vs);
      if (fs) gl.deleteShader(fs);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 w-full h-full pointer-events-none z-0 overflow-hidden select-none"
      style={{
        backgroundImage: "url('/zen_koi_water_landscape.jpg')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* ── GPU-Accelerated Dynamic WebGL Shader Canvas ── */}
      <canvas ref={canvasRef} className="block w-full h-full pointer-events-none" />

      {/* ── Subtle Atmospheric Ambient Vignette & Crystal Radiance ── */}
      <div className="absolute inset-0 bg-radial-[circle_at_center] from-transparent via-[#032a39]/15 to-[#021822]/45 dark:via-[#021822]/35 dark:to-[#010c12]/75 pointer-events-none" />

      {/* ── Soft Top Specular Depth Gradient ── */}
      <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-white/10 dark:from-black/30 to-transparent pointer-events-none" />

      {/* ── Subtle Floating Water Sparkles / Light Glints (Pure CSS transforms, 0 layout shifts) ── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <span
          className="absolute w-2 h-2 rounded-full bg-cyan-200/50 blur-[1px] animate-pulse"
          style={{ top: '28%', left: '42%', animationDuration: '4s' }}
        />
        <span
          className="absolute w-1.5 h-1.5 rounded-full bg-emerald-200/40 blur-[1px] animate-pulse"
          style={{ top: '65%', left: '72%', animationDuration: '5.5s' }}
        />
        <span
          className="absolute w-2.5 h-2.5 rounded-full bg-teal-100/35 blur-[1.5px] animate-pulse"
          style={{ top: '48%', left: '85%', animationDuration: '6s' }}
        />
      </div>
    </div>
  );
}

export default ZenKoiWaterBackground;
