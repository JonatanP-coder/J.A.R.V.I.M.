import * as THREE from 'three';
import { SpacecraftComponent } from '../types/mission';

/**
 * Procedural 3D model builders for each spacecraft component.
 * Every option in every category has a distinct, mechanically plausible,
 * and visually identifiable procedural 3D model.
 */

export function createSolarCellTexture(maxAnisotropy = 4): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#0a1936';
  ctx.fillRect(0, 0, 512, 512);

  const cols = 8;
  const rows = 16;
  const cellW = 512 / cols;
  const cellH = 512 / rows;

  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      ctx.fillStyle = (c + r) % 2 === 0 ? '#11295c' : '#0c2049';
      ctx.fillRect(c * cellW + 2, r * cellH + 2, cellW - 4, cellH - 4);

      ctx.strokeStyle = '#2a5ba8';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(c * cellW + cellW / 2, r * cellH + 2);
      ctx.lineTo(c * cellW + cellW / 2, (r + 1) * cellH - 2);
      ctx.stroke();
    }
  }

  ctx.strokeStyle = '#e6af2e';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, 128);
  ctx.lineTo(512, 128);
  ctx.moveTo(0, 256);
  ctx.lineTo(512, 256);
  ctx.moveTo(0, 384);
  ctx.lineTo(512, 384);
  ctx.stroke();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = maxAnisotropy;
  return texture;
}

export function createGoldFoilTexture(maxAnisotropy = 4): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#d4af37';
  ctx.fillRect(0, 0, 256, 256);

  for (let i = 0; i < 500; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    const rad = Math.random() * 12 + 2;
    ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255, 230, 120, 0.2)' : 'rgba(160, 100, 20, 0.25)';
    ctx.beginPath();
    ctx.arc(x, y, rad, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = maxAnisotropy;
  return texture;
}

export interface CraftSelectionMap {
  capsule?: SpacecraftComponent;
  solar?: SpacecraftComponent;
  oxygen?: SpacecraftComponent;
  shield?: SpacecraftComponent;
  engine?: SpacecraftComponent;
  payload?: SpacecraftComponent;
}

export interface AssembledSpacecraftResult {
  spacecraftGroup: THREE.Group;
  engineMount: THREE.Group;
  dispose: () => void;
}

/**
 * Builds the complete user-assembled spacecraft (Service Module Hub + all 6 selected modules)
 * using identical geometry & materials to the Hangar assembly view.
 */
export function buildAssembledSpacecraft(
  selectedComponents: CraftSelectionMap,
  isSoftwareGl: boolean,
  maxAnisotropy = 4
): AssembledSpacecraftResult {
  const solarTexture = createSolarCellTexture(maxAnisotropy);
  const goldFoilTexture = createGoldFoilTexture(maxAnisotropy);

  const whiteSkinMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    roughness: 0.28,
    metalness: 0.35,
  });
  whiteSkinMat.userData.shared = true;

  const trimMat = new THREE.MeshStandardMaterial({
    color: 0x1f2937,
    roughness: 0.45,
    metalness: 0.7,
  });
  trimMat.userData.shared = true;

  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0x051329,
    roughness: 0.1,
    metalness: 0.9,
    clearcoat: 1.0,
    clearcoatRoughness: 0.1,
  });
  glassMat.userData.shared = true;

  const metalMat = new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    roughness: 0.35,
    metalness: 0.85,
  });
  metalMat.userData.shared = true;

  const spacecraftGroup = new THREE.Group();

  const serviceGeom = new THREE.CylinderGeometry(1.15, 1.15, 0.9, 24);
  const serviceMesh = new THREE.Mesh(serviceGeom, trimMat);
  serviceMesh.position.y = -1.0;
  serviceMesh.castShadow = !isSoftwareGl;
  spacecraftGroup.add(serviceMesh);

  const capsuleMount = new THREE.Group();
  capsuleMount.position.y = 0;
  capsuleMount.add(
    buildCapsule(
      selectedComponents.capsule?.id || 'capsula-orion-jr',
      { whiteSkin: whiteSkinMat, trim: trimMat, glass: glassMat, metal: metalMat },
      isSoftwareGl
    )
  );

  const solarMount = new THREE.Group();
  solarMount.position.y = -1.0;
  solarMount.add(
    buildSolar(
      selectedComponents.solar?.id || 'paneles-rosa-desplegables',
      { solarTexture },
      { trim: trimMat, metal: metalMat },
      isSoftwareGl
    )
  );

  const oxygenMount = new THREE.Group();
  oxygenMount.position.y = -1.0;
  oxygenMount.add(
    buildOxygen(
      selectedComponents.oxygen?.id || 'oxigeno-criogenico-doble',
      { goldFoilTexture },
      { trim: trimMat, metal: metalMat },
      isSoftwareGl
    )
  );

  const shieldMount = new THREE.Group();
  shieldMount.position.y = -1.55;
  shieldMount.add(
    buildShield(
      selectedComponents.shield?.id || 'escudo-pica-x',
      { metal: metalMat },
      isSoftwareGl
    )
  );

  const engineMount = new THREE.Group();
  engineMount.position.y = -1.55;
  engineMount.add(
    buildEngine(
      selectedComponents.engine?.id || 'motor-bipropelente-merlin',
      { trim: trimMat, metal: metalMat },
      isSoftwareGl
    )
  );

  const payloadMount = new THREE.Group();
  payloadMount.position.y = -1.0;
  payloadMount.add(
    buildPayload(
      selectedComponents.payload?.id || 'payload-radar-atmosferico',
      { trim: trimMat, metal: metalMat },
      isSoftwareGl
    )
  );

  spacecraftGroup.add(capsuleMount, solarMount, oxygenMount, shieldMount, engineMount, payloadMount);

  const dispose = () => {
    disposeHierarchy(spacecraftGroup);
    solarTexture.dispose();
    goldFoilTexture.dispose();
    whiteSkinMat.dispose();
    trimMat.dispose();
    glassMat.dispose();
    metalMat.dispose();
  };

  return { spacecraftGroup, engineMount, dispose };
}

export function disposeHierarchy(obj: THREE.Object3D) {
  obj.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh;
      if (mesh.geometry) {
        mesh.geometry.dispose();
      }
      if (mesh.material) {
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((m) => {
            if (!m.userData?.shared) m.dispose();
          });
        } else if (!mesh.material.userData?.shared) {
          mesh.material.dispose();
        }
      }
    }
  });
  while (obj.children.length > 0) {
    obj.remove(obj.children[0]);
  }
}

// -------------------------------------------------------------
// 1. CABINA / MANDO (Capsules)
// -------------------------------------------------------------
export function buildCapsule(
  id: string,
  materials: {
    whiteSkin: THREE.Material;
    trim: THREE.Material;
    glass: THREE.Material;
    metal: THREE.Material;
  },
  isSoftwareGl: boolean
): THREE.Group {
  const group = new THREE.Group();

  if (id === 'modulo-apolo-nextgen') {
    // Apollo NextGen: Metallic brushed cone, Launch Escape Tower (LES) on apex, round portholes
    const apoloMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      metalness: 0.85,
      roughness: 0.22,
    });

    // Main cone body
    const coneGeom = new THREE.CylinderGeometry(0.42, 1.12, 1.3, 24);
    const body = new THREE.Mesh(coneGeom, apoloMat);
    body.castShadow = !isSoftwareGl;
    group.add(body);

    // Corrugated base ring
    const ringGeom = new THREE.CylinderGeometry(1.14, 1.16, 0.16, 24);
    const ring = new THREE.Mesh(ringGeom, materials.trim);
    ring.position.y = -0.65;
    group.add(ring);

    // Circular portholes (3 eyes around front)
    const portholeGeom = new THREE.CylinderGeometry(0.1, 0.1, 0.08, 16);
    const p1 = new THREE.Mesh(portholeGeom, materials.glass);
    p1.rotation.set(-0.35, 0, 0);
    p1.position.set(0, 0.25, 0.72);

    const p2 = new THREE.Mesh(portholeGeom, materials.glass);
    p2.rotation.set(-0.35, 0.6, 0);
    p2.position.set(0.48, 0.25, 0.55);

    const p3 = new THREE.Mesh(portholeGeom, materials.glass);
    p3.rotation.set(-0.35, -0.6, 0);
    p3.position.set(-0.48, 0.25, 0.55);

    group.add(p1, p2, p3);

    // Launch Escape System (LES) Tower on top
    const towerApex = new THREE.Group();
    towerApex.position.y = 0.65;

    // 4 lattice angled struts
    for (let i = 0; i < 4; i++) {
      const angle = (i * Math.PI) / 2 + Math.PI / 4;
      const strutGeom = new THREE.CylinderGeometry(0.02, 0.02, 0.8, 8);
      const strut = new THREE.Mesh(strutGeom, materials.trim);
      strut.position.set(Math.cos(angle) * 0.15, 0.4, Math.sin(angle) * 0.15);
      strut.rotation.z = Math.cos(angle) * 0.18;
      strut.rotation.x = Math.sin(angle) * 0.18;
      towerApex.add(strut);
    }

    // Escape motor tip and tiny steering canards
    const motorTipGeom = new THREE.CylinderGeometry(0.08, 0.05, 0.35, 12);
    const motorTip = new THREE.Mesh(motorTipGeom, materials.trim);
    motorTip.position.y = 0.85;
    towerApex.add(motorTip);

    const noseConeGeom = new THREE.ConeGeometry(0.08, 0.2, 12);
    const noseCone = new THREE.Mesh(noseConeGeom, materials.metal);
    noseCone.position.y = 1.05;
    towerApex.add(noseCone);

    group.add(towerApex);

  } else if (id === 'cabina-dragon-explorer') {
    // Dragon Explorer: Futuristic curved lifting-body capsule, large panoramic wraparound visor, SuperDraco nacelles
    const dragonMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      metalness: 0.2,
      roughness: 0.18,
    });

    // Parabolic aerodynamic upper fuselage
    const bodyGeom = new THREE.CylinderGeometry(0.3, 1.22, 1.35, 24);
    const body = new THREE.Mesh(bodyGeom, dragonMat);
    body.castShadow = !isSoftwareGl;
    group.add(body);

    // Nose cap (soft curved nose)
    const noseGeom = new THREE.SphereGeometry(0.32, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2);
    const nose = new THREE.Mesh(noseGeom, dragonMat);
    nose.position.y = 0.675;
    group.add(nose);

    // Large Panoramic Visor (black glossy glass)
    const visorGeom = new THREE.CylinderGeometry(0.55, 0.82, 0.35, 16, 1, false, -Math.PI / 2.6, Math.PI / 1.3);
    const visor = new THREE.Mesh(visorGeom, materials.glass);
    visor.position.set(0, 0.28, 0.22);
    group.add(visor);

    // Dual SuperDraco thruster nacelles on left and right flanks
    [-1, 1].forEach((side) => {
      const nacelleGeom = new THREE.CylinderGeometry(0.12, 0.16, 0.5, 12);
      const nacelle = new THREE.Mesh(nacelleGeom, materials.trim);
      nacelle.position.set(side * 1.05, -0.2, 0);
      nacelle.rotation.z = side * -0.25;

      // Twin micro nozzles angled downward
      const n1 = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.12, 8), materials.metal);
      n1.position.set(0, -0.28, 0.05);
      n1.rotation.x = Math.PI;
      const n2 = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.12, 8), materials.metal);
      n2.position.set(0, -0.28, -0.05);
      n2.rotation.x = Math.PI;
      nacelle.add(n1, n2);

      group.add(nacelle);
    });

    // Aerodynamic strakes/fins at base
    [-1, 1].forEach((side) => {
      const finGeom = new THREE.BoxGeometry(0.25, 0.45, 0.04);
      const fin = new THREE.Mesh(finGeom, materials.trim);
      fin.position.set(side * 1.15, -0.55, -0.3);
      fin.rotation.z = side * 0.3;
      group.add(fin);
    });

  } else {
    // Default / Orion Jr: Classic Orion capsule with docking ring, twin trapezoidal windows, and RCS quads
    const coneGeom = new THREE.CylinderGeometry(0.55, 1.15, 1.25, 24);
    const capsuleMesh = new THREE.Mesh(coneGeom, materials.whiteSkin);
    capsuleMesh.castShadow = !isSoftwareGl;
    group.add(capsuleMesh);

    // Docking port
    const dockGeom = new THREE.CylinderGeometry(0.32, 0.35, 0.25, 24);
    const dockMesh = new THREE.Mesh(dockGeom, materials.trim);
    dockMesh.position.y = 0.72;
    dockMesh.castShadow = !isSoftwareGl;
    group.add(dockMesh);

    // Cockpit Windows
    const windowGeom = new THREE.BoxGeometry(0.24, 0.14, 0.1);
    const win1 = new THREE.Mesh(windowGeom, materials.glass);
    win1.position.set(0.3, 0.2, 0.78);
    win1.rotation.set(-0.35, 0.35, 0);
    const win2 = new THREE.Mesh(windowGeom, materials.glass);
    win2.position.set(-0.3, 0.2, 0.78);
    win2.rotation.set(-0.35, -0.35, 0);
    group.add(win1, win2);

    // 4 RCS Thruster Pods around the base
    for (let i = 0; i < 4; i++) {
      const angle = (i * Math.PI) / 2;
      const rcsBlock = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.12), materials.metal);
      rcsBlock.position.set(Math.cos(angle) * 1.08, -0.4, Math.sin(angle) * 1.08);
      group.add(rcsBlock);
    }
  }

  return group;
}

// -------------------------------------------------------------
// 2. PANELES SOLARES (Solar Arrays)
// -------------------------------------------------------------
export function buildSolar(
  id: string,
  textures: { solarTexture: THREE.CanvasTexture },
  materials: { trim: THREE.Material; metal: THREE.Material },
  isSoftwareGl: boolean
): THREE.Group {
  const group = new THREE.Group();

  const solarMat = new THREE.MeshStandardMaterial({
    map: textures.solarTexture,
    roughness: 0.2,
    metalness: 0.85,
  });

  if (id === 'paneles-ultraflex-triple') {
    // UltraFlex: Circular accordion pleated fan solar discs (like Orion/Mars Phoenix/Lucy)
    [-1, 1].forEach((side) => {
      const wingGroup = new THREE.Group();
      wingGroup.position.x = side * 1.35;

      // Gimbal arm connecting to hull
      const armGeom = new THREE.CylinderGeometry(0.06, 0.06, 0.9, 12);
      const arm = new THREE.Mesh(armGeom, materials.trim);
      arm.rotation.z = Math.PI / 2;
      arm.position.x = side * 0.45;
      wingGroup.add(arm);

      // Central circular pivot hub
      const hubGeom = new THREE.CylinderGeometry(0.16, 0.16, 0.12, 16);
      const hub = new THREE.Mesh(hubGeom, materials.metal);
      hub.position.x = side * 0.9;
      hub.rotation.z = Math.PI / 2;
      wingGroup.add(hub);

      // UltraFlex 12-sided polygonal disc array
      const discGeom = new THREE.CylinderGeometry(1.2, 1.2, 0.04, 12);
      const disc = new THREE.Mesh(discGeom, solarMat);
      disc.position.x = side * 2.1;
      disc.rotation.z = Math.PI / 2;
      disc.castShadow = !isSoftwareGl;
      wingGroup.add(disc);

      // 12 Radial carbon fiber support ribs
      for (let r = 0; r < 12; r++) {
        const theta = (r * Math.PI) / 6;
        const ribGeom = new THREE.BoxGeometry(0.03, 1.15, 0.06);
        const rib = new THREE.Mesh(ribGeom, materials.trim);
        rib.position.set(side * 2.1, Math.cos(theta) * 0.58, Math.sin(theta) * 0.58);
        rib.rotation.x = theta;
        wingGroup.add(rib);
      }

      group.add(wingGroup);
    });

  } else if (id === 'micro-paneles-helio-silicio') {
    // Micro-Paneles: Compact CubeSat-style accordion Z-fold panels (3 segmented plates per side)
    [-1, 1].forEach((side) => {
      const wingGroup = new THREE.Group();
      wingGroup.position.x = side * 1.25;

      // Connecting strut
      const strutGeom = new THREE.CylinderGeometry(0.04, 0.04, 0.4, 8);
      const strut = new THREE.Mesh(strutGeom, materials.trim);
      strut.rotation.z = Math.PI / 2;
      strut.position.x = side * 0.2;
      wingGroup.add(strut);

      // 3 accordion panels
      const panelGeom = new THREE.BoxGeometry(0.48, 0.7, 0.03);
      for (let p = 0; p < 3; p++) {
        const seg = new THREE.Mesh(panelGeom, solarMat);
        seg.position.x = side * (0.55 + p * 0.52);
        // subtle accordion alternating angle
        seg.rotation.y = (p % 2 === 0 ? 0.08 : -0.08) * side;
        seg.castShadow = !isSoftwareGl;
        wingGroup.add(seg);

        // Gold hinge between panels
        if (p < 2) {
          const hingeGeom = new THREE.CylinderGeometry(0.02, 0.02, 0.65, 8);
          const hinge = new THREE.Mesh(hingeGeom, materials.metal);
          hinge.position.set(side * (0.8 + p * 0.52), 0, 0);
          wingGroup.add(hinge);
        }
      }

      // Whip antenna at tip
      const whipGeom = new THREE.CylinderGeometry(0.01, 0.01, 0.7, 6);
      const whip = new THREE.Mesh(whipGeom, materials.metal);
      whip.position.set(side * 2.15, 0.35, 0);
      whip.rotation.z = side * -0.4;
      wingGroup.add(whip);

      group.add(wingGroup);
    });

  } else {
    // ROSA (Roll-Out Solar Arrays): Rectangular thin flexible blankets with roll-out canisters
    [-1, 1].forEach((side) => {
      const wingGroup = new THREE.Group();
      wingGroup.position.x = side * 1.35;

      // Main deployment arm
      const armGeom = new THREE.CylinderGeometry(0.04, 0.04, 1.2, 8);
      const arm = new THREE.Mesh(armGeom, materials.trim);
      arm.rotation.z = Math.PI / 2;
      arm.position.x = side * 0.6;
      wingGroup.add(arm);

      // Thin rectangular solar blanket
      const blanketGeom = new THREE.BoxGeometry(2.1, 0.75, 0.03);
      const blanket = new THREE.Mesh(blanketGeom, solarMat);
      blanket.position.x = side * 1.65;
      blanket.castShadow = !isSoftwareGl;
      wingGroup.add(blanket);

      // Roll canisters at the outer tips
      const canisterGeom = new THREE.CylinderGeometry(0.07, 0.07, 0.82, 12);
      const canister = new THREE.Mesh(canisterGeom, materials.trim);
      canister.position.x = side * 2.72;
      canister.rotation.x = Math.PI / 2;
      wingGroup.add(canister);

      group.add(wingGroup);
    });
  }

  return group;
}

// -------------------------------------------------------------
// 3. SOPORTE OXYGEN / LIFE SUPPORT
// -------------------------------------------------------------
export function buildOxygen(
  id: string,
  textures: { goldFoilTexture: THREE.CanvasTexture },
  materials: { trim: THREE.Material; metal: THREE.Material },
  isSoftwareGl: boolean
): THREE.Group {
  const group = new THREE.Group();

  const goldFoilMat = new THREE.MeshStandardMaterial({
    map: textures.goldFoilTexture,
    roughness: 0.3,
    metalness: 0.9,
  });

  if (id === 'sistema-eclss-regenerativo') {
    // ECLSS: High-tech cylindrical closed-loop processor with Sabatier reactor and condenser pipes
    const silverMat = new THREE.MeshStandardMaterial({
      color: 0xcbd5e1,
      roughness: 0.25,
      metalness: 0.85,
    });

    // Central cylindrical processor
    const procGeom = new THREE.CylinderGeometry(0.42, 0.42, 0.7, 16);
    const proc = new THREE.Mesh(procGeom, silverMat);
    proc.position.set(0, 0, 0.7);
    proc.castShadow = !isSoftwareGl;
    group.add(proc);

    // Sabatier vertical condensation tube
    const tubeGeom = new THREE.CylinderGeometry(0.1, 0.1, 0.8, 12);
    const tube = new THREE.Mesh(tubeGeom, materials.metal);
    tube.position.set(0.42, 0, 0.65);
    group.add(tube);

    // Auxiliary CO2 scrubber filter pod
    const filterGeom = new THREE.BoxGeometry(0.22, 0.35, 0.25);
    const filter = new THREE.Mesh(filterGeom, materials.trim);
    filter.position.set(-0.38, 0, 0.68);
    group.add(filter);

    // Interconnect plumbing loops
    const pipeGeom = new THREE.TorusGeometry(0.25, 0.025, 8, 20);
    const pipe = new THREE.Mesh(pipeGeom, materials.metal);
    pipe.position.set(0, 0.25, 0.72);
    group.add(pipe);

  } else if (id === 'botellas-oxigeno-emergencia') {
    // Botellas de Emergencia: 4 high-pressure composite overwrapped pressure vessels (COPVs)
    const copvMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.3,
      metalness: 0.7,
    });
    const yellowStripeMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      roughness: 0.4,
    });

    const positions = [
      { x: -0.32, z: 0.72 },
      { x: -0.11, z: 0.76 },
      { x: 0.11, z: 0.76 },
      { x: 0.32, z: 0.72 },
    ];

    positions.forEach((pos) => {
      const bottleGroup = new THREE.Group();
      bottleGroup.position.set(pos.x, 0, pos.z);

      // Cylinder bottle body
      const bottleGeom = new THREE.CylinderGeometry(0.08, 0.08, 0.6, 12);
      const bottle = new THREE.Mesh(bottleGeom, copvMat);
      bottle.castShadow = !isSoftwareGl;

      // Rounded caps
      const capTop = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 8), copvMat);
      capTop.position.y = 0.3;
      const capBottom = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 8), copvMat);
      capBottom.position.y = -0.3;

      // Safety warning stripe
      const stripe = new THREE.Mesh(new THREE.CylinderGeometry(0.082, 0.082, 0.1, 12), yellowStripeMat);

      // Top brass valve regulator
      const valve = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.08, 8), materials.metal);
      valve.position.y = 0.4;

      bottleGroup.add(bottle, capTop, capBottom, stripe, valve);
      group.add(bottleGroup);
    });

    // Manifold connecting bar
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.04, 0.05), materials.trim);
    bar.position.set(0, 0.22, 0.74);
    group.add(bar);

  } else {
    // Default: Tanque Criogénico Doble Etapa (Dual gold-wrapped vacuum dewar spheres)
    const o2SphereGeom = new THREE.SphereGeometry(0.36, 16, 16);
    const tank1 = new THREE.Mesh(o2SphereGeom, goldFoilMat);
    tank1.position.set(0.55, 0, 0.65);
    tank1.castShadow = !isSoftwareGl;

    const tank2 = new THREE.Mesh(o2SphereGeom, goldFoilMat);
    tank2.position.set(-0.55, 0, 0.65);
    tank2.castShadow = !isSoftwareGl;

    // Cross-feed pipes between tanks
    const pipeGeom = new THREE.CylinderGeometry(0.03, 0.03, 1.1, 8);
    const pipe = new THREE.Mesh(pipeGeom, materials.metal);
    pipe.rotation.z = Math.PI / 2;
    pipe.position.set(0, 0, 0.65);

    // Dual cradle rings
    const cradle1 = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.02, 8, 24), materials.trim);
    cradle1.position.set(0.55, 0, 0.65);
    cradle1.rotation.y = Math.PI / 2;

    const cradle2 = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.02, 8, 24), materials.trim);
    cradle2.position.set(-0.55, 0, 0.65);
    cradle2.rotation.y = Math.PI / 2;

    group.add(tank1, tank2, pipe, cradle1, cradle2);
  }

  return group;
}

// -------------------------------------------------------------
// 4. ESCUDO TÉRMICO / RADIACIÓN (Shield & TPS)
// -------------------------------------------------------------
export function buildShield(
  id: string,
  materials: { metal: THREE.Material },
  isSoftwareGl: boolean
): THREE.Group {
  const group = new THREE.Group();

  if (id === 'blindaje-polietileno-boro') {
    // Polyethylene-Boron Shield: Segmented multi-layer hexagonal armor with gold radiation dispersion ring
    const shieldPolyMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.45,
      metalness: 0.65,
    });
    const goldRingMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      roughness: 0.25,
      metalness: 0.95,
    });

    // Outer beveled ring
    const baseDisc = new THREE.Mesh(new THREE.CylinderGeometry(1.24, 1.28, 0.24, 32), shieldPolyMat);
    baseDisc.castShadow = !isSoftwareGl;
    group.add(baseDisc);

    // Concentric gold deflector ring
    const goldRing = new THREE.Mesh(new THREE.TorusGeometry(1.05, 0.04, 8, 32), goldRingMat);
    goldRing.rotation.x = Math.PI / 2;
    goldRing.position.y = -0.11;
    group.add(goldRing);

    // Hexagonal armor nodes
    for (let h = 0; h < 6; h++) {
      const theta = (h * Math.PI) / 3;
      const hex = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.06, 6), materials.metal);
      hex.position.set(Math.cos(theta) * 0.6, -0.12, Math.sin(theta) * 0.6);
      group.add(hex);
    }

  } else if (id === 'malla-ceramica-ultraligera') {
    // Ceramic Silica TPS Blanket: White/light-grey segmented thermal tile grid (Space Shuttle style)
    const ceramicMat = new THREE.MeshStandardMaterial({
      color: 0xf1f5f9,
      roughness: 0.8,
      metalness: 0.1,
    });

    // Main silica disc
    const tileDisc = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.24, 0.16, 24), ceramicMat);
    tileDisc.castShadow = !isSoftwareGl;
    group.add(tileDisc);

    // Titanium mounting rim
    const rim = new THREE.Mesh(new THREE.TorusGeometry(1.22, 0.03, 8, 32), materials.metal);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 0.08;
    group.add(rim);

  } else {
    // PICA-X (Phenolic Impregnated Carbon Ablator): Charcoal-black concave heat shield with heavy bevel
    const picaxMat = new THREE.MeshStandardMaterial({
      color: 0x18181b,
      roughness: 0.9,
      metalness: 0.05,
    });

    const shieldMesh = new THREE.Mesh(new THREE.CylinderGeometry(1.22, 1.26, 0.22, 28), picaxMat);
    shieldMesh.castShadow = !isSoftwareGl;
    group.add(shieldMesh);

    // Beveled outer heat retention seal
    const heatSeal = new THREE.Mesh(new THREE.TorusGeometry(1.25, 0.04, 8, 32), materials.metal);
    heatSeal.rotation.x = Math.PI / 2;
    heatSeal.position.y = -0.05;
    group.add(heatSeal);
  }

  return group;
}

// -------------------------------------------------------------
// 5. MOTOR / PROPULSIÓN (Engine)
// -------------------------------------------------------------
export function buildEngine(
  id: string,
  materials: { trim: THREE.Material; metal: THREE.Material },
  isSoftwareGl: boolean
): THREE.Group {
  const group = new THREE.Group();

  if (id === 'motor-pesado-raptor') {
    // Raptor Heavy Cryogenic: Massive bell nozzle with turbopump manifolds and cyan/blue Mach-diamond glow
    const nozzleMat = new THREE.MeshStandardMaterial({
      color: 0x27272a,
      roughness: 0.25,
      metalness: 0.92,
    });
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8, // Electric cyan
    });

    // Massive gimbal gimbal mount
    const gimbal = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.55, 0.35, 16), materials.trim);
    gimbal.position.y = -0.15;
    group.add(gimbal);

    // Large fluted bell nozzle
    const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.95, 1.05, 28, 1, true), nozzleMat);
    nozzle.position.y = -0.75;
    nozzle.castShadow = !isSoftwareGl;
    group.add(nozzle);

    // Dual turbopump feed loops on sides
    [-1, 1].forEach((side) => {
      const pump = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.45, 12), materials.metal);
      pump.position.set(side * 0.5, -0.35, 0);
      group.add(pump);

      const pipe = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.03, 8, 16), materials.metal);
      pipe.position.set(side * 0.42, -0.55, 0);
      pipe.rotation.y = Math.PI / 2;
      group.add(pipe);
    });

    // Intense interior plasma glow disc
    const glow = new THREE.Mesh(new THREE.CircleGeometry(0.38, 16), glowMat);
    glow.rotation.x = Math.PI / 2;
    glow.position.y = -0.35;
    group.add(glow);

  } else if (id === 'propulsor-ionico-hall') {
    // Hall-Effect Ion Thruster: Annular magnetic channel with xenon injector and neon violet-blue plasma
    const thrusterBodyMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.35,
      metalness: 0.8,
    });
    const ionGlowMat = new THREE.MeshBasicMaterial({
      color: 0x818cf8, // Indigo / violet-blue plasma
    });

    // Main cylindrical housing
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.58, 0.4, 20), thrusterBodyMat);
    body.position.y = -0.2;
    group.add(body);

    // Central magnetic core
    const core = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.42, 16), materials.metal);
    core.position.y = -0.2;
    group.add(core);

    // Outer annular cathode discharge ring
    const plasmaRing = new THREE.Mesh(new THREE.RingGeometry(0.2, 0.46, 24), ionGlowMat);
    plasmaRing.rotation.x = Math.PI / 2;
    plasmaRing.position.y = -0.41;
    group.add(plasmaRing);

    // Hollow cathode emitter bracket mounted at rim
    const cathode = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.22, 8), materials.metal);
    cathode.position.set(0.48, -0.32, 0.2);
    cathode.rotation.z = -0.3;
    group.add(cathode);

  } else {
    // Merlin Medium Bipropellant: High-expansion vacuum bell with niobium metallic sheen and amber glow
    const merlinMat = new THREE.MeshStandardMaterial({
      color: 0x3f3f46,
      roughness: 0.3,
      metalness: 0.88,
    });
    const amberGlowMat = new THREE.MeshBasicMaterial({
      color: 0xf97316, // Orange/amber flame
    });

    const gimbal = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.4, 0.28, 16), materials.trim);
    gimbal.position.y = -0.14;
    group.add(gimbal);

    const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.76, 0.85, 24, 1, true), merlinMat);
    nozzle.position.y = -0.65;
    nozzle.castShadow = !isSoftwareGl;
    group.add(nozzle);

    // Side turbine gas exhaust duct
    const exhaustDuct = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.8, 10), materials.metal);
    exhaustDuct.position.set(0.45, -0.65, 0.2);
    exhaustDuct.rotation.z = -0.15;
    group.add(exhaustDuct);

    // Amber interior glow
    const glow = new THREE.Mesh(new THREE.CircleGeometry(0.28, 16), amberGlowMat);
    glow.rotation.x = Math.PI / 2;
    glow.position.y = -0.3;
    group.add(glow);
  }

  return group;
}

// -------------------------------------------------------------
// 6. CARGA CIENTÍFICA (Payload)
// -------------------------------------------------------------
export function buildPayload(
  id: string,
  materials: { trim: THREE.Material; metal: THREE.Material },
  isSoftwareGl: boolean
): THREE.Group {
  const group = new THREE.Group();

  if (id === 'payload-rover-autonomo') {
    // Autonomous Rover: Folded 6-wheeled robotic rover platform mounted in service bay
    const chassisMat = new THREE.MeshStandardMaterial({
      color: 0xd4d4d8,
      roughness: 0.4,
      metalness: 0.6,
    });
    const wheelMat = new THREE.MeshStandardMaterial({
      color: 0x18181b,
      roughness: 0.6,
      metalness: 0.8,
    });

    // Deployable pallet frame
    const pallet = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.08, 0.65), materials.trim);
    pallet.position.set(0, 0, -0.8);
    group.add(pallet);

    // Rover central chassis body
    const chassis = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.22, 0.5), chassisMat);
    chassis.position.set(0, 0.15, -0.8);
    chassis.castShadow = !isSoftwareGl;
    group.add(chassis);

    // 6 Folded cleated wheels
    const wheelPositions = [
      { x: -0.3, z: -0.6 },
      { x: -0.3, z: -0.8 },
      { x: -0.3, z: -1.0 },
      { x: 0.3, z: -0.6 },
      { x: 0.3, z: -0.8 },
      { x: 0.3, z: -1.0 },
    ];

    wheelPositions.forEach((wp) => {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.06, 12), wheelMat);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(wp.x, 0.06, wp.z);
      group.add(wheel);
    });

    // Folded camera mast with Pancam stereo eyes
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.35, 8), materials.metal);
    mast.position.set(0.12, 0.35, -0.7);
    const cameraHead = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.06, 0.08), materials.trim);
    cameraHead.position.set(0.12, 0.52, -0.7);
    group.add(mast, cameraHead);

  } else if (id === 'payload-mini-telescopio') {
    // Mini Deep Space Telescope: High-resolution Cassegrain barrel with gold segmented mirror inside and sun baffle
    const barrelMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.2,
      metalness: 0.85,
    });
    const goldMirrorMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      roughness: 0.1,
      metalness: 0.98,
    });

    // Angled telescope mount arm
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.45, 8), materials.trim);
    arm.position.set(0, -0.15, -0.75);
    arm.rotation.x = -0.5;
    group.add(arm);

    // Cylindrical optical tube
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.75, 20, 1, true), barrelMat);
    barrel.position.set(0, 0.15, -1.05);
    barrel.rotation.x = -0.7;
    barrel.castShadow = !isSoftwareGl;
    group.add(barrel);

    // Gold primary mirror disc inside bottom of barrel
    const mirror = new THREE.Mesh(new THREE.CircleGeometry(0.24, 16), goldMirrorMat);
    mirror.position.set(0, -0.08, -0.9);
    mirror.rotation.x = -0.7;
    group.add(mirror);

    // 4-Vane spider supporting central secondary mirror
    const spider = new THREE.Mesh(new THREE.RingGeometry(0.05, 0.26, 4), materials.metal);
    spider.position.set(0, 0.32, -1.18);
    spider.rotation.x = -0.7;
    group.add(spider);

  } else {
    // Default / Radar Atmosférico: Dual deployable SAR antenna dipole booms and spectrometer pod
    const podMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.35,
      metalness: 0.7,
    });

    // Central avionics pod
    const pod = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.35, 0.35), podMat);
    pod.position.set(0, 0, -0.85);
    pod.castShadow = !isSoftwareGl;
    group.add(pod);

    // Dual deployable radar booms extending outward horizontally
    [-1, 1].forEach((side) => {
      const boom = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.6, 8), materials.metal);
      boom.rotation.z = Math.PI / 2;
      boom.position.set(side * 1.0, 0, -0.85);
      group.add(boom);

      // Antenna tip transmitter balls
      const tip = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), materials.trim);
      tip.position.set(side * 1.8, 0, -0.85);
      group.add(tip);
    });

    // Parabolic antenna dish
    const dish = new THREE.Mesh(
      new THREE.SphereGeometry(0.38, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2.5),
      new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.4, metalness: 0.6, side: THREE.DoubleSide })
    );
    dish.position.set(0, 0.25, -1.05);
    dish.rotation.x = 2.2;
    group.add(dish);
  }

  return group;
}
