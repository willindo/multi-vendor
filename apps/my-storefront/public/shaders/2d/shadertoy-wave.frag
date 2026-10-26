void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;

    vec2 mouseUV = iMouse.xy / iResolution.xy;

    float distanceToMouse = distance(uv, mouseUV);

    float wave = sin(
        uv.x * 12.0
        + iTime * 2.0
        + distanceToMouse * 12.0
    );

    float bands = sin(uv.y * 20.0 + wave * 2.0);

    vec3 color = vec3(
        0.05,
        0.4 + 0.4 * (bands),
        0.9
    );

    fragColor = vec4(color, 1.0);
}
