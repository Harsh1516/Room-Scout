import React, { useRef, useEffect } from 'react';

/**
 * NeuralFluidMatrixBackground
 * High-performance WebGL Circular Fluid Dynamics & Neon Matrix Streams
 * Exact shader styling matching the Host Upload page & high-tech neural interface.
 */
export function NeuralFluidMatrixBackground({
  blurAmount = 0,
  className = '',
} = {}) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let animId;
    let resizeObserver = null;

    function syncSize() {
      if (!canvas) return;
      const w = canvas.clientWidth || window.innerWidth || 1280;
      const h = canvas.clientHeight || window.innerHeight || 720;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
    }

    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(syncSize);
      resizeObserver.observe(canvas);
    }
    syncSize();

    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) return;

    const vs = `attribute vec2 a_position;
varying vec2 v_texCoord;
void main() {
  v_texCoord = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}`;

    const fs = `precision highp float;

uniform vec2 u_resolution;
uniform float u_time;
uniform vec2 u_mouse;
varying vec2 v_texCoord;

// Simplex/Perlin-inspired noise helpers
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }

float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187,
                        0.366025403784439,
                       -0.577350269189626,
                        0.024390243902439);
    vec2 i  = floor(v + dot(v, C.yy) );
    vec2 x0 = v -   i + dot(i, C.xx);
    vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod289(i);
    vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
        + i.x + vec3(0.0, i1.x, 1.0 ));
    vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
    m = m*m ;
    m = m*m ;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
    vec3 g;
    g.x  = a0.x  * x0.x  + h.x  * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
}

void main() {
    vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / min(u_resolution.x, u_resolution.y);
    vec2 mouse = (u_mouse - 0.5 * u_resolution.xy) / min(u_resolution.x, u_resolution.y);
    
    // Polar coordinates for circular fluid dynamics
    float r = length(uv);
    float angle = atan(uv.y, uv.x);
    
    // Subtle mouse interactive influence
    float distMouse = length(uv - mouse);
    float mouseInfluence = smoothstep(0.4, 0.0, distMouse) * 0.18;
    
    // Circular vortex & fluid swirl motion
    float t = u_time * 0.45;
    float swirlAngle = angle + t * 0.35 + (0.5 / (r + 0.18)) + mouseInfluence;
    
    // Fluid domain warping with multi-scale noise
    vec2 fluidCoord = vec2(cos(swirlAngle), sin(swirlAngle)) * r * 2.2;
    float n1 = snoise(fluidCoord * 1.5 + vec2(t * 0.2, -t * 0.15));
    float n2 = snoise(fluidCoord * 3.2 - vec2(n1 * 1.2, t * 0.3));
    float fluidNoise = snoise(fluidCoord * 2.5 + vec2(n2 * 0.8, n1 * 0.8));

    // Circular ring pulse flowing outward and swirling
    float ring1 = sin(r * 18.0 - t * 2.5 + fluidNoise * 3.2);
    float ring2 = sin(r * 32.0 + t * 1.8 - fluidNoise * 2.0);
    float ringPattern = smoothstep(0.2, 0.95, ring1 * 0.5 + 0.5) * smoothstep(0.1, 0.9, ring2 * 0.5 + 0.5);
    
    // Circular fluid glow mask centered in middle with falloff
    float fluidMask = smoothstep(1.3, 0.25, r);
    float innerMask = smoothstep(0.04, 0.28, r);
    
    // Matrix linear thin scanlines & digital grid lines
    vec2 matrixUV = gl_FragCoord.xy / u_resolution.xy;
    float vertCol = floor(matrixUV.x * 120.0);
    float colRandom = fract(sin(vertCol * 78.233) * 43758.5453);
    float lineSpeed = 0.8 + colRandom * 1.4;
    float lineStream = fract(matrixUV.y * 3.5 + u_time * lineSpeed * 0.6 + colRandom);
    float matrixVertical = pow(lineStream, 14.0) * step(0.45, fract(colRandom * 3.0));
    
    // Horizontal razor-thin linear matrix scanlines
    float scanline = sin(gl_FragCoord.y * 1.2 + u_time * 2.0) * 0.5 + 0.5;
    scanline = pow(scanline, 8.0) * 0.18;
    
    // Fine high-tech matrix grid wireframe
    float fineGridX = abs(fract(gl_FragCoord.x * 0.04) - 0.5);
    float fineGridY = abs(fract(gl_FragCoord.y * 0.04) - 0.5);
    float fineGrid = smoothstep(0.05, 0.0, min(fineGridX, fineGridY)) * 0.12;
    
    // Colors: Deep obsidian black backdrop (#030305), with luminous neon teal/cyan & emerald streams
    vec3 bgDeepBlack = vec3(0.015, 0.018, 0.024);
    vec3 fluidColor1 = vec3(0.0, 0.85, 0.72);
    vec3 fluidColor2 = vec3(0.08, 0.42, 0.98);
    vec3 fluidColor3 = vec3(0.0, 1.0, 0.55);
    
    // Composite circular fluid color
    vec3 fluidColor = mix(fluidColor2, fluidColor1, fluidNoise * 0.5 + 0.5);
    fluidColor = mix(fluidColor, fluidColor3, ringPattern * 0.6);
    
    // Compute total fluid energy
    float fluidIntensity = (pow(max(0.0, fluidNoise), 2.2) * 1.6 + ringPattern * 0.9) * fluidMask * innerMask;
    fluidIntensity += (1.0 - smoothstep(0.0, 0.85, r)) * 0.45;
    
    // Layer background and fluid
    vec3 color = bgDeepBlack;
    color += fluidColor * fluidIntensity * 0.85;
    
    // Layer Matrix lines
    vec3 matrixColor = vec3(0.0, 1.0, 0.65);
    color += matrixColor * matrixVertical * 0.65;
    color += vec3(0.0, 0.9, 0.8) * scanline;
    color += vec3(0.1, 0.4, 0.5) * fineGrid;
    
    // Vignette towards edge for infinite deep dark cosmos feeling
    float vignette = smoothstep(1.6, 0.45, length(uv));
    color *= mix(0.7, 1.0, vignette);

    gl_FragColor = vec4(color, 1.0);
}
`;

    function cs(type, src) {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return s;
    }
    const prog = gl.createProgram();
    gl.attachShader(prog, cs(gl.VERTEX_SHADER, vs));
    gl.attachShader(prog, cs(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(prog);
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const pos = gl.getAttribLocation(prog, 'a_position');
    gl.enableVertexAttribArray(pos);
    gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);

    const uTime = gl.getUniformLocation(prog, 'u_time');
    const uRes = gl.getUniformLocation(prog, 'u_resolution');
    const uMouse = gl.getUniformLocation(prog, 'u_mouse');

    let mouse = { x: canvas.width / 2, y: canvas.height / 2 };
    const handleMouseMove = (event) => {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      if (rect.width && rect.height) {
        const nx = (event.clientX - rect.left) / rect.width;
        const ny = 1.0 - (event.clientY - rect.top) / rect.height;
        mouse.x = nx * canvas.width;
        mouse.y = ny * canvas.height;
      }
    };
    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    function render(t) {
      if (!canvas) return;
      gl.viewport(0, 0, canvas.width, canvas.height);
      if (uTime) gl.uniform1f(uTime, t * 0.001);
      if (uRes) gl.uniform2f(uRes, canvas.width, canvas.height);
      if (uMouse) gl.uniform2f(uMouse, mouse.x, mouse.y);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      animId = requestAnimationFrame(render);
    }
    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('mousemove', handleMouseMove);
      if (resizeObserver) resizeObserver.disconnect();
    };
  }, []);

  return (
    <div className={`fixed inset-0 w-full h-full pointer-events-none z-0 overflow-hidden select-none bg-[#131316] ${className}`}>
      <canvas
        ref={canvasRef}
        style={
          blurAmount > 0
            ? {
                filter: `blur(${blurAmount}px)`,
                transform: 'scale(1.05)',
                willChange: 'filter, transform',
              }
            : undefined
        }
        className="block w-full h-full pointer-events-none"
      />
      {/* Atmospheric Grain & Radial Vignette */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#131316] via-transparent to-[#131316]/70 pointer-events-none z-0" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(19,19,22,0.85)_80%)] pointer-events-none z-0" />
      {/* Soft translucent depth blur layer to smooth out any harsh pixel noise */}
      {blurAmount > 0 && (
        <div className="absolute inset-0 backdrop-blur-[2px] bg-black/10 pointer-events-none z-0" />
      )}
    </div>
  );
}

export default NeuralFluidMatrixBackground;
