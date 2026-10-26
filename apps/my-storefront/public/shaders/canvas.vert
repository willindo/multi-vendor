#version 300 es

in vec3 aPosition;
in vec3 aNormal;

uniform float iTime;
uniform mat4 uModelViewMatrix;
uniform mat4 uProjectionMatrix;

void main() {
    vec3 position = aPosition;
    vec3 normal = aNormal;

    float wave =
        sin(position.x * 8.0 + iTime * 2.0) *
        cos(position.z * 8.0 + iTime * 1.5);

    position += normal * wave * 0.15;

    float angle = position.y * 2.0 + iTime;

    mat2 rotation = mat2(
        cos(angle), -sin(angle),
        sin(angle),  cos(angle)
    );

    position.xz = rotation * position.xz;

    gl_Position = uProjectionMatrix
                * uModelViewMatrix
                * vec4(position, 1.0);
}
