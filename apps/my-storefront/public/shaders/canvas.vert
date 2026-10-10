#version 300 es

in vec2 aPosition;
// out vec4 gl_Position;
void main() {
    gl_Position = vec4(aPosition, 0.0, 1.0);
}
