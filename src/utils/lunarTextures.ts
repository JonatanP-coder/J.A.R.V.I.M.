import * as THREE from 'three';

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Tileable 2D value noise on spherical equirectangular coordinates (seamless in U)
function makeSeamlessNoise(gridW: number, gridH: number, seed: number) {
  const rand = mulberry32(seed);
  const grid = new Float32Array(gridW * gridH);
  for (let i = 0; i < grid.length; i++) grid[i] = rand();

  return (u: number, v: number): number => {
    const x = (((u % 1) + 1) % 1) * gridW;
    const y = Math.max(0, Math.min(0.9999, v)) * (gridH - 1);
    const x0 = Math.floor(x) % gridW;
    const x1 = (x0 + 1) % gridW;
    const y0 = Math.floor(y);
    const y1 = Math.min(gridH - 1, y0 + 1);
    const fx = x - Math.floor(x);
    const fy = y - y0;
    const sx = fx * fx * (3 - 2 * fx);
    const sy = fy * fy * (3 - 2 * fy);

    const n00 = grid[y0 * gridW + x0];
    const n10 = grid[y0 * gridW + x1];
    const n01 = grid[y1 * gridW + x0];
    const n11 = grid[y1 * gridW + x1];
    const nx0 = n00 + (n10 - n00) * sx;
    const nx1 = n01 + (n11 - n01) * sx;
    return nx0 + (nx1 - nx0) * sy;
  };
}

export interface LunarTextureSet {
  albedoMap: THREE.CanvasTexture;
  displacementMap: THREE.CanvasTexture;
  normalMap: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
  dispose: () => void;
}

/**
 * Generates high-resolution procedural LRO-inspired Lunar textures:
 * - Albedo map (anorthosite highlands, basaltic maria, bright ejecta ray systems)
 * - Height / displacement map (multi-scale craters with raised rims & central peaks)
 * - Tangent-space Sobel normal map for sharp terminator relief
 * - Roughness variation map (glassy mare basalt vs powdery highlands regolith)
 */
export function createLunarTextureSet(maxAnisotropy = 4): LunarTextureSet {
  const W = 2048;
  const H = 1024;
  const rand = mulberry32(20260720);

  const n1 = makeSeamlessNoise(12, 6, 101);
  const n2 = makeSeamlessNoise(24, 12, 202);
  const n3 = makeSeamlessNoise(64, 32, 303);
  const n4 = makeSeamlessNoise(160, 80, 404);
  const n5 = makeSeamlessNoise(320, 160, 505);

  const heightField = new Float32Array(W * H);
  const mareField = new Float32Array(W * H);

  // 1. Base planetary topography: maria basins & highland regolith fBm
  for (let py = 0; py < H; py++) {
    const v = py / (H - 1);
    const latFactor = Math.sin(v * Math.PI); // avoid excessive stretching at poles
    for (let px = 0; px < W; px++) {
      const u = px / W;
      const idx = py * W + px;

      const fbm =
        n1(u, v) * 0.44 +
        n2(u, v) * 0.26 +
        n3(u, v) * 0.16 +
        n4(u, v) * 0.09 +
        n5(u, v) * 0.05;

      // Maria low-lying basalt basins biased toward near side & mid-latitudes
      const mareSignal = n1(u + 0.18, v) * 0.65 + n2(u + 0.18, v) * 0.35;
      const mareMask = Math.max(0, Math.min(1, (0.49 - mareSignal) * 3.8)) * (0.35 + 0.65 * latFactor);

      mareField[idx] = mareMask;
      heightField[idx] = 0.52 + (fbm - 0.5) * 0.36 - mareMask * 0.24;
    }
  }

  // 2. Impact Crater Field (large terraced basins, medium craters, crisp small & micro craters)
  interface CraterDef {
    u: number;
    v: number;
    radiusU: number;
    radiusV: number;
    depth: number;
    rimHeight: number;
    centralPeak: number;
    hasRays: boolean;
    raySeed: number;
  }

  const craters: CraterDef[] = [];
  // Large walled basins & major craters
  for (let i = 0; i < 28; i++) {
    const v = 0.12 + rand() * 0.76;
    const sinLat = Math.max(0.28, Math.sin(v * Math.PI));
    const rV = 0.030 + rand() * 0.045;
    craters.push({
      u: rand(),
      v,
      radiusV: rV,
      radiusU: (rV * 0.5) / sinLat,
      depth: 0.24 + rand() * 0.12,
      rimHeight: 0.12 + rand() * 0.05,
      centralPeak: rand() > 0.35 ? 0.11 + rand() * 0.05 : 0,
      hasRays: i < 5,
      raySeed: rand() * 100,
    });
  }
  // Medium complex craters
  for (let i = 0; i < 130; i++) {
    const v = 0.08 + rand() * 0.84;
    const sinLat = Math.max(0.25, Math.sin(v * Math.PI));
    const rV = 0.010 + rand() * 0.020;
    craters.push({
      u: rand(),
      v,
      radiusV: rV,
      radiusU: (rV * 0.5) / sinLat,
      depth: 0.14 + rand() * 0.09,
      rimHeight: 0.075 + rand() * 0.04,
      centralPeak: rand() > 0.7 ? 0.055 : 0,
      hasRays: i < 6,
      raySeed: rand() * 100,
    });
  }
  // Small crisp bowl craters
  for (let i = 0; i < 380; i++) {
    const v = 0.06 + rand() * 0.88;
    const sinLat = Math.max(0.22, Math.sin(v * Math.PI));
    const rV = 0.004 + rand() * 0.007;
    craters.push({
      u: rand(),
      v,
      radiusV: rV,
      radiusU: (rV * 0.5) / sinLat,
      depth: 0.08 + rand() * 0.06,
      rimHeight: 0.04 + rand() * 0.025,
      centralPeak: 0,
      hasRays: false,
      raySeed: 0,
    });
  }
  // Fine secondary micro-pitting craters
  for (let i = 0; i < 700; i++) {
    const v = 0.05 + rand() * 0.90;
    const sinLat = Math.max(0.2, Math.sin(v * Math.PI));
    const rV = 0.0018 + rand() * 0.0028;
    craters.push({
      u: rand(),
      v,
      radiusV: rV,
      radiusU: (rV * 0.5) / sinLat,
      depth: 0.05 + rand() * 0.04,
      rimHeight: 0.025 + rand() * 0.015,
      centralPeak: 0,
      hasRays: false,
      raySeed: 0,
    });
  }

  const ejectaBright = new Float32Array(W * H);

  for (const c of craters) {
    const outerMult = c.hasRays ? 3.4 : 1.55;
    const minPx = Math.floor((c.u - c.radiusU * outerMult) * W);
    const maxPx = Math.ceil((c.u + c.radiusU * outerMult) * W);
    const minPy = Math.max(0, Math.floor((c.v - c.radiusV * outerMult) * H));
    const maxPy = Math.min(H - 1, Math.ceil((c.v + c.radiusV * outerMult) * H));

    for (let py = minPy; py <= maxPy; py++) {
      const dv = (py / H - c.v) / c.radiusV;
      for (let rawPx = minPx; rawPx <= maxPx; rawPx++) {
        const px = ((rawPx % W) + W) % W;
        let duRaw = rawPx / W - c.u;
        if (duRaw > 0.5) duRaw -= 1;
        if (duRaw < -0.5) duRaw += 1;
        const du = duRaw / c.radiusU;

        const r = Math.hypot(du, dv);
        if (r > outerMult) continue;

        const idx = py * W + px;
        if (r < 1.0) {
          // Parabolic crater bowl
          const bowl = (r * r - 1.0) * c.depth;
          // Raised crater wall near r=1.0
          const rim = Math.exp(-Math.pow((r - 0.96) / 0.13, 2)) * c.rimHeight;
          // Optional central rebound peak
          const peak = c.centralPeak > 0 ? Math.exp(-(r * r) / 0.035) * c.centralPeak : 0;
          heightField[idx] += bowl + rim + peak;
          if (r > 0.85) {
            ejectaBright[idx] = Math.min(1, ejectaBright[idx] + 0.25);
          }
        } else if (r < 1.55) {
          // Outer ejecta apron tapering down cleanly into surrounding regolith
          const t = (r - 1.0) / 0.55;
          const rimFalloff = (1 - t) * (1 - t) * c.rimHeight * 0.85;
          heightField[idx] += rimFalloff;
          ejectaBright[idx] = Math.min(1, ejectaBright[idx] + (1 - t) * 0.28);
        }

        // Copernican / Tycho radial bright ejecta rays
        if (c.hasRays && r > 0.95 && r < outerMult) {
          const ang = Math.atan2(dv, du);
          const streak =
            Math.pow(Math.max(0, Math.sin(ang * 7 + c.raySeed) * 0.5 + Math.cos(ang * 13 - c.raySeed * 1.7) * 0.5), 2);
          const fade = Math.max(0, 1 - (r - 0.95) / (outerMult - 0.95));
          ejectaBright[idx] = Math.min(1, ejectaBright[idx] + streak * fade * 0.44);
        }
      }
    }
  }

  // Clamp heightfield to [0, 1]
  for (let i = 0; i < heightField.length; i++) {
    heightField[i] = Math.max(0.02, Math.min(0.98, heightField[i]));
  }

  // 3. Build Albedo, Displacement, Roughness & Sobel Normal CanvasTextures
  const albedoCanvas = document.createElement('canvas');
  albedoCanvas.width = W;
  albedoCanvas.height = H;
  const albedoCtx = albedoCanvas.getContext('2d')!;
  const albedoImg = albedoCtx.createImageData(W, H);

  const dispCanvas = document.createElement('canvas');
  dispCanvas.width = W;
  dispCanvas.height = H;
  const dispCtx = dispCanvas.getContext('2d')!;
  const dispImg = dispCtx.createImageData(W, H);

  const roughCanvas = document.createElement('canvas');
  roughCanvas.width = W;
  roughCanvas.height = H;
  const roughCtx = roughCanvas.getContext('2d')!;
  const roughImg = roughCtx.createImageData(W, H);

  const normCanvas = document.createElement('canvas');
  normCanvas.width = W;
  normCanvas.height = H;
  const normCtx = normCanvas.getContext('2d')!;
  const normImg = normCtx.createImageData(W, H);

  const normalStrength = 5.4;

  for (let py = 0; py < H; py++) {
    const pyUp = Math.max(0, py - 1);
    const pyDn = Math.min(H - 1, py + 1);
    for (let px = 0; px < W; px++) {
      const pxL = (px - 1 + W) % W;
      const pxR = (px + 1) % W;
      const idx = py * W + px;
      const p4 = idx * 4;

      const hVal = heightField[idx];
      const mare = mareField[idx];
      const ray = ejectaBright[idx];
      const u = px / W;
      const v = py / H;
      const micro = n4(u, v);
      const grit = n5(u, v);

      // True NASA lunar regolith albedo (slate-charcoal maria ~55..78, anorthosite highlands ~105..140, rays ~178)
      const baseTone = 118 - mare * 54 + (hVal - 0.5) * 52 + (micro - 0.5) * 26 + (grit - 0.5) * 18 + ray * 62;
      const rCol = Math.max(28, Math.min(212, Math.round(baseTone * (1.01 - mare * 0.03))));
      const gCol = Math.max(28, Math.min(210, Math.round(baseTone * (0.99 - mare * 0.01))));
      const bCol = Math.max(30, Math.min(208, Math.round(baseTone * (0.96 + mare * 0.02))));

      albedoImg.data[p4] = rCol;
      albedoImg.data[p4 + 1] = gCol;
      albedoImg.data[p4 + 2] = bCol;
      albedoImg.data[p4 + 3] = 255;

      // Displacement grayscale
      const dispByte = Math.max(0, Math.min(255, Math.round(hVal * 255)));
      dispImg.data[p4] = dispByte;
      dispImg.data[p4 + 1] = dispByte;
      dispImg.data[p4 + 2] = dispByte;
      dispImg.data[p4 + 3] = 255;

      // Roughness grayscale (mare basalt ~0.84, powdery highlands ~0.96)
      const roughVal = Math.max(0.76, Math.min(0.98, 0.94 - mare * 0.09 + (micro - 0.5) * 0.08));
      const roughByte = Math.round(roughVal * 255);
      roughImg.data[p4] = roughByte;
      roughImg.data[p4 + 1] = roughByte;
      roughImg.data[p4 + 2] = roughByte;
      roughImg.data[p4 + 3] = 255;

      // Sobel gradient for Tangent-Space Normal Map
      const tl = heightField[pyUp * W + pxL];
      const t = heightField[pyUp * W + px];
      const tr = heightField[pyUp * W + pxR];
      const l = heightField[py * W + pxL];
      const rH = heightField[py * W + pxR];
      const bl = heightField[pyDn * W + pxL];
      const b = heightField[pyDn * W + px];
      const br = heightField[pyDn * W + pxR];

      const dX = tr + 2 * rH + br - (tl + 2 * l + bl);
      const dY = bl + 2 * b + br - (tl + 2 * t + tr);

      let nx = -dX * normalStrength;
      let ny = -dY * normalStrength;
      let nz = 1.0;
      const len = Math.hypot(nx, ny, nz) || 1;
      nx /= len;
      ny /= len;
      nz /= len;

      normImg.data[p4] = Math.round((nx * 0.5 + 0.5) * 255);
      normImg.data[p4 + 1] = Math.round((ny * 0.5 + 0.5) * 255);
      normImg.data[p4 + 2] = Math.round((nz * 0.5 + 0.5) * 255);
      normImg.data[p4 + 3] = 255;
    }
  }

  albedoCtx.putImageData(albedoImg, 0, 0);
  dispCtx.putImageData(dispImg, 0, 0);
  roughCtx.putImageData(roughImg, 0, 0);
  normCtx.putImageData(normImg, 0, 0);

  const albedoMap = new THREE.CanvasTexture(albedoCanvas);
  albedoMap.colorSpace = THREE.SRGBColorSpace;
  albedoMap.wrapS = THREE.RepeatWrapping;
  albedoMap.anisotropy = maxAnisotropy;

  const displacementMap = new THREE.CanvasTexture(dispCanvas);
  displacementMap.wrapS = THREE.RepeatWrapping;
  displacementMap.anisotropy = maxAnisotropy;

  const normalMap = new THREE.CanvasTexture(normCanvas);
  normalMap.wrapS = THREE.RepeatWrapping;
  normalMap.anisotropy = maxAnisotropy;

  const roughnessMap = new THREE.CanvasTexture(roughCanvas);
  roughnessMap.wrapS = THREE.RepeatWrapping;
  roughnessMap.anisotropy = maxAnisotropy;

  return {
    albedoMap,
    displacementMap,
    normalMap,
    roughnessMap,
    dispose: () => {
      albedoMap.dispose();
      displacementMap.dispose();
      normalMap.dispose();
      roughnessMap.dispose();
    },
  };
}

/**
 * Generates an Earth texture with oceans, continents, polar caps, and swirling cloud bands
 * for realistic Artemis orbital horizon ambiance.
 */
export function createEarthTexture(maxAnisotropy = 4): THREE.CanvasTexture {
  const W = 512;
  const H = 256;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  const oceanGrad = ctx.createLinearGradient(0, 0, 0, H);
  oceanGrad.addColorStop(0, '#1e4e8c');
  oceanGrad.addColorStop(0.5, '#0b356e');
  oceanGrad.addColorStop(1, '#1e4e8c');
  ctx.fillStyle = oceanGrad;
  ctx.fillRect(0, 0, W, H);

  const n1 = makeSeamlessNoise(10, 5, 707);
  const n2 = makeSeamlessNoise(24, 12, 808);
  const img = ctx.getImageData(0, 0, W, H);

  for (let py = 0; py < H; py++) {
    const v = py / (H - 1);
    const polar = Math.abs(v - 0.5) * 2;
    for (let px = 0; px < W; px++) {
      const u = px / W;
      const p4 = (py * W + px) * 4;

      const cont = n1(u, v) * 0.65 + n2(u, v) * 0.35;
      const cloud = n2(u + 0.3, v + 0.1) * 0.7 + n1(u + 0.5, v) * 0.3;

      let r = img.data[p4];
      let g = img.data[p4 + 1];
      let b = img.data[p4 + 2];

      if (polar > 0.87) {
        r = 235;
        g = 242;
        b = 248;
      } else if (cont > 0.54) {
        const desert = Math.max(0, 1 - Math.abs(polar - 0.35) * 3.5);
        r = Math.round(52 + desert * 115);
        g = Math.round(108 + desert * 45);
        b = Math.round(54 + desert * 25);
      }

      if (cloud > 0.58) {
        const a = Math.min(0.88, (cloud - 0.58) * 3.2);
        r = Math.round(r * (1 - a) + 245 * a);
        g = Math.round(g * (1 - a) + 248 * a);
        b = Math.round(b * (1 - a) + 255 * a);
      }

      img.data[p4] = r;
      img.data[p4 + 1] = g;
      img.data[p4 + 2] = b;
    }
  }

  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}
