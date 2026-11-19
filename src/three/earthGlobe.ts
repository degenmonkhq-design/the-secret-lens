import * as THREE from 'three';
import { createEarthTextures } from './proceduralTextures';

export interface EarthGlobeHandle {
  group: THREE.Group;
  surfaceMesh: THREE.Mesh;
  cloudsMesh: THREE.Mesh;
  dispose: () => void;
}

/**
 * Builds a NASA-grade photorealistic 3D Earth with:
 * - Seamless 3D spherical FBM continents, ocean bathymetry & snowy ridges
 * - Tangent-space terrain normal map & specular ocean roughness map
 * - Night-side golden city-light constellations + twilight scatter via onBeforeCompile
 * - Swirling cyclonic atmospheric cloud layer
 * - Rayleigh blue-gold limb atmospheric scatter halo
 */
export function buildGlowingEarth(
  maxAniso: number,
  sunDirection = new THREE.Vector3(6, 3.5, 5.5).normalize()
): EarthGlobeHandle {
  const { albedoTex, normalTex, roughnessTex, cityLightsTex, cloudsTex } =
    createEarthTextures(maxAniso);

  const group = new THREE.Group();
  group.name = 'PhotorealisticEarthGroup';
  group.rotation.z = THREE.MathUtils.degToRad(23.4);

  const sphereGeo = new THREE.SphereGeometry(0.92, 64, 48);
  const surfaceMat = new THREE.MeshStandardMaterial({
    map: albedoTex,
    normalMap: normalTex,
    normalScale: new THREE.Vector2(1.2, 1.2),
    roughnessMap: roughnessTex,
    roughness: 0.92,
    metalness: 0.06,
    emissive: new THREE.Color(0x091f42),
    emissiveIntensity: 0.28,
  });

  // Inject night-side city lights & subtle golden twilight rim along the solar terminator
  surfaceMat.onBeforeCompile = (shader) => {
    shader.uniforms.uSunDir = { value: sunDirection };
    shader.uniforms.uCityMap = { value: cityLightsTex };

    shader.vertexShader =
      `varying vec3 vEarthWorldNormal;\nvarying vec2 vEarthUv;\n` +
      shader.vertexShader.replace(
        '#include <beginnormal_vertex>',
        `#include <beginnormal_vertex>\nvEarthUv = uv;\nvEarthWorldNormal = normalize(mat3(modelMatrix) * objectNormal);`
      );

    shader.fragmentShader =
      `uniform vec3 uSunDir;\nuniform sampler2D uCityMap;\nvarying vec3 vEarthWorldNormal;\nvarying vec2 vEarthUv;\n` +
      shader.fragmentShader.replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
        float sunDot = dot(normalize(vEarthWorldNormal), normalize(uSunDir));
        float nightMask = smoothstep(0.14, -0.26, sunDot);
        vec3 cityLights = texture2D(uCityMap, vEarthUv).rgb;
        float terminator = exp(-sunDot * sunDot * 28.0) * 0.16;
        totalEmissiveRadiance += cityLights * nightMask * 1.45 + vec3(0.85, 0.55, 0.25) * terminator;`
      );
  };
  surfaceMat.customProgramCacheKey = () => 'photorealistic-earth-v2';

  const surfaceMesh = new THREE.Mesh(sphereGeo, surfaceMat);
  group.add(surfaceMesh);

  // Swirling volumetric cloud deck
  const cloudsGeo = new THREE.SphereGeometry(0.938, 56, 42);
  const cloudsMat = new THREE.MeshStandardMaterial({
    map: cloudsTex,
    transparent: true,
    opacity: 0.78,
    depthWrite: false,
    roughness: 0.95,
    metalness: 0.0,
    emissive: new THREE.Color(0x0b1c36),
    emissiveIntensity: 0.18,
  });
  const cloudsMesh = new THREE.Mesh(cloudsGeo, cloudsMat);
  group.add(cloudsMesh);

  // Outer Rayleigh Atmospheric Limb Scatter Halo
  const atmoGeo = new THREE.SphereGeometry(1.045, 52, 38);
  const atmoMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.BackSide,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uSunDir: { value: sunDirection },
      glowColorDay: { value: new THREE.Color(0x4fc3ff) },
      glowColorSunset: { value: new THREE.Color(0xf5c542) },
    },
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vViewPos;
      varying vec3 vWorldNormal;
      void main() {
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        vNormal = normalize(normalMatrix * normal);
        vViewPos = -mvPosition.xyz;
        vWorldNormal = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      uniform vec3 uSunDir;
      uniform vec3 glowColorDay;
      uniform vec3 glowColorSunset;
      varying vec3 vNormal;
      varying vec3 vViewPos;
      varying vec3 vWorldNormal;
      void main() {
        vec3 viewDir = normalize(vViewPos);
        float rim = pow(clamp(0.68 - dot(vNormal, viewDir), 0.0, 1.0), 3.1);
        float sunLight = smoothstep(-0.35, 0.55, dot(normalize(vWorldNormal), normalize(uSunDir)));
        vec3 atmoColor = mix(glowColorSunset * 0.55, glowColorDay, sunLight);
        float alpha = rim * mix(0.28, 0.95, sunLight);
        gl_FragColor = vec4(atmoColor, clamp(alpha, 0.0, 0.88));
      }
    `,
  });
  const atmoMesh = new THREE.Mesh(atmoGeo, atmoMat);
  group.add(atmoMesh);

  const dispose = () => {
    sphereGeo.dispose();
    surfaceMat.dispose();
    cloudsGeo.dispose();
    cloudsMat.dispose();
    atmoGeo.dispose();
    atmoMat.dispose();
    albedoTex.dispose();
    normalTex.dispose();
    roughnessTex.dispose();
    cityLightsTex.dispose();
    cloudsTex.dispose();
  };

  return { group, surfaceMesh, cloudsMesh, dispose };
}
