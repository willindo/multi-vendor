// #version 300 es
// canvas.frag — Fragment shader (preview-ready)
// ─────────────────────────────────────────────
// HOW TO PREVIEW:
//   1. Open this file in Antigravity IDE
// LIVE CONTROLS (glsl-canvas GUI):
//   uTime       — auto-driven by extension
//   uResolution — auto-driven by extension
// ─────────────────────────────────────────────

#ifdef GL_ES
precision highp float;
#endif

// Standard uniforms — auto-provided by glslCanvas / ShadeView
// uniform vec2  iResolution;  // canvas size in pixels
// uniform float iTime;        // elapsed seconds
// uniform vec2  iMouse;       // mouse position in pixels

// Fragment output (replaces gl_FragColor removed in GLSL ES 3.00)
// out vec4 fragColor;
// in vec2 fragCoord;

// ── helpers ───────────────────────────────────

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

// smooth noise
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i + vec2(0, 0)), hash(i + vec2(1, 0)), u.x),
    mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x),
    u.y
  );
}

// fbm — fractal brownian motion
float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p  = p * 2.1 + vec2(1.3, 1.7);
    a *= 0.5;
  }
  return v;
}

// ── main ──────────────────────────────────────

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  // void main() {
  // vec2 uv = gl_FragCoord.xy / iResolution;
  // vec2 uv = fragCoord.xy / iResolution;
  vec2 uv = fragCoord / iResolution.xy;

  // aspect-correct coords centered at 0
  // vec2 st = (gl_FragCoord.xy - iResolution * 0.5) / min(iResolution.x, iResolution.y);
  vec2 st = (fragCoord - 0.5 * iResolution.xy) / min(iResolution.x, iResolution.y);

  // mouse influence (normalised 0-1)
  // vec2 mouse = iMouse / iResolution;

  float t = iTime * 0.4;

  // animated domain warp
  vec2 q = vec2(
    fbm(st + t * 0.3),
    fbm(st + vec2(1.7, 9.2))
  );

  vec2 r = vec2(
    fbm(st + 1.0 * q + vec2(1.7, 9.2) + 0.15 * t),
    fbm(st + 1.0 * q + vec2(8.3, 2.8) + 0.126 * t)
  );

  float f = fbm(st + r);

  // base wave (matches your original ShaderCanvas.tsx logic)
  float wave = sin(uv.x * 10.0 + uv.y * 6.0 + iTime);

  // colour palette — deep ocean to aurora
  vec3 c1 = vec3(0.02, 0.05, 0.18);   // deep navy
  vec3 c2 = vec3(0.10, 0.40, 0.65);   // ocean blue
  vec3 c3 = vec3(0.40, 0.85, 0.75);   // aqua
  vec3 c4 = vec3(0.90, 0.60, 0.95);   // aurora violet
  vec3 color = mix(
    mix(c1, c2, clamp(f * 2.0, 0.0, 1.0)),
    mix(c3, c4, clamp(f * 2.0 - 1.0, 0.0, 1.0)),
    clamp(f, 0.0, 1.0)
  );

  // shimmer overlay
  color += 0.05 * vec3(wave, wave * 0.5, wave * 0.2);

  // vignette
  float vig = 1.0 - smoothstep(0.5, 1.4, length(st));
  color *= vig;

  fragColor = vec4(color, 1.0);
}
