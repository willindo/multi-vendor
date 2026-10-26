
export function adaptShadertoyFragment(source: string): string {
    if (/^\s*#version\b/m.test(source)) {
        throw new Error(
            "Shadertoy source must not declare #version; the adapter supplies GLSL ES 3.00.",
        );
    }

    if (!/\bvoid\s+mainImage\s*\(/.test(source)) {
        throw new Error(
            "Shadertoy fragment shader must define mainImage().",
        );
    }

    if (/^\s*out\s+vec4\s+fragColor\s*;/m.test(source)) {
        throw new Error(
            "Shadertoy source should not declare the wrapper's fragColor output.",
        );
    }

    return `#version 300 es
precision highp float;

uniform vec3 iResolution;
uniform float iTime;
uniform vec4 iMouse;
uniform sampler2D iChannel0;

out vec4 fragColor;

${source}

void main() {
    mainImage(fragColor, gl_FragCoord.xy);
}
`;
}
