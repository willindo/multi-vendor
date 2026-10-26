#version 300 es
precision highp float;

uniform vec2 uResolution;
uniform float uTime;
uniform sampler2D uVideo;

out vec4 fragColor;

void main() {
    vec2 uv = gl_FragCoord.xy / uResolution;

    float wave = sin(
        uv.y * 18.0 + uTime * 2.0
    ) * 0.012;

    vec2 distortedUV = uv;
    distortedUV.x += wave;

    vec3 videoColor = texture(uVideo, distortedUV).rgb;

    fragColor = vec4(videoColor, 1.0);
}
