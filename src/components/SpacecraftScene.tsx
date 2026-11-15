import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { MissionStats, SpacecraftComponent } from '../types/mission';
import {
  computeVehicleLaunchProfile,
  createInitialLaunchTelemetry,
  LaunchTelemetry,
  stepLaunchPhysics,
} from '../utils/launchPhysics';
import {
  buildCapsule,
  buildSolar,
  buildOxygen,
  buildShield,
  buildEngine,
  buildPayload,
  createSolarCellTexture,
  createGoldFoilTexture,
  disposeHierarchy,
} from './craftBuilders';
import { createLunarTextureSet } from '../utils/lunarTextures';

interface SpacecraftSceneProps {
  selectedComponents: {
    capsule: SpacecraftComponent;
    solar: SpacecraftComponent;
    oxygen: SpacecraftComponent;
    shield: SpacecraftComponent;
    engine: SpacecraftComponent;
    payload: SpacecraftComponent;
  };
  stats?: MissionStats;
  isExploded?: boolean;
  mode?: 'title' | 'hangar' | 'launch' | 'flight';
  launchActive?: boolean;
  flightProgress?: number; // 0 to 100
  destinationType?: 'moon' | 'mars' | 'deep_space';
  cameraShake?: boolean;
  reducedMotion?: boolean;
  canvasTitle?: string;
  onLaunchTelemetry?: (telemetry: LaunchTelemetry) => void;
  onLaunchComplete?: (finalTelemetry: LaunchTelemetry) => void;
}

function createPlanetTexture(type: 'moon' | 'mars' | 'deep_space'): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  if (type === 'mars') {
    ctx.fillStyle = '#b84e27';
    ctx.fillRect(0, 0, 512, 256);
    ctx.fillStyle = '#6e2b17';
    for (let i = 0; i < 40; i++) {
      ctx.beginPath();
      ctx.arc(Math.random() * 512, Math.random() * 256, Math.random() * 40 + 10, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#f0f4f8';
    ctx.fillRect(0, 0, 512, 16);
    ctx.fillRect(0, 240, 512, 16);
  } else if (type === 'moon') {
    ctx.fillStyle = '#9aa0a6';
    ctx.fillRect(0, 0, 512, 256);
    ctx.fillStyle = '#5f6368';
    for (let i = 0; i < 25; i++) {
      ctx.beginPath();
      ctx.ellipse(Math.random() * 512, Math.random() * 256, Math.random() * 60 + 20, Math.random() * 40 + 10, Math.random() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#dadce0';
    for (let i = 0; i < 80; i++) {
      ctx.beginPath();
      ctx.arc(Math.random() * 512, Math.random() * 256, Math.random() * 8 + 2, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    ctx.fillStyle = '#101626';
    ctx.fillRect(0, 0, 512, 256);
    const grad = ctx.createRadialGradient(256, 128, 10, 256, 128, 200);
    grad.addColorStop(0, '#385585');
    grad.addColorStop(0.6, '#182747');
    grad.addColorStop(1, '#080d17');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 256);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createParticleSpriteTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(32, 32, 2, 32, 32, 30);
  grad.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
  grad.addColorStop(0.35, 'rgba(255, 255, 255, 0.75)');
  grad.addColorStop(0.7, 'rgba(255, 255, 255, 0.2)');
  grad.addColorStop(1, 'rgba(255, 255, 255, 0.0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

const DEFAULT_STATS: MissionStats = {
  weightKg: 1400,
  powerConsumedW: 350,
  powerGeneratedW: 480,
  netPowerW: 130,
  budgetUSD: 100000,
  oxygenPercent: 75,
  shieldHealthPercent: 70,
  sciencePoints: 30,
};

export const SpacecraftScene: React.FC<SpacecraftSceneProps> = ({
  selectedComponents,
  stats = DEFAULT_STATS,
  isExploded = false,
  mode = 'hangar',
  launchActive = false,
  destinationType = 'moon',
  cameraShake = false,
  reducedMotion = false,
  canvasTitle = 'Arrastra para rotar la nave espacial en 360°',
  onLaunchTelemetry,
  onLaunchComplete,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);

  // References to dynamic component sub-groups
  const subGroupsRef = useRef<{
    capsule?: THREE.Group;
    solar?: THREE.Group;
    oxygen?: THREE.Group;
    shield?: THREE.Group;
    engine?: THREE.Group;
    payload?: THREE.Group;
  }>({});

  const stateRef = useRef({
    selectedComponents,
    stats,
    isExploded,
    mode,
    launchActive,
    destinationType,
    cameraShake,
    reducedMotion,
    onLaunchTelemetry,
    onLaunchComplete,
  });

  stateRef.current = {
    selectedComponents,
    stats,
    isExploded,
    mode,
    launchActive,
    destinationType,
    cameraShake,
    reducedMotion,
    onLaunchTelemetry,
    onLaunchComplete,
  };

  const rebuilderRef = useRef<(() => void) | null>(null);

  // Trigger procedural component update when selected components change
  useEffect(() => {
    if (rebuilderRef.current) {
      rebuilderRef.current();
    }
  }, [
    selectedComponents.capsule.id,
    selectedComponents.solar.id,
    selectedComponents.oxygen.id,
    selectedComponents.shield.id,
    selectedComponents.engine.id,
    selectedComponents.payload.id,
  ]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let width = container.clientWidth || window.innerWidth;
    let height = container.clientHeight || window.innerHeight;

    const isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(mode === 'flight' ? 0x03060c : 0x070b14);
    scene.fog = new THREE.FogExp2(mode === 'flight' ? 0x03060c : 0x070b14, 0.025);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 2.2, 5.8);

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
      alpha: false,
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(renderer.domElement);

    const maxAnisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());

    // Studio Environment map via RoomEnvironment + PMREMGenerator
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const roomEnv = new RoomEnvironment();
    const envTarget = pmremGenerator.fromScene(roomEnv, 0.04);
    scene.environment = envTarget.texture;
    roomEnv.dispose();
    pmremGenerator.dispose();

    // Lighting rig
    const keyLight = new THREE.DirectionalLight(0xfff5ea, 2.8);
    keyLight.position.set(4, 8, 6);
    keyLight.castShadow = !isSoftwareGl;
    if (keyLight.shadow) {
      keyLight.shadow.mapSize.width = 1024;
      keyLight.shadow.mapSize.height = 1024;
      keyLight.shadow.camera.near = 0.5;
      keyLight.shadow.camera.far = 25;
      keyLight.shadow.camera.left = -4;
      keyLight.shadow.camera.right = 4;
      keyLight.shadow.camera.top = 4;
      keyLight.shadow.camera.bottom = -4;
      keyLight.shadow.bias = -0.0005;
      keyLight.shadow.normalBias = 0.02;
    }
    scene.add(keyLight);

    const fillLight = new THREE.HemisphereLight(0x7695bd, 0x182433, 1.2);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0x4080ff, 1.8);
    rimLight.position.set(-5, 3, -6);
    scene.add(rimLight);

    // Shared procedural textures
    const solarTexture = createSolarCellTexture(maxAnisotropy);
    const goldFoilTexture = createGoldFoilTexture(maxAnisotropy);

    // Base materials (shared across swappable components; disposed on unmount)
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

    // Root spacecraft group
    const spacecraftGroup = new THREE.Group();
    scene.add(spacecraftGroup);

    // Stationary Central Service Module Hub
    const serviceGeom = new THREE.CylinderGeometry(1.15, 1.15, 0.9, 24);
    const serviceMesh = new THREE.Mesh(serviceGeom, trimMat);
    serviceMesh.position.y = -1.0;
    serviceMesh.castShadow = !isSoftwareGl;
    spacecraftGroup.add(serviceMesh);

    // Component mounting hubs (these move during Exploded View)
    const capsuleMount = new THREE.Group();
    const solarMount = new THREE.Group();
    const oxygenMount = new THREE.Group();
    const shieldMount = new THREE.Group();
    const engineMount = new THREE.Group();
    const payloadMount = new THREE.Group();

    // Default resting positions on the spacecraft assembly
    capsuleMount.position.y = 0;
    solarMount.position.y = -1.0;
    oxygenMount.position.y = -1.0;
    shieldMount.position.y = -1.55;
    engineMount.position.y = -1.55;
    payloadMount.position.y = -1.0;

    spacecraftGroup.add(capsuleMount);
    spacecraftGroup.add(solarMount);
    spacecraftGroup.add(oxygenMount);
    spacecraftGroup.add(shieldMount);
    spacecraftGroup.add(engineMount);
    spacecraftGroup.add(payloadMount);

    subGroupsRef.current = {
      capsule: capsuleMount,
      solar: solarMount,
      oxygen: oxygenMount,
      shield: shieldMount,
      engine: engineMount,
      payload: payloadMount,
    };

    // Rebuild function that dynamically re-instantiates only the modified component
    let currentRenderedIds = {
      capsule: '',
      solar: '',
      oxygen: '',
      shield: '',
      engine: '',
      payload: '',
    };

    const rebuildComponents = () => {
      const { selectedComponents: comps } = stateRef.current;

      // 1. Capsule
      if (currentRenderedIds.capsule !== comps.capsule.id) {
        disposeHierarchy(capsuleMount);
        const newCapsule = buildCapsule(comps.capsule.id, { whiteSkin: whiteSkinMat, trim: trimMat, glass: glassMat, metal: metalMat }, isSoftwareGl);
        capsuleMount.add(newCapsule);
        currentRenderedIds.capsule = comps.capsule.id;
      }

      // 2. Solar
      if (currentRenderedIds.solar !== comps.solar.id) {
        disposeHierarchy(solarMount);
        const newSolar = buildSolar(comps.solar.id, { solarTexture }, { trim: trimMat, metal: metalMat }, isSoftwareGl);
        solarMount.add(newSolar);
        currentRenderedIds.solar = comps.solar.id;
      }

      // 3. Oxygen
      if (currentRenderedIds.oxygen !== comps.oxygen.id) {
        disposeHierarchy(oxygenMount);
        const newO2 = buildOxygen(comps.oxygen.id, { goldFoilTexture }, { trim: trimMat, metal: metalMat }, isSoftwareGl);
        oxygenMount.add(newO2);
        currentRenderedIds.oxygen = comps.oxygen.id;
      }

      // 4. Shield
      if (currentRenderedIds.shield !== comps.shield.id) {
        disposeHierarchy(shieldMount);
        const newShield = buildShield(comps.shield.id, { metal: metalMat }, isSoftwareGl);
        shieldMount.add(newShield);
        currentRenderedIds.shield = comps.shield.id;
      }

      // 5. Engine
      if (currentRenderedIds.engine !== comps.engine.id) {
        disposeHierarchy(engineMount);
        const newEngine = buildEngine(comps.engine.id, { trim: trimMat, metal: metalMat }, isSoftwareGl);
        engineMount.add(newEngine);
        currentRenderedIds.engine = comps.engine.id;
      }

      // 6. Payload
      if (currentRenderedIds.payload !== comps.payload.id) {
        disposeHierarchy(payloadMount);
        const newPayload = buildPayload(comps.payload.id, { trim: trimMat, metal: metalMat }, isSoftwareGl);
        payloadMount.add(newPayload);
        currentRenderedIds.payload = comps.payload.id;
      }
    };

    rebuilderRef.current = rebuildComponents;
    rebuildComponents(); // initial build

    // Hangar Ground Grid and Soft Radial Contact Shadow
    const groundGrid = new THREE.GridHelper(16, 16, 0x2563eb, 0x1e293b);
    groundGrid.position.y = -2.75;
    scene.add(groundGrid);

    // Procedural Contact Shadow
    const shadowCanvas = document.createElement('canvas');
    shadowCanvas.width = 128;
    shadowCanvas.height = 128;
    const shadowCtx = shadowCanvas.getContext('2d')!;
    const radGrad = shadowCtx.createRadialGradient(64, 64, 4, 64, 64, 60);
    radGrad.addColorStop(0, 'rgba(0,0,0,0.7)');
    radGrad.addColorStop(0.5, 'rgba(0,0,0,0.25)');
    radGrad.addColorStop(1, 'rgba(0,0,0,0)');
    shadowCtx.fillStyle = radGrad;
    shadowCtx.fillRect(0, 0, 128, 128);

    const shadowTex = new THREE.CanvasTexture(shadowCanvas);
    const shadowPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(4.2, 4.2),
      new THREE.MeshBasicMaterial({
        map: shadowTex,
        transparent: true,
        opacity: 0.7,
        depthWrite: false,
      })
    );
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.y = -2.73;
    scene.add(shadowPlane);

    // Starfield for Flight Mode
    const starCount = isSoftwareGl ? 300 : 900;
    const starGeom = new THREE.BufferGeometry();
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount * 3; i += 3) {
      starPositions[i] = (Math.random() - 0.5) * 80;
      starPositions[i + 1] = (Math.random() - 0.5) * 80;
      starPositions[i + 2] = (Math.random() - 0.5) * 120;
    }
    starGeom.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const starMat = new THREE.PointsMaterial({
      color: 0x93c5fd,
      size: 0.25,
      transparent: true,
      opacity: 0.85,
    });
    const starField = new THREE.Points(starGeom, starMat);
    scene.add(starField);

    // Celestial Planet Destination in Flight Mode
    const planetGeom = new THREE.SphereGeometry(3.5, 48, 48);
    let lunarTextures: ReturnType<typeof createLunarTextureSet> | null = null;
    let planetTex: THREE.CanvasTexture | null = null;
    let planetMat: THREE.MeshStandardMaterial;

    if (destinationType === 'moon') {
      lunarTextures = createLunarTextureSet(Math.min(8, renderer.capabilities.getMaxAnisotropy()));
      planetGeom.computeTangents();
      planetMat = new THREE.MeshStandardMaterial({
        map: lunarTextures.albedoMap,
        normalMap: lunarTextures.normalMap,
        normalScale: new THREE.Vector2(1.6, 1.6),
        roughnessMap: lunarTextures.roughnessMap,
        roughness: 0.9,
        metalness: 0.04,
      });
    } else {
      planetTex = createPlanetTexture(destinationType);
      planetMat = new THREE.MeshStandardMaterial({
        map: planetTex,
        roughness: 0.75,
        metalness: 0.1,
      });
    }
    const planetMesh = new THREE.Mesh(planetGeom, planetMat);
    planetMesh.position.set(12, 4, -30);
    scene.add(planetMesh);

    // Atmosphere Glow Rim
    const atmosGeom = new THREE.SphereGeometry(3.68, 32, 32);
    const atmosMat = new THREE.MeshBasicMaterial({
      color: destinationType === 'mars' ? 0xf97316 : destinationType === 'moon' ? 0x94a3b8 : 0x60a5fa,
      transparent: true,
      opacity: destinationType === 'moon' ? 0.06 : 0.22,
      side: THREE.BackSide,
    });
    const atmosMesh = new THREE.Mesh(atmosGeom, atmosMat);
    planetMesh.add(atmosMesh);

    // =========================================================================
    // LAUNCH COMPLEX 39A PAD, GANTRY TOWER & VOLUMETRIC PARTICLE SYSTEMS
    // =========================================================================
    const launchPadGroup = new THREE.Group();
    scene.add(launchPadGroup);

    // Coastal launch cape terrain horizon
    const capeTerrainGeo = new THREE.CircleGeometry(140, 48);
    capeTerrainGeo.rotateX(-Math.PI / 2);
    const capeTerrainMat = new THREE.MeshStandardMaterial({
      color: 0x1a2638,
      roughness: 0.95,
      metalness: 0.08,
    });
    const capeTerrain = new THREE.Mesh(capeTerrainGeo, capeTerrainMat);
    capeTerrain.position.y = -2.78;
    capeTerrain.receiveShadow = !isSoftwareGl;
    launchPadGroup.add(capeTerrain);

    // Concrete octagonal launch apron
    const padDeckMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.85,
      metalness: 0.2,
    });
    const padDeck = new THREE.Mesh(new THREE.CylinderGeometry(5.5, 6.2, 0.35, 8), padDeckMat);
    padDeck.position.y = -2.62;
    padDeck.receiveShadow = !isSoftwareGl;
    launchPadGroup.add(padDeck);

    // Flame trench blast deflector cone directly beneath nozzle
    const deflectorMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.6,
      metalness: 0.65,
    });
    const blastDeflector = new THREE.Mesh(new THREE.ConeGeometry(1.4, 0.45, 8), deflectorMat);
    blastDeflector.position.y = -2.35;
    launchPadGroup.add(blastDeflector);

    // 4 Hold-down clamps around the base
    const clamps: THREE.Group[] = [];
    for (let i = 0; i < 4; i++) {
      const angle = (i * Math.PI) / 2 + Math.PI / 4;
      const clampPivot = new THREE.Group();
      clampPivot.position.set(Math.cos(angle) * 1.45, -2.4, Math.sin(angle) * 1.45);
      clampPivot.rotation.y = -angle;

      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.55, 0.16), deflectorMat);
      arm.position.set(-0.18, 0.28, 0);
      clampPivot.add(arm);
      launchPadGroup.add(clampPivot);
      clamps.push(clampPivot);
    }

    // Lattice Umbilical Service Tower
    const towerGroup = new THREE.Group();
    towerGroup.position.set(-3.2, -2.5, -1.0);
    const towerMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.75, roughness: 0.35 });
    const towerColGeo = new THREE.BoxGeometry(0.14, 7.2, 0.14);
    [
      [-0.45, -0.45],
      [0.45, -0.45],
      [-0.45, 0.45],
      [0.45, 0.45],
    ].forEach(([cx, cz]) => {
      const col = new THREE.Mesh(towerColGeo, towerMat);
      col.position.set(cx, 3.6, cz);
      col.castShadow = !isSoftwareGl;
      towerGroup.add(col);
    });
    // Horizontal crossbars & red aviation beacon on tower apex
    for (let h = 1; h <= 6; h++) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.08, 1.0), towerMat);
      bar.position.y = h * 1.1;
      towerGroup.add(bar);
    }
    const beaconMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xef4444 })
    );
    beaconMesh.position.y = 7.35;
    towerGroup.add(beaconMesh);

    // Retractable Umbilical Swing Arm
    const umbilicalPivot = new THREE.Group();
    umbilicalPivot.position.set(0.45, 2.5, 0.45);
    const umbilicalArm = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.14, 0.18), trimMat);
    umbilicalArm.position.set(1.15, 0, 0.25);
    umbilicalPivot.add(umbilicalArm);
    towerGroup.add(umbilicalPivot);
    launchPadGroup.add(towerGroup);

    // Engine Plume Core & Point Light (attached to engineMount)
    const plumeGroup = new THREE.Group();
    plumeGroup.position.set(0, -0.55, 0);
    plumeGroup.visible = false;

    const innerPlumeMat = new THREE.MeshBasicMaterial({
      color: 0xe0f2fe,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const innerPlumeGeo = new THREE.ConeGeometry(0.32, 2.6, 16);
    innerPlumeGeo.translate(0, -1.3, 0);
    const innerPlume = new THREE.Mesh(innerPlumeGeo, innerPlumeMat);
    plumeGroup.add(innerPlume);

    const outerPlumeMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const outerPlumeGeo = new THREE.ConeGeometry(0.55, 4.2, 16);
    outerPlumeGeo.translate(0, -2.1, 0);
    const outerPlume = new THREE.Mesh(outerPlumeGeo, outerPlumeMat);
    plumeGroup.add(outerPlume);

    const plumeLight = new THREE.PointLight(0xf97316, 0, 24);
    plumeLight.position.set(0, -1.2, 0);
    plumeGroup.add(plumeLight);

    engineMount.add(plumeGroup);

    // Particle Systems (Exhaust Fire + Pad Smoke/Dust + Atmospheric/Space Dust Streaks)
    const particleTex = createParticleSpriteTexture();

    // 1. Exhaust Fire Particle System
    const FIRE_COUNT = isSoftwareGl ? 60 : 240;
    const firePos = new Float32Array(FIRE_COUNT * 3);
    const fireVel = new Float32Array(FIRE_COUNT * 3);
    const fireLife = new Float32Array(FIRE_COUNT);
    for (let i = 0; i < FIRE_COUNT; i++) {
      fireLife[i] = Math.random();
    }
    const fireGeom = new THREE.BufferGeometry();
    fireGeom.setAttribute('position', new THREE.BufferAttribute(firePos, 3));
    const fireMat = new THREE.PointsMaterial({
      size: 1.05,
      map: particleTex,
      color: 0xffa040,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const fireParticles = new THREE.Points(fireGeom, fireMat);
    fireParticles.frustumCulled = false;
    fireParticles.visible = false;
    scene.add(fireParticles);

    // 2. Pad Smoke / Dust Cloud Particle System
    const SMOKE_COUNT = isSoftwareGl ? 45 : 200;
    const smokePos = new Float32Array(SMOKE_COUNT * 3);
    const smokeVel = new Float32Array(SMOKE_COUNT * 3);
    const smokeLife = new Float32Array(SMOKE_COUNT);
    for (let i = 0; i < SMOKE_COUNT; i++) {
      smokeLife[i] = Math.random();
    }
    const smokeGeom = new THREE.BufferGeometry();
    smokeGeom.setAttribute('position', new THREE.BufferAttribute(smokePos, 3));
    const smokeMat = new THREE.PointsMaterial({
      size: 2.2,
      map: particleTex,
      color: 0xcbd5e1,
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
    });
    const smokeParticles = new THREE.Points(smokeGeom, smokeMat);
    smokeParticles.frustumCulled = false;
    smokeParticles.visible = false;
    scene.add(smokeParticles);

    // 3. Space Dust / Atmospheric Speed Streak Particles (visible during high-speed climb & cruise)
    const DUST_COUNT = isSoftwareGl ? 140 : 320;
    const dustPos = new Float32Array(DUST_COUNT * 3);
    for (let i = 0; i < DUST_COUNT * 3; i += 3) {
      dustPos[i] = (Math.random() - 0.5) * 36;
      dustPos[i + 1] = (Math.random() - 0.5) * 40;
      dustPos[i + 2] = (Math.random() - 0.5) * 36;
    }
    const dustGeom = new THREE.BufferGeometry();
    dustGeom.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
    const dustMat = new THREE.PointsMaterial({
      size: 0.22,
      map: particleTex,
      color: 0xbae6fd,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const spaceDustParticles = new THREE.Points(dustGeom, dustMat);
    spaceDustParticles.frustumCulled = false;
    spaceDustParticles.visible = false;
    scene.add(spaceDustParticles);

    // Interactive Orbit / Rotation Drag
    let isDragging = false;
    let prevMouseX = 0;
    let prevMouseY = 0;
    let targetRotY = 0.4;
    let targetRotX = 0.15;
    let curRotY = 0.4;
    let curRotX = 0.15;

    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      isDragging = true;
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      prevMouseX = clientX;
      prevMouseY = clientY;
    };

    const onPointerMove = (e: MouseEvent | TouchEvent) => {
      if (!isDragging) return;
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      const dx = clientX - prevMouseX;
      const dy = clientY - prevMouseY;
      prevMouseX = clientX;
      prevMouseY = clientY;

      targetRotY += dx * 0.007;
      targetRotX = Math.max(-0.6, Math.min(0.6, targetRotX + dy * 0.007));
    };

    const onPointerUp = () => {
      isDragging = false;
    };

    const canvasElem = renderer.domElement;
    canvasElem.addEventListener('mousedown', onPointerDown);
    canvasElem.addEventListener('mousemove', onPointerMove);
    window.addEventListener('mouseup', onPointerUp);
    canvasElem.addEventListener('touchstart', onPointerDown, { passive: true });
    canvasElem.addEventListener('touchmove', onPointerMove, { passive: true });
    window.addEventListener('touchend', onPointerUp);

    // Resize Handler
    const handleResize = () => {
      if (!container) return;
      width = container.clientWidth || window.innerWidth;
      height = container.clientHeight || window.innerHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    window.addEventListener('resize', handleResize);

    // Animation Loop
    let frameId = 0;
    let isDisposed = false;
    let lastTime = performance.now();
    let prevMode = stateRef.current.mode;
    let prevLaunchActive = stateRef.current.launchActive;
    let launchProfile = computeVehicleLaunchProfile(stateRef.current.selectedComponents, stateRef.current.stats);
    let launchTelem = createInitialLaunchTelemetry(launchProfile, stateRef.current.stats);
    let lastTelemEmitTime = 0;
    let launchCompleteNotified = false;
    const skyPadColor = new THREE.Color(0x16335b);
    const skyStratosphereColor = new THREE.Color(0x0b1636);
    const skySpaceColor = new THREE.Color(0x03060c);
    const skyCol = new THREE.Color();
    const flightBgColor = new THREE.Color(0x03060c);
    const hangarBgColor = new THREE.Color(0x070b14);
    const zeroVec = new THREE.Vector3(0, 0, 0);
    const nozzleWorldPos = new THREE.Vector3();
    const downThrustVec = new THREE.Vector3();
    const camChaseTarget = new THREE.Vector3();
    const camLookTarget = new THREE.Vector3();

    function afterDraw(cb: () => void) {
      if (isDisposed) return;
      const gl = renderer.getContext() as WebGL2RenderingContext;
      if (!gl || gl.isContextLost()) return;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      if (!sync) {
        frameId = window.setTimeout(cb, 80);
        return;
      }
      gl.flush();
      const poll = () => {
        if (isDisposed || gl.isContextLost()) {
          gl.deleteSync(sync);
          return;
        }
        const state = gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    const shakeOffset = new THREE.Vector3();

    function tick() {
      if (isDisposed) return;
      const now = performance.now();
      const rawDt = Math.max(0.001, (now - lastTime) / 1000);
      const dt = Math.min(rawDt, isSoftwareGl ? 0.25 : 0.05);
      const physicsDt = Math.min(rawDt, isSoftwareGl ? 0.75 : 0.12);
      lastTime = now;
      const {
        isExploded: expl,
        mode: curMode,
        launchActive: isLaunching,
        cameraShake: shake,
        selectedComponents: curComps,
        stats: curStats,
        onLaunchTelemetry: emitLaunchTelem,
        onLaunchComplete: emitLaunchComplete,
      } = stateRef.current;

      // Detect mode or launch trigger transitions
      if (curMode !== prevMode) {
        if (curMode === 'launch') {
          launchProfile = computeVehicleLaunchProfile(curComps, curStats);
          launchTelem = createInitialLaunchTelemetry(launchProfile, curStats);
          launchCompleteNotified = false;
          spacecraftGroup.position.set(0, 0, 0);
          spacecraftGroup.rotation.set(0, 0, 0);
          curRotX = 0;
          curRotY = 0.35;
          targetRotX = 0;
          targetRotY = 0.35;
          camera.position.set(3.2, 1.4, 8.2);
        } else {
          spacecraftGroup.position.set(curMode === 'title' ? 1.4 : 0, 0, 0);
        }
        prevMode = curMode;
      }

      if (curMode === 'launch' && isLaunching && !prevLaunchActive) {
        launchProfile = computeVehicleLaunchProfile(curComps, curStats);
        launchTelem = {
          ...createInitialLaunchTelemetry(launchProfile, curStats),
          phase: 'ignition',
        };
        launchCompleteNotified = false;
        emitLaunchTelem?.(launchTelem);
      }
      if (curMode === 'launch' && !isLaunching && prevLaunchActive) {
        launchProfile = computeVehicleLaunchProfile(curComps, curStats);
        launchTelem = createInitialLaunchTelemetry(launchProfile, curStats);
        launchCompleteNotified = false;
        spacecraftGroup.position.set(0, 0, 0);
        emitLaunchTelem?.(launchTelem);
      }
      prevLaunchActive = isLaunching;

      // Update launch physics if actively launching (sub-stepped for real-time stability on low-FPS software GL)
      if (curMode === 'launch' && isLaunching && !launchTelem.isComplete && !document.querySelector('dialog[open]')) {
        let remainingDt = physicsDt;
        while (remainingDt > 0.0001 && !launchTelem.isComplete) {
          const stepDt = Math.min(0.04, remainingDt);
          launchTelem = stepLaunchPhysics(launchTelem, launchProfile, curStats, stepDt);
          remainingDt -= stepDt;
        }
        if (now - lastTelemEmitTime > 50 || launchTelem.isComplete) {
          lastTelemEmitTime = now;
          emitLaunchTelem?.(launchTelem);
        }
        if (launchTelem.isComplete && !launchCompleteNotified) {
          launchCompleteNotified = true;
          emitLaunchComplete?.(launchTelem);
        }
      }

      // Camera shake (either manual contingency or engine vibration during launch)
      const isEngineShaking =
        curMode === 'launch' && isLaunching && launchTelem.altitudeKm < 42 && !launchTelem.isComplete;
      if (shake || isEngineShaking) {
        const amp = shake
          ? 0.12
          : (0.045 + (launchTelem.throttlePercent / 100) * 0.055) * launchProfile.shakeIntensity;
        shakeOffset.set((Math.random() - 0.5) * amp, (Math.random() - 0.5) * amp, (Math.random() - 0.5) * amp * 0.7);
      } else {
        shakeOffset.lerp(zeroVec, 0.12);
      }

      // Spacecraft Rotation & Position
      const dampFactor = 1 - Math.exp(-8 * dt);
      if (curMode === 'launch') {
        launchPadGroup.visible = true;
        groundGrid.visible = false;
        shadowPlane.visible = false;
        planetMesh.visible = false;

        // Sky & Atmosphere Transition with Altitude
        const altNorm = Math.min(1, launchTelem.altitudeKm / 75);
        if (altNorm < 0.35) {
          skyCol.copy(skyPadColor).lerp(skyStratosphereColor, altNorm / 0.35);
        } else {
          skyCol.copy(skyStratosphereColor).lerp(skySpaceColor, (altNorm - 0.35) / 0.65);
        }
        scene.background = skyCol;
        (scene.fog as THREE.FogExp2).color.copy(skyCol);
        (scene.fog as THREE.FogExp2).density = Math.max(0.001, 0.012 * (1 - altNorm));

        // Stars emerge gradually as atmosphere thins
        starField.visible = altNorm > 0.15;
        starMat.opacity = Math.min(0.95, Math.max(0, (altNorm - 0.15) * 1.15));
        starField.position.y = spacecraftGroup.position.y;

        if (!isLaunching) {
          // Pre-launch upright on pad with optional mouse inspect
          if (!isDragging) {
            targetRotY += 0.12 * dt;
          }
          curRotY += (targetRotY - curRotY) * dampFactor;
          spacecraftGroup.position.set(0, 0, 0);
          spacecraftGroup.rotation.set(0, curRotY, 0);

          // Clamps closed & umbilical connected
          clamps.forEach((c) => {
            c.rotation.z = THREE.MathUtils.damp(c.rotation.z, 0, 8, dt);
          });
          umbilicalPivot.rotation.y = THREE.MathUtils.damp(umbilicalPivot.rotation.y, 0, 6, dt);
        } else {
          // Active liftoff & gravity-turn pitch
          const gravityTurnRad = -Math.min(0.28, Math.max(0, (launchTelem.altitudeKm - 6) / 114) * 0.28);
          spacecraftGroup.position.set(
            Math.max(0, (launchTelem.visualAltitudeUnits - 12) * 0.14),
            launchTelem.visualAltitudeUnits,
            0
          );
          spacecraftGroup.rotation.set(0, 0.35, gravityTurnRad);

          // Release hold-down clamps & swing umbilical tower arm away
          const releaseTarget = launchTelem.elapsedSec > 0.65 ? -0.65 : 0;
          clamps.forEach((c) => {
            c.rotation.z = THREE.MathUtils.damp(c.rotation.z, releaseTarget, 10, dt);
          });
          umbilicalPivot.rotation.y = THREE.MathUtils.damp(umbilicalPivot.rotation.y, -1.15, 5, dt);
        }

        // Plume & Particle Visuals driven by active engine & throttle
        const showPlume = isLaunching && launchTelem.throttlePercent > 0;
        plumeGroup.visible = showPlume;
        fireParticles.visible = showPlume;
        smokeParticles.visible = isLaunching && launchTelem.altitudeKm < 14;
        spaceDustParticles.visible = isLaunching && launchTelem.altitudeKm > 5;

        if (showPlume) {
          const thr = launchTelem.throttlePercent / 100;
          const flicker = 0.88 + Math.random() * 0.26;
          if (launchProfile.plumeStyle === 'cryo') {
            innerPlumeMat.color.setHex(0xe0f2fe);
            outerPlumeMat.color.setHex(0x38bdf8);
            fireMat.color.setHex(0x7dd3fc);
            plumeLight.color.setHex(0x38bdf8);
          } else if (launchProfile.plumeStyle === 'ion') {
            innerPlumeMat.color.setHex(0xc4b5fd);
            outerPlumeMat.color.setHex(0x22d3ee);
            fireMat.color.setHex(0xa78bfa);
            plumeLight.color.setHex(0x818cf8);
          } else {
            innerPlumeMat.color.setHex(0xfef08a);
            outerPlumeMat.color.setHex(0xf97316);
            fireMat.color.setHex(0xfb923c);
            plumeLight.color.setHex(0xf97316);
          }
          plumeGroup.scale.set(0.85 + thr * 0.25, (0.7 + thr * 0.85) * flicker, 0.85 + thr * 0.25);
          plumeLight.intensity = 6 * thr * flicker;

          // Compute engine nozzle world position & downward thrust axis
          engineMount.getWorldPosition(nozzleWorldPos);
          nozzleWorldPos.y -= 0.55;
          downThrustVec.set(0, -1, 0).applyEuler(spacecraftGroup.rotation).normalize();

          // Update fire exhaust particles
          const fArr = fireGeom.attributes.position.array as Float32Array;
          for (let i = 0; i < FIRE_COUNT; i++) {
            fireLife[i] += dt * (2.6 + thr * 1.4);
            if (fireLife[i] >= 1) {
              fireLife[i] = 0;
              fArr[i * 3] = nozzleWorldPos.x + (Math.random() - 0.5) * 0.4;
              fArr[i * 3 + 1] = nozzleWorldPos.y;
              fArr[i * 3 + 2] = nozzleWorldPos.z + (Math.random() - 0.5) * 0.4;
              const speed = (10 + Math.random() * 8) * thr;
              fireVel[i * 3] = downThrustVec.x * speed + (Math.random() - 0.5) * 1.6;
              fireVel[i * 3 + 1] = downThrustVec.y * speed;
              fireVel[i * 3 + 2] = downThrustVec.z * speed + (Math.random() - 0.5) * 1.6;
            } else {
              fArr[i * 3] += fireVel[i * 3] * dt;
              fArr[i * 3 + 1] += fireVel[i * 3 + 1] * dt;
              fArr[i * 3 + 2] += fireVel[i * 3 + 2] * dt;
            }
          }
          fireGeom.attributes.position.needsUpdate = true;
        }

        // Update billowing pad smoke particles during ignition & tower clear
        if (smokeParticles.visible) {
          const sArr = smokeGeom.attributes.position.array as Float32Array;
          const smokeStrength = Math.max(0, 1 - launchTelem.altitudeKm / 14);
          smokeMat.opacity = 0.5 * smokeStrength;
          for (let i = 0; i < SMOKE_COUNT; i++) {
            smokeLife[i] += dt * 0.75;
            if (smokeLife[i] >= 1) {
              smokeLife[i] = 0;
              const ang = Math.random() * Math.PI * 2;
              const rad = 0.5 + Math.random() * 1.2;
              sArr[i * 3] = Math.cos(ang) * rad;
              sArr[i * 3 + 1] = -2.35 + Math.random() * 0.4;
              sArr[i * 3 + 2] = Math.sin(ang) * rad;
              const radialSpeed = 4.5 + Math.random() * 5.5;
              smokeVel[i * 3] = Math.cos(ang) * radialSpeed;
              smokeVel[i * 3 + 1] = 0.6 + Math.random() * 1.6;
              smokeVel[i * 3 + 2] = Math.sin(ang) * radialSpeed;
            } else {
              sArr[i * 3] += smokeVel[i * 3] * dt;
              sArr[i * 3 + 1] += smokeVel[i * 3 + 1] * dt;
              sArr[i * 3 + 2] += smokeVel[i * 3 + 2] * dt;
              smokeVel[i * 3] *= 0.985;
              smokeVel[i * 3 + 2] *= 0.985;
            }
          }
          smokeGeom.attributes.position.needsUpdate = true;
        }

        // Update high-speed atmospheric & space dust streaks around ascending rocket
        if (spaceDustParticles.visible) {
          spaceDustParticles.position.copy(spacecraftGroup.position);
          const dArr = dustGeom.attributes.position.array as Float32Array;
          const streakSpeed = 12 + (launchTelem.velocityMs / 8000) * 42;
          for (let i = 0; i < DUST_COUNT; i++) {
            dArr[i * 3 + 1] -= streakSpeed * dt;
            if (dArr[i * 3 + 1] < -20) {
              dArr[i * 3] = (Math.random() - 0.5) * 32;
              dArr[i * 3 + 1] = 20;
              dArr[i * 3 + 2] = (Math.random() - 0.5) * 32;
            }
          }
          dustGeom.attributes.position.needsUpdate = true;
        }
      } else {
        // Non-launch modes (title, hangar, flight)
        launchPadGroup.visible = false;
        smokeParticles.visible = false;
        const activeBg = curMode === 'flight' ? flightBgColor : hangarBgColor;
        scene.background = activeBg;
        (scene.fog as THREE.FogExp2).color.copy(activeBg);
        (scene.fog as THREE.FogExp2).density = 0.025;

        if (!isDragging && !stateRef.current.reducedMotion && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
          targetRotY += 0.25 * dt;
        }
        curRotY += (targetRotY - curRotY) * dampFactor;
        curRotX += (targetRotX - curRotX) * dampFactor;

        spacecraftGroup.rotation.set(curRotX, curRotY, 0);

        const targetPosX = curMode === 'title' ? 1.4 : 0;
        spacecraftGroup.position.x = THREE.MathUtils.damp(spacecraftGroup.position.x, targetPosX, 4, dt);
        spacecraftGroup.position.y = THREE.MathUtils.damp(spacecraftGroup.position.y, 0, 4, dt);
        spacecraftGroup.position.z = 0;

        if (curMode === 'flight') {
          groundGrid.visible = false;
          shadowPlane.visible = false;
          starField.visible = true;
          starMat.opacity = 0.85;
          starField.position.set(0, 0, 0);
          planetMesh.visible = true;

          // Active cruise engine flame & space dust particles in flight
          plumeGroup.visible = true;
          fireParticles.visible = true;
          spaceDustParticles.visible = true;
          spaceDustParticles.position.set(0, 0, 0);
          const engineId = curComps.engine?.id || 'motor-bipropelente-merlin';
          if (engineId === 'motor-pesado-raptor' || curComps.engine?.isHeavyEngine) {
            innerPlumeMat.color.setHex(0xe0f2fe);
            outerPlumeMat.color.setHex(0x38bdf8);
            fireMat.color.setHex(0x7dd3fc);
            plumeLight.color.setHex(0x38bdf8);
          } else if (engineId === 'propulsor-ionico-hall') {
            innerPlumeMat.color.setHex(0xc4b5fd);
            outerPlumeMat.color.setHex(0x22d3ee);
            fireMat.color.setHex(0xa78bfa);
            plumeLight.color.setHex(0x818cf8);
          } else {
            innerPlumeMat.color.setHex(0xfef08a);
            outerPlumeMat.color.setHex(0xf97316);
            fireMat.color.setHex(0xfb923c);
            plumeLight.color.setHex(0xf97316);
          }
          const flicker = 0.9 + Math.random() * 0.2;
          plumeGroup.scale.set(0.75, 0.85 * flicker, 0.75);
          plumeLight.intensity = 3.5;

          engineMount.getWorldPosition(nozzleWorldPos);
          downThrustVec.set(0, -1, 0).applyEuler(spacecraftGroup.rotation).normalize();
          const fArr = fireGeom.attributes.position.array as Float32Array;
          for (let i = 0; i < FIRE_COUNT; i++) {
            fireLife[i] += dt * 3.0;
            if (fireLife[i] >= 1) {
              fireLife[i] = 0;
              fArr[i * 3] = nozzleWorldPos.x + (Math.random() - 0.5) * 0.25;
              fArr[i * 3 + 1] = nozzleWorldPos.y;
              fArr[i * 3 + 2] = nozzleWorldPos.z + (Math.random() - 0.5) * 0.25;
              const spd = 8 + Math.random() * 5;
              fireVel[i * 3] = downThrustVec.x * spd;
              fireVel[i * 3 + 1] = downThrustVec.y * spd;
              fireVel[i * 3 + 2] = downThrustVec.z * spd;
            } else {
              fArr[i * 3] += fireVel[i * 3] * dt;
              fArr[i * 3 + 1] += fireVel[i * 3 + 1] * dt;
              fArr[i * 3 + 2] += fireVel[i * 3 + 2] * dt;
            }
          }
          fireGeom.attributes.position.needsUpdate = true;

          const positions = starGeom.attributes.position.array as Float32Array;
          for (let i = 2; i < starCount * 3; i += 3) {
            positions[i] += dt * 30;
            if (positions[i] > 20) {
              positions[i] = -100;
            }
          }
          starGeom.attributes.position.needsUpdate = true;
          if (!stateRef.current.reducedMotion) planetMesh.rotation.y += dt * 0.04;
        } else {
          groundGrid.visible = true;
          shadowPlane.visible = true;
          starField.visible = false;
          planetMesh.visible = false;
          plumeGroup.visible = false;
          fireParticles.visible = false;
          spaceDustParticles.visible = false;
        }
      }

      // EXPLODED VIEW KINEMATICS:
      const targetCapsuleY = expl ? 1.3 : 0;
      const targetSolarX = expl ? 1.5 : 0;
      const targetOxygenZ = expl ? 1.2 : 0;
      const targetShieldY = expl ? -0.8 : 0;
      const targetEngineY = expl ? -1.6 : 0;
      const targetPayloadZ = expl ? -1.3 : 0;

      capsuleMount.position.y = THREE.MathUtils.damp(capsuleMount.position.y, targetCapsuleY, 6, dt);
      solarMount.position.x = THREE.MathUtils.damp(solarMount.position.x, 0, 6, dt);
      if (solarMount.children[0]) {
        solarMount.children[0].children.forEach((wing) => {
          const side = wing.position.x > 0 ? 1 : -1;
          const targetWingX = side * (1.35 + (expl ? targetSolarX * 0.6 : 0));
          wing.position.x = THREE.MathUtils.damp(wing.position.x, targetWingX, 6, dt);
        });
      }

      oxygenMount.position.z = THREE.MathUtils.damp(oxygenMount.position.z, targetOxygenZ, 6, dt);
      shieldMount.position.y = THREE.MathUtils.damp(shieldMount.position.y, -1.55 + targetShieldY, 6, dt);
      engineMount.position.y = THREE.MathUtils.damp(engineMount.position.y, -1.55 + targetEngineY, 6, dt);
      payloadMount.position.z = THREE.MathUtils.damp(payloadMount.position.z, targetPayloadZ, 6, dt);

      // Camera Transitions (Dynamic Launch Tracking vs Studio Hangar Orbit)
      if (curMode === 'launch') {
        if (!isLaunching) {
          camChaseTarget.set(2.4 + shakeOffset.x, 0.9 + shakeOffset.y, 8.0 + shakeOffset.z);
          camera.position.lerp(camChaseTarget, 1 - Math.exp(-5 * dt));
          camera.lookAt(0, -0.3, 0);
        } else {
          // Sweeping dynamic camera that tracks the vehicle ascending from surface into orbit
          const climb = launchTelem.visualAltitudeUnits;
          const sweepPhase = Math.min(1, launchTelem.elapsedSec / 6.5);
          const camX = spacecraftGroup.position.x + 2.8 + sweepPhase * 3.8 + shakeOffset.x;
          const camY = Math.max(-0.5, climb - 1.8 - sweepPhase * 2.2) + shakeOffset.y;
          const camZ = 8.4 + sweepPhase * 4.2 + shakeOffset.z;
          camChaseTarget.set(camX, camY, camZ);
          camera.position.lerp(camChaseTarget, 1 - Math.exp(-6.5 * dt));
          camLookTarget.set(spacecraftGroup.position.x, climb - 0.5, 0);
          camera.lookAt(camLookTarget);
        }
      } else {
        camera.position.x = THREE.MathUtils.damp(camera.position.x, shakeOffset.x, 10, dt);
        camera.position.y = THREE.MathUtils.damp(camera.position.y, 2.0 + shakeOffset.y, 10, dt);
        camera.position.z = THREE.MathUtils.damp(camera.position.z, (expl ? 7.6 : 5.8) + shakeOffset.z, 6, dt);
        camera.lookAt(0, expl ? -0.3 : 0, 0);
      }

      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    }

    tick();

    return () => {
      isDisposed = true;
      if (isSoftwareGl) {
        clearTimeout(frameId);
      } else {
        cancelAnimationFrame(frameId);
      }

      canvasElem.removeEventListener('mousedown', onPointerDown);
      canvasElem.removeEventListener('mousemove', onPointerMove);
      window.removeEventListener('mouseup', onPointerUp);
      canvasElem.removeEventListener('touchstart', onPointerDown);
      canvasElem.removeEventListener('touchmove', onPointerMove);
      window.removeEventListener('touchend', onPointerUp);
      window.removeEventListener('resize', handleResize);

      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }

      scene.environment = null;
      envTarget.dispose();
      renderer.dispose();
      disposeHierarchy(spacecraftGroup);
      disposeHierarchy(launchPadGroup);
      groundGrid.dispose();
      starGeom.dispose();
      planetGeom.dispose();
      atmosGeom.dispose();
      shadowPlane.geometry.dispose();
      (shadowPlane.material as THREE.Material).dispose();
      innerPlumeGeo.dispose();
      outerPlumeGeo.dispose();
      fireGeom.dispose();
      smokeGeom.dispose();
      dustGeom.dispose();

      solarTexture.dispose();
      goldFoilTexture.dispose();
      planetTex?.dispose();
      lunarTextures?.dispose();
      shadowTex.dispose();
      particleTex.dispose();

      whiteSkinMat.dispose();
      trimMat.dispose();
      glassMat.dispose();
      metalMat.dispose();
      starMat.dispose();
      planetMat.dispose();
      atmosMat.dispose();
      innerPlumeMat.dispose();
      outerPlumeMat.dispose();
      fireMat.dispose();
      smokeMat.dispose();
      dustMat.dispose();
      capeTerrainMat.dispose();
      padDeckMat.dispose();
      deflectorMat.dispose();
      towerMat.dispose();
    };
  }, [destinationType]);

  return (
    <div
      ref={mountRef}
      className="absolute inset-0 w-full h-full overflow-hidden select-none cursor-grab active:cursor-grabbing"
      title={canvasTitle}
    />
  );
};
