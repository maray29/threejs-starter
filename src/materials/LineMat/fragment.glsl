uniform float minZ;
uniform float maxZ;
varying float vHeight;
vec3 getColor(float height) {
    float t = (height - minZ) / (maxZ - minZ);
    vec3 bottomColor = vec3(0.9176, 0.0941, 0.8078);
    vec3 topColor = vec3(0.0, 0.0, 1.0);
    return mix(bottomColor, topColor, t);
}
void main() {
    gl_FragColor = vec4(getColor(vHeight), 1.0);
}