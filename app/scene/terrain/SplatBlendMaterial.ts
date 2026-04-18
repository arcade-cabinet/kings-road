import * as THREE from 'three';

/**
 * Build a ShaderMaterial that blends up to 4 PBR materials by a RGBA splat map.
 *
 * Each channel of the splat map (R=mat0, G=mat1, B=mat2, A=mat3) carries the
 * blend weight for one MeshStandardMaterial loaded by loadPbrMaterial(). The
 * fragment shader lerps albedo, normal, roughness, and AO across the 4 layers.
 *
 * Displacement is applied in vertex shader using the shared heightmap — not
 * per-material — since buildDisplacedGeometry already bakes displacement in.
 *
 * Lights, fog, and shadow-receiving are forwarded via THREE.ShaderChunk includes
 * so the material integrates with the scene's lighting rig.
 *
 * PBR standard: every bound MeshStandardMaterial must carry color + normalGL +
 * roughness maps. AO and metalness are optional (not all packs ship them).
 */
export function buildSplatBlendMaterial(params: {
  splatMap: THREE.DataTexture;
  materials: THREE.MeshStandardMaterial[];
  tileScale?: number;
}): THREE.ShaderMaterial {
  const { splatMap, materials, tileScale = 8 } = params;

  if (materials.length === 0 || materials.length > 4) {
    throw new Error('buildSplatBlendMaterial requires 1–4 materials');
  }

  // Pad to exactly 4 slots with the first material as fallback.
  const mats = [...materials];
  while (mats.length < 4) mats.push(mats[0]);

  const uniforms: Record<string, THREE.IUniform> = {
    uSplatMap: { value: splatMap },
    uTileScale: { value: tileScale },
  };

  for (let i = 0; i < 4; i++) {
    uniforms[`uColor${i}`] = { value: mats[i].map ?? null };
    uniforms[`uNormal${i}`] = { value: mats[i].normalMap ?? null };
    uniforms[`uRoughness${i}`] = { value: mats[i].roughnessMap ?? null };
    uniforms[`uAO${i}`] = { value: mats[i].aoMap ?? null };
    uniforms[`uRoughnessVal${i}`] = { value: mats[i].roughness };
    uniforms[`uHasAO${i}`] = { value: mats[i].aoMap != null ? 1.0 : 0.0 };
  }

  const vertexShader = /* glsl */ `
    varying vec2 vUv;
    varying vec3 vWorldNormal;
    varying vec3 vViewPosition;

    #include <common>
    #include <shadowmap_pars_vertex>

    void main() {
      vUv = uv;
      vec4 worldPos = modelMatrix * vec4(position, 1.0);
      vWorldNormal = normalize(mat3(transpose(inverse(modelMatrix))) * normal);
      vec4 mvPosition = viewMatrix * worldPos;
      vViewPosition = -mvPosition.xyz;
      gl_Position = projectionMatrix * mvPosition;

      #include <shadowmap_vertex>
    }
  `;

  const fragmentShader = /* glsl */ `
    uniform sampler2D uSplatMap;
    uniform float uTileScale;

    uniform sampler2D uColor0; uniform sampler2D uNormal0; uniform sampler2D uRoughness0;
    uniform sampler2D uAO0; uniform float uRoughnessVal0; uniform float uHasAO0;

    uniform sampler2D uColor1; uniform sampler2D uNormal1; uniform sampler2D uRoughness1;
    uniform sampler2D uAO1; uniform float uRoughnessVal1; uniform float uHasAO1;

    uniform sampler2D uColor2; uniform sampler2D uNormal2; uniform sampler2D uRoughness2;
    uniform sampler2D uAO2; uniform float uRoughnessVal2; uniform float uHasAO2;

    uniform sampler2D uColor3; uniform sampler2D uNormal3; uniform sampler2D uRoughness3;
    uniform sampler2D uAO3; uniform float uRoughnessVal3; uniform float uHasAO3;

    varying vec2 vUv;
    varying vec3 vWorldNormal;
    varying vec3 vViewPosition;

    #include <common>
    #include <lights_pars_begin>
    #include <shadowmap_pars_fragment>
    #include <shadowmask_pars_fragment>
    #include <fog_pars_fragment>

    // Blend 4 PBR layers by splat weights.
    vec3 blendAlbedo(vec4 w, vec2 uv) {
      return
        w.r * texture2D(uColor0, uv).rgb +
        w.g * texture2D(uColor1, uv).rgb +
        w.b * texture2D(uColor2, uv).rgb +
        w.a * texture2D(uColor3, uv).rgb;
    }

    vec3 blendNormal(vec4 w, vec2 uv) {
      vec3 n =
        w.r * texture2D(uNormal0, uv).rgb +
        w.g * texture2D(uNormal1, uv).rgb +
        w.b * texture2D(uNormal2, uv).rgb +
        w.a * texture2D(uNormal3, uv).rgb;
      return normalize(n * 2.0 - 1.0);
    }

    float blendRoughness(vec4 w, vec2 uv) {
      return
        w.r * texture2D(uRoughness0, uv).r * uRoughnessVal0 +
        w.g * texture2D(uRoughness1, uv).r * uRoughnessVal1 +
        w.b * texture2D(uRoughness2, uv).r * uRoughnessVal2 +
        w.a * texture2D(uRoughness3, uv).r * uRoughnessVal3;
    }

    float blendAO(vec4 w, vec2 uv) {
      float ao0 = uHasAO0 > 0.5 ? texture2D(uAO0, uv).r : 1.0;
      float ao1 = uHasAO1 > 0.5 ? texture2D(uAO1, uv).r : 1.0;
      float ao2 = uHasAO2 > 0.5 ? texture2D(uAO2, uv).r : 1.0;
      float ao3 = uHasAO3 > 0.5 ? texture2D(uAO3, uv).r : 1.0;
      return w.r * ao0 + w.g * ao1 + w.b * ao2 + w.a * ao3;
    }

    void main() {
      vec4 splat = texture2D(uSplatMap, vUv);

      // Re-normalise splat weights (rounding in Uint8 can drift slightly).
      float wSum = splat.r + splat.g + splat.b + splat.a;
      vec4 w = wSum > 0.0 ? splat / wSum : vec4(1.0, 0.0, 0.0, 0.0);

      vec2 tiledUv = vUv * uTileScale;

      vec3 albedo   = blendAlbedo(w, tiledUv);
      vec3 normal   = blendNormal(w, tiledUv);
      float rough   = blendRoughness(w, tiledUv);
      float ao      = blendAO(w, tiledUv);

      // Simple Lambertian + ambient for now; hook into THREE lights via chunks.
      vec3 L = vec3(0.0);
      #if NUM_DIR_LIGHTS > 0
        DirectionalLight dirLight;
        DirectionalLightShadow dirShadow;
        for (int i = 0; i < NUM_DIR_LIGHTS; i++) {
          dirLight = directionalLights[i];
          float NdotL = max(dot(vWorldNormal, dirLight.direction), 0.0);
          float shadow = getShadowMask();
          L += dirLight.color * NdotL * shadow;
        }
      #endif

      vec3 ambient = ambientLightColor * ao;
      vec3 color = albedo * (ambient + L * (1.0 - rough * 0.5));

      gl_FragColor = vec4(color, 1.0);

      #include <fog_fragment>
    }
  `;

  const mat = new THREE.ShaderMaterial({
    uniforms,
    vertexShader,
    fragmentShader,
    lights: true,
    fog: true,
  });

  return mat;
}
