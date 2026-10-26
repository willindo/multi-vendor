
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    // Sample the input video.
    vec3 videoColor = texture(iChannel0, uv).rgb;

    // Animated wave distortion.
    float wave = sin(
        uv.y * 18.0 + iTime * 2.0
    ) * 0.012;

    vec2 distortedUV = uv;
    distortedUV.y += wave;

    videoColor = texture(iChannel0, distortedUV).rgb;

    // Neon-style color treatment.
    videoColor.r *= 1.15;
    videoColor.g *= 0.95;
    videoColor.b = min(videoColor.b * 1.25, 1.0);
    fragColor = vec4(videoColor, 1.0);
}
