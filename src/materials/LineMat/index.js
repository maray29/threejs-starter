import fragmentShader from "./fragment.glsl";
import vertexShader from "./vertex.glsl";
import { ShaderMaterial } from "three";

const uniforms = (minZ, maxZ) => ({
  minZ: { value: minZ },
  maxZ: { value: maxZ },
});

export const LineMat = (minZ, maxZ) =>
  new ShaderMaterial({
    vertexShader: vertexShader,
    fragmentShader: fragmentShader,
    uniforms: uniforms(minZ, maxZ),
  });

// export const LineMat = new ShaderMaterial({
//   vertexShader: vertexShader,
//   fragmentShader: fragmentShader,
//   uniforms: uniforms(minZ, maxZ),
// });
