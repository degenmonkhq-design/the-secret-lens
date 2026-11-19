import * as THREE from 'three';

// ---------------------------------------------------------------------------
// Deterministic 3D Value Noise & FBM (zero-seam spherical planet generation)
// ---------------------------------------------------------------------------
function hash3(x: number, y: number, z: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453123;
  return n - Math.floor(n);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function noise3(x: number, y: number, z: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const iz = Math.floor(z);

  const fx = x - ix;
  const fy = y - iy;
  const fz = z - iz;

  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  const uz = fz * fz * (3 - 2 * fz);

  const n000 = hash3(ix, iy, iz);
  const n100 = hash3(ix + 1, iy, iz);
  const n010 = hash3(ix, iy + 1, iz);
  const n110 = hash3(ix + 1, iy + 1, iz);
  const n001 = hash3(ix, iy, iz + 1);
  const n101 = hash3(ix + 1, iy, iz + 1);
  const n011 = hash3(ix, iy + 1, iz + 1);
  const n111 = hash3(ix + 1, iy + 1, iz + 1);

  const nx00 = lerp(n000, n100, ux);
  const nx10 = lerp(n010, n110, ux);
  const nx01 = lerp(n001, n101, ux);
  const nx11 = lerp(n011, n111, ux);

  const nxy0 = lerp(nx00, nx10, uy);
  const nxy1 = lerp(nx01, nx11, uy);

  return lerp(nxy0, nxy1, uz);
}

function fbm3(x: number, y: number, z: number, octaves = 5): number {
  let value = 0;
  let amp = 0.5;
  let freq = 1.0;
  for (let i = 0; i < octaves; i++) {
    value += amp * noise3(x * freq, y * freq, z * freq);
    freq *= 2.04;
    amp *= 0.5;
  }
  return value;
}

function ridgedFbm3(x: number, y: number, z: number, octaves = 4): number {
  let value = 0;
  let amp = 0.5;
  let freq = 1.0;
  for (let i = 0; i < octaves; i++) {
    const n = 1.0 - Math.abs(noise3(x * freq, y * freq, z * freq) * 2.0 - 1.0);
    value += amp * n * n;
    freq *= 2.1;
    amp *= 0.5;
  }
  return value;
}

/**
 * Converts a scalar equirectangular heightfield [0..1] into a linear tangent-space Normal DataTexture.
 */
function heightFieldToNormalTexture(
  heights: Float32Array,
  w: number,
  h: number,
  strength: number,
  maxAniso: number
): THREE.DataTexture {
  const data = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++) {
    const yUp = Math.max(0, y - 1);
    const yDn = Math.min(h - 1, y + 1);
    for (let x = 0; x < w; x++) {
      const xLt = (x - 1 + w) % w;
      const xRt = (x + 1) % w;

      const dX = (heights[y * w + xRt] - heights[y * w + xLt]) * strength;
      const dY = (heights[yDn * w + x] - heights[yUp * w + x]) * strength;

      let nx = -dX;
      let ny = -dY;
      let nz = 1.0;
      const invLen = 1.0 / Math.sqrt(nx * nx + ny * ny + nz * nz);
      nx *= invLen;
      ny *= invLen;
      nz *= invLen;

      const idx = (y * w + x) * 4;
      data[idx] = Math.round((nx * 0.5 + 0.5) * 255);
      data[idx + 1] = Math.round((ny * 0.5 + 0.5) * 255);
      data[idx + 2] = Math.round((nz * 0.5 + 0.5) * 255);
      data[idx + 3] = 255;
    }
  }
  const tex = new THREE.DataTexture(data, w, h, THREE.RGBAFormat);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = true;
  tex.anisotropy = Math.min(8, maxAniso);
  tex.needsUpdate = true;
  return tex;
}

/**
 * Generates NASA-grade procedural spherical textures for Earth:
 * - albedoTex (sRGB): realistic oceans, coastal shelves, forests, deserts, mountains, polar ice
 * - normalTex (Linear): crisp tangent-space terrain relief
 * - roughnessTex (Linear): specular ocean glint vs matte continents
 * - cityLightsTex (sRGB): warm golden night-side urban clusters along coasts/lowlands
 * - cloudsTex (sRGB): multi-octave swirling atmospheric cloud systems
 */
export function createEarthTextures(maxAniso: number): {
  albedoTex: THREE.CanvasTexture;
  normalTex: THREE.DataTexture;
  roughnessTex: THREE.CanvasTexture;
  cityLightsTex: THREE.CanvasTexture;
  cloudsTex: THREE.CanvasTexture;
} {
  const w = 512;
  const h = 256;

  const albedoCanvas = document.createElement('canvas');
  albedoCanvas.width = w;
  albedoCanvas.height = h;
  const aCtx = albedoCanvas.getContext('2d')!;
  const aImg = aCtx.createImageData(w, h);

  const roughCanvas = document.createElement('canvas');
  roughCanvas.width = w;
  roughCanvas.height = h;
  const rCtx = roughCanvas.getContext('2d')!;
  const rImg = rCtx.createImageData(w, h);

  const cityCanvas = document.createElement('canvas');
  cityCanvas.width = w;
  cityCanvas.height = h;
  const nCtx = cityCanvas.getContext('2d')!;
  const nImg = nCtx.createImageData(w, h);

  const cloudsCanvas = document.createElement('canvas');
  cloudsCanvas.width = w;
  cloudsCanvas.height = h;
  const cCtx = cloudsCanvas.getContext('2d')!;
  const cImg = cCtx.createImageData(w, h);

  const heightField = new Float32Array(w * h);

  for (let y = 0; y < h; y++) {
    const v = y / (h - 1);
    const phi = v * Math.PI; // 0 North Pole -> PI South Pole
    const sinPhi = Math.sin(phi);
    const cosPhi = Math.cos(phi);
    const latNorm = Math.abs(cosPhi); // 0 equator -> 1 poles

    for (let x = 0; x < w; x++) {
      const u = x / w;
      const theta = u * Math.PI * 2;
      const sx = sinPhi * Math.cos(theta);
      const sy = cosPhi;
      const sz = sinPhi * Math.sin(theta);

      // Domain-warped 3D FBM for organic Earth continents
      const warpX = fbm3(sx * 1.4 + 3.1, sy * 1.4, sz * 1.4 + 1.7, 3) * 0.48;
      const warpY = fbm3(sx * 1.4 + 8.3, sy * 1.4 + 2.4, sz * 1.4, 3) * 0.48;
      const continent = fbm3(sx * 1.9 + warpX, sy * 1.9 + warpY, sz * 1.9 - warpX * 0.6, 5);
      const ridge = ridgedFbm3(sx * 4.5 + 5.2, sy * 4.5, sz * 4.5 + 2.9, 4);
      const moisture = fbm3(sx * 3.1 - 4.0, sy * 3.1 + 1.2, sz * 3.1 + 6.5, 4);

      const seaLevel = 0.515;
      const elev = continent + (continent > seaLevel ? (ridge - 0.35) * 0.14 : 0);
      const idx = (y * w + x) * 4;

      let R = 0;
      let G = 0;
      let B = 0;
      let rough = 60;
      let cityGlow = 0;

      // Polar ice cap blend
      const iceThreshold = 0.87 - fbm3(sx * 5, sy * 5, sz * 5, 3) * 0.12;

      if (latNorm > iceThreshold) {
        // Polar ice sheets / glaciers
        R = 232;
        G = 242;
        B = 252;
        rough = 185;
        heightField[y * w + x] = 0.62;
      } else if (elev < seaLevel) {
        // Ocean bathymetry gradient: abyssal cobalt -> turquoise continental shelf
        const depth = Math.max(0, Math.min(1, (seaLevel - elev) / 0.18));
        R = Math.round(lerp(18, 4, depth));
        G = Math.round(lerp(92, 22, depth));
        B = Math.round(lerp(138, 62, depth));
        rough = 48; // specular ocean water
        heightField[y * w + x] = 0.42;
      } else {
        const landAlt = Math.min(1, (elev - seaLevel) / 0.28);
        heightField[y * w + x] = 0.45 + landAlt * 0.55;
        rough = 212;

        if (landAlt > 0.72) {
          // Snow-capped high mountain ranges
          const snowMix = Math.min(1, (landAlt - 0.72) / 0.22);
          R = Math.round(lerp(116, 236, snowMix));
          G = Math.round(lerp(106, 242, snowMix));
          B = Math.round(lerp(96, 248, snowMix));
        } else {
          // Biome blend: arid desert -> golden savannah -> deep emerald rainforest
          const aridity = Math.max(0, Math.min(1, (0.58 - moisture) * 2.2 + (0.28 - latNorm) * 0.5));
          const vegR = lerp(24, 62, landAlt);
          const vegG = lerp(78, 102, landAlt);
          const vegB = lerp(42, 48, landAlt);

          const desR = lerp(164, 134, landAlt);
          const desG = lerp(136, 108, landAlt);
          const desB = lerp(90, 74, landAlt);

          R = Math.round(lerp(vegR, desR, aridity));
          G = Math.round(lerp(vegG, desG, aridity));
          B = Math.round(lerp(vegB, desB, aridity));

          // Coastal & temperate golden night-side city lights
          if (landAlt < 0.28 && latNorm < 0.68) {
            const urbanNoise = fbm3(sx * 24.0 + 1.5, sy * 24.0, sz * 24.0 + 4.1, 3);
            if (urbanNoise > 0.62) {
              cityGlow = Math.min(1, (urbanNoise - 0.62) * 3.8);
            }
          }
        }
      }

      aImg.data[idx] = R;
      aImg.data[idx + 1] = G;
      aImg.data[idx + 2] = B;
      aImg.data[idx + 3] = 255;

      rImg.data[idx] = rough;
      rImg.data[idx + 1] = rough;
      rImg.data[idx + 2] = rough;
      rImg.data[idx + 3] = 255;

      if (cityGlow > 0.02) {
        nImg.data[idx] = Math.round(255 * cityGlow);
        nImg.data[idx + 1] = Math.round(196 * cityGlow);
        nImg.data[idx + 2] = Math.round(92 * cityGlow);
        nImg.data[idx + 3] = 255;
      } else {
        nImg.data[idx] = 0;
        nImg.data[idx + 1] = 0;
        nImg.data[idx + 2] = 0;
        nImg.data[idx + 3] = 255;
      }

      // Swirling global cyclonic cloud systems
      const swirl = fbm3(sx * 2.5 + 11.2, sy * 3.4, sz * 2.5 - 3.7, 4);
      const cloudDensity = fbm3(
        sx * 4.2 + swirl * 1.15,
        sy * 5.2 - swirl * 0.4,
        sz * 4.2 + swirl * 0.9,
        5
      );
      const cAlpha = Math.max(0, Math.min(1, (cloudDensity - 0.49) * 3.1));
      cImg.data[idx] = 248;
      cImg.data[idx + 1] = 251;
      cImg.data[idx + 2] = 255;
      cImg.data[idx + 3] = Math.round(cAlpha * 235);
    }
  }

  aCtx.putImageData(aImg, 0, 0);
  rCtx.putImageData(rImg, 0, 0);
  nCtx.putImageData(nImg, 0, 0);
  cCtx.putImageData(cImg, 0, 0);

  const albedoTex = new THREE.CanvasTexture(albedoCanvas);
  albedoTex.colorSpace = THREE.SRGBColorSpace;
  albedoTex.wrapS = THREE.RepeatWrapping;
  albedoTex.anisotropy = Math.min(8, maxAniso);
  albedoTex.needsUpdate = true;

  const normalTex = heightFieldToNormalTexture(heightField, w, h, 3.8, maxAniso);

  const roughnessTex = new THREE.CanvasTexture(roughCanvas);
  roughnessTex.wrapS = THREE.RepeatWrapping;
  roughnessTex.anisotropy = Math.min(8, maxAniso);
  roughnessTex.needsUpdate = true;

  const cityLightsTex = new THREE.CanvasTexture(cityCanvas);
  cityLightsTex.colorSpace = THREE.SRGBColorSpace;
  cityLightsTex.wrapS = THREE.RepeatWrapping;
  cityLightsTex.anisotropy = Math.min(4, maxAniso);
  cityLightsTex.needsUpdate = true;

  const cloudsTex = new THREE.CanvasTexture(cloudsCanvas);
  cloudsTex.colorSpace = THREE.SRGBColorSpace;
  cloudsTex.wrapS = THREE.RepeatWrapping;
  cloudsTex.anisotropy = Math.min(8, maxAniso);
  cloudsTex.needsUpdate = true;

  return { albedoTex, normalTex, roughnessTex, cityLightsTex, cloudsTex };
}

/**
 * Generates Cassini-grade photorealistic Saturn banded jet-streams, normal relief,
 * and razor-detailed multi-ringlet radial rings.
 */
export function createSaturnTextures(maxAniso: number): {
  planetTex: THREE.CanvasTexture;
  normalTex: THREE.DataTexture;
  ringTex: THREE.CanvasTexture;
} {
  const w = 512;
  const h = 256;
  const pCanvas = document.createElement('canvas');
  pCanvas.width = w;
  pCanvas.height = h;
  const pCtx = pCanvas.getContext('2d')!;
  const pImg = pCtx.createImageData(w, h);
  const heights = new Float32Array(w * h);

  for (let y = 0; y < h; y++) {
    const v = y / (h - 1);
    const phi = v * Math.PI;
    const sinPhi = Math.sin(phi);
    const cosPhi = Math.cos(phi);
    const polarCap = Math.max(0, (Math.abs(cosPhi) - 0.84) / 0.16);

    for (let x = 0; x < w; x++) {
      const u = x / w;
      const theta = u * Math.PI * 2;
      const sx = sinPhi * Math.cos(theta);
      const sy = cosPhi;
      const sz = sinPhi * Math.sin(theta);

      // Turbulent latitudinal zonal jet-streams
      const turb = fbm3(sx * 4.5, sy * 12.0, sz * 4.5, 4) * 0.055;
      const bandCoord = v + turb;
      const waveA = Math.sin(bandCoord * Math.PI * 16.0);
      const waveB = Math.sin(bandCoord * Math.PI * 34.0 + 1.1);
      const storm = fbm3(sx * 7.5 + 2.1, sy * 22.0, sz * 7.5, 3);
      const bandVal = Math.max(0, Math.min(1, 0.52 + waveA * 0.24 + waveB * 0.12 + (storm - 0.5) * 0.22));

      let R = Math.round(lerp(168, 242, bandVal));
      let G = Math.round(lerp(134, 214, bandVal));
      let B = Math.round(lerp(88, 158, bandVal));

      // Authentic cool sage-blue polar hexagon tint at high latitudes
      if (polarCap > 0) {
        R = Math.round(lerp(R, 126, polarCap * 0.65));
        G = Math.round(lerp(G, 146, polarCap * 0.55));
        B = Math.round(lerp(B, 148, polarCap * 0.55));
      }

      const idx = (y * w + x) * 4;
      pImg.data[idx] = R;
      pImg.data[idx + 1] = G;
      pImg.data[idx + 2] = B;
      pImg.data[idx + 3] = 255;
      heights[y * w + x] = bandVal;
    }
  }
  pCtx.putImageData(pImg, 0, 0);

  // High-resolution 1024px radial ringlet texture (C, B, Cassini Division, A, Encke, F rings)
  const rw = 1024;
  const rCanvas = document.createElement('canvas');
  rCanvas.width = rw;
  rCanvas.height = 16;
  const rCtx = rCanvas.getContext('2d')!;
  const rImg = rCtx.createImageData(rw, 16);

  for (let x = 0; x < rw; x++) {
    const r = x / (rw - 1); // 0 inner edge -> 1 outer edge
    const fineRinglet =
      0.5 +
      0.28 * Math.sin(r * 210.0) +
      0.14 * Math.sin(r * 540.0 + 1.4) +
      0.08 * Math.cos(r * 980.0);

    let alpha = 0;
    let tint = 0.85;

    if (r > 0.04 && r < 0.22) {
      // Faint dusky C-ring
      alpha = 0.16 * Math.sin(((r - 0.04) / 0.18) * Math.PI) * (0.7 + fineRinglet * 0.4);
      tint = 0.65;
    } else if (r >= 0.22 && r < 0.57) {
      // Bright dense icy B-ring
      const edge = Math.sin(((r - 0.22) / 0.35) * Math.PI * 0.92 + 0.12);
      alpha = (0.58 + 0.36 * fineRinglet) * Math.min(1, edge * 1.45);
      tint = 0.95;
    } else if (r >= 0.57 && r < 0.635) {
      // Cassini Division dark gap
      alpha = 0.025;
      tint = 0.45;
    } else if (r >= 0.635 && r < 0.89) {
      // A-ring + Encke gap around 0.82
      const encke = Math.abs(r - 0.825) < 0.01 ? 0.12 : 1.0;
      const taper = 1.0 - Math.pow((r - 0.635) / 0.255, 2.2) * 0.55;
      alpha = (0.42 + 0.28 * fineRinglet) * taper * encke;
      tint = 0.84;
    } else if (r > 0.925 && r < 0.955) {
      // Narrow bright outer F-ring
      alpha = 0.35 * Math.sin(((r - 0.925) / 0.03) * Math.PI);
      tint = 0.98;
    }

    const R = Math.round(238 * tint);
    const G = Math.round(218 * tint);
    const B = Math.round(182 * tint);
    const A = Math.round(Math.max(0, Math.min(1, alpha)) * 255);

    for (let y = 0; y < 16; y++) {
      const idx = (y * rw + x) * 4;
      rImg.data[idx] = R;
      rImg.data[idx + 1] = G;
      rImg.data[idx + 2] = B;
      rImg.data[idx + 3] = A;
    }
  }
  rCtx.putImageData(rImg, 0, 0);

  const planetTex = new THREE.CanvasTexture(pCanvas);
  planetTex.colorSpace = THREE.SRGBColorSpace;
  planetTex.wrapS = THREE.RepeatWrapping;
  planetTex.anisotropy = Math.min(8, maxAniso);
  planetTex.needsUpdate = true;

  const normalTex = heightFieldToNormalTexture(heights, w, h, 0.85, maxAniso);

  const ringTex = new THREE.CanvasTexture(rCanvas);
  ringTex.colorSpace = THREE.SRGBColorSpace;
  ringTex.anisotropy = Math.min(8, maxAniso);
  ringTex.needsUpdate = true;

  return { planetTex, normalTex, ringTex };
}

/**
 * Generates LRO-grade photorealistic Moon albedo & tangent-space crater normal map.
 */
export function createPhotorealisticMoonTextures(maxAniso: number): {
  albedoTex: THREE.CanvasTexture;
  normalTex: THREE.DataTexture;
} {
  const w = 512;
  const h = 256;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(w, h);
  const heights = new Float32Array(w * h);

  // Pre-seed deterministic 3D crater centers on unit sphere
  const craters: Array<{ x: number; y: number; z: number; r: number; depth: number }> = [];
  for (let i = 0; i < 150; i++) {
    const u = hash3(i * 1.3, 4.1, 9.7) * 2 - 1;
    const th = hash3(i * 2.7, 8.2, 3.1) * Math.PI * 2;
    const sq = Math.sqrt(Math.max(0, 1 - u * u));
    craters.push({
      x: sq * Math.cos(th),
      y: u,
      z: sq * Math.sin(th),
      r: 0.03 + Math.pow(hash3(i, 7.7, 1.9), 2.4) * 0.22,
      depth: 0.14 + hash3(i, 2.3, 6.4) * 0.22,
    });
  }

  for (let y = 0; y < h; y++) {
    const phi = (y / (h - 1)) * Math.PI;
    const sinPhi = Math.sin(phi);
    const cosPhi = Math.cos(phi);

    for (let x = 0; x < w; x++) {
      const theta = (x / w) * Math.PI * 2;
      const sx = sinPhi * Math.cos(theta);
      const sy = cosPhi;
      const sz = sinPhi * Math.sin(theta);

      // Basaltic Maria (dark lunar seas) vs bright anorthosite highlands
      const maria = fbm3(sx * 1.6 + 2.1, sy * 1.6 - 1.3, sz * 1.6 + 0.7, 5);
      const regolith = fbm3(sx * 9.0, sy * 9.0, sz * 9.0, 4);
      let hVal = 0.55 + (maria - 0.5) * 0.35 + (regolith - 0.5) * 0.16;
      let bright = maria < 0.47 ? lerp(102, 138, maria / 0.47) : lerp(152, 212, (maria - 0.47) / 0.53);
      bright += (regolith - 0.5) * 34;

      for (let c = 0; c < craters.length; c++) {
        const cr = craters[c];
        const dx = sx - cr.x;
        const dy = sy - cr.y;
        const dz = sz - cr.z;
        const dSq = dx * dx + dy * dy + dz * dz;
        const outerR = cr.r * 1.35;
        if (dSq > outerR * outerR) continue;
        const d = Math.sqrt(dSq) / cr.r;
        if (d < 1.0) {
          // Parabolic crater bowl
          hVal -= (1.0 - d * d) * cr.depth;
          bright -= (1.0 - d * d) * 26;
        } else {
          // Raised bright ejecta rim
          const rim = 1.0 - (d - 1.0) / 0.35;
          hVal += rim * rim * cr.depth * 0.38;
          bright += rim * 24;
        }
      }

      const shade = Math.max(75, Math.min(238, Math.round(bright)));
      const idx = (y * w + x) * 4;
      img.data[idx] = shade;
      img.data[idx + 1] = Math.round(shade * 0.99);
      img.data[idx + 2] = Math.round(shade * 1.02);
      img.data[idx + 3] = 255;
      heights[y * w + x] = Math.max(0, Math.min(1, hVal));
    }
  }
  ctx.putImageData(img, 0, 0);

  const albedoTex = new THREE.CanvasTexture(canvas);
  albedoTex.colorSpace = THREE.SRGBColorSpace;
  albedoTex.wrapS = THREE.RepeatWrapping;
  albedoTex.anisotropy = Math.min(8, maxAniso);
  albedoTex.needsUpdate = true;

  const normalTex = heightFieldToNormalTexture(heights, w, h, 4.4, maxAniso);
  return { albedoTex, normalTex };
}

/**
 * Generates a photorealistic Milky Way Galactic Band & Interstellar Stardust texture (sRGB).
 */
export function createMilkyWayDustTexture(): THREE.CanvasTexture {
  const w = 768;
  const h = 384;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(w, h);

  for (let y = 0; y < h; y++) {
    const ny = (y / (h - 1)) * 2 - 1;
    // Tilted diagonal galactic plane across sky
    for (let x = 0; x < w; x++) {
      const nx = (x / (w - 1)) * 2 - 1;
      const planeDist = Math.abs(ny * 0.85 - nx * 0.42);
      const bandMask = Math.exp(-planeDist * planeDist * 6.5);
      const radialFade = Math.max(0, 1 - (nx * nx * 0.72 + ny * ny * 0.85));

      const cloudA = fbm3(nx * 2.8 + 1.4, ny * 2.8 + 0.9, 0.7, 5);
      const cloudB = fbm3(nx * 6.4 - 2.3, ny * 6.4 + 3.1, 2.2, 4);
      const darkRift = fbm3(nx * 5.2 + 4.1, ny * 5.2 - 1.5, 4.4, 4);

      const coreGlow = Math.exp(-((nx + 0.08) * (nx + 0.08) * 3.5 + ny * ny * 5.0));
      const riftMask = darkRift > 0.54 && planeDist < 0.22 ? Math.max(0.2, 1.0 - (darkRift - 0.54) * 3.2) : 1.0;

      const intensity = bandMask * radialFade * Math.max(0, cloudA * 0.85 + cloudB * 0.35 - 0.22) * riftMask;

      const R = Math.round(Math.min(255, (72 + 178 * coreGlow + 40 * cloudB) * intensity));
      const G = Math.round(Math.min(255, (92 + 124 * coreGlow + 34 * cloudA) * intensity));
      const B = Math.round(Math.min(255, (165 + 48 * (1 - coreGlow) + 52 * cloudB) * intensity));
      const A = Math.round(Math.min(255, intensity * 210));

      const idx = (y * w + x) * 4;
      img.data[idx] = R;
      img.data[idx + 1] = G;
      img.data[idx + 2] = B;
      img.data[idx + 3] = A;
    }
  }
  ctx.putImageData(img, 0, 0);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Generates an ethereal, gossamer orbiting thought ribbon texture (no heavy borders).
 */
export function createOrbitingThoughtTexture(
  phrase: string,
  textHex: string,
  glowHex: string,
  maxAniso: number
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 96;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    ctx.clearRect(0, 0, 1024, 96);

    ctx.globalAlpha = 0.86;
    ctx.font = '600 24px "Plus Jakarta Sans", "Noto Sans Devanagari", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = glowHex;
    ctx.shadowBlur = 16;
    ctx.fillStyle = textHex;
    ctx.fillText(phrase, 512, 48);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.anisotropy = Math.min(8, maxAniso);
  tex.needsUpdate = true;
  return tex;
}

/**
 * Kept for backwards compatibility if referenced elsewhere.
 */
export function createNebulaCloudTexture(
  primaryRgba: string,
  secondaryRgba: string
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    ctx.clearRect(0, 0, 512, 512);
    const lobes = [
      { x: 256, y: 256, r: 230, c: primaryRgba },
      { x: 180, y: 210, r: 175, c: secondaryRgba },
      { x: 330, y: 295, r: 165, c: primaryRgba },
      { x: 245, y: 175, r: 140, c: secondaryRgba },
    ];
    for (const lobe of lobes) {
      const grad = ctx.createRadialGradient(lobe.x, lobe.y, 8, lobe.x, lobe.y, lobe.r);
      grad.addColorStop(0, lobe.c);
      grad.addColorStop(0.55, lobe.c.replace(/[\d.]+\)$/, '0.18)'));
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 512, 512);
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}
