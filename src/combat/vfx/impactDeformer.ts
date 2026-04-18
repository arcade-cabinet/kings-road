import * as THREE from 'three';

export interface ImpactPoint {
  id: number;
  worldPos: THREE.Vector3;
  startTime: number;
  /** Duration of full wound-cavity animation in ms. */
  duration: number;
  /** Radius of SDF sphere injection in world units. */
  radius: number;
}

/** GLSL vertex shader — displaces geometry inward at the SDF contact sphere. */
export const impactDeformerVert = /* glsl */ `
  uniform vec3 u_impactPos;
  uniform float u_impactRadius;
  uniform float u_impactStrength;

  varying vec3 vNormal;
  varying vec2 vUv;

  void main() {
    vNormal = normalMatrix * normal;
    vUv = uv;

    vec3 worldPos = (modelMatrix * vec4(position, 1.0)).xyz;
    float d = length(worldPos - u_impactPos);
    float sdf = u_impactRadius - d;

    // Displace vertices that fall inside the SDF sphere inward along normal.
    // Smooth falloff prevents hard seams at the sphere boundary.
    float influence = smoothstep(0.0, u_impactRadius, max(0.0, sdf));
    vec3 displaced = position - normal * influence * u_impactStrength;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
  }
`;

export const impactDeformerFrag = /* glsl */ `
  uniform vec3 u_color;
  uniform float u_opacity;

  varying vec3 vNormal;
  varying vec2 vUv;

  void main() {
    // Darken the wound cavity with a rim effect
    float rim = 1.0 - max(0.0, dot(normalize(vNormal), vec3(0.0, 0.0, 1.0)));
    vec3 col = u_color * (0.4 + 0.6 * rim);
    gl_FragColor = vec4(col, u_opacity);
  }
`;

/** Build a ShaderMaterial for the impact deformer. */
export function createImpactDeformerMaterial(
  baseColor = '#8B4513',
): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader: impactDeformerVert,
    fragmentShader: impactDeformerFrag,
    uniforms: {
      u_impactPos: { value: new THREE.Vector3() },
      u_impactRadius: { value: 0.0 },
      u_impactStrength: { value: 0.0 },
      u_color: { value: new THREE.Color(baseColor) },
      u_opacity: { value: 1.0 },
    },
    transparent: true,
    side: THREE.DoubleSide,
  });
}

/** Animate impact uniforms for a 0.3s wound-cavity deformation that restores. */
export function tickImpactDeformer(
  mat: THREE.ShaderMaterial,
  impact: ImpactPoint,
  now: number,
): boolean {
  const age = now - impact.startTime;
  if (age >= impact.duration) return false; // expired

  const t = age / impact.duration; // 0 → 1
  // Punch in fast (0→0.15), hold briefly (0.15→0.6), restore slowly (0.6→1.0)
  let strength: number;
  if (t < 0.15) {
    strength = t / 0.15;
  } else if (t < 0.6) {
    strength = 1.0;
  } else {
    strength = 1.0 - (t - 0.6) / 0.4;
  }

  mat.uniforms.u_impactPos.value.copy(impact.worldPos);
  mat.uniforms.u_impactRadius.value = impact.radius;
  mat.uniforms.u_impactStrength.value = strength * 0.25; // max 0.25 world-unit indent
  mat.uniforms.u_opacity.value = 1.0;
  return true;
}
