import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { SpacecraftComponent } from '../types/mission';
import { sounds } from '../utils/audio';
import {
  computeStrafeTargetVelocity,
  dampAngleShortest,
  getCameraBasisXZ,
  getRoverModelYaw,
  getWheelSteerAndRoll,
} from '../utils/roverKinematics';
import { buildAssembledSpacecraft, disposeHierarchy } from './craftBuilders';
import { buildJWSTObservatory } from './jwstBuilder';
import { createEarthTexture, createLunarTextureSet } from '../utils/lunarTextures';
import { Compass, Eye, RotateCw, ZoomIn } from 'lucide-react';
import { useI18n } from '../i18n/I18nContext';
import { UI_COPY } from '../i18n/uiCopy';
import { MARS_OBSTACLE_NAMES, MARS_SAMPLE_COPY } from '../i18n/translations';

export interface MarsDriveInput {
  forward: boolean;
  backward: boolean;
  turnLeft: boolean;
  turnRight: boolean;
  strafeLeft?: boolean;
  strafeRight?: boolean;
  holdExtract?: boolean;
}

export interface MarsCollectibleSample {
  id: string;
  name: string;
  mineral: string;
  nasaMission: string;
  x: number;
  z: number;
  description: string;
  collected: boolean;
}

export interface MarsTelemetry {
  roverX: number;
  roverY: number;
  roverZ: number;
  headingDeg: number;
  speedKmh: number;
  distanceToBeaconM: number;
  targetReached: boolean;
  collisionWarning: string | null;
  drillingProgress: number;
  collectedSampleIds: string[];
  recentSampleName: string | null;
  nearSample?: MarsCollectibleSample | null;
  holdExtractProgress?: number;
  isHoldingExtract?: boolean;
}

export interface MoonTelemetry {
  pitchAngleDeg: number;
  isThrusting: boolean;
  periluneKm: number;
  apoluneKm: number;
  orbitLockPercent: number;
  isLocked: boolean;
}

export interface L2Telemetry {
  selectedSegmentId: number | null;
  calibratedSegments: number[];
  misalignedSegments: number[];
  sunshieldTensioned: boolean;
  wavefrontErrorNm: number;
  strehlRatio: number;
  isFullyCalibrated: boolean;
}

interface DestinationSceneProps {
  destinationType: 'moon' | 'mars' | 'deep_space';
  selectedComponents: Record<string, SpacecraftComponent>;
  isMuted: boolean;
  paused?: boolean;
  // Mars Interactive Props
  marsDriveInput?: MarsDriveInput;
  onMarsTelemetryUpdate?: (telem: MarsTelemetry) => void;
  onMarsCollision?: (obstacleName: string) => void;
  onMarsSampleCollected?: (sample: MarsCollectibleSample) => void;
  onMarsSuccess?: () => void;
  // Moon Interactive Props
  moonPitch?: number;
  moonThrust?: boolean;
  onMoonTelemetryUpdate?: (telem: MoonTelemetry) => void;
  onMoonSuccess?: () => void;
  // L2 Interactive Props
  l2SelectedSegment?: number | null;
  l2CalibratedSegments?: number[];
  l2SunshieldTensioned?: boolean;
  onL2SelectSegment?: (segmentId: number) => void;
  onL2TelemetryUpdate?: (telem: L2Telemetry) => void;
  onL2Success?: () => void;
}

/**
 * Mathematical elevation function for expanded Isidis Planitia terrain.
 * Guarantees zero elevation around the lander pad (x: 0, z: -1 to 2.8)
 * and returns exact deterministic world Y for any coordinate (x, z).
 */
export function getMarsHeight(x: number, z: number): number {
  // Safe flat basin around lander platform (x: 0, z: -1.0)
  const distFromLander = Math.hypot(x, z - (-1.0));
  const landerPadRadius = 3.4;
  const flatFactor = Math.min(1.0, Math.max(0, (distFromLander - landerPadRadius) / 4.2));

  // Natural undulating Isidis Planitia terrain across 90x90 territory
  const wave1 = Math.sin(x * 0.12) * Math.cos(z * 0.11) * 0.45;
  const wave2 = Math.sin(x * 0.05 + 1.2) * 0.28;
  const wave3 = Math.cos(z * 0.07 - 0.4) * 0.25;
  // West crater depression around (-9.5, 12.8)
  const craterDip = -0.45 * Math.exp(-(Math.pow(x + 9.5, 2) + Math.pow(z - 12.8, 2)) / 18.0);
  // East dune ridge around (8.5, 7.2)
  const eastRidge = 0.38 * Math.exp(-(Math.pow(x - 8.5, 2) + Math.pow(z - 7.2, 2)) / 22.0);
  // North-East elevated basaltic plateau near beacon (7.5, 24.5)
  const beaconPlateau = 0.42 * Math.exp(-(Math.pow(x - 7.5, 2) + Math.pow(z - 24.5, 2)) / 26.0);

  return (wave1 + wave2 + wave3 + craterDip + eastRidge + beaconPlateau) * flatFactor;
}

export const DestinationScene: React.FC<DestinationSceneProps> = ({
  destinationType,
  selectedComponents,
  isMuted,
  paused = false,
  marsDriveInput,
  onMarsTelemetryUpdate,
  onMarsCollision,
  onMarsSampleCollected,
  onMarsSuccess,
  moonPitch = -20,
  moonThrust = false,
  onMoonTelemetryUpdate,
  onMoonSuccess,
  l2SelectedSegment = null,
  l2CalibratedSegments = [],
  l2SunshieldTensioned = false,
  onL2SelectSegment,
  onL2TelemetryUpdate,
  onL2Success,
}) => {
  const { lang } = useI18n();
  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  const destT = UI_COPY[lang].dest;
  const langRef = useRef(lang);
  langRef.current = lang;

  const containerRef = useRef<HTMLDivElement>(null);
  const [cameraView, setCameraView] = useState<'overview' | 'instrument' | 'cinematic'>('overview');
  const [autoRotate, setAutoRotate] = useState<boolean>(false);

  const cameraViewRef = useRef(cameraView);
  useEffect(() => {
    cameraViewRef.current = cameraView;
  }, [cameraView]);

  const autoRotateRef = useRef(autoRotate);
  useEffect(() => {
    autoRotateRef.current = autoRotate;
  }, [autoRotate]);

  // References to keep callbacks and dynamic inputs up-to-date without remounting Three.js
  const inputsRef = useRef({
    marsDriveInput: {
      forward: false,
      backward: false,
      turnLeft: false,
      turnRight: false,
      strafeLeft: false,
      strafeRight: false,
      holdExtract: false,
    },
    moonPitch: -20,
    moonThrust: false,
    l2SelectedSegment: null as number | null,
    l2CalibratedSegments: [] as number[],
    l2SunshieldTensioned: false,
    onMarsTelemetryUpdate,
    onMarsCollision,
    onMarsSampleCollected,
    onMarsSuccess,
    onMoonTelemetryUpdate,
    onMoonSuccess,
    onL2SelectSegment,
    onL2TelemetryUpdate,
    onL2Success,
  });

  useEffect(() => {
    inputsRef.current.marsDriveInput = marsDriveInput
      ? {
          forward: marsDriveInput.forward,
          backward: marsDriveInput.backward,
          turnLeft: marsDriveInput.turnLeft,
          turnRight: marsDriveInput.turnRight,
          strafeLeft: !!marsDriveInput.strafeLeft,
          strafeRight: !!marsDriveInput.strafeRight,
          holdExtract: !!marsDriveInput.holdExtract,
        }
      : {
          forward: false,
          backward: false,
          turnLeft: false,
          turnRight: false,
          strafeLeft: false,
          strafeRight: false,
          holdExtract: false,
        };
    inputsRef.current.moonPitch = moonPitch;
    inputsRef.current.moonThrust = moonThrust;
    inputsRef.current.l2SelectedSegment = l2SelectedSegment;
    inputsRef.current.l2CalibratedSegments = l2CalibratedSegments;
    inputsRef.current.l2SunshieldTensioned = l2SunshieldTensioned;
    inputsRef.current.onMarsTelemetryUpdate = onMarsTelemetryUpdate;
    inputsRef.current.onMarsCollision = onMarsCollision;
    inputsRef.current.onMarsSampleCollected = onMarsSampleCollected;
    inputsRef.current.onMarsSuccess = onMarsSuccess;
    inputsRef.current.onMoonTelemetryUpdate = onMoonTelemetryUpdate;
    inputsRef.current.onMoonSuccess = onMoonSuccess;
    inputsRef.current.onL2SelectSegment = onL2SelectSegment;
    inputsRef.current.onL2TelemetryUpdate = onL2TelemetryUpdate;
    inputsRef.current.onL2Success = onL2Success;
  }, [
    marsDriveInput,
    moonPitch,
    moonThrust,
    l2SelectedSegment,
    l2CalibratedSegments,
    l2SunshieldTensioned,
    onMarsTelemetryUpdate,
    onMarsCollision,
    onMarsSampleCollected,
    onMarsSuccess,
    onMoonTelemetryUpdate,
    onMoonSuccess,
    onL2SelectSegment,
    onL2TelemetryUpdate,
    onL2Success,
  ]);

  // Object references for the render loop
  const animRefs = useRef<{
    roverGroup?: THREE.Group;
    roverWheels?: THREE.Group[];
    drillArm?: THREE.Group;
    drillTurret?: THREE.Mesh;
    beaconMesh?: THREE.Group;
    beaconRing?: THREE.Mesh;
    sampleMeshes?: { id: string; group: THREE.Group; ring: THREE.Mesh; collected: boolean }[];
    craftGroup?: THREE.Group;
    engineFlame?: THREE.Group;
    orbitLine?: THREE.Line;
    moonPlanet?: THREE.Mesh;
    telescopeHexagons?: THREE.Mesh[];
    sunshieldLayers?: THREE.Mesh[];
  }>({});

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    const isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(destinationType === 'mars' ? 50 : 45, width / height, 0.1, 2000);
    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = destinationType === 'moon' ? 1.2 : 1.15;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    container.replaceChildren(renderer.domElement);

    const maxAnisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    const cleanups: (() => void)[] = [];

    // Studio IBL reflections for realistic metallic foil, gold beryllium & Kapton response
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const roomEnv = new RoomEnvironment();
    const envRenderTarget = pmremGenerator.fromScene(roomEnv, 0.04);
    scene.environment = envRenderTarget.texture;
    roomEnv.dispose();
    pmremGenerator.dispose();
    cleanups.push(() => {
      scene.environment = null;
      envRenderTarget.dispose();
    });

    // Initial camera position & atmosphere based on destination
    if (destinationType === 'mars') {
      camera.position.set(0, 8.5, -9.5);
      scene.fog = new THREE.FogExp2(0xb6522c, 0.014);
      scene.background = new THREE.Color(0x9a3d1d);
    } else if (destinationType === 'moon') {
      camera.position.set(4.6, 2.2, 6.8);
      scene.fog = new THREE.FogExp2(0x02040a, 0.0005);
      scene.background = new THREE.Color(0x020308);
    } else {
      // Match reference photo hero 3/4 view (tripod & bow louvers left-forward, silver wing right, clear of HUD)
      camera.position.set(5.9, 2.2, 6.9);
      scene.fog = new THREE.FogExp2(0x02020a, 0.0005);
      scene.background = new THREE.Color(0x03030d);
    }

    const currentLookAt = new THREE.Vector3(
      destinationType === 'deep_space' ? 0.55 : 0,
      destinationType === 'deep_space' ? 0.52 : destinationType === 'moon' ? -0.15 : 0,
      destinationType === 'deep_space' ? 0.15 : 0
    );
    camera.lookAt(currentLookAt);

    // 2. Lighting Setup
    const ambientLight = new THREE.AmbientLight(
      destinationType === 'mars' ? 0xffcbb0 : destinationType === 'moon' ? 0x1e2b44 : 0x3b4d70,
      destinationType === 'mars' ? 1.6 : destinationType === 'moon' ? 0.25 : 0.65
    );
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(
      0xfffbf0,
      destinationType === 'moon' ? 3.1 : destinationType === 'deep_space' ? 2.85 : 2.6
    );
    if (destinationType === 'moon') {
      // Grazing solar terminator angle to make craters & ejecta rims pop with deep relief
      sunLight.position.set(-24, 14, 16);
    } else if (destinationType === 'deep_space') {
      sunLight.position.set(10, 14, 14);
    } else {
      sunLight.position.set(15, 25, 12);
    }
    if (destinationType === 'mars' && !isSoftwareGl) {
      sunLight.castShadow = true;
      sunLight.shadow.mapSize.width = 2048;
      sunLight.shadow.mapSize.height = 2048;
      sunLight.shadow.camera.near = 0.5;
      sunLight.shadow.camera.far = 80;
      const d = 36;
      sunLight.shadow.camera.left = -d;
      sunLight.shadow.camera.right = d;
      sunLight.shadow.camera.top = d;
      sunLight.shadow.camera.bottom = -d;
      sunLight.shadow.bias = -0.0004;
    }
    scene.add(sunLight);

    const fillLight = new THREE.DirectionalLight(
      destinationType === 'mars' ? 0xcc6030 : destinationType === 'deep_space' ? 0xffd2eb : 0x5c94ef,
      destinationType === 'deep_space' ? 1.15 : destinationType === 'moon' ? 0.8 : 1.0
    );
    fillLight.position.set(
      destinationType === 'moon' ? 18 : -8,
      destinationType === 'deep_space' ? -12 : -6,
      destinationType === 'moon' ? -24 : 8
    );
    scene.add(fillLight);

    // 3. Build Destination-Specific Assets

    // Raycaster for clicking 3D telescope mirror segments
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    // Mars gameplay variables
    let roverX = 0;
    let roverZ = 3.0;
    let roverHeading = 0; // facing +Z direction
    let roverSpeed = 0;
    let velX = 0;
    let velZ = 0;
    let marsTargetReached = false;
    let collisionCooldown = 0;
    let extractHoldTime = 0;
    let lastDrillSoundTime = 0;
    const collectedSampleIds: string[] = [];
    // Deep Coring Target Waypoint on the North-East basaltic plateau
    const beaconTarget = { x: 7.5, z: 24.5 };

    // Dispersed non-linear obstacles across all quadrants of Isidis Planitia
    const obstacles = [
      { x: 3.8, z: 4.5, r: 0.85, name: 'Formación Basáltica Alfa' },
      { x: -3.6, z: 6.0, r: 0.90, name: 'Afloramiento Rocoso Austral' },
      { x: 10.8, z: 6.5, r: 1.10, name: 'Cresta de Olivino Este' },
      { x: 5.8, z: 9.2, r: 0.80, name: 'Duna Transversal Consolidada' },
      { x: -5.5, z: 9.8, r: 0.95, name: 'Bloque de Eyección Primario' },
      { x: -11.8, z: 11.5, r: 1.25, name: 'Borde de Cráter Menor' },
      { x: -7.2, z: 14.8, r: 0.85, name: 'Depósito de Clastos Piroclásticos' },
      { x: 1.8, z: 13.8, r: 1.05, name: 'Monolito Basáltico Central' },
      { x: 6.2, z: 15.5, r: 0.85, name: 'Duna Longitudinal Isidis' },
      { x: -2.8, z: 17.5, r: 0.90, name: 'Fisura de Basalto Escoriáceo' },
      { x: -8.2, z: 20.0, r: 1.15, name: 'Cresta Arcillosa Deltaica' },
      { x: -3.5, z: 23.5, r: 0.85, name: 'Afloramiento Sedimentario' },
      { x: 3.8, z: 21.0, r: 0.95, name: 'Rocas de Impacto Metamórficas' },
      { x: 10.5, z: 23.0, r: 1.05, name: 'Escarpe Rocoso Meseta Norte' },
      { x: 5.2, z: 26.8, r: 0.80, name: 'Campo de Bloques Boreal' },
    ];

    // Real NASA geological collectible samples dispersed across distinct quadrants
    const collectibleSamples: MarsCollectibleSample[] = [
      {
        id: 'sample-hematita',
        name: 'Nódulo de Hematita ("Martian Blueberries")',
        mineral: 'Óxido de Hierro Fe₂O₃',
        nasaMission: 'Opportunity PDS (Meridiani / Isidis)',
        x: 8.5,
        z: 7.2,
        description: 'Concreción esférica formada por precipitación en aguas subterráneas ácidas antiguas.',
        collected: false,
      },
      {
        id: 'sample-yeso',
        name: 'Vena de Yeso Hidratado',
        mineral: 'Sulfato de Calcio CaSO₄·2H₂O',
        nasaMission: 'Curiosity MSL-SAM (Gale / Isidis)',
        x: -9.5,
        z: 12.8,
        description: 'Venas minerales blancas cristalizadas en fisuras por salmueras evaporíticas.',
        collected: false,
      },
      {
        id: 'sample-filosilicatos',
        name: 'Testigo de Esmectita Férmica',
        mineral: 'Arcilla de Silicato Hidratada',
        nasaMission: 'Perseverance Mars 2020 SuperCam',
        x: -5.2,
        z: 21.0,
        description: 'Mineral arcilloso formado en ambientes lacustres habitables de pH neutro.',
        collected: false,
      },
    ];

    // Moon gameplay variables
    let moonPerilune = 4200;
    let moonApolune = 88000;
    let moonOrbitLock = 0;
    let moonLocked = false;

    // Keyboard state tracking for Mars driving & sample extraction
    const keysPressed = {
      w: false,
      s: false,
      a: false,
      d: false,
      e: false,
      ArrowUp: false,
      ArrowDown: false,
      ArrowLeft: false,
      ArrowRight: false,
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (pausedRef.current || document.querySelector('dialog[open]') || (e.target as HTMLElement)?.closest('input,select,textarea')) return;
      const key = e.key.toLowerCase();
      if (['w', 's', 'a', 'd', 'e', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) {
        if (key === 'w' || key === 'arrowup') keysPressed.w = true;
        if (key === 's' || key === 'arrowdown') keysPressed.s = true;
        if (key === 'a' || key === 'arrowleft') keysPressed.a = true;
        if (key === 'd' || key === 'arrowright') keysPressed.d = true;
        if (key === 'e') keysPressed.e = true;
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key === 'w' || key === 'arrowup') keysPressed.w = false;
      if (key === 's' || key === 'arrowdown') keysPressed.s = false;
      if (key === 'a' || key === 'arrowleft') keysPressed.a = false;
      if (key === 'd' || key === 'arrowright') keysPressed.d = false;
      if (key === 'e') {
        keysPressed.e = false;
        extractHoldTime = 0;
      }
    };

    const onWindowBlur = () => {
      keysPressed.w = false;
      keysPressed.s = false;
      keysPressed.a = false;
      keysPressed.d = false;
      keysPressed.e = false;
      keysPressed.ArrowUp = false;
      keysPressed.ArrowDown = false;
      keysPressed.ArrowLeft = false;
      keysPressed.ArrowRight = false;
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onWindowBlur);

    // Build destination scene
    if (destinationType === 'mars') {
      buildInteractiveMarsScene(scene, cleanups, animRefs.current, obstacles, beaconTarget, collectibleSamples, isSoftwareGl);
    } else if (destinationType === 'moon') {
      buildInteractiveMoonScene(scene, cleanups, animRefs.current, selectedComponents, isSoftwareGl, maxAnisotropy);
    } else {
      buildInteractiveL2Scene(scene, cleanups, animRefs.current, isSoftwareGl, maxAnisotropy);
    }

    // 4. Mouse / Touch Controls & Raycasting
    let isDragging = false;
    let prevMouseX = 0;
    let prevMouseY = 0;
    // Mars starts with camera positioned south of rover (theta = PI), looking north (+Z)
    let sphericalTheta = destinationType === 'mars' ? Math.PI : Math.atan2(camera.position.x, camera.position.z);
    let sphericalPhi = destinationType === 'mars' ? 1.05 : Math.acos(camera.position.y / (camera.position.length() || 1));
    let sphericalRadius = destinationType === 'mars' ? 14.5 : camera.position.length();

    // Prevent context menu to allow clean right-mouse drag
    const onContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };
    container.addEventListener('contextmenu', onContextMenu);

    const onPointerDown = (e: MouseEvent) => {
      if (e.button === 0 || e.button === 2) {
        isDragging = true;
        prevMouseX = e.clientX;
        prevMouseY = e.clientY;

        // In L2 mode, raycast on mirror segments
        if (destinationType === 'deep_space' && animRefs.current.telescopeHexagons) {
          const rect = container.getBoundingClientRect();
          mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
          mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
          raycaster.setFromCamera(mouse, camera);

          const intersects = raycaster.intersectObjects(animRefs.current.telescopeHexagons);
          if (intersects.length > 0) {
            const hitMesh = intersects[0].object as THREE.Mesh;
            const segmentId = hitMesh.userData.segmentId;
            if (segmentId !== undefined && inputsRef.current.onL2SelectSegment) {
              sounds.playClick();
              inputsRef.current.onL2SelectSegment(segmentId);
            }
          }
        }
      }
    };

    const maxPhi = destinationType === 'mars' ? Math.PI / 2.05 : Math.PI - 0.24;

    const onPointerMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const deltaX = e.clientX - prevMouseX;
      const deltaY = e.clientY - prevMouseY;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;

      sphericalTheta -= deltaX * 0.0055;
      sphericalPhi = Math.max(0.20, Math.min(maxPhi, sphericalPhi - deltaY * 0.0055));

      // For non-mars scenes, update directly
      if (destinationType !== 'mars') {
        camera.position.x = currentLookAt.x + sphericalRadius * Math.sin(sphericalPhi) * Math.sin(sphericalTheta);
        camera.position.y = currentLookAt.y + sphericalRadius * Math.cos(sphericalPhi);
        camera.position.z = currentLookAt.z + sphericalRadius * Math.sin(sphericalPhi) * Math.cos(sphericalTheta);
        camera.lookAt(currentLookAt);
      }
    };

    const onPointerUp = () => {
      isDragging = false;
    };

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        isDragging = true;
        prevMouseX = e.touches[0].clientX;
        prevMouseY = e.touches[0].clientY;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!isDragging || e.touches.length !== 1) return;
      const deltaX = e.touches[0].clientX - prevMouseX;
      const deltaY = e.touches[0].clientY - prevMouseY;
      prevMouseX = e.touches[0].clientX;
      prevMouseY = e.touches[0].clientY;

      sphericalTheta -= deltaX * 0.0055;
      sphericalPhi = Math.max(0.20, Math.min(maxPhi, sphericalPhi - deltaY * 0.0055));

      if (destinationType !== 'mars') {
        camera.position.x = currentLookAt.x + sphericalRadius * Math.sin(sphericalPhi) * Math.sin(sphericalTheta);
        camera.position.y = currentLookAt.y + sphericalRadius * Math.cos(sphericalPhi);
        camera.position.z = currentLookAt.z + sphericalRadius * Math.sin(sphericalPhi) * Math.cos(sphericalTheta);
        camera.lookAt(currentLookAt);
      }
    };

    const onTouchEnd = () => {
      isDragging = false;
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const minRadius = destinationType === 'mars' ? 5.5 : 3.2;
      const maxRadius = destinationType === 'mars' ? 26.0 : 24.0;
      sphericalRadius = Math.max(minRadius, Math.min(maxRadius, sphericalRadius + e.deltaY * 0.015));

      if (destinationType !== 'mars') {
        camera.position.x = currentLookAt.x + sphericalRadius * Math.sin(sphericalPhi) * Math.sin(sphericalTheta);
        camera.position.y = currentLookAt.y + sphericalRadius * Math.cos(sphericalPhi);
        camera.position.z = currentLookAt.z + sphericalRadius * Math.sin(sphericalPhi) * Math.cos(sphericalTheta);
        camera.lookAt(currentLookAt);
      }
    };

    container.addEventListener('mousedown', onPointerDown);
    window.addEventListener('mousemove', onPointerMove);
    window.addEventListener('mouseup', onPointerUp);
    container.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onTouchEnd, { passive: true });
    container.addEventListener('wheel', onWheel, { passive: false });

    // 5. Main Animation & Physics Loop
    let reqId = 0;
    let isDisposed = false;
    let lastTime = performance.now();
    let lastTelemEmitTime = 0;
    let lastDriveSoundTime = 0;
    let lastBurnSoundTime = 0;
    let lastMarsStateSig = '';
    let lastMoonStateSig = '';
    let lastL2StateSig = '';
    const stowedSampleScale = new THREE.Vector3(0.01, 0.01, 0.01);
    const lookTargetVec = new THREE.Vector3();
    const desiredCamVec = new THREE.Vector3();

    function afterDraw(cb: () => void) {
      if (isDisposed) return;
      const gl = renderer.getContext() as WebGL2RenderingContext;
      if (!gl || gl.isContextLost()) return;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      if (!sync) {
        reqId = window.setTimeout(cb, 80);
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
          reqId = window.setTimeout(poll, 5);
        } else {
          gl.deleteSync(sync);
          reqId = window.setTimeout(cb, 80);
        }
      };
      reqId = window.setTimeout(poll, 5);
    }

    const animate = () => {
      if (isDisposed) return;
      const time = performance.now();
      const rawDt = Math.max(0.001, (time - lastTime) / 1000);
      const pausedNow = pausedRef.current || !!document.querySelector('dialog[open]');
      const dt = pausedNow ? 0 : Math.min(isSoftwareGl ? 0.18 : 0.05, rawDt);
      const wallDt = pausedNow ? 0 : Math.min(1.0, rawDt);
      lastTime = time;

      // ----------------------------------------------------
      // 1. MARS ROVER 3D PHYSICS & DRIVING
      // ----------------------------------------------------
      if (destinationType === 'mars' && animRefs.current.roverGroup) {
        const rover = animRefs.current.roverGroup;
        const input = inputsRef.current.marsDriveInput;

        const isForward = keysPressed.w || input.forward;
        const isBackward = keysPressed.s || input.backward;
        const isLeft = keysPressed.a || input.turnLeft || !!input.strafeLeft;
        const isRight = keysPressed.d || input.turnRight || !!input.strafeRight;
        const isHoldingE = keysPressed.e || !!input.holdExtract;

        let recentSampleName: string | null = null;
        let nearestSample: MarsCollectibleSample | null = null;
        let nearestDist = Infinity;

        // Check proximity to uncollected NASA samples (2.8m detection radius)
        for (const sample of collectibleSamples) {
          if (!sample.collected) {
            const dist = Math.hypot(roverX - sample.x, roverZ - sample.z);
            if (dist < 2.8 && dist < nearestDist) {
              nearestSample = sample;
              nearestDist = dist;
            }
          }
        }

        // Camera Forward & Right ground projection vectors for directional strafe (Forward × Up)
        const basis = getCameraBasisXZ(sphericalTheta);

        // Calculate directional input axes
        let moveFwd = 0;
        let moveStrafe = 0;
        if (isForward) moveFwd += 1;
        if (isBackward) moveFwd -= 1;
        if (isRight) moveStrafe += 1;
        if (isLeft) moveStrafe -= 1;

        const hasMoveInput = moveFwd !== 0 || moveStrafe !== 0;

        if (!marsTargetReached) {
          // Calculate target velocity based on camera forward and strict screen-aligned strafe vectors
          const maxSpeed = 3.0; // m/s (~10.8 km/h)
          const { vx: targetVelX, vz: targetVelZ } = computeStrafeTargetVelocity(
            moveFwd,
            moveStrafe,
            basis,
            maxSpeed
          );

          if (hasMoveInput && time - lastDriveSoundTime > 170) {
            sounds.playRoverDrive();
            lastDriveSoundTime = time;
          }

          // Smooth velocity damping: rapid acceleration and stable braking
          velX = THREE.MathUtils.damp(velX, targetVelX, hasMoveInput ? 8.5 : 6.0, dt);
          velZ = THREE.MathUtils.damp(velZ, targetVelZ, hasMoveInput ? 8.5 : 6.0, dt);
          roverSpeed = Math.hypot(velX, velZ);

          // Proposed next position
          const nextX = roverX + velX * dt;
          const nextZ = roverZ + velZ * dt;

          // Obstacle collision check with smooth tangential slide
          let hitObstacle: string | null = null;
          let hitObsRef: { x: number; z: number; r: number; name: string } | null = null;
          const roverRadius = 0.72;

          for (let obsIdx = 0; obsIdx < obstacles.length; obsIdx++) {
            const obs = obstacles[obsIdx];
            const distToObs = Math.hypot(nextX - obs.x, nextZ - obs.z);
            const minSafeDist = obs.r + roverRadius;
            if (distToObs < minSafeDist) {
              const localizedObsName = MARS_OBSTACLE_NAMES[langRef.current][obsIdx] || obs.name;
              hitObstacle = localizedObsName;
              hitObsRef = obs;

              // Tangential slide projection along obstacle boundary
              const nx = (nextX - obs.x) / (distToObs || 1);
              const nz = (nextZ - obs.z) / (distToObs || 1);

              roverX = obs.x + nx * (minSafeDist + 0.02);
              roverZ = obs.z + nz * (minSafeDist + 0.02);

              // Cancel velocity component pointing into the obstacle
              const normalDot = velX * nx + velZ * nz;
              if (normalDot < 0) {
                velX -= normalDot * nx;
                velZ -= normalDot * nz;
              }
              velX *= 0.7;
              velZ *= 0.7;

              if (collisionCooldown <= 0) {
                sounds.playCollision();
                collisionCooldown = 0.55;
                if (inputsRef.current.onMarsCollision) {
                  inputsRef.current.onMarsCollision(localizedObsName);
                }
              }
              break;
            }
          }

          if (!hitObsRef) {
            roverX = Math.max(-26, Math.min(26, nextX));
            roverZ = Math.max(0.5, Math.min(32, nextZ));
          }

          if (collisionCooldown > 0) collisionCooldown -= dt;

          // Compute exact terrain height at rover position
          const currentGroundY = getMarsHeight(roverX, roverZ);

          // Apply position flush on the ground (no sinking, no floating)
          rover.position.set(roverX, currentGroundY, roverZ);

          // Chassis heading: synchronize with camera gaze direction along shortest arc
          // Positive rotation.y makes local +Z match (fwdX, fwdZ) and rotate identically with camera left/right
          roverHeading = dampAngleShortest(roverHeading, basis.camGazeAngle, 8.0, dt);
          rover.rotation.order = 'YXZ';
          rover.rotation.y = getRoverModelYaw(roverHeading);

          // Natural slope alignment (pitch & roll in rover local frame)
          const slopeZ = (getMarsHeight(roverX, roverZ + 0.6) - getMarsHeight(roverX, roverZ - 0.6)) / 1.2;
          const slopeX = (getMarsHeight(roverX + 0.6, roverZ) - getMarsHeight(roverX - 0.6, roverZ)) / 1.2;
          const slopeFwd = slopeX * Math.sin(roverHeading) + slopeZ * Math.cos(roverHeading);
          const slopeRight = slopeX * -Math.cos(roverHeading) + slopeZ * Math.sin(roverHeading);
          rover.rotation.x = -Math.atan(slopeFwd);
          rover.rotation.z = -Math.atan(slopeRight);

          // Rotate wheels proportionally to physical displacement and steer into strafe direction
          if (animRefs.current.roverWheels) {
            const { steerAngleRad, rollSign } = getWheelSteerAndRoll(moveFwd, moveStrafe);
            animRefs.current.roverWheels.forEach((w) => {
              w.rotation.y = THREE.MathUtils.damp(w.rotation.y, steerAngleRad, 9.0, dt);
              w.rotation.x += roverSpeed * rollSign * dt * 7.5;
            });
          }

          // ------------------------------------------------------------------
          // HOLD 'E' SAMPLE EXTRACTION MECHANIC WITH ANIMATED ROTARY CORE DRILL
          // ------------------------------------------------------------------
          let currentExtractProgress = 0;
          let isExtractingNow = false;

          const activeSample = nearestSample;
          if (activeSample && isHoldingE) {
            isExtractingNow = true;
            extractHoldTime += Math.min(2.5, rawDt);
            currentExtractProgress = Math.min(100, (extractHoldTime / 1.2) * 100);

            // Procedural drill audio synthesis pulse
            if (time - lastDrillSoundTime > 180) {
              sounds.playDrillExtract(currentExtractProgress / 100);
              lastDrillSoundTime = time;
            }

            // Tilt robotic arm down to surface and spin drill turret
            if (animRefs.current.drillArm) {
              animRefs.current.drillArm.rotation.x = THREE.MathUtils.damp(
                animRefs.current.drillArm.rotation.x,
                1.15,
                6.0,
                dt
              );
            }
            if (animRefs.current.drillTurret) {
              animRefs.current.drillTurret.rotation.z += 28.0 * dt;
            }

            // Completed 100% extraction sequence
            if (currentExtractProgress >= 100) {
              activeSample.collected = true;
              collectedSampleIds.push(activeSample.id);
              const locSample = MARS_SAMPLE_COPY[langRef.current][activeSample.id];
              const localizedSample = locSample
                ? { ...activeSample, ...locSample }
                : activeSample;
              recentSampleName = localizedSample.name;
              sounds.playScan();
              sounds.playApproval();
              if (inputsRef.current.onMarsSampleCollected) {
                inputsRef.current.onMarsSampleCollected(localizedSample);
              }
              extractHoldTime = 0;
              currentExtractProgress = 0;
              isExtractingNow = false;
            }
          } else {
            // Immediate cancellation and reset if key released or rover moves away
            extractHoldTime = 0;
            currentExtractProgress = 0;
            isExtractingNow = false;

            if (animRefs.current.drillArm) {
              animRefs.current.drillArm.rotation.x = THREE.MathUtils.damp(
                animRefs.current.drillArm.rotation.x,
                0.35,
                4.0,
                dt
              );
            }
          }

          // Animate collectible sample meshes (gentle levitation and glowing scan ring)
          if (animRefs.current.sampleMeshes) {
            animRefs.current.sampleMeshes.forEach((sm, i) => {
              if (collectedSampleIds.includes(sm.id)) {
                // Stow into rover storage bay
                sm.group.scale.lerp(stowedSampleScale, dt * 6.0);
              } else {
                const sampleDef = collectibleSamples[i];
                const baseY = getMarsHeight(sampleDef.x, sampleDef.z);
                sm.group.position.y = baseY + 0.35 + Math.sin(time * 0.003 + i) * 0.05;
                sm.ring.rotation.z += 1.4 * dt;
              }
            });
          }

          // Distance to final sampling target beacon
          const distToBeacon = Math.hypot(roverX - beaconTarget.x, roverZ - beaconTarget.z);

          // AUTOMATIC MISSION COMPLETION ON BEACON ARRIVAL:
          // "apenas llegue el robot al punto necesario, la misión se complete y no tengas que darle a ningún botón"
          if (distToBeacon < 2.6 && !marsTargetReached) {
            marsTargetReached = true;
            roverSpeed = 0;
            sounds.playVictory();
            sounds.playTelemetryPing();
            if (inputsRef.current.onMarsSuccess) {
              inputsRef.current.onMarsSuccess();
            }
          }

          // Emit telemetry update (throttled to ~12Hz unless discrete state changed)
          if (inputsRef.current.onMarsTelemetryUpdate) {
            const locNear = nearestSample
              ? { ...nearestSample, ...(MARS_SAMPLE_COPY[langRef.current][nearestSample.id] || {}) }
              : null;
            const sig = `${marsTargetReached}|${nearestSample?.id || ''}|${isExtractingNow}|${collectedSampleIds.length}|${hitObstacle || ''}`;
            if (sig !== lastMarsStateSig || time - lastTelemEmitTime >= 85) {
              lastMarsStateSig = sig;
              lastTelemEmitTime = time;
              inputsRef.current.onMarsTelemetryUpdate({
                roverX,
                roverY: currentGroundY,
                roverZ,
                headingDeg: Math.round((((roverHeading * 180) / Math.PI) % 360 + 360) % 360),
                speedKmh: Math.round(Math.abs(roverSpeed) * 3.6 * 10) / 10,
                distanceToBeaconM: Math.round(distToBeacon * 10) / 10,
                targetReached: marsTargetReached,
                collisionWarning: hitObstacle,
                drillingProgress: marsTargetReached ? 100 : Math.round(currentExtractProgress),
                collectedSampleIds: [...collectedSampleIds],
                recentSampleName,
                nearSample: locNear,
                holdExtractProgress: Math.round(currentExtractProgress),
                isHoldingExtract: isExtractingNow,
              });
            }
          }
        } else {
          // Automated robotic arm deep coring sequence on site
          if (animRefs.current.drillArm) {
            animRefs.current.drillArm.rotation.x = THREE.MathUtils.damp(
              animRefs.current.drillArm.rotation.x,
              1.35,
              3.5,
              dt
            );
          }
          if (animRefs.current.drillTurret) {
            animRefs.current.drillTurret.rotation.z += 16.0 * dt;
          }
        }

        // Animate beacon ring rotation & pulse
        if (animRefs.current.beaconRing) {
          animRefs.current.beaconRing.rotation.z += 1.2 * dt;
        }

        // Follow camera: chase-cam smoothly following the rover, oriented solely by mouse drag & wheel
        // Decoupled completely from WASD movement!
        const roverGroundY = getMarsHeight(roverX, roverZ);
        lookTargetVec.set(roverX, roverGroundY + 0.9, roverZ);
        currentLookAt.lerp(lookTargetVec, dt * 7.5);

        // Smooth camera presets transition when not actively dragging
        if (!isDragging) {
          if (cameraViewRef.current === 'instrument') {
            sphericalRadius = THREE.MathUtils.damp(sphericalRadius, 7.2, 4.0, dt);
            sphericalPhi = THREE.MathUtils.damp(sphericalPhi, 0.95, 4.0, dt);
          } else if (cameraViewRef.current === 'cinematic' && document.documentElement.dataset.reducedMotion !== 'true') {
            sphericalRadius = THREE.MathUtils.damp(sphericalRadius, 21.0, 4.0, dt);
            sphericalPhi = THREE.MathUtils.damp(sphericalPhi, 1.25, 4.0, dt);
          }
        }

        // Calculate desired camera position in spherical orbit around currentLookAt
        const camOffsetX = sphericalRadius * Math.sin(sphericalPhi) * Math.sin(sphericalTheta);
        const camOffsetY = sphericalRadius * Math.cos(sphericalPhi);
        const camOffsetZ = sphericalRadius * Math.sin(sphericalPhi) * Math.cos(sphericalTheta);

        const desiredCamX = currentLookAt.x + camOffsetX;
        const desiredCamZ = currentLookAt.z + camOffsetZ;
        const groundAtCam = getMarsHeight(desiredCamX, desiredCamZ);
        // Ensure camera never clips into the terrain
        const desiredCamY = Math.max(currentLookAt.y + camOffsetY, groundAtCam + 1.25);

        desiredCamVec.set(desiredCamX, desiredCamY, desiredCamZ);
        camera.position.lerp(desiredCamVec, dt * 7.5);
        camera.lookAt(currentLookAt);
      }

      // ----------------------------------------------------
      // 2. MOON ARTEMIS IV NRHO INSERTION MANEUVER
      // ----------------------------------------------------
      if (destinationType === 'moon' && animRefs.current.craftGroup) {
        const craft = animRefs.current.craftGroup;
        const targetPitch = inputsRef.current.moonPitch;
        const isThrusting = inputsRef.current.moonThrust;

        // Smooth pitch orientation around orbital tangent
        const targetPitchRad = ((-targetPitch - 20) * Math.PI) / 180;
        craft.rotation.x += (targetPitchRad - craft.rotation.x) * dt * 4.0;

        // Slow lunar rotation below orbital craft
        if (animRefs.current.moonPlanet) {
          animRefs.current.moonPlanet.rotation.y += 0.008 * dt;
        }

        // Thruster flame plume visibility and flickering
        if (animRefs.current.engineFlame) {
          const flame = animRefs.current.engineFlame;
          if (isThrusting) {
            flame.visible = true;
            flame.scale.set(0.9 + Math.random() * 0.25, 0.8 + Math.random() * 0.45, 0.9 + Math.random() * 0.25);
            if (time - lastBurnSoundTime > 260) {
              sounds.playEngineBurn(true);
              lastBurnSoundTime = time;
            }

            // If pitch is within the nominal retro corridor (-25° to -15°)
            if (targetPitch >= -26 && targetPitch <= -14) {
              moonPerilune = Math.max(3000, moonPerilune - wallDt * 180);
              moonApolune = Math.max(70000, moonApolune - wallDt * 2500);
              moonOrbitLock = Math.min(100, moonOrbitLock + wallDt * 16);
            } else {
              moonPerilune += wallDt * 90;
              moonOrbitLock = Math.max(0, moonOrbitLock - wallDt * 8);
            }

            if (moonOrbitLock >= 90 && !moonLocked) {
              moonLocked = true;
              sounds.playVictory();
              sounds.playApproval();
              if (inputsRef.current.onMoonSuccess) inputsRef.current.onMoonSuccess();
            }
          } else {
            flame.visible = false;
          }
        }

        // Color orbital ellipse line based on lock
        if (animRefs.current.orbitLine) {
          const mat = animRefs.current.orbitLine.material as THREE.LineDashedMaterial;
          if (moonOrbitLock >= 90) {
            mat.color.setHex(0x10b981);
            mat.opacity = 0.9;
          } else {
            mat.color.setHex(0x38bdf8);
            mat.opacity = 0.45;
          }
        }

        // Emit Moon telemetry (throttled unless discrete state changed)
        if (inputsRef.current.onMoonTelemetryUpdate) {
          const isLockedNow = moonOrbitLock >= 90;
          const sig = `${targetPitch}|${isThrusting}|${isLockedNow}`;
          if (sig !== lastMoonStateSig || (isThrusting && time - lastTelemEmitTime >= 85)) {
            lastMoonStateSig = sig;
            lastTelemEmitTime = time;
            inputsRef.current.onMoonTelemetryUpdate({
              pitchAngleDeg: targetPitch,
              isThrusting,
              periluneKm: Math.round(moonPerilune),
              apoluneKm: Math.round(moonApolune),
              orbitLockPercent: Math.round(moonOrbitLock),
              isLocked: isLockedNow,
            });
          }
        }
      }

      // ----------------------------------------------------
      // 3. LAGRANGE L2 TELESCOPE MIRROR CALIBRATION
      // ----------------------------------------------------
      if (destinationType === 'deep_space' && animRefs.current.telescopeHexagons) {
        const hexes = animRefs.current.telescopeHexagons;
        const calibratedIds = inputsRef.current.l2CalibratedSegments;
        const selectedId = inputsRef.current.l2SelectedSegment;
        const isSunshieldTensioned = inputsRef.current.l2SunshieldTensioned;

        let totalCalibrated = 0;
        const misalignedIds = [2, 6, 11, 15];

        hexes.forEach((hex, idx) => {
          const isMisaligned = misalignedIds.includes(idx);
          const isCalibrated = calibratedIds.includes(idx);
          const baseRotX = (hex.userData.baseRotX as number) ?? 0;
          const baseRotY = (hex.userData.baseRotY as number) ?? 0;
          const baseZ = (hex.userData.baseZ as number) ?? 0.08;

          if (isMisaligned && !isCalibrated) {
            hex.rotation.x = baseRotX + 0.16 + Math.sin(time * 0.003 + idx) * 0.022;
            hex.rotation.y = baseRotY + Math.cos(time * 0.0025 + idx) * 0.022;
            hex.position.z = baseZ + 0.09;
            const mat = hex.material as THREE.MeshPhysicalMaterial;
            mat.emissive.setHex(selectedId === idx ? 0xff4400 : 0xcc6600);
            mat.emissiveIntensity = 0.55 + 0.28 * Math.sin(time * 0.006);
          } else {
            hex.rotation.x = THREE.MathUtils.damp(hex.rotation.x, baseRotX, 8, dt);
            hex.rotation.y = THREE.MathUtils.damp(hex.rotation.y, baseRotY, 8, dt);
            hex.position.z = THREE.MathUtils.damp(hex.position.z, baseZ, 8, dt);
            const mat = hex.material as THREE.MeshPhysicalMaterial;
            mat.emissive.setHex(selectedId === idx ? 0x0088ff : 0x3b2600);
            mat.emissiveIntensity = selectedId === idx ? 0.45 : 0.14;
            if (isMisaligned && isCalibrated) totalCalibrated++;
          }
        });

        // Animate 5-layer Kapton sunshield tensioning expansion
        if (animRefs.current.sunshieldLayers) {
          animRefs.current.sunshieldLayers.forEach((layerMesh) => {
            const layerIdx = (layerMesh.userData.layerIdx as number) ?? 0;
            const baseY = (layerMesh.userData.baseY as number) ?? 0;
            const spread = isSunshieldTensioned ? (layerIdx - 2) * 0.045 : 0;
            layerMesh.position.y = THREE.MathUtils.damp(layerMesh.position.y, baseY + spread, 5.5, dt);
          });
        }

        const remainingUncalibrated = 4 - totalCalibrated + (isSunshieldTensioned ? 0 : 1);
        const wavefrontError = 24 + remainingUncalibrated * 85;
        const strehlRatio = Math.max(0.18, 0.98 - remainingUncalibrated * 0.16);
        const isFull = remainingUncalibrated === 0;

        if (inputsRef.current.onL2TelemetryUpdate) {
          const sig = `${selectedId}|${calibratedIds.join(',')}|${isSunshieldTensioned}|${isFull}`;
          if (sig !== lastL2StateSig) {
            lastL2StateSig = sig;
            inputsRef.current.onL2TelemetryUpdate({
              selectedSegmentId: selectedId,
              calibratedSegments: calibratedIds,
              misalignedSegments: misalignedIds,
              sunshieldTensioned: isSunshieldTensioned,
              wavefrontErrorNm: Math.round(wavefrontError),
              strehlRatio: Math.round(strehlRatio * 100) / 100,
              isFullyCalibrated: isFull,
            });
          }
        }
      }

      // Non-Mars camera presets & auto-rotation
      if (destinationType !== 'mars') {
        if (!isDragging) {
          if (cameraViewRef.current === 'instrument') {
            sphericalRadius = THREE.MathUtils.damp(
              sphericalRadius,
              destinationType === 'moon' ? 5.2 : 5.0,
              3.5,
              dt
            );
          } else if (cameraViewRef.current === 'cinematic' && document.documentElement.dataset.reducedMotion !== 'true') {
            sphericalRadius = THREE.MathUtils.damp(
              sphericalRadius,
              destinationType === 'moon' ? 12.2 : 11.4,
              3.5,
              dt
            );
          }
          if (autoRotateRef.current && document.documentElement.dataset.reducedMotion !== 'true') {
            sphericalTheta += 0.16 * dt;
          }
          camera.position.x = currentLookAt.x + sphericalRadius * Math.sin(sphericalPhi) * Math.sin(sphericalTheta);
          camera.position.y = currentLookAt.y + sphericalRadius * Math.cos(sphericalPhi);
          camera.position.z = currentLookAt.z + sphericalRadius * Math.sin(sphericalPhi) * Math.cos(sphericalTheta);
          camera.lookAt(currentLookAt);
        }
      } else if (autoRotateRef.current && !isDragging && document.documentElement.dataset.reducedMotion !== 'true') {
        sphericalTheta += 0.15 * dt;
      }

      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(animate);
      } else {
        reqId = requestAnimationFrame(animate);
      }
    };

    animate();

    // 6. Resize Handler
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      if (w <= 0 || h <= 0) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      isDisposed = true;
      if (isSoftwareGl) {
        clearTimeout(reqId);
      } else {
        cancelAnimationFrame(reqId);
      }
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onWindowBlur);
      window.removeEventListener('resize', handleResize);
      container.removeEventListener('contextmenu', onContextMenu);
      container.removeEventListener('mousedown', onPointerDown);
      window.removeEventListener('mousemove', onPointerMove);
      window.removeEventListener('mouseup', onPointerUp);
      container.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      container.removeEventListener('wheel', onWheel);
      cleanups.forEach((c) => c());
      disposeHierarchy(scene);
      renderer.dispose();
    };
  }, [
    destinationType,
    selectedComponents.capsule?.id,
    selectedComponents.solar?.id,
    selectedComponents.oxygen?.id,
    selectedComponents.shield?.id,
    selectedComponents.engine?.id,
    selectedComponents.payload?.id,
  ]);

  return (
    <div className="relative w-full h-full select-none overflow-hidden">
      {/* Three.js Canvas Container */}
      <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Floating 3D Camera Controls */}
      <div className="absolute bottom-6 left-6 z-20 flex flex-wrap items-center gap-2 pointer-events-auto">
        <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-900/90 border border-slate-700/80 shadow-xl backdrop-blur-md">
          <button
            onClick={() => {
              sounds.playClick();
              setCameraView('overview');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
              cameraView === 'overview'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>{destT.camOverview}</span>
          </button>

          <button
            onClick={() => {
              sounds.playClick();
              setCameraView('instrument');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
              cameraView === 'instrument'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <ZoomIn className="w-3.5 h-3.5" />
            <span>{destT.camInstrument}</span>
          </button>

          <button
            onClick={() => {
              sounds.playClick();
              setCameraView('cinematic');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
              cameraView === 'cinematic'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>{destT.camCinematic}</span>
          </button>

          <div className="w-px h-5 bg-slate-700 mx-1" />

          <button
            onClick={() => {
              sounds.playClick();
              setAutoRotate((r) => !r);
            }}
            className={`p-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
              autoRotate ? 'text-emerald-400 bg-emerald-950/40 border border-emerald-500/30' : 'text-slate-400 hover:text-white'
            }`}
            title={destT.camAutoRotateTitle}
          >
            <RotateCw className={`w-3.5 h-3.5 ${autoRotate ? 'animate-spin' : ''}`} style={{ animationDuration: '6s' }} />
          </button>
        </div>
      </div>
    </div>
  );
};

// =========================================================================
// 1. MARS SCENE BUILDER WITH ELEVATION MAPPING, ROCKS & NASA SAMPLES
// =========================================================================
function buildInteractiveMarsScene(
  scene: THREE.Scene,
  cleanups: (() => void)[],
  animRefs: {
    roverGroup?: THREE.Group;
    roverWheels?: THREE.Group[];
    drillArm?: THREE.Group;
    drillTurret?: THREE.Mesh;
    beaconMesh?: THREE.Group;
    beaconRing?: THREE.Mesh;
    sampleMeshes?: { id: string; group: THREE.Group; ring: THREE.Mesh; collected: boolean }[];
  },
  obstacles: { x: number; z: number; r: number; name: string }[],
  beaconPos: { x: number; z: number },
  collectibleSamples: MarsCollectibleSample[],
  isSoftwareGl: boolean
) {
  // A. Procedural Surface Noise Texture for Sand & Rock Relief
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const imgData = ctx.createImageData(256, 256);
    for (let i = 0; i < imgData.data.length; i += 4) {
      const v = 128 + Math.floor((Math.random() - 0.5) * 55);
      imgData.data[i] = v;
      imgData.data[i + 1] = v;
      imgData.data[i + 2] = v;
      imgData.data[i + 3] = 255;
    }
    ctx.putImageData(imgData, 0, 0);
  }
  const noiseTex = new THREE.CanvasTexture(canvas);
  noiseTex.wrapS = THREE.RepeatWrapping;
  noiseTex.wrapT = THREE.RepeatWrapping;
  noiseTex.repeat.set(16, 16);

  // B. Martian Terrain Mesh generated with exact mathematical height
  const terrainSegs = isSoftwareGl ? 64 : 110;
  const terrainGeo = new THREE.PlaneGeometry(90, 90, terrainSegs, terrainSegs);
  terrainGeo.rotateX(-Math.PI / 2); // Local X = World X, Local Z = World Z, Local Y = World Y
  const posAttr = terrainGeo.attributes.position;
  const colors: number[] = [];

  const baseRed = new THREE.Color(0xb54d28);
  const darkBasalt = new THREE.Color(0x6e2412);
  const duneGold = new THREE.Color(0xcc6f3a);

  for (let i = 0; i < posAttr.count; i++) {
    const vx = posAttr.getX(i);
    const vz = posAttr.getZ(i);
    const vy = getMarsHeight(vx, vz);
    posAttr.setY(i, vy);

    // Color gradient based on elevation
    const colorFactor = (vy + 0.45) / 0.95;
    const vertexColor = baseRed.clone();
    if (colorFactor > 0.5) {
      vertexColor.lerp(duneGold, (colorFactor - 0.5) * 1.5);
    } else {
      vertexColor.lerp(darkBasalt, (0.5 - colorFactor) * 1.5);
    }
    colors.push(vertexColor.r, vertexColor.g, vertexColor.b);
  }

  terrainGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  terrainGeo.computeVertexNormals();

  const terrainMat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.92,
    metalness: 0.08,
    bumpMap: noiseTex,
    bumpScale: 0.06,
    flatShading: true,
  });
  const terrain = new THREE.Mesh(terrainGeo, terrainMat);
  terrain.position.set(0, 0, 0);
  terrain.receiveShadow = !isSoftwareGl;
  scene.add(terrain);

  // C. Specific Obstacle Boulders placed firmly on the surface
  const rockGeo = new THREE.DodecahedronGeometry(0.8, isSoftwareGl ? 0 : 1);
  const rockMat = new THREE.MeshStandardMaterial({
    color: 0x5a2012,
    roughness: 0.95,
    metalness: 0.1,
    bumpMap: noiseTex,
    bumpScale: 0.08,
    flatShading: true,
  });

  obstacles.forEach((obs) => {
    const rock = new THREE.Mesh(rockGeo, rockMat);
    const groundY = getMarsHeight(obs.x, obs.z);
    rock.position.set(obs.x, groundY + obs.r * 0.42, obs.z);
    rock.scale.set(obs.r, obs.r * 0.78, obs.r * 0.92);
    rock.rotation.set(Math.sin(obs.x) * 2.0, Math.cos(obs.z) * 2.0, Math.sin(obs.x * obs.z));
    rock.castShadow = !isSoftwareGl;
    rock.receiveShadow = !isSoftwareGl;
    scene.add(rock);
  });

  // D. Mars Lander Platform resting on flat landing pad
  const landerGroup = new THREE.Group();
  landerGroup.position.set(0, 0, -1.0);

  const deckGeo = new THREE.CylinderGeometry(1.6, 1.8, 0.45, 8);
  const deckMat = new THREE.MeshStandardMaterial({ color: 0xd8dde6, metalness: 0.65, roughness: 0.35 });
  const deck = new THREE.Mesh(deckGeo, deckMat);
  deck.position.y = 0.5;
  deck.castShadow = true;
  deck.receiveShadow = true;
  landerGroup.add(deck);

  const foilMat = new THREE.MeshStandardMaterial({ color: 0xd49b28, metalness: 0.88, roughness: 0.22 });
  const foilGeo = new THREE.CylinderGeometry(1.8, 1.2, 0.4, 8);
  const foil = new THREE.Mesh(foilGeo, foilMat);
  foil.position.y = 0.15;
  foil.castShadow = true;
  landerGroup.add(foil);

  // Deployment Ramp smoothly landing on Y = 0
  const rampGeo = new THREE.BoxGeometry(1.2, 0.06, 2.2);
  const rampMat = new THREE.MeshStandardMaterial({ color: 0x99a4ad, metalness: 0.85, roughness: 0.35 });
  const ramp = new THREE.Mesh(rampGeo, rampMat);
  ramp.position.set(0, 0.18, 1.7);
  ramp.rotation.x = 0.38;
  ramp.castShadow = true;
  ramp.receiveShadow = true;
  landerGroup.add(ramp);
  scene.add(landerGroup);

  // E. High-Detail Geological Rover (Curiosity / Perseverance Architecture)
  // Wheels bottom is exactly at y = 0 inside the group
  const roverGroup = new THREE.Group();
  roverGroup.position.set(0, getMarsHeight(0, 3.0), 3.0);

  // 1. Main Avionics Body
  const bodyGeo = new THREE.BoxGeometry(0.88, 0.44, 1.35);
  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    metalness: 0.25,
    roughness: 0.35,
  });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.y = 0.42;
  body.castShadow = true;
  body.receiveShadow = true;
  roverGroup.add(body);

  // Golden MLI Thermal Blanket Deck
  const deckFoilGeo = new THREE.BoxGeometry(0.82, 0.04, 1.25);
  const deckFoil = new THREE.Mesh(deckFoilGeo, foilMat);
  deckFoil.position.set(0, 0.65, 0);
  deckFoil.castShadow = true;
  roverGroup.add(deckFoil);

  // Side NASA Insignia Plaque
  const plaqueGeo = new THREE.BoxGeometry(0.02, 0.14, 0.24);
  const plaqueMat = new THREE.MeshStandardMaterial({ color: 0x0b3d91, metalness: 0.6, roughness: 0.3 });
  const plaque = new THREE.Mesh(plaqueGeo, plaqueMat);
  plaque.position.set(0.45, 0.42, 0.15);
  roverGroup.add(plaque);

  // 2. Rocker-Bogie Suspension Linkages (Left & Right)
  const titaniumMat = new THREE.MeshStandardMaterial({ color: 0x3a4048, metalness: 0.85, roughness: 0.3 });
  [-0.58, 0.58].forEach((sideX) => {
    // Main Rocker Tube
    const rockerGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.95, 8);
    const rocker = new THREE.Mesh(rockerGeo, titaniumMat);
    rocker.position.set(sideX, 0.32, 0.15);
    rocker.rotation.x = Math.PI / 4;
    rocker.castShadow = true;
    roverGroup.add(rocker);

    // Bogie Linkage Tube
    const bogieGeo = new THREE.CylinderGeometry(0.022, 0.022, 0.65, 8);
    const bogie = new THREE.Mesh(bogieGeo, titaniumMat);
    bogie.position.set(sideX, 0.26, -0.22);
    bogie.rotation.x = -Math.PI / 5;
    bogie.castShadow = true;
    roverGroup.add(bogie);
  });

  // 3. 6 Treaded Wheels with Outer Cleat Ridges & Titanium Hubs
  const wheels: THREE.Group[] = [];
  const tireMat = new THREE.MeshStandardMaterial({ color: 0x181b1e, roughness: 0.85, metalness: 0.35 });
  const rimMat = new THREE.MeshStandardMaterial({ color: 0xb0b8c4, metalness: 0.9, roughness: 0.2 });
  const hubStudMat = new THREE.MeshStandardMaterial({ color: 0xd4d8df, metalness: 0.95 });

  const wheelPositions = [
    { x: -0.66, y: 0.20, z: 0.52 },
    { x: 0.66, y: 0.20, z: 0.52 },
    { x: -0.70, y: 0.20, z: 0.0 },
    { x: 0.70, y: 0.20, z: 0.0 },
    { x: -0.66, y: 0.20, z: -0.52 },
    { x: 0.66, y: 0.20, z: -0.52 },
  ];

  const tireGeo = new THREE.CylinderGeometry(0.20, 0.20, 0.16, 18);
  const cleatRingGeo = new THREE.TorusGeometry(0.205, 0.015, 6, 18);

  wheelPositions.forEach((wp) => {
    const wheelGroup = new THREE.Group();
    wheelGroup.position.set(wp.x, wp.y, wp.z);

    const tire = new THREE.Mesh(tireGeo, tireMat);
    tire.rotation.z = Math.PI / 2;
    tire.castShadow = true;
    tire.receiveShadow = true;
    wheelGroup.add(tire);

    const cleatRing = new THREE.Mesh(cleatRingGeo, tireMat);
    cleatRing.rotation.y = Math.PI / 2;
    wheelGroup.add(cleatRing);

    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.10, 0.17, 10), rimMat);
    hub.rotation.z = Math.PI / 2;
    wheelGroup.add(hub);

    const stud = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.18, 6), hubStudMat);
    stud.rotation.z = Math.PI / 2;
    wheelGroup.add(stud);

    roverGroup.add(wheelGroup);
    wheels.push(wheelGroup);
  });
  animRefs.roverWheels = wheels;

  // 4. Rear MMRTG (Multi-Mission Radioisotope Thermoelectric Generator)
  const mmrtgGroup = new THREE.Group();
  mmrtgGroup.position.set(0, 0.52, -0.72);
  const mmrtgBody = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.12, 0.38, 12),
    new THREE.MeshStandardMaterial({ color: 0x22252a, metalness: 0.8, roughness: 0.3 })
  );
  mmrtgBody.rotation.x = Math.PI / 2;
  mmrtgBody.castShadow = true;
  mmrtgGroup.add(mmrtgBody);

  // MMRTG Cooling Fins
  const finGeo = new THREE.BoxGeometry(0.34, 0.015, 0.32);
  const finMat = new THREE.MeshStandardMaterial({ color: 0x3b424a, metalness: 0.85, roughness: 0.25 });
  for (let f = 0; f < 4; f++) {
    const fin = new THREE.Mesh(finGeo, finMat);
    fin.rotation.z = (f * Math.PI) / 4;
    mmrtgGroup.add(fin);
  }
  roverGroup.add(mmrtgGroup);

  // 5. Mastcam Remote Sensing Mast (Stereo Optical Lenses & ChemCam)
  const mastPole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.035, 0.045, 0.90, 8),
    new THREE.MeshStandardMaterial({ color: 0xd0d7de, metalness: 0.85, roughness: 0.25 })
  );
  mastPole.position.set(0.24, 0.95, 0.38);
  mastPole.castShadow = true;
  roverGroup.add(mastPole);

  const mastHead = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.18, 0.22), bodyMat);
  mastHead.position.set(0.24, 1.42, 0.38);
  mastHead.castShadow = true;
  roverGroup.add(mastHead);

  // Dual Stereoscopic Optical Lenses (Mastcam-Z)
  const lensGeo = new THREE.CylinderGeometry(0.035, 0.035, 0.06, 12);
  const lensMat = new THREE.MeshStandardMaterial({ color: 0x051b3b, roughness: 0.1, metalness: 0.95 });
  [-0.08, 0.08].forEach((lx) => {
    const lens = new THREE.Mesh(lensGeo, lensMat);
    lens.position.set(0.24 + lx, 1.42, 0.50);
    lens.rotation.x = Math.PI / 2;
    roverGroup.add(lens);
  });

  // ChemCam Laser Spectrometer Sensor
  const chemCam = new THREE.Mesh(
    new THREE.CylinderGeometry(0.045, 0.045, 0.10, 10),
    new THREE.MeshStandardMaterial({ color: 0x212529, metalness: 0.9 })
  );
  chemCam.position.set(0.24, 1.54, 0.38);
  chemCam.rotation.x = Math.PI / 2;
  roverGroup.add(chemCam);

  // High Gain Parabolic Antenna (HGA)
  const dishGeo = new THREE.CylinderGeometry(0.18, 0.02, 0.06, 16);
  const dishMat = new THREE.MeshStandardMaterial({ color: 0xd8dde6, metalness: 0.75, roughness: 0.3 });
  const dish = new THREE.Mesh(dishGeo, dishMat);
  dish.position.set(-0.25, 0.85, -0.25);
  dish.rotation.x = -0.45;
  dish.rotation.z = -0.25;
  dish.castShadow = true;
  roverGroup.add(dish);

  // 6. Articulated 3-Segment Robotic Sampling Arm with Rotary Core Drill
  const arm = new THREE.Group();
  arm.position.set(-0.28, 0.44, 0.62);

  // Segment 1 (Shoulder to Elbow)
  const armSeg1 = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.48, 8), rimMat);
  armSeg1.position.set(0, 0.12, 0.18);
  armSeg1.rotation.x = 0.65;
  armSeg1.castShadow = true;
  arm.add(armSeg1);

  // Segment 2 (Elbow to Wrist)
  const armSeg2 = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.38, 8), rimMat);
  armSeg2.position.set(0, 0.06, 0.44);
  armSeg2.rotation.x = 0.25;
  armSeg2.castShadow = true;
  arm.add(armSeg2);

  // Drill Turret Housing
  const drillTurret = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.20, 10), rimMat);
  drillTurret.rotation.z = Math.PI / 2;
  drillTurret.position.set(0, -0.04, 0.58);
  drillTurret.castShadow = true;
  arm.add(drillTurret);

  // Core Coring Bit Spindle
  const bitGeo = new THREE.CylinderGeometry(0.015, 0.02, 0.16, 8);
  const bitMat = new THREE.MeshStandardMaterial({ color: 0x495057, metalness: 0.95, roughness: 0.15 });
  const bit = new THREE.Mesh(bitGeo, bitMat);
  bit.position.set(0, -0.14, 0.58);
  arm.add(bit);

  roverGroup.add(arm);

  animRefs.roverGroup = roverGroup;
  animRefs.drillArm = arm;
  animRefs.drillTurret = drillTurret;
  scene.add(roverGroup);

  // F. NASA Collectible Samples: Distinctive High-Quality 3D Mineral Formations
  const sampleMeshes: { id: string; group: THREE.Group; ring: THREE.Mesh; collected: boolean }[] = [];
  const sRingGeo = new THREE.TorusGeometry(0.48, 0.018, 6, 24);

  collectibleSamples.forEach((sample, idx) => {
    const sGroup = new THREE.Group();
    const groundY = getMarsHeight(sample.x, sample.z);
    sGroup.position.set(sample.x, groundY + 0.35, sample.z);

    // 1. Bedrock Host Matrix Plate
    const pedGeo = new THREE.CylinderGeometry(0.42, 0.50, 0.12, 10);
    const pedMat = new THREE.MeshStandardMaterial({
      color: 0x3d170e,
      roughness: 0.95,
      bumpMap: noiseTex,
      bumpScale: 0.06,
      flatShading: true,
    });
    const pedestal = new THREE.Mesh(pedGeo, pedMat);
    pedestal.position.set(0, -0.28, 0);
    pedestal.receiveShadow = true;
    sGroup.add(pedestal);

    // 2. Distinctive 3D Mineral Geometry based on actual NASA geology
    if (sample.id === 'sample-hematita') {
      // "Martian Blueberries" (Opportunity PDS): Clustered metallic dark spherules
      const berryMat = new THREE.MeshStandardMaterial({
        color: 0x2b2338,
        emissive: 0x4c1d95,
        emissiveIntensity: 0.35,
        metalness: 0.92,
        roughness: 0.18,
      });
      const berryOffsets = [
        { x: 0, y: 0.05, z: 0, s: 0.09 },
        { x: 0.10, y: 0.02, z: 0.08, s: 0.07 },
        { x: -0.11, y: 0.03, z: 0.05, s: 0.08 },
        { x: 0.06, y: 0.08, z: -0.09, s: 0.075 },
        { x: -0.08, y: 0.04, z: -0.08, s: 0.07 },
        { x: 0.02, y: 0.12, z: 0.04, s: 0.065 },
      ];
      berryOffsets.forEach((bo) => {
        const berry = new THREE.Mesh(new THREE.SphereGeometry(bo.s, 14, 14), berryMat);
        berry.position.set(bo.x, bo.y, bo.z);
        berry.castShadow = true;
        sGroup.add(berry);
      });
    } else if (sample.id === 'sample-yeso') {
      // Hydrated Gypsum Vein (Curiosity MSL): Translucent prismatic hexagonal crystal cluster
      // Use clearcoat + alpha instead of transmission to avoid an extra full-scene transmission render pass per frame
      const crystalMat = new THREE.MeshPhysicalMaterial({
        color: 0xe0f2fe,
        emissive: 0x0284c7,
        emissiveIntensity: 0.4,
        roughness: 0.12,
        metalness: 0.15,
        clearcoat: 1.0,
        sheen: 0.4,
        transparent: true,
        opacity: 0.88,
      });
      const crystalOffsets = [
        { x: 0, y: 0.12, z: 0, rotX: 0.1, rotZ: 0.05, h: 0.44, r: 0.06 },
        { x: 0.12, y: 0.08, z: 0.06, rotX: 0.3, rotZ: 0.25, h: 0.36, r: 0.05 },
        { x: -0.10, y: 0.09, z: 0.08, rotX: -0.2, rotZ: -0.3, h: 0.38, r: 0.055 },
        { x: -0.06, y: 0.06, z: -0.12, rotX: -0.35, rotZ: 0.15, h: 0.32, r: 0.045 },
        { x: 0.08, y: 0.07, z: -0.08, rotX: 0.15, rotZ: -0.25, h: 0.35, r: 0.05 },
      ];
      crystalOffsets.forEach((co) => {
        const crystal = new THREE.Mesh(new THREE.CylinderGeometry(co.r * 0.4, co.r, co.h, 6), crystalMat);
        crystal.position.set(co.x, co.y, co.z);
        crystal.rotation.set(co.rotX, 0, co.rotZ);
        crystal.castShadow = true;
        sGroup.add(crystal);
      });
    } else {
      // Ferric Smectite Core Tube (Perseverance M2020): Hermetic titanium sample core canister
      const canisterMat = new THREE.MeshStandardMaterial({
        color: 0xe2e8f0,
        metalness: 0.92,
        roughness: 0.18,
      });
      const canister = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.44, 16), canisterMat);
      canister.position.set(0, 0.10, 0);
      canister.rotation.z = 0.25;
      canister.castShadow = true;
      sGroup.add(canister);

      // Gold seal caps
      [-0.18, 0.18].forEach((cy) => {
        const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.052, 0.05, 12), foilMat);
        cap.position.set(-0.25 * cy, 0.10 + cy, 0);
        cap.rotation.z = 0.25;
        sGroup.add(cap);
      });

      // Emerald indicator status band
      const band = new THREE.Mesh(
        new THREE.CylinderGeometry(0.048, 0.048, 0.04, 12),
        new THREE.MeshBasicMaterial({ color: 0x10b981 })
      );
      band.position.set(0, 0.10, 0);
      band.rotation.z = 0.25;
      sGroup.add(band);
    }

    // Rotating Holographic Beacon Scanning Ring
    const ringColors = [0xf59e0b, 0x38bdf8, 0x10b981];
    const sRingMat = new THREE.MeshBasicMaterial({
      color: ringColors[idx],
      transparent: true,
      opacity: 0.85,
    });
    const sRing = new THREE.Mesh(sRingGeo, sRingMat);
    sRing.rotation.x = Math.PI / 2;
    sGroup.add(sRing);

    scene.add(sGroup);
    sampleMeshes.push({ id: sample.id, group: sGroup, ring: sRing, collected: false });
  });
  animRefs.sampleMeshes = sampleMeshes;

  // G. Scientific Deep Coring Beacon Target Site on North-East Plateau
  const beaconGroup = new THREE.Group();
  const beaconGroundY = getMarsHeight(beaconPos.x, beaconPos.z);
  beaconGroup.position.set(beaconPos.x, beaconGroundY, beaconPos.z);

  // Holographic cylinder beam
  const beamGeo = new THREE.CylinderGeometry(0.9, 0.9, 5.0, 16, 1, true);
  const beamMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.35,
    side: THREE.DoubleSide,
  });
  const beam = new THREE.Mesh(beamGeo, beamMat);
  beam.position.y = 2.5;
  beaconGroup.add(beam);

  // Ground Target Ring
  const ringGeo = new THREE.TorusGeometry(1.05, 0.05, 8, 24);
  const ringMat = new THREE.MeshBasicMaterial({ color: 0x10b981 });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.06;
  beaconGroup.add(ring);
  animRefs.beaconRing = ring;

  // Diamond Beacon Head
  const diamondGeo = new THREE.OctahedronGeometry(0.42);
  const diamondMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0284c7,
    emissiveIntensity: 0.85,
    metalness: 0.6,
    roughness: 0.2,
  });
  const diamond = new THREE.Mesh(diamondGeo, diamondMat);
  diamond.position.y = 5.2;
  beaconGroup.add(diamond);

  scene.add(beaconGroup);
  animRefs.beaconMesh = beaconGroup;

  cleanups.push(() => {
    terrainGeo.dispose();
    terrainMat.dispose();
    noiseTex.dispose();
    rockGeo.dispose();
    rockMat.dispose();
    deckGeo.dispose();
    deckMat.dispose();
    foilGeo.dispose();
    foilMat.dispose();
    rampGeo.dispose();
    rampMat.dispose();
    bodyGeo.dispose();
    bodyMat.dispose();
    deckFoilGeo.dispose();
    plaqueGeo.dispose();
    plaqueMat.dispose();
    titaniumMat.dispose();
    tireGeo.dispose();
    tireMat.dispose();
    cleatRingGeo.dispose();
    rimMat.dispose();
    hubStudMat.dispose();
    finGeo.dispose();
    finMat.dispose();
    dishGeo.dispose();
    dishMat.dispose();
    bitGeo.dispose();
    bitMat.dispose();
    sRingGeo.dispose();
    beamGeo.dispose();
    beamMat.dispose();
    ringGeo.dispose();
    ringMat.dispose();
    diamondGeo.dispose();
    diamondMat.dispose();
  });
}

// =========================================================================
// 2. MOON ARTEMIS IV SCENE BUILDER (PHOTOREALISTIC LUNAR TERRAIN + HANGAR SYNC)
// =========================================================================
function buildInteractiveMoonScene(
  scene: THREE.Scene,
  cleanups: (() => void)[],
  animRefs: {
    craftGroup?: THREE.Group;
    engineFlame?: THREE.Group;
    orbitLine?: THREE.Line;
    moonPlanet?: THREE.Mesh;
  },
  selectedComponents: Record<string, SpacecraftComponent>,
  isSoftwareGl: boolean,
  maxAnisotropy: number
) {
  // Deep starfield backdrop
  const starCount = isSoftwareGl ? 320 : 900;
  const starGeo = new THREE.BufferGeometry();
  const starPos = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    const r = 80 + Math.random() * 60;
    const th = Math.random() * Math.PI * 2;
    const ph = Math.acos(2 * Math.random() - 1);
    starPos[i * 3] = r * Math.sin(ph) * Math.cos(th);
    starPos[i * 3 + 1] = r * Math.cos(ph);
    starPos[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th);
  }
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  const starMat = new THREE.PointsMaterial({ color: 0xe2e8f0, size: 0.24, transparent: true, opacity: 0.85 });
  const starField = new THREE.Points(starGeo, starMat);
  scene.add(starField);

  // High-resolution cratered lunar globe with LRO albedo, displacement, normal, and roughness maps
  const lunarTextures = createLunarTextureSet(maxAnisotropy);
  const moonGeo = new THREE.SphereGeometry(18, isSoftwareGl ? 72 : 128, isSoftwareGl ? 54 : 96);
  moonGeo.computeTangents();
  const moonMat = new THREE.MeshStandardMaterial({
    map: lunarTextures.albedoMap,
    displacementMap: lunarTextures.displacementMap,
    displacementScale: 0.52,
    displacementBias: -0.24,
    normalMap: lunarTextures.normalMap,
    normalScale: new THREE.Vector2(2.15, 2.15),
    roughnessMap: lunarTextures.roughnessMap,
    roughness: 0.95,
    metalness: 0.02,
    envMapIntensity: 0.14,
  });
  const moon = new THREE.Mesh(moonGeo, moonMat);
  moon.position.set(0, -20.8, 0);
  moon.rotation.set(0.28, -0.75, 0.08);
  scene.add(moon);
  animRefs.moonPlanet = moon;

  // Photorealistic Earthrise framed in distant orbital sky
  const earthGroup = new THREE.Group();
  earthGroup.position.set(-5.8, 5.2, -30);
  const earthTex = createEarthTexture(maxAnisotropy);
  const earthGeo = new THREE.SphereGeometry(3.4, 48, 48);
  const earthMat = new THREE.MeshStandardMaterial({
    map: earthTex,
    roughness: 0.58,
    metalness: 0.06,
  });
  const earth = new THREE.Mesh(earthGeo, earthMat);
  earth.rotation.y = -0.6;
  earthGroup.add(earth);

  const earthAtmosGeo = new THREE.SphereGeometry(3.62, 40, 40);
  const earthAtmosMat = new THREE.MeshBasicMaterial({
    color: 0x60a5fa,
    transparent: true,
    opacity: 0.26,
    side: THREE.BackSide,
  });
  const earthAtmos = new THREE.Mesh(earthAtmosGeo, earthAtmosMat);
  earthGroup.add(earthAtmos);
  scene.add(earthGroup);

  // Synchronized User-Assembled Hangar Spacecraft orbiting Moon
  const craftGroup = new THREE.Group();
  craftGroup.position.set(0, 0.35, 0);

  const {
    spacecraftGroup: assembledCraft,
    engineMount,
    dispose: disposeCraft,
  } = buildAssembledSpacecraft(selectedComponents, isSoftwareGl, maxAnisotropy);

  // Orient full spacecraft stack horizontally along orbital velocity axis for retro-burn
  const craftPivot = new THREE.Group();
  craftPivot.scale.setScalar(0.72);
  craftPivot.rotation.set(-Math.PI * 0.44, 0.08, -0.22);
  craftPivot.add(assembledCraft);
  craftGroup.add(craftPivot);

  // Dynamic Engine Retro-Burn Plume attached directly to selected engineMount nozzle
  const engineId = selectedComponents.engine?.id || 'motor-bipropelente-merlin';
  const outerColor =
    engineId === 'motor-pesado-raptor'
      ? 0x38bdf8
      : engineId === 'propulsor-ionico-hall'
        ? 0x818cf8
        : 0xf97316;
  const innerColor =
    engineId === 'motor-pesado-raptor'
      ? 0xe0f2fe
      : engineId === 'propulsor-ionico-hall'
        ? 0xc4b5fd
        : 0xfef08a;

  const flameGroup = new THREE.Group();
  flameGroup.position.set(0, -0.75, 0);
  flameGroup.visible = false;

  const outerFlameGeo = new THREE.ConeGeometry(0.46, 1.9, 16);
  outerFlameGeo.rotateX(Math.PI);
  outerFlameGeo.translate(0, -0.95, 0);
  const outerFlameMat = new THREE.MeshBasicMaterial({
    color: outerColor,
    transparent: true,
    opacity: 0.65,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const outerFlame = new THREE.Mesh(outerFlameGeo, outerFlameMat);
  flameGroup.add(outerFlame);

  const innerFlameGeo = new THREE.ConeGeometry(0.24, 1.15, 14);
  innerFlameGeo.rotateX(Math.PI);
  innerFlameGeo.translate(0, -0.58, 0);
  const innerFlameMat = new THREE.MeshBasicMaterial({
    color: innerColor,
    transparent: true,
    opacity: 0.92,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const innerFlame = new THREE.Mesh(innerFlameGeo, innerFlameMat);
  flameGroup.add(innerFlame);

  engineMount.add(flameGroup);
  animRefs.engineFlame = flameGroup;

  scene.add(craftGroup);
  animRefs.craftGroup = craftGroup;

  // NRHO Orbital Ellipse Guide
  const orbitCurve = new THREE.EllipseCurve(0, 0, 12, 7, 0, 2 * Math.PI, false, 0);
  const orbitPoints = orbitCurve.getPoints(80).map((p) => new THREE.Vector3(p.x, -0.6 + p.y * 0.2, p.y));
  const orbitGeo = new THREE.BufferGeometry().setFromPoints(orbitPoints);
  const orbitMat = new THREE.LineDashedMaterial({
    color: 0x38bdf8,
    dashSize: 0.6,
    gapSize: 0.3,
    transparent: true,
    opacity: 0.45,
  });
  const orbitLine = new THREE.Line(orbitGeo, orbitMat);
  orbitLine.computeLineDistances();
  scene.add(orbitLine);
  animRefs.orbitLine = orbitLine;

  cleanups.push(() => {
    disposeCraft();
    lunarTextures.dispose();
    earthTex.dispose();
    starGeo.dispose();
    starMat.dispose();
    moonGeo.dispose();
    moonMat.dispose();
    earthGeo.dispose();
    earthMat.dispose();
    earthAtmosGeo.dispose();
    earthAtmosMat.dispose();
    outerFlameGeo.dispose();
    outerFlameMat.dispose();
    innerFlameGeo.dispose();
    innerFlameMat.dispose();
    orbitGeo.dispose();
    orbitMat.dispose();
  });
}

// =========================================================================
// 3. LAGRANGE L2 TELESCOPE BUILDER (JWST ARCHITECTURE)
// =========================================================================
function buildInteractiveL2Scene(
  scene: THREE.Scene,
  cleanups: (() => void)[],
  animRefs: {
    telescopeHexagons?: THREE.Mesh[];
    sunshieldLayers?: THREE.Mesh[];
  },
  isSoftwareGl: boolean,
  maxAnisotropy: number
) {
  // Deep space starfield around L2 halo orbit
  const starCount = isSoftwareGl ? 320 : 1000;
  const starGeo = new THREE.BufferGeometry();
  const starPos = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    const r = 70 + Math.random() * 60;
    const th = Math.random() * Math.PI * 2;
    const ph = Math.acos(2 * Math.random() - 1);
    starPos[i * 3] = r * Math.sin(ph) * Math.cos(th);
    starPos[i * 3 + 1] = r * Math.cos(ph);
    starPos[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th);
  }
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  const starMat = new THREE.PointsMaterial({ color: 0xe2e8f0, size: 0.22, transparent: true, opacity: 0.8 });
  const starField = new THREE.Points(starGeo, starMat);
  scene.add(starField);

  const jwst = buildJWSTObservatory(isSoftwareGl, maxAnisotropy);
  animRefs.telescopeHexagons = jwst.hexagons;
  animRefs.sunshieldLayers = jwst.sunshieldLayers;
  scene.add(jwst.group);

  cleanups.push(() => {
    jwst.dispose();
    starGeo.dispose();
    starMat.dispose();
  });
}
