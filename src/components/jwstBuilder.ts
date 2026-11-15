import * as THREE from 'three';

export interface JWSTBuildResult {
  group: THREE.Group;
  hexagons: THREE.Mesh[];
  sunshieldLayers: THREE.Mesh[];
  secondaryMirrorGroup: THREE.Group;
  dispose: () => void;
}

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

/**
 * Procedural Kapton membrane height/crinkle texture (radial creases & thermal foil micro-wrinkles).
 */
function createKaptonBumpTexture(maxAnisotropy: number): {
  bumpMap: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
} {
  const W = 512;
  const H = 512;
  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = W;
  bumpCanvas.height = H;
  const bCtx = bumpCanvas.getContext('2d')!;

  const roughCanvas = document.createElement('canvas');
  roughCanvas.width = W;
  roughCanvas.height = H;
  const rCtx = roughCanvas.getContext('2d')!;

  bCtx.fillStyle = '#808080';
  bCtx.fillRect(0, 0, W, H);
  rCtx.fillStyle = '#383838';
  rCtx.fillRect(0, 0, W, H);

  const rand = mulberry32(20211225);
  const cx = W * 0.5;
  const cy = H * 0.44;

  // Radial tension creases emanating from the central deployable tower hub
  for (let i = 0; i < 84; i++) {
    const angle = (i / 84) * Math.PI * 2 + (rand() - 0.5) * 0.05;
    const len = 140 + rand() * 190;
    const bright = rand() > 0.48;
    const alpha = 0.08 + rand() * 0.16;

    bCtx.strokeStyle = bright ? `rgba(245,245,245,${alpha})` : `rgba(30,30,30,${alpha})`;
    bCtx.lineWidth = 1.2 + rand() * 3.2;
    bCtx.beginPath();
    bCtx.moveTo(cx + Math.cos(angle) * 28, cy + Math.sin(angle) * 28);
    const midR = 70 + rand() * 60;
    const sway = (rand() - 0.5) * 0.14;
    bCtx.quadraticCurveTo(
      cx + Math.cos(angle + sway) * midR,
      cy + Math.sin(angle + sway) * midR,
      cx + Math.cos(angle) * len,
      cy + Math.sin(angle) * len
    );
    bCtx.stroke();

    rCtx.strokeStyle = bright ? 'rgba(90,90,90,0.18)' : 'rgba(22,22,22,0.16)';
    rCtx.lineWidth = bCtx.lineWidth;
    rCtx.beginPath();
    rCtx.moveTo(cx + Math.cos(angle) * 28, cy + Math.sin(angle) * 28);
    rCtx.lineTo(cx + Math.cos(angle) * len, cy + Math.sin(angle) * len);
    rCtx.stroke();
  }

  // Subtle horizontal membrane seam lines across the kite
  for (let s = 1; s < 10; s++) {
    const y = (s / 10) * H;
    bCtx.strokeStyle = 'rgba(210,210,210,0.14)';
    bCtx.lineWidth = 1.2;
    bCtx.beginPath();
    bCtx.moveTo(0, y);
    bCtx.lineTo(W, y);
    bCtx.stroke();
  }

  const bumpMap = new THREE.CanvasTexture(bumpCanvas);
  bumpMap.colorSpace = THREE.NoColorSpace;
  bumpMap.anisotropy = maxAnisotropy;

  const roughnessMap = new THREE.CanvasTexture(roughCanvas);
  roughnessMap.colorSpace = THREE.NoColorSpace;
  roughnessMap.anisotropy = maxAnisotropy;

  return { bumpMap, roughnessMap };
}

/**
 * Crinkled black carbon/MLI thermal blanket texture for the JWST OTE backplane frill & shroud.
 */
function createCrinkledBlackMliTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const rand = mulberry32(99104);

  ctx.fillStyle = '#505050';
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 420; i++) {
    const x1 = rand() * size;
    const y1 = rand() * size;
    const len = 8 + rand() * 26;
    const ang = rand() * Math.PI * 2;
    ctx.strokeStyle = rand() > 0.5 ? 'rgba(230,230,230,0.22)' : 'rgba(15,15,15,0.28)';
    ctx.lineWidth = 1 + rand() * 2;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x1 + Math.cos(ang) * len, y1 + Math.sin(ang) * len);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.NoColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 3);
  tex.anisotropy = maxAnisotropy;
  return tex;
}

/**
 * Builds a subdivided asymmetric kite/diamond Kapton sunshield layer geometry
 * with realistic radial tension ripples and edge catenary curvature.
 */
function createSunshieldLayerGeometry(layerIdx: number): THREE.BufferGeometry {
  const NU = 26;
  const NV = 28;
  const scale = 1.0 - (4 - layerIdx) * 0.018;
  const zAft = -3.15 * scale;
  const zBow = 3.92 * scale;
  const zWing = -0.52 * scale;
  const tWing = (zWing - zAft) / (zBow - zAft);
  const wAft = 0.86 * scale;
  const wWing = 2.58 * scale;
  const wBow = 0.54 * scale;

  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let iv = 0; iv <= NV; iv++) {
    const t = iv / NV; // 0 = aft, 1 = bow
    const z = zAft + t * (zBow - zAft);

    let halfW: number;
    if (t <= tWing) {
      const s = t / tWing;
      halfW = wAft + s * (wWing - wAft);
    } else {
      const s = (t - tWing) / (1 - tWing);
      halfW = wWing - s * (wWing - wBow);
    }

    for (let iu = 0; iu <= NU; iu++) {
      const uNorm = (iu / NU) * 2 - 1; // -1 to +1
      const x = uNorm * halfW;

      // Radial distance from hub for subtle catenary & crease relief
      const rNorm = Math.min(1.25, Math.hypot(x / wWing, (z + 0.15) / 3.6));
      const ang = Math.atan2(z + 0.15, x);
      const radialCrease = Math.sin(ang * 14 + rNorm * 3.0) * 0.014 * Math.min(1, rNorm * 1.4);
      const catenaryDroop = -0.045 * Math.pow(Math.abs(uNorm), 1.8) * Math.sin(t * Math.PI);
      const wingSweep = 0.08 * Math.pow(rNorm, 2);
      const bowCurl = layerIdx === 0 ? -0.055 * Math.pow(Math.max(0, t - 0.65) / 0.35, 1.5) : 0;

      // Perimeter vertical separation so the 5 layers visibly fan into louvers at bow & wingtips
      const edgeFactor = Math.max(Math.abs(uNorm), Math.abs(t * 2 - 1));
      const yOffset = (layerIdx - 2) * (0.025 + 0.045 * edgeFactor) + radialCrease + catenaryDroop + wingSweep + bowCurl;

      positions.push(x, yOffset, z);
      uvs.push((x / (wWing * 2)) + 0.5, (z - zAft) / (zBow - zAft));
    }
  }

  for (let iv = 0; iv < NV; iv++) {
    for (let iu = 0; iu < NU; iu++) {
      const a = iv * (NU + 1) + iu;
      const b = a + 1;
      const c = a + (NU + 1);
      const d = c + 1;
      indices.push(a, c, b);
      indices.push(b, c, d);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Builds the Phase 2 Deep Space Observatory faithfully modeled after the
 * James Webb Space Telescope (JWST) architecture in the reference image:
 * - 18 gold-coated hexagonal beryllium primary mirror segments in a honeycomb + central AOS snout
 * - Dark carbon backplane truss, crinkled perimeter MLI frill & ISIM instrument bay
 * - 3-strut deployable carbon-composite Secondary Mirror Support Structure (SMSS) & convex gold secondary mirror
 * - 5-layer diamond-kite Kapton sunshield with aluminized cold side & pinkish-violet silicon hot side,
 *   stepped bow/aft spreader louvers, stray-light baffle, and underside spacecraft bus.
 */
export function buildJWSTObservatory(
  isSoftwareGl: boolean,
  maxAnisotropy = 4
): JWSTBuildResult {
  const group = new THREE.Group();
  const hexagons: THREE.Mesh[] = [];
  const sunshieldLayers: THREE.Mesh[] = [];
  const geometriesToDispose: THREE.BufferGeometry[] = [];
  const materialsToDispose: THREE.Material[] = [];

  const { bumpMap: kaptonBumpMap, roughnessMap: kaptonRoughnessMap } = createKaptonBumpTexture(maxAnisotropy);
  const mliBumpMap = createCrinkledBlackMliTexture(maxAnisotropy);

  // Shared Dark Composite / Carbon / MLI Materials
  const carbonMat = new THREE.MeshStandardMaterial({
    color: 0x16191f,
    roughness: 0.52,
    metalness: 0.42,
  });
  const mliDarkMat = new THREE.MeshStandardMaterial({
    color: 0x151820,
    roughness: 0.52,
    metalness: 0.34,
    envMapIntensity: 0.32,
    bumpMap: mliBumpMap,
    bumpScale: 0.055,
    side: THREE.DoubleSide,
  });
  const metallicFrameMat = new THREE.MeshStandardMaterial({
    color: 0x8b95a5,
    roughness: 0.34,
    metalness: 0.85,
  });
  const busGoldMat = new THREE.MeshStandardMaterial({
    color: 0xd9a738,
    roughness: 0.32,
    metalness: 0.9,
    bumpMap: mliBumpMap,
    bumpScale: 0.025,
  });
  materialsToDispose.push(carbonMat, mliDarkMat, metallicFrameMat, busGoldMat);

  // =========================================================================
  // 1. 5-LAYER DIAMOND-KITE KAPTON SUNSHIELD
  // =========================================================================
  const sunshieldGroup = new THREE.Group();
  sunshieldGroup.position.set(0, -0.35, 0.25);

  const layerColors = [
    0xe798c5, // Layer 0 (Bottom sun-facing hot side): silicon-coated pinkish-violet Kapton
    0xb2bcc9, // Layer 1
    0xbac4d2, // Layer 2
    0xc4cddb, // Layer 3
    0xcfd7e3, // Layer 4 (Top mirror-facing cold side): crinkled aluminized silver Kapton
  ];

  for (let layer = 0; layer < 5; layer++) {
    const layerGeo = createSunshieldLayerGeometry(layer);
    geometriesToDispose.push(layerGeo);

    const isHotBottom = layer === 0;
    const layerMat = new THREE.MeshPhysicalMaterial({
      color: layerColors[layer],
      metalness: isHotBottom ? 0.85 : 0.94,
      roughness: isHotBottom ? 0.25 : 0.21,
      roughnessMap: kaptonRoughnessMap,
      bumpMap: kaptonBumpMap,
      bumpScale: 0.05,
      envMapIntensity: isHotBottom ? 0.95 : 1.15,
      iridescence: isHotBottom ? 0.5 : 0.14,
      iridescenceIOR: 1.4,
      side: THREE.DoubleSide,
    });
    materialsToDispose.push(layerMat);

    const layerMesh = new THREE.Mesh(layerGeo, layerMat);
    const restY = -0.18 + layer * 0.075;
    layerMesh.position.y = restY;
    layerMesh.userData.baseY = restY;
    layerMesh.userData.layerIdx = layer;
    layerMesh.receiveShadow = !isSoftwareGl;
    sunshieldGroup.add(layerMesh);
    sunshieldLayers.push(layerMesh);
  }

  // Front bow Unitized Pallet Structure & 5 stepped horizontal louver spreaders
  const bowAssembly = new THREE.Group();
  bowAssembly.position.set(0, -0.02, 3.88);
  const bowPostGeo = new THREE.BoxGeometry(0.06, 0.56, 0.08);
  geometriesToDispose.push(bowPostGeo);
  [-0.52, 0.52].forEach((bx) => {
    const post = new THREE.Mesh(bowPostGeo, metallicFrameMat);
    post.position.set(bx, -0.02, 0);
    post.rotation.x = 0.12;
    bowAssembly.add(post);
  });
  const louverGeo = new THREE.BoxGeometry(1.12, 0.024, 0.22);
  geometriesToDispose.push(louverGeo);
  for (let l = 0; l < 5; l++) {
    const louver = new THREE.Mesh(louverGeo, metallicFrameMat);
    louver.position.set(0, -0.22 + l * 0.11, -0.06 + (4 - l) * 0.02);
    louver.rotation.x = -0.14;
    bowAssembly.add(louver);
  }
  sunshieldGroup.add(bowAssembly);

  // Port & Starboard Wingtip Spreader Bars & Aft Stern Spreaders
  const wingCapGeo = new THREE.BoxGeometry(0.14, 0.48, 0.22);
  geometriesToDispose.push(wingCapGeo);
  [-1, 1].forEach((side) => {
    const wingCap = new THREE.Mesh(wingCapGeo, carbonMat);
    wingCap.position.set(side * 2.54, -0.05, -0.52);
    wingCap.rotation.z = side * -0.16;
    sunshieldGroup.add(wingCap);

    // Diagonal structural spreader boom under shield
    const boomGeo = new THREE.CylinderGeometry(0.028, 0.035, 2.55, 8);
    geometriesToDispose.push(boomGeo);
    const boom = new THREE.Mesh(boomGeo, carbonMat);
    boom.position.set(side * 1.25, -0.24, -0.28);
    boom.rotation.z = Math.PI / 2;
    boom.rotation.y = side * 0.18;
    sunshieldGroup.add(boom);
  });

  // Aft Momentum Trim Flap extending behind the stern edge (iconic JWST solar pressure stabilizer)
  const trimFlapGeo = new THREE.BoxGeometry(1.42, 0.03, 0.72);
  geometriesToDispose.push(trimFlapGeo);
  const trimFlap = new THREE.Mesh(trimFlapGeo, mliDarkMat);
  trimFlap.position.set(0, -0.16, -3.45);
  trimFlap.rotation.x = 0.28;
  sunshieldGroup.add(trimFlap);

  // =========================================================================
  // 2. UNDERSIDE SPACECRAFT BUS, SOLAR WING, HGA DISH & DEPLOYABLE TOWER
  // =========================================================================
  const busGroup = new THREE.Group();
  busGroup.position.set(0, -0.44, -0.35);

  const busBodyGeo = new THREE.BoxGeometry(1.18, 0.48, 1.38);
  geometriesToDispose.push(busBodyGeo);
  const busBody = new THREE.Mesh(busBodyGeo, carbonMat);
  busGroup.add(busBody);

  // Side silver & gold MLI avionics panels on the bus
  const sideBayGeo = new THREE.BoxGeometry(1.24, 0.34, 0.75);
  geometriesToDispose.push(sideBayGeo);
  const sideBay = new THREE.Mesh(sideBayGeo, busGoldMat);
  sideBay.position.set(0, -0.02, -0.15);
  busGroup.add(sideBay);

  // High-Gain Ka-band Dish Antenna below bus
  const dishGeo = new THREE.SphereGeometry(0.28, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2.6);
  geometriesToDispose.push(dishGeo);
  const dish = new THREE.Mesh(dishGeo, metallicFrameMat);
  dish.position.set(-0.38, -0.34, 0.25);
  dish.rotation.x = Math.PI * 0.82;
  busGroup.add(dish);

  // Bus Aft Solar Array Wing (angled sunward)
  const solarWingGeo = new THREE.BoxGeometry(0.46, 0.03, 1.35);
  const solarMat = new THREE.MeshStandardMaterial({
    color: 0x0f2757,
    roughness: 0.22,
    metalness: 0.8,
  });
  geometriesToDispose.push(solarWingGeo);
  materialsToDispose.push(solarMat);
  const solarWing = new THREE.Mesh(solarWingGeo, solarMat);
  solarWing.position.set(0.32, -0.32, -1.15);
  solarWing.rotation.x = 0.35;
  busGroup.add(solarWing);

  // Deployable Tower Assembly (DTA) behind mirror connecting Bus up through Sunshield to ISIM/Backplane
  const dtaGeo = new THREE.CylinderGeometry(0.15, 0.19, 1.35, 12);
  geometriesToDispose.push(dtaGeo);
  const dta = new THREE.Mesh(dtaGeo, carbonMat);
  dta.position.set(0, 0.68, -0.45);
  busGroup.add(dta);

  // Angled Stray-Light Baffle Panel right below primary mirror (visible in photo!)
  const baffleGeo = new THREE.BoxGeometry(1.18, 0.4, 0.05);
  geometriesToDispose.push(baffleGeo);
  const baffle = new THREE.Mesh(baffleGeo, mliDarkMat);
  baffle.position.set(0, 0.56, 0.32);
  baffle.rotation.x = -0.3;
  sunshieldGroup.add(baffle);

  sunshieldGroup.add(busGroup);
  group.add(sunshieldGroup);

  // =========================================================================
  // 3. OPTICAL TELESCOPE ELEMENT (OTE): 18 GOLD BEVEL HEXES + BACKPLANE + AOS
  // =========================================================================
  const oteGroup = new THREE.Group();
  oteGroup.position.set(0, 1.56, -0.15);

  const hexRadius = 0.34;
  const hexShape = new THREE.Shape();
  for (let i = 0; i < 6; i++) {
    const angle = (i * Math.PI) / 3;
    const hx = hexRadius * Math.cos(angle);
    const hy = hexRadius * Math.sin(angle);
    if (i === 0) hexShape.moveTo(hx, hy);
    else hexShape.lineTo(hx, hy);
  }
  hexShape.closePath();

  const hexGeo = new THREE.ExtrudeGeometry(hexShape, {
    depth: 0.048,
    bevelEnabled: true,
    bevelThickness: 0.011,
    bevelSize: 0.011,
    bevelSegments: 2,
  });
  hexGeo.translate(0, 0, -0.024);
  geometriesToDispose.push(hexGeo);

  // Exact 18-segment honeycomb layout in original index order (keeps misalignedIds [2,6,11,15] compatible)
  const hexCoords: [number, number][] = [
    [0, 1],
    [Math.sqrt(3) / 2, 0.5],
    [Math.sqrt(3) / 2, -0.5],
    [0, -1],
    [-Math.sqrt(3) / 2, -0.5],
    [-Math.sqrt(3) / 2, 0.5],
    [0, 2],
    [Math.sqrt(3) / 2, 1.5],
    [Math.sqrt(3), 1],
    [Math.sqrt(3), 0],
    [Math.sqrt(3), -1],
    [Math.sqrt(3) / 2, -1.5],
    [0, -2],
    [-Math.sqrt(3) / 2, -1.5],
    [-Math.sqrt(3), -1],
    [-Math.sqrt(3), 0],
    [-Math.sqrt(3), 1],
    [-Math.sqrt(3) / 2, 1.5],
  ];

  const spacing = hexRadius * 1.77;
  hexCoords.forEach(([hx, hy], idx) => {
    const px = hx * spacing;
    const py = hy * spacing;
    // Concave parabolic dish curvature toward secondary mirror focus (+Z)
    const rSq = px * px + py * py;
    const baseZ = 0.07 + rSq * 0.045;
    const baseRotY = -px * 0.072;
    const baseRotX = py * 0.072;

    const goldMat = new THREE.MeshPhysicalMaterial({
      color: 0xf7c544,
      metalness: 0.98,
      roughness: 0.09,
      clearcoat: 0.25,
      clearcoatRoughness: 0.08,
      emissive: 0x3b2600,
      emissiveIntensity: 0.16,
    });
    materialsToDispose.push(goldMat);

    const hexMesh = new THREE.Mesh(hexGeo, goldMat);
    hexMesh.position.set(px, py, baseZ);
    hexMesh.rotation.set(baseRotX, baseRotY, 0);
    hexMesh.userData = {
      segmentId: idx,
      baseRotX,
      baseRotY,
      baseZ,
    };
    hexMesh.castShadow = !isSoftwareGl;
    oteGroup.add(hexMesh);
    hexagons.push(hexMesh);
  });

  // Crinkled black OTE backplane & perimeter frill closely hugging the 18-hex honeycomb
  const frillShape = new THREE.Shape();
  const frillPoints: [number, number][] = [
    [0, 1.6],
    [0.36, 1.46],
    [0.64, 1.24],
    [1.14, 1.02],
    [1.36, 0.64],
    [1.38, -0.64],
    [1.14, -1.02],
    [0.64, -1.24],
    [0.34, -1.48],
    [0, -1.56],
    [-0.34, -1.48],
    [-0.64, -1.24],
    [-1.14, -1.02],
    [-1.38, -0.64],
    [-1.36, 0.64],
    [-1.14, 1.02],
    [-0.64, 1.24],
    [-0.36, 1.46],
  ];
  frillPoints.forEach(([fx, fy], i) => {
    if (i === 0) frillShape.moveTo(fx, fy);
    else frillShape.lineTo(fx, fy);
  });
  frillShape.closePath();

  const backplaneGeo = new THREE.ExtrudeGeometry(frillShape, {
    depth: 0.18,
    bevelEnabled: true,
    bevelThickness: 0.03,
    bevelSize: 0.04,
    bevelSegments: 1,
  });
  backplaneGeo.translate(0, 0, -0.21);
  geometriesToDispose.push(backplaneGeo);
  const backplane = new THREE.Mesh(backplaneGeo, mliDarkMat);
  oteGroup.add(backplane);

  // Upper wing hinge bracket & ISIM science instrument enclosure behind primary mirror
  const isimGeo = new THREE.BoxGeometry(1.36, 1.48, 0.72);
  geometriesToDispose.push(isimGeo);
  const isimBox = new THREE.Mesh(isimGeo, mliDarkMat);
  isimBox.position.set(0, -0.04, -0.58);
  oteGroup.add(isimBox);

  // Radiator fins on rear of ISIM
  const finGeo = new THREE.BoxGeometry(0.95, 0.03, 0.35);
  geometriesToDispose.push(finGeo);
  for (let f = 0; f < 4; f++) {
    const fin = new THREE.Mesh(finGeo, metallicFrameMat);
    fin.position.set(0, -0.45 + f * 0.3, -0.96);
    oteGroup.add(fin);
  }

  // Central Aft Optics Subsystem (AOS) dark tapered nose baffle inside the center hex cavity
  const aosGroup = new THREE.Group();
  const aosBaffleGeo = new THREE.CylinderGeometry(0.16, 0.29, 0.62, 6);
  aosBaffleGeo.rotateX(Math.PI / 2);
  geometriesToDispose.push(aosBaffleGeo);
  const aosBaffle = new THREE.Mesh(aosBaffleGeo, carbonMat);
  aosBaffle.position.set(0, 0, 0.28);
  aosGroup.add(aosBaffle);

  const aosApertureGeo = new THREE.BoxGeometry(0.17, 0.14, 0.06);
  const aosInnerMat = new THREE.MeshStandardMaterial({ color: 0x05070c, roughness: 0.1, metalness: 0.95 });
  geometriesToDispose.push(aosApertureGeo);
  materialsToDispose.push(aosInnerMat);
  const aosAperture = new THREE.Mesh(aosApertureGeo, aosInnerMat);
  aosAperture.position.set(0, 0.02, 0.58);
  aosGroup.add(aosAperture);
  oteGroup.add(aosGroup);

  // =========================================================================
  // 4. SECONDARY MIRROR SUPPORT STRUCTURE (SMSS) 3-STRUT TRIPOD & CONVEX MIRROR
  // =========================================================================
  const secondaryMirrorGroup = new THREE.Group();
  const secPos = new THREE.Vector3(0, 0.0, 3.02);
  secondaryMirrorGroup.position.copy(secPos);

  // Helper to build a sleek carbon-composite strut connecting two points
  const addStrut = (start: THREE.Vector3, end: THREE.Vector3, radius = 0.036) => {
    const dir = new THREE.Vector3().subVectors(end, start);
    const len = dir.length();
    const strutGeo = new THREE.CylinderGeometry(radius * 0.85, radius, len, 10);
    geometriesToDispose.push(strutGeo);
    const strutMesh = new THREE.Mesh(strutGeo, carbonMat);
    strutMesh.position.copy(start).add(end).multiplyScalar(0.5);
    strutMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    strutMesh.castShadow = !isSoftwareGl;
    oteGroup.add(strutMesh);
  };

  // Top center strut from top OTE apex hinge to secondary mirror top
  addStrut(new THREE.Vector3(0, 1.56, -0.02), new THREE.Vector3(0, 0.14, 3.02), 0.042);

  // Thin telemetry/antenna mast projecting slightly above top OTE hinge (distinct silhouette feature!)
  const antennaMastGeo = new THREE.CylinderGeometry(0.012, 0.016, 0.58, 8);
  geometriesToDispose.push(antennaMastGeo);
  const antennaMast = new THREE.Mesh(antennaMastGeo, carbonMat);
  antennaMast.position.set(0, 1.82, -0.18);
  antennaMast.rotation.x = -0.34;
  oteGroup.add(antennaMast);

  // Two lower angled struts from bottom outer flanks of primary mirror to secondary mirror bottom
  addStrut(new THREE.Vector3(-1.02, -1.16, -0.02), new THREE.Vector3(-0.12, -0.15, 3.0), 0.036);
  addStrut(new THREE.Vector3(1.02, -1.16, -0.02), new THREE.Vector3(0.12, -0.15, 3.0), 0.036);

  // Triangular crinkled black carbon secondary mirror housing
  const secShape = new THREE.Shape();
  secShape.moveTo(0, 0.24);
  secShape.lineTo(0.22, -0.19);
  secShape.lineTo(-0.22, -0.19);
  secShape.closePath();
  const secHousingGeo = new THREE.ExtrudeGeometry(secShape, {
    depth: 0.14,
    bevelEnabled: true,
    bevelThickness: 0.02,
    bevelSize: 0.02,
    bevelSegments: 1,
  });
  secHousingGeo.translate(0, 0, -0.07);
  geometriesToDispose.push(secHousingGeo);
  const secHousing = new THREE.Mesh(secHousingGeo, mliDarkMat);
  secondaryMirrorGroup.add(secHousing);

  // Convex Gold Secondary Mirror facing -Z back toward the primary honeycomb
  const secMirrorGeo = new THREE.SphereGeometry(0.17, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.36);
  secMirrorGeo.rotateX(-Math.PI / 2);
  geometriesToDispose.push(secMirrorGeo);
  const secMirrorMat = new THREE.MeshPhysicalMaterial({
    color: 0xf9ca4b,
    metalness: 0.99,
    roughness: 0.06,
    clearcoat: 0.3,
  });
  materialsToDispose.push(secMirrorMat);
  const secMirror = new THREE.Mesh(secMirrorGeo, secMirrorMat);
  secMirror.position.set(0, -0.02, 0.01);
  secondaryMirrorGroup.add(secMirror);

  oteGroup.add(secondaryMirrorGroup);
  group.add(oteGroup);

  const dispose = () => {
    geometriesToDispose.forEach((g) => g.dispose());
    materialsToDispose.forEach((m) => m.dispose());
    kaptonBumpMap.dispose();
    kaptonRoughnessMap.dispose();
    mliBumpMap.dispose();
  };

  return {
    group,
    hexagons,
    sunshieldLayers,
    secondaryMirrorGroup,
    dispose,
  };
}
