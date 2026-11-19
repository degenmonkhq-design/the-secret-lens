import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { buildCosmicPlanetsAndThoughts, CosmicUniverseHandle } from './solarSystem';
import { buildTunnelOfLightWormhole, WormholeHandle } from './wormhole';
import { createMilkyWayDustTexture } from './proceduralTextures';

export interface SecretLensSceneState {
  cameraActive: boolean;
  cameraFacing?: 'environment' | 'user';
  isRecording?: boolean;
  targetYaw: number;
  targetPitch: number;
  inPortalRange: boolean;
  heatLevel: number;
  cleanReelMode: boolean;
}

/**
 * Probes WebGL2 renderer string cleanly to detect software rasterizers (SwiftShader / llvmpipe).
 */
function detectSoftwareWebGL(): boolean {
  try {
    const probeCanvas = document.createElement('canvas');
    const gl = probeCanvas.getContext('webgl2');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const rendererStr = ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) || '') : '';
    const isSoftware = /SwiftShader|llvmpipe|softpipe|Software|Mesa/i.test(rendererStr);
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return isSoftware;
  } catch {
    return false;
  }
}

export class SecretLensScene {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private envRT: THREE.WebGLRenderTarget;
  private universe: CosmicUniverseHandle;
  private wormhole: WormholeHandle;

  // Photorealistic pinpoint GPU-twinkling starfield (micro-stars + Milky Way band + diffraction stars)
  private starGeo: THREE.BufferGeometry;
  private starMat: THREE.ShaderMaterial;
  private starPoints: THREE.Points;

  // Distant floating galactic stardust particles
  private dustGeo: THREE.BufferGeometry;
  private dustMat: THREE.ShaderMaterial;
  private dustPoints: THREE.Points;

  // Photorealistic Milky Way Galactic Core & Dust Lanes backdrop
  private milkyWayGeo: THREE.PlaneGeometry;
  private milkyWayTex: THREE.CanvasTexture;
  private milkyWayMat: THREE.MeshBasicMaterial;
  private milkyWayMesh: THREE.Mesh;

  private isSoftwareGl: boolean;
  private glContext: WebGL2RenderingContext | null = null;
  private rafId = 0;
  private timerId = 0;
  private disposed = false;
  private resizeObserver: ResizeObserver;
  private clock = new THREE.Clock();

  private smoothYaw = 0;
  private smoothPitch = 0;

  private cosmicBgColor = new THREE.Color('#02040a');
  private cosmicFog = new THREE.FogExp2('#02040a', 0.012);

  private state: SecretLensSceneState = {
    cameraActive: false,
    isRecording: false,
    targetYaw: 0,
    targetPitch: 0,
    inPortalRange: false,
    heatLevel: 0.25,
    cleanReelMode: false,
  };

  constructor(container: HTMLElement, initialState: SecretLensSceneState) {
    this.container = container;
    this.state = { ...initialState };
    this.isSoftwareGl = detectSoftwareWebGL();

    const width = Math.max(1, container.clientWidth || window.innerWidth);
    const height = Math.max(1, container.clientHeight || window.innerHeight);

    this.renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true,
    });
    this.renderer.setSize(width, height);
    const pixelRatio = this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2);
    this.renderer.setPixelRatio(pixelRatio);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.06;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = false;

    const rawCtx = this.renderer.getContext();
    if (typeof WebGL2RenderingContext !== 'undefined' && rawCtx instanceof WebGL2RenderingContext) {
      this.glContext = rawCtx;
    }

    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.pointerEvents = 'none';
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(54, width / height, 0.1, 160);
    this.camera.position.set(0, 0.06, 6.2);

    // Subtle cosmic environment reflection map
    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    const roomEnv = new RoomEnvironment();
    this.envRT = pmremGenerator.fromScene(roomEnv, 0.06);
    this.scene.environment = this.envRT.texture;
    this.scene.environmentIntensity = 0.25;
    roomEnv.dispose();
    pmremGenerator.dispose();

    // NASA-style three-point solar illumination: crisp Solar Key + deep Earthshine fill + cool cosmic rim
    const sunPos = new THREE.Vector3(6, 3.5, 5.5);
    const sunDir = sunPos.clone().normalize();

    const keyLight = new THREE.DirectionalLight(0xfff5dc, 2.75);
    keyLight.position.copy(sunPos);
    this.scene.add(keyLight);

    const hemiLight = new THREE.HemisphereLight(0x2d549e, 0x040712, 0.34);
    this.scene.add(hemiLight);

    const rimLight = new THREE.DirectionalLight(0x52a8ff, 0.42);
    rimLight.position.set(-6, -2.5, -5);
    this.scene.add(rimLight);

    // Photorealistic Shaded Planets (Earth, Saturn w/ Cassini rings, Cratered Moon, Titan) + Orbiting Thoughts
    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();
    this.universe = buildCosmicPlanetsAndThoughts(maxAniso, sunDir);
    this.scene.add(this.universe.planetsGroup, this.universe.orbitingThoughtsGroup);

    // Glowing Tunnel of Light (Wormhole) active cleanly during Video / Reel Recording Mode
    this.wormhole = buildTunnelOfLightWormhole();
    this.scene.add(this.wormhole.group);

    // Photorealistic Milky Way Galactic Band backdrop
    this.milkyWayTex = createMilkyWayDustTexture();
    this.milkyWayGeo = new THREE.PlaneGeometry(78, 39);
    this.milkyWayMat = new THREE.MeshBasicMaterial({
      map: this.milkyWayTex,
      transparent: true,
      opacity: 0.44,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.milkyWayMesh = new THREE.Mesh(this.milkyWayGeo, this.milkyWayMat);
    this.milkyWayMesh.position.set(0, 0.8, -36);
    this.milkyWayMesh.rotation.z = THREE.MathUtils.degToRad(-12);
    this.scene.add(this.milkyWayMesh);

    // Thousands of Tiny, Sharp, Multi-Layered Twinkling Stars (1 GPU draw call)
    // Mixes distant pinpoint micro-stars, tilted Milky Way dense field & bright diffraction stars
    const totalStars = this.isSoftwareGl ? 3200 : 8500;
    const positions = new Float32Array(totalStars * 3);
    const colors = new Float32Array(totalStars * 3);
    const sizes = new Float32Array(totalStars);
    const phases = new Float32Array(totalStars);
    const speeds = new Float32Array(totalStars);
    const kinds = new Float32Array(totalStars);

    // True blackbody stellar color temperatures (O/B blue-white, A white, G warm gold, K pale amber)
    const stellarPalette = [
      new THREE.Color('#c8e2ff'), // O/B hot blue-white
      new THREE.Color('#ffffff'), // A pure white
      new THREE.Color('#fff9ed'), // F white-cream
      new THREE.Color('#ffebc4'), // G warm solar
      new THREE.Color('#ffd09b'), // K gentle amber
    ];

    for (let i = 0; i < totalStars; i++) {
      const i3 = i * 3;
      const layerRoll = Math.random();

      if (layerRoll < 0.62) {
        // Far distant micro-stars across full sky hemisphere (tiny sharp pinpoints)
        const radius = 26 + Math.random() * 44;
        const theta = (Math.random() - 0.5) * Math.PI * 1.45;
        const phi = (Math.random() - 0.5) * Math.PI * 0.92;
        positions[i3] = Math.sin(theta) * Math.cos(phi) * radius;
        positions[i3 + 1] = Math.sin(phi) * radius;
        positions[i3 + 2] = -Math.cos(theta) * Math.cos(phi) * radius;
        sizes[i] = 0.9 + Math.random() * 1.6;
        kinds[i] = 0.0;
      } else if (layerRoll < 0.92) {
        // Dense tilted Milky Way galactic band stars
        const radius = 18 + Math.random() * 34;
        const bandT = (Math.random() - 0.5) * 2.1;
        const scatter = (Math.random() + Math.random() - 1.0) * 0.28;
        const gx = bandT;
        const gy = bandT * 0.44 + scatter;
        positions[i3] = gx * radius * 0.95;
        positions[i3 + 1] = gy * radius * 0.85;
        positions[i3 + 2] = -radius;
        sizes[i] = 1.2 + Math.random() * 2.2;
        kinds[i] = 0.0;
      } else {
        // Closer bright navigational stars with subtle astronomical diffraction cross
        const radius = 11 + Math.random() * 16;
        positions[i3] = (Math.random() - 0.5) * radius * 2.2;
        positions[i3 + 1] = (Math.random() - 0.5) * radius * 1.5;
        positions[i3 + 2] = -radius;
        const isFirstMag = Math.random() > 0.72;
        sizes[i] = isFirstMag ? 4.4 + Math.random() * 3.0 : 2.5 + Math.random() * 1.6;
        kinds[i] = isFirstMag ? 1.0 : 0.25;
      }

      const col = stellarPalette[Math.floor(Math.random() * stellarPalette.length)];
      colors[i3] = col.r;
      colors[i3 + 1] = col.g;
      colors[i3 + 2] = col.b;
      phases[i] = Math.random() * Math.PI * 2;
      speeds[i] = 0.9 + Math.random() * 3.2;
    }

    this.starGeo = new THREE.BufferGeometry();
    this.starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.starGeo.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
    this.starGeo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    this.starGeo.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
    this.starGeo.setAttribute('aSpeed', new THREE.BufferAttribute(speeds, 1));
    this.starGeo.setAttribute('aKind', new THREE.BufferAttribute(kinds, 1));

    this.starMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uPixelRatio: { value: pixelRatio },
        uBaseAlpha: { value: 0.92 },
      },
      vertexShader: `
        attribute vec3 aColor;
        attribute float aSize;
        attribute float aPhase;
        attribute float aSpeed;
        attribute float aKind;
        uniform float uTime;
        uniform float uPixelRatio;
        varying vec3 vColor;
        varying float vTwinkle;
        varying float vKind;
        void main() {
          vColor = aColor;
          vKind = aKind;
          // Crisp natural atmospheric/astronomical scintillation
          float osc = 0.5 + 0.5 * sin(uTime * aSpeed + aPhase);
          vTwinkle = mix(0.45, 1.0, osc * osc);
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = clamp(aSize * uPixelRatio * (18.0 / max(8.0, -mvPosition.z)), 1.0, 14.0);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform float uBaseAlpha;
        varying vec3 vColor;
        varying float vTwinkle;
        varying float vKind;
        void main() {
          vec2 uv = gl_PointCoord - vec2(0.5);
          float dist = length(uv);
          if (dist > 0.5) discard;

          // Razor-sharp pinpoint stellar core + delicate Airy halo
          float core = exp(-dist * dist * 46.0);
          float halo = exp(-dist * dist * 12.0) * 0.28;

          // Subtle 4-way optical diffraction rays ONLY on brightest magnitude-1 stars
          float crossH = exp(-abs(uv.y) * 26.0) * exp(-abs(uv.x) * 6.5);
          float crossV = exp(-abs(uv.x) * 26.0) * exp(-abs(uv.y) * 6.5);
          float spikes = max(crossH, crossV) * 0.55 * vKind;

          float alpha = (core + halo + spikes) * vTwinkle * uBaseAlpha;
          vec3 finalCol = mix(vColor, vec3(1.0), core * 0.75);
          gl_FragColor = vec4(finalCol, clamp(alpha, 0.0, 1.0));
        }
      `,
    });

    this.starPoints = new THREE.Points(this.starGeo, this.starMat);
    this.starPoints.frustumCulled = false;
    this.scene.add(this.starPoints);

    // Tiny subtle drifting near-field cosmic micro-stardust (sharp pinpoint glints, never chunky balls)
    const dustCount = this.isSoftwareGl ? 90 : 220;
    const dustPos = new Float32Array(dustCount * 3);
    const dustPhase = new Float32Array(dustCount);
    for (let i = 0; i < dustCount; i++) {
      dustPos[i * 3] = (Math.random() - 0.5) * 11;
      dustPos[i * 3 + 1] = (Math.random() - 0.5) * 7.5;
      dustPos[i * 3 + 2] = -6.5 + Math.random() * 8.5;
      dustPhase[i] = Math.random() * Math.PI * 2;
    }
    this.dustGeo = new THREE.BufferGeometry();
    this.dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
    this.dustGeo.setAttribute('aPhase', new THREE.BufferAttribute(dustPhase, 1));
    this.dustMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uPixelRatio: { value: pixelRatio },
      },
      vertexShader: `
        attribute float aPhase;
        uniform float uTime;
        uniform float uPixelRatio;
        varying float vAlpha;
        void main() {
          vec3 p = position;
          p.x += sin(uTime * 0.25 + aPhase) * 0.28;
          p.y += cos(uTime * 0.2 + aPhase * 1.3) * 0.22;
          vAlpha = 0.22 + 0.55 * (0.5 + 0.5 * sin(uTime * 1.4 + aPhase * 2.0));
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_PointSize = clamp(2.6 * uPixelRatio * (5.0 / max(1.5, -mv.z)), 1.0, 5.0);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: `
        varying float vAlpha;
        void main() {
          vec2 uv = gl_PointCoord - vec2(0.5);
          float d = length(uv);
          if (d > 0.5) discard;
          float a = exp(-d * d * 24.0) * vAlpha;
          gl_FragColor = vec4(1.0, 0.93, 0.72, a);
        }
      `,
    });
    this.dustPoints = new THREE.Points(this.dustGeo, this.dustMat);
    this.dustPoints.frustumCulled = false;
    this.scene.add(this.dustPoints);

    this.applyBackgroundMode();

    this.resizeObserver = new ResizeObserver(() => this.handleResize());
    this.resizeObserver.observe(this.container);

    this.scheduleNextFrame();
  }

  public getCanvas(): HTMLCanvasElement {
    return this.renderer.domElement;
  }

  public setState(partial: Partial<SecretLensSceneState>): void {
    const prevCam = this.state.cameraActive;
    const prevRec = Boolean(this.state.isRecording || this.state.cleanReelMode);
    Object.assign(this.state, partial);
    const recording = Boolean(this.state.isRecording || this.state.cleanReelMode);

    if (prevCam !== this.state.cameraActive || prevRec !== recording) {
      this.applyBackgroundMode();
    }

    // Unified Video & Reel Recording Mode: hide ALL planets, moons, rings & orbiting thoughts; reveal Tunnel of Light Wormhole
    this.universe.planetsGroup.visible = !recording;
    this.universe.orbitingThoughtsGroup.visible = !recording;
    this.wormhole.group.visible = recording;
  }

  private applyBackgroundMode(): void {
    const recording = Boolean(this.state.isRecording || this.state.cleanReelMode);
    // Keep WebGL buffer alpha-transparent so either live <video> or deep black-blue cyberCanvas (#000105->#03091e) shines behind stars
    this.scene.background = null;
    this.scene.fog = null;
    this.renderer.setClearColor(0x000000, 0);

    if (this.state.cameraActive) {
      this.starMat.uniforms.uBaseAlpha.value = recording ? 0.98 : 0.88;
      this.milkyWayMat.opacity = recording ? 0.36 : 0.28;
    } else {
      this.starMat.uniforms.uBaseAlpha.value = 1.0;
      this.milkyWayMat.opacity = recording ? 0.44 : 0.56;
    }
  }

  private handleResize(): void {
    if (this.disposed) return;
    const width = Math.max(1, this.container.clientWidth || window.innerWidth);
    const height = Math.max(1, this.container.clientHeight || window.innerHeight);
    const pixelRatio = this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(pixelRatio);
    this.starMat.uniforms.uPixelRatio.value = pixelRatio;
    this.dustMat.uniforms.uPixelRatio.value = pixelRatio;
  }

  private scheduleNextFrame(): void {
    if (this.disposed) return;
    if (this.isSoftwareGl) {
      this.afterDraw(() => {
        if (!this.disposed) this.tick();
      });
    } else {
      this.rafId = requestAnimationFrame(() => {
        if (!this.disposed) this.tick();
      });
    }
  }

  private afterDraw(fn: () => void): void {
    const gl = this.glContext;
    if (!gl || typeof gl.fenceSync !== 'function') {
      this.timerId = window.setTimeout(fn, 80);
      return;
    }
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    if (!sync) {
      this.timerId = window.setTimeout(fn, 80);
      return;
    }
    gl.flush();
    const poll = () => {
      if (this.disposed) {
        try {
          gl.deleteSync(sync);
        } catch {
          // ignore
        }
        return;
      }
      const status = gl.clientWaitSync(sync, 0, 0);
      if (status === gl.ALREADY_SIGNALED || status === gl.CONDITION_SATISFIED || status === gl.WAIT_FAILED) {
        try {
          gl.deleteSync(sync);
        } catch {
          // ignore
        }
        this.timerId = window.setTimeout(fn, 80);
      } else {
        this.rafId = requestAnimationFrame(poll);
      }
    };
    this.rafId = requestAnimationFrame(poll);
  }

  private tick(): void {
    const dt = Math.min(0.1, this.clock.getDelta());
    const elapsed = this.clock.elapsedTime;

    this.smoothYaw = THREE.MathUtils.damp(this.smoothYaw, this.state.targetYaw, 6, dt);
    this.smoothPitch = THREE.MathUtils.damp(this.smoothPitch, this.state.targetPitch, 6, dt);

    const yawRad = THREE.MathUtils.degToRad(this.smoothYaw * 0.35);
    const pitchRad = THREE.MathUtils.degToRad(this.smoothPitch * 0.45);
    this.camera.position.x = Math.sin(yawRad) * 1.15;
    this.camera.position.y = 0.06 + Math.sin(pitchRad) * 0.85;
    this.camera.lookAt(0, 0.02, -0.6);

    // Animate photorealistic planets & orbiting thoughts OR Tunnel of Light Wormhole in Recording Mode
    this.universe.animate(elapsed);
    this.wormhole.animate(elapsed);

    // GPU shader twinkle & gentle deep-cosmos drift
    this.starMat.uniforms.uTime.value = elapsed;
    this.dustMat.uniforms.uTime.value = elapsed;
    this.starPoints.rotation.z = elapsed * 0.0025;
    this.starPoints.rotation.y = elapsed * 0.0018;
    this.milkyWayMesh.rotation.z = THREE.MathUtils.degToRad(-12) + elapsed * 0.0015;

    this.renderer.render(this.scene, this.camera);
    this.scheduleNextFrame();
  }

  public dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    cancelAnimationFrame(this.rafId);
    window.clearTimeout(this.timerId);
    this.resizeObserver.disconnect();

    this.universe.dispose();
    this.wormhole.dispose();
    this.starGeo.dispose();
    this.starMat.dispose();
    this.dustGeo.dispose();
    this.dustMat.dispose();
    this.milkyWayGeo.dispose();
    this.milkyWayMat.dispose();
    this.milkyWayTex.dispose();
    this.envRT.dispose();

    if (this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
    this.renderer.dispose();
  }
}
