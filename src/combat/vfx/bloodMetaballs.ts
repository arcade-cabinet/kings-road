import * as THREE from 'three';

/** N=16 metaball point-masses with gravity, raymarched on a hull mesh. */
const METABALL_COUNT = 16;

export interface MetaballBurst {
  id: number;
  origin: THREE.Vector3;
  startTime: number;
  duration: number;
}

/** GLSL fragment shader — raymarch metaballs isosurface inside hull AABB. */
export const bloodMetaballsFrag = /* glsl */ `
  #define METABALL_COUNT 16
  #define MAX_STEPS 32
  #define MIN_DIST 0.005
  #define MAX_DIST 2.0

  uniform vec3 u_balls[METABALL_COUNT];
  uniform float u_age;       // 0 → 1 over burst lifetime
  uniform vec3 u_origin;
  uniform mat4 u_modelInv;

  varying vec3 vWorldPos;
  varying vec3 vNormal;

  // Smooth-min for metaball field blending (k controls blend radius)
  float smin(float a, float b, float k) {
    float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
    return mix(b, a, h) - k * h * (1.0 - h);
  }

  float metaballField(vec3 p) {
    float d = MAX_DIST;
    for (int i = 0; i < METABALL_COUNT; i++) {
      float ball = length(p - u_balls[i]) - 0.04;
      d = smin(d, ball, 0.06);
    }
    return d;
  }

  vec3 fieldNormal(vec3 p) {
    const float e = 0.002;
    return normalize(vec3(
      metaballField(p + vec3(e, 0, 0)) - metaballField(p - vec3(e, 0, 0)),
      metaballField(p + vec3(0, e, 0)) - metaballField(p - vec3(0, e, 0)),
      metaballField(p + vec3(0, 0, e)) - metaballField(p - vec3(0, 0, e))
    ));
  }

  void main() {
    // Ray from camera through fragment, in world space
    vec3 ro = cameraPosition;
    vec3 rd = normalize(vWorldPos - ro);

    float t = 0.0;
    bool hit = false;
    for (int i = 0; i < MAX_STEPS; i++) {
      vec3 p = ro + rd * t;
      float d = metaballField(p);
      if (d < MIN_DIST) { hit = true; break; }
      t += d;
      if (t > MAX_DIST) break;
    }

    if (!hit) discard;

    vec3 p = ro + rd * t;
    vec3 n = fieldNormal(p);
    // Simple diffuse + specular blood shading
    vec3 L = normalize(vec3(0.3, 1.0, 0.5));
    float diff = max(0.0, dot(n, L));
    float spec = pow(max(0.0, dot(reflect(-L, n), -rd)), 12.0);

    // Blood: deep crimson, drying to brownish as age increases
    vec3 fresh = vec3(0.55, 0.02, 0.02);
    vec3 dried = vec3(0.35, 0.08, 0.02);
    vec3 albedo = mix(fresh, dried, u_age);

    vec3 col = albedo * (0.1 + 0.9 * diff) + vec3(0.8, 0.1, 0.1) * spec;
    float alpha = 1.0 - smoothstep(0.7, 1.0, u_age);
    gl_FragColor = vec4(col, alpha);
  }
`;

export const bloodMetaballsVert = /* glsl */ `
  varying vec3 vWorldPos;
  varying vec3 vNormal;

  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorldPos = wp.xyz;
    vNormal = normalMatrix * normal;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

export function createBloodMetaballsMaterial(): THREE.ShaderMaterial {
  const balls: THREE.Vector3[] = [];
  for (let i = 0; i < METABALL_COUNT; i++) balls.push(new THREE.Vector3());

  return new THREE.ShaderMaterial({
    vertexShader: bloodMetaballsVert,
    fragmentShader: bloodMetaballsFrag,
    uniforms: {
      u_balls: { value: balls },
      u_age: { value: 0.0 },
      u_origin: { value: new THREE.Vector3() },
      u_modelInv: { value: new THREE.Matrix4() },
    },
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
}

const _gravity = new THREE.Vector3(0, -9.8, 0);
const _vel = new THREE.Vector3();

/** Animate N=16 metaball positions for a burst: spread + gravity + fade. */
export function tickBloodMetaballs(
  mat: THREE.ShaderMaterial,
  burst: MetaballBurst,
  now: number,
  seed: number,
): boolean {
  const age = now - burst.startTime;
  if (age >= burst.duration) return false;

  const t = age / 1000; // seconds
  const normAge = age / burst.duration;

  const balls = mat.uniforms.u_balls.value as THREE.Vector3[];
  for (let i = 0; i < METABALL_COUNT; i++) {
    // Deterministic per-ball initial velocity from seed+index
    const s = (seed * 1.618 + i * 7.13) % (Math.PI * 2);
    const vy = 1.5 + ((i * 3.7) % 1.0) * 2.0;
    _vel.set(Math.sin(s) * 1.2, vy, Math.cos(s) * 1.2);

    balls[i]
      .copy(burst.origin)
      .addScaledVector(_vel, t)
      .addScaledVector(_gravity, 0.5 * t * t);
  }

  mat.uniforms.u_age.value = normAge;
  mat.uniforms.u_origin.value.copy(burst.origin);
  return true;
}
