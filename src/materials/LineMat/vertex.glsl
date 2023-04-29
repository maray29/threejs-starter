attribute float vertexHeight;
varying float vHeight;
void main() {
    vHeight = vertexHeight;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}