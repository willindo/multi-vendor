#version 300 es
precision highp float;

uniform vec2 uResolution;
uniform float uTime;

out vec4 fragColor;

void main() {
    vec2 uv = gl_FragCoord.xy / uResolution;

    // Aspect ratio correction
    uv.x *= uResolution.x / uResolution.y;

    // Multiple wave frequencies
    float wave1 = sin(uv.x * 5.0 + uTime * 1.2);
    float wave2 = sin(uv.x * 8.0 - uTime * 0.8);
    float wave3 = sin(uv.x * 3.0 + uTime * 0.5);

    // Bend waves vertically
    float curve =
        uv.y
        + wave1 * 0.10
        + wave2 * 0.035
        + wave3 * 0.02;

    // Repeating horizontal neon lines
    float pattern = sin(curve * 65.0);

    // Thin lines on a dark background
    float line = 1.0 - smoothstep(0.0, 0.12, abs(pattern));

    // Glow around each line
    float glow = 1.0 - smoothstep(0.12, 0.65, abs(pattern));

    vec3 background = vec3(0.005, 0.008, 0.025);
    vec3 neon = vec3(0.0, 0.85, 1.0);
    vec3 violet = vec3(0.35, 0.08, 1.0);

    vec3 color = background;
    color += neon * line * 1.5;
    color += violet * glow * 0.35;

    fragColor = vec4(color, 1.0);
}
