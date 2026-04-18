import * as THREE from 'three';

/**
 * Wraith SDF body — raymarched isosurface on a bounded hull mesh.
 * Drifts vertically, dissipates near hull edges. Proves volumetric enemies
 * are viable on the R3F stack within a bounded draw region.
 */
export const wraithSdfVert = /* glsl */ `
  varying vec3 vLocalPos;

  void main() {
    vLocalPos = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const wraithSdfFrag = /* glsl */ `
  #define MAX_STEPS 48
  #define MIN_DIST 0.003
  #define MAX_DIST 1.5

  uniform float u_time;
  uniform float u_dissipate; // 0 = solid, 1 = fully dissipated
  uniform vec3 u_color;
  // Inverse model matrix computed on CPU each frame — avoids inverse() which
  // is not available in GLSL ES 1.0 / WebGL 1.0.
  uniform mat4 u_modelMatrixInverse;

  varying vec3 vLocalPos;

  // Smooth union of two SDFs
  float smin(float a, float b, float k) {
    float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
    return mix(b, a, h) - k * h * (1.0 - h);
  }

  // Wraith body: vertical capsule with undulating noise lobes
  float wraithSdf(vec3 p) {
    // Drift upward over time
    vec3 q = p - vec3(0.0, sin(u_time * 0.4) * 0.1, 0.0);

    // Core capsule
    float body = length(vec2(length(q.xz), q.y - clamp(q.y, -0.6, 0.6))) - 0.25;

    // Noise lobes — sinusoidal approximation, GPU-safe
    float lobe1 = length(q - vec3(
      0.3 * sin(u_time * 1.1 + q.y * 3.0),
      0.2 * cos(u_time * 0.7),
      0.3 * cos(u_time * 1.3 + q.y * 2.5)
    )) - 0.15;
    float lobe2 = length(q - vec3(
      -0.25 * sin(u_time * 0.9 + q.y * 2.8),
      -0.1 * sin(u_time * 1.4),
      0.2 * cos(u_time * 1.1)
    )) - 0.12;

    float d = smin(body, lobe1, 0.1);
    d = smin(d, lobe2, 0.1);

    // Dissipation: expand SDF uniformly so isosurface shrinks
    d += u_dissipate * 0.5;
    return d;
  }

  vec3 sdfNormal(vec3 p) {
    const float e = 0.003;
    return normalize(vec3(
      wraithSdf(p + vec3(e, 0, 0)) - wraithSdf(p - vec3(e, 0, 0)),
      wraithSdf(p + vec3(0, e, 0)) - wraithSdf(p - vec3(0, e, 0)),
      wraithSdf(p + vec3(0, 0, e)) - wraithSdf(p - vec3(0, 0, e))
    ));
  }

  void main() {
    // Camera in local object space via CPU-computed inverse (WebGL 1.0 safe).
    // March from local camera position toward the hull surface fragment,
    // so MAX_DIST is bounded by hull diameter (~1.2), not camera distance.
    vec3 ro = (u_modelMatrixInverse * vec4(cameraPosition, 1.0)).xyz;
    vec3 rd = normalize(vLocalPos - ro);

    // Start march at the hull surface (vLocalPos on BackSide), walking inward.
    // t=0 is on the hull; marching inward keeps MAX_DIST relative to hull thickness.
    float t = 0.0;
    bool hit = false;
    for (int i = 0; i < MAX_STEPS; i++) {
      vec3 p = ro + rd * t;
      float d = wraithSdf(p);
      if (d < MIN_DIST) { hit = true; break; }
      t += d;
      if (t > MAX_DIST) break;
    }

    if (!hit) discard;

    vec3 p = ro + rd * t;
    vec3 n = sdfNormal(p);
    vec3 L = normalize(vec3(0.2, 1.0, 0.4));
    float diff = 0.5 + 0.5 * dot(n, L);

    // Rim glow — ghostly edge brightening
    float rim = pow(1.0 - abs(dot(n, -rd)), 3.0);

    vec3 col = u_color * diff + vec3(0.4, 0.6, 1.0) * rim * 0.8;
    float alpha = (1.0 - u_dissipate) * (0.7 + 0.3 * rim);
    gl_FragColor = vec4(col, alpha);
  }
`;

export function createWraithSdfMaterial(
  color = '#4a6a9a',
): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader: wraithSdfVert,
    fragmentShader: wraithSdfFrag,
    uniforms: {
      u_time: { value: 0.0 },
      u_dissipate: { value: 0.0 },
      u_color: { value: new THREE.Color(color) },
      u_modelMatrixInverse: { value: new THREE.Matrix4() },
    },
    transparent: true,
    depthWrite: false,
    side: THREE.BackSide,
  });
}

/** Tick wraith material uniforms each frame. Returns false when fully dissipated. */
export function tickWraithSdf(
  mat: THREE.ShaderMaterial,
  elapsed: number,
  dissipateStart: number,
  dissipateEnd: number,
): boolean {
  mat.uniforms.u_time.value = elapsed;
  if (elapsed > dissipateStart) {
    const duration = dissipateEnd - dissipateStart;
    const d =
      duration > 0 ? Math.min(1.0, (elapsed - dissipateStart) / duration) : 1.0;
    mat.uniforms.u_dissipate.value = d;
    if (d >= 1.0) return false;
  }
  return true;
}
