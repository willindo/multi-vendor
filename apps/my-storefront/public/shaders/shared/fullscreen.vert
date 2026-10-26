#version 300 es

in vec2 aPosition;

void main() {
    // void mainVertex(out vec2 fragCoord, vec2 aPosition){
    gl_Position = vec4(aPosition, 0.0, 1.0);
}
