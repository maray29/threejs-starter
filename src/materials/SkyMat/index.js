import { ShaderMaterial, BackSide, Vector3, Color } from "three";

import vertexShader from "./vertex.glsl";
import fragmentShader from "./fragment.glsl";

const uniforms = {
  topColor: { value: new Color(0x0077ff) },
  bottomColor: { value: new Color(0xffffff) },
  offset: { value: 33 },
  exponent: { value: 0.6 },
};
uniforms["topColor"] = new Vector3(0.6, 1, 0.6);

export const SkyMat = new ShaderMaterial({
  uniforms: uniforms,
  vertex: vertexShader,
  fragment: fragmentShader,
  side: BackSide,
});
