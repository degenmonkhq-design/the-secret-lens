import * as THREE from 'three';
import { buildGlowingEarth, EarthGlobeHandle } from './earthGlobe';
import {
  createOrbitingThoughtTexture,
  createPhotorealisticMoonTextures,
  createSaturnTextures,
} from './proceduralTextures';

export interface CosmicUniverseHandle {
  planetsGroup: THREE.Group;
  orbitingThoughtsGroup: THREE.Group;
  animate: (elapsed: number) => void;
  dispose: () => void;
}

/**
 * Builds the photorealistic Normal-Dashboard planetary cosmos over the camera feed:
 * - Shaded Photorealistic Earth (continents, normal relief, night city lights, clouds, Rayleigh halo)
 * - Shaded Photorealistic Saturn (zonal bands, normal relief, icy multi-ringlet Cassini rings)
 * - Shaded LRO-style Lunar Moon (crater normal relief & Maria seas) + distant golden Titan moon
 * - Delicate ethereal glowing orbiting thoughts & micro-stardust circling Earth
 *
 * Kept strictly isolated into `planetsGroup` and `orbitingThoughtsGroup` so BOTH
 * vanish instantaneously in Video Recording Mode.
 */
export function buildCosmicPlanetsAndThoughts(
  maxAniso: number,
  sunDirection = new THREE.Vector3(6, 3.5, 5.5).normalize()
): CosmicUniverseHandle {
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];
  const textures: THREE.Texture[] = [];

  const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    geometries.push(g);
    return g;
  };
  const trackMat = <T extends THREE.Material>(m: T): T => {
    materials.push(m);
    return m;
  };
  const trackTex = <T extends THREE.Texture>(t: T): T => {
    textures.push(t);
    return t;
  };

  const planetsGroup = new THREE.Group();
  planetsGroup.name = 'PhotorealisticPlanetsGroup';

  // 1. Photorealistic Glowing Earth
  const earth: EarthGlobeHandle = buildGlowingEarth(maxAniso, sunDirection);
  earth.group.position.set(-0.34, -0.18, -3.1);
  planetsGroup.add(earth.group);

  // 2. Photorealistic Saturn with Tilted Multi-Ringlet Cassini Rings
  const {
    planetTex: saturnPlanetTex,
    normalTex: saturnNormalTex,
    ringTex: saturnRingTex,
  } = createSaturnTextures(maxAniso);
  trackTex(saturnPlanetTex);
  trackTex(saturnNormalTex);
  trackTex(saturnRingTex);

  const saturnGroup = new THREE.Group();
  saturnGroup.position.set(2.15, 1.18, -5.25);
  saturnGroup.rotation.z = THREE.MathUtils.degToRad(26.7);
  saturnGroup.rotation.x = THREE.MathUtils.degToRad(15);

  const saturnBody = new THREE.Mesh(
    trackGeo(new THREE.SphereGeometry(0.55, 56, 40)),
    trackMat(
      new THREE.MeshStandardMaterial({
        map: saturnPlanetTex,
        normalMap: saturnNormalTex,
        normalScale: new THREE.Vector2(0.45, 0.45),
        roughness: 0.72,
        metalness: 0.02,
        emissive: new THREE.Color(0x211405),
        emissiveIntensity: 0.2,
      })
    )
  );
  // Realistic oblate spheroid flattening of Saturn (~10% polar flattening)
  saturnBody.scale.set(1.0, 0.91, 1.0);
  saturnGroup.add(saturnBody);

  // Subtle warm atmospheric haze limb around Saturn
  const saturnHalo = new THREE.Mesh(
    trackGeo(new THREE.SphereGeometry(0.585, 42, 30)),
    trackMat(
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
        uniforms: { glowColor: { value: new THREE.Color(0xf2cf8a) } },
        vertexShader: `
          varying vec3 vN;
          varying vec3 vV;
          void main() {
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            vN = normalize(normalMatrix * normal);
            vV = -mv.xyz;
            gl_Position = projectionMatrix * mv;
          }
        `,
        fragmentShader: `
          uniform vec3 glowColor;
          varying vec3 vN;
          varying vec3 vV;
          void main() {
            float rim = pow(clamp(0.62 - dot(vN, normalize(vV)), 0.0, 1.0), 3.4);
            gl_FragColor = vec4(glowColor, rim * 0.45);
          }
        `,
      })
    )
  );
  saturnHalo.scale.set(1.0, 0.91, 1.0);
  saturnGroup.add(saturnHalo);

  // Remap RingGeometry UVs radially (u = 0 inner -> 1 outer) for Cassini/Encke ringlet precision
  const saturnRingGeo = trackGeo(new THREE.RingGeometry(0.76, 1.54, 112, 1));
  const posAttr = saturnRingGeo.attributes.position;
  const uvAttr = saturnRingGeo.attributes.uv;
  const innerR = 0.76;
  const outerR = 1.54;
  for (let i = 0; i < posAttr.count; i++) {
    const x = posAttr.getX(i);
    const y = posAttr.getY(i);
    const radius = Math.sqrt(x * x + y * y);
    const u = (radius - innerR) / (outerR - innerR);
    uvAttr.setXY(i, Math.max(0, Math.min(1, u)), 0.5);
  }
  uvAttr.needsUpdate = true;

  const saturnRingMesh = new THREE.Mesh(
    saturnRingGeo,
    trackMat(
      new THREE.MeshStandardMaterial({
        map: saturnRingTex,
        transparent: true,
        opacity: 0.94,
        roughness: 0.65,
        metalness: 0.05,
        side: THREE.DoubleSide,
        depthWrite: false,
        emissive: new THREE.Color(0x524229),
        emissiveIntensity: 0.38,
      })
    )
  );
  saturnRingMesh.rotation.x = Math.PI / 2;
  saturnGroup.add(saturnRingMesh);
  planetsGroup.add(saturnGroup);

  // 3. Photorealistic Distant Lunar Moon (cratered LRO normal map relief)
  const { albedoTex: moonAlbedo, normalTex: moonNormal } = createPhotorealisticMoonTextures(maxAniso);
  trackTex(moonAlbedo);
  trackTex(moonNormal);

  const lunarMoon = new THREE.Mesh(
    trackGeo(new THREE.SphereGeometry(0.28, 48, 36)),
    trackMat(
      new THREE.MeshStandardMaterial({
        map: moonAlbedo,
        normalMap: moonNormal,
        normalScale: new THREE.Vector2(1.45, 1.45),
        roughness: 0.94,
        metalness: 0.0,
        emissive: new THREE.Color(0x161d2b),
        emissiveIntensity: 0.22,
      })
    )
  );
  lunarMoon.position.set(-2.05, 1.42, -4.55);
  planetsGroup.add(lunarMoon);

  // 4. Distant Atmospheric Titan Moon orbiting gently near Saturn
  const titanMoon = new THREE.Mesh(
    trackGeo(new THREE.SphereGeometry(0.14, 32, 24)),
    trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xd9a86c,
        roughness: 0.82,
        metalness: 0.02,
        emissive: new THREE.Color(0x4a2f12),
        emissiveIntensity: 0.35,
      })
    )
  );
  titanMoon.position.set(1.05, 0.72, -5.85);
  planetsGroup.add(titanMoon);

  // 5. Delicate Glowing Orbiting Thoughts / Whispers circling the planets
  const orbitingThoughtsGroup = new THREE.Group();
  orbitingThoughtsGroup.name = 'OrbitingThoughtsGroup';
  orbitingThoughtsGroup.position.set(-0.34, -0.18, -3.1);

  const ribbonTexA = trackTex(
    createOrbitingThoughtTexture(
      '✦ दुनिया की बोलती हुई किताब   ·   WHISPERS OF HUMANITY   ·   ECHOES IN ORBIT ✦',
      '#fff5c4',
      '#f5c542',
      maxAniso
    )
  );
  const ribbonTexB = trackTex(
    createOrbitingThoughtTexture(
      '✧ हर गली में एक कहानी   ·   SECRET MEMORIES   ·   STEP WITHIN 3M TO UNLOCK ✧',
      '#d4f9ff',
      '#38e8ff',
      maxAniso
    )
  );

  const ribbonA = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(1.58, 1.58, 0.14, 80, 1, true)),
    trackMat(
      new THREE.MeshBasicMaterial({
        map: ribbonTexA,
        transparent: true,
        opacity: 0.56,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    )
  );
  ribbonA.rotation.x = THREE.MathUtils.degToRad(14);
  ribbonA.rotation.z = THREE.MathUtils.degToRad(-9);

  const ribbonB = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(1.88, 1.88, 0.12, 80, 1, true)),
    trackMat(
      new THREE.MeshBasicMaterial({
        map: ribbonTexB,
        transparent: true,
        opacity: 0.44,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    )
  );
  ribbonB.rotation.x = THREE.MathUtils.degToRad(-17);
  ribbonB.rotation.z = THREE.MathUtils.degToRad(13);

  orbitingThoughtsGroup.add(ribbonA, ribbonB);

  // Tiny luminous golden & cyan orbiting thought-sparks around Earth
  const orbGeo = trackGeo(new THREE.SphereGeometry(0.024, 12, 10));
  const orbMatGold = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0xffe99c,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
    })
  );
  const orbMatCyan = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0x9cf4ff,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
    })
  );

  const thoughtOrbs: Array<{
    mesh: THREE.Mesh;
    radius: number;
    speed: number;
    phase: number;
    tilt: number;
  }> = [];
  for (let i = 0; i < 8; i++) {
    const orb = new THREE.Mesh(orbGeo, i % 2 === 0 ? orbMatGold : orbMatCyan);
    orbitingThoughtsGroup.add(orb);
    thoughtOrbs.push({
      mesh: orb,
      radius: 1.38 + (i % 3) * 0.28,
      speed: (i % 2 === 0 ? 1 : -1) * (0.24 + i * 0.04),
      phase: (i * Math.PI) / 4,
      tilt: (i - 3.5) * 0.12,
    });
  }

  const animate = (elapsed: number) => {
    if (planetsGroup.visible) {
      earth.surfaceMesh.rotation.y = elapsed * 0.065;
      earth.cloudsMesh.rotation.y = elapsed * 0.092;

      saturnBody.rotation.y = elapsed * 0.05;
      saturnRingMesh.rotation.z = elapsed * 0.018;

      lunarMoon.rotation.y = elapsed * 0.035;
      lunarMoon.position.y = 1.42 + Math.sin(elapsed * 0.42) * 0.04;

      titanMoon.position.x = 2.15 + Math.cos(elapsed * 0.18) * 1.45;
      titanMoon.position.z = -5.25 + Math.sin(elapsed * 0.18) * 1.15;
    }

    if (orbitingThoughtsGroup.visible) {
      ribbonA.rotation.y = elapsed * 0.13;
      ribbonB.rotation.y = -elapsed * 0.095;
      for (const item of thoughtOrbs) {
        const a = elapsed * item.speed + item.phase;
        item.mesh.position.set(
          Math.cos(a) * item.radius,
          Math.sin(a * 0.8) * item.tilt,
          Math.sin(a) * item.radius
        );
      }
    }
  };

  const dispose = () => {
    earth.dispose();
    geometries.forEach((g) => g.dispose());
    materials.forEach((m) => m.dispose());
    textures.forEach((t) => t.dispose());
  };

  return { planetsGroup, orbitingThoughtsGroup, animate, dispose };
}
