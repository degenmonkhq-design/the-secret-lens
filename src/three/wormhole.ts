import * as THREE from 'three';

export interface WormholeHandle {
  group: THREE.Group;
  animate: (elapsed: number) => void;
  dispose: () => void;
}

/**
 * Builds a photorealistic glowing Cosmic Tunnel of Light (Wormhole) active during
 * Video / Reel Recording Mode. Renders concentric spiraling plasma light currents
 * and hyperspace star-streaks receding into an infinite luminous core.
 */
export function buildTunnelOfLightWormhole(): WormholeHandle {
  const group = new THREE.Group();
  group.name = 'TunnelOfLightWormhole';
  group.visible = false; // Hidden on Normal Dashboard; active cleanly during Recording Mode

  // Open-ended funnel stretching deep along -Z axis
  const tunnelGeo = new THREE.CylinderGeometry(3.6, 0.28, 34, 56, 36, true);
  tunnelGeo.rotateX(Math.PI / 2);

  const tunnelMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uInnerColor: { value: new THREE.Color('#fff1b8') },
      uMidColor: { value: new THREE.Color('#38e8ff') },
      uOuterColor: { value: new THREE.Color('#13389e') },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uInnerColor;
      uniform vec3 uMidColor;
      uniform vec3 uOuterColor;
      varying vec2 vUv;

      float hash21(vec2 p) {
        p = fract(p * vec2(123.34, 456.21));
        p += dot(p, p + 45.32);
        return fract(p.x * p.y);
      }

      void main() {
        // vUv.y: 0.0 (deep far core) -> 1.0 (near camera entrance)
        float depth = clamp(vUv.y, 0.0, 1.0);
        float angle = vUv.x * 6.2831853;

        // Twin helical plasma light currents rushing forward from the distant core
        float spiralA = 0.5 + 0.5 * sin(angle * 4.0 + depth * 18.0 - uTime * 3.4);
        float spiralB = 0.5 + 0.5 * sin(angle * 7.0 - depth * 12.0 - uTime * 2.1);
        float streaks = pow(spiralA, 3.0) * 0.65 + pow(spiralB, 4.0) * 0.45;

        // Radial starlight filaments rushing down tunnel walls
        float lane = floor(vUv.x * 64.0);
        float speed = 1.6 + hash21(vec2(lane, 3.7)) * 2.4;
        float offset = fract(depth * 3.2 - uTime * speed + hash21(vec2(lane, 9.1)));
        float starStreak = smoothstep(0.0, 0.12, offset) * smoothstep(0.45, 0.12, offset);
        float laneMask = smoothstep(0.32, 0.5, abs(fract(vUv.x * 64.0) - 0.5));
        float filaments = starStreak * (1.0 - laneMask) * 0.7;

        // Luminous depth falloff (brightest near center portal entrance, fades smoothly near camera)
        float coreGlow = exp(-depth * 3.8);
        float edgeFade = smoothstep(1.0, 0.52, depth);

        vec3 col = mix(uOuterColor, uMidColor, streaks);
        col = mix(col, uInnerColor, clamp(coreGlow * 1.15 + filaments * 0.45, 0.0, 1.0));

        float alpha = (coreGlow * 0.72 + (streaks * 0.34 + filaments * 0.42) * edgeFade) * 0.85;
        gl_FragColor = vec4(col, clamp(alpha, 0.0, 0.9));
      }
    `,
  });

  const tunnelMesh = new THREE.Mesh(tunnelGeo, tunnelMat);
  tunnelMesh.position.set(0, 0.04, -18.5);
  group.add(tunnelMesh);

  // Soft golden-cyan central vanishing portal light flare
  const flareGeo = new THREE.PlaneGeometry(5.6, 5.6);
  const flareMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      varying vec2 vUv;
      void main() {
        vec2 uv = vUv - vec2(0.5);
        float d = length(uv) * 2.0;
        if (d > 1.0) discard;
        float pulse = 0.88 + 0.12 * sin(uTime * 2.4);
        float core = exp(-d * d * 11.0) * 0.95;
        float corona = exp(-d * d * 3.4) * 0.38;
        vec3 col = mix(vec3(0.22, 0.88, 1.0), vec3(1.0, 0.95, 0.76), core);
        gl_FragColor = vec4(col, clamp((core + corona) * pulse, 0.0, 0.92));
      }
    `,
  });
  const flareMesh = new THREE.Mesh(flareGeo, flareMat);
  flareMesh.position.set(0, 0.04, -34.5);
  group.add(flareMesh);

  const animate = (elapsed: number) => {
    if (!group.visible) return;
    tunnelMat.uniforms.uTime.value = elapsed;
    flareMat.uniforms.uTime.value = elapsed;
    tunnelMesh.rotation.z = elapsed * 0.08;
  };

  const dispose = () => {
    tunnelGeo.dispose();
    tunnelMat.dispose();
    flareGeo.dispose();
    flareMat.dispose();
  };

  return { group, animate, dispose };
}
