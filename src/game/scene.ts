/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 3D Tactical Battle Royale Simulation Engine (Three.js r160+)
 * Compliant with Three.js Skill & Ultra Mode Directives
 */

import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { WeaponData, ArmorItem, WeaponAttachmentSlots } from './types';
import { WEAPONS, HELMETS, VESTS, CIRCLE_PHASES, LIVIK_POIS } from './data';
import { calculateBulletDrop, calculateMitigatedDamage, computeAttachmentModifiers } from './ballistics';
import { soundSystem } from './audio';

// Reusable math helpers to prevent garbage collection in render loop
const _vec3A = new THREE.Vector3();
const _vec3B = new THREE.Vector3();
const _vec3C = new THREE.Vector3();
const _quatA = new THREE.Quaternion();

export interface BulletTracer {
  mesh: THREE.Mesh;
  startPos: THREE.Vector3;
  currentPos: THREE.Vector3;
  velocity: THREE.Vector3;
  originVelocityMuzzle: number;
  dragCoefficient: number;
  distanceTraveled: number;
  maxDistance: number;
  damage: number;
  isHeadshotMultiplier: number;
  fromPlayer: boolean;
  active: boolean;
  birthTime: number;
}

export interface EnemyBot {
  id: string;
  name: string;
  group: THREE.Group;
  health: number;
  maxHealth: number;
  isDead: boolean;
  position: THREE.Vector3;
  patrolTarget: THREE.Vector3;
  state: 'patrol' | 'alert' | 'attack' | 'dead';
  fireTimer: number;
  weapon: WeaponData;
  aimAngle: number;
  helmet: ArmorItem;
  vest: ArmorItem;
}

export interface LootCrate {
  group: THREE.Group;
  position: THREE.Vector3;
  type: 'airdrop' | 'death_crate' | 'ground_loot';
  weaponId?: string;
  ammoCaliber?: string;
  ammoCount?: number;
  medId?: string;
  armorLevel?: number;
  opened: boolean;
}

export interface TargetDummy {
  group: THREE.Group;
  position: THREE.Vector3;
  distanceMeters: number;
  health: number;
  maxHealth: number;
  lastHitTime: number;
}

export class TacticalGameEngine {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private isSoftwareGl: boolean = false;
  private isDestroyed: boolean = false;
  private frameId: number = 0;

  // Game Mode
  public gameMode: 'battle_royale' | 'firing_range' = 'battle_royale';

  // Terrain height sampling
  public terrainWidth = 1200;
  public terrainDepth = 1200;

  // Player state
  public player = {
    position: new THREE.Vector3(0, 5, 0),
    rotationY: 0,
    pitch: 0,
    velocity: new THREE.Vector3(),
    isGrounded: true,
    stance: 'stand' as 'stand' | 'crouch' | 'prone',
    isAiming: false,
    isSprinting: false,
    health: 100,
    maxHealth: 100,
    boost: 0, // 0-100
    helmet: HELMETS[2], // Military Lv.2
    vest: VESTS[2],     // Military Lv.2
    backpackCapacity: 250,
    currentWeight: 110,
    primaryWeapon: WEAPONS['m416'],
    secondaryWeapon: WEAPONS['kar98k'],
    activeWeaponSlot: 'primary' as 'primary' | 'secondary',
    primaryAmmo: 30,
    secondaryAmmo: 5,
    reserveAmmo: {
      '5.56mm': 180,
      '7.62mm': 50,
      '9mm': 60,
      '.45 ACP': 40,
      '.300 Magnum': 10,
    },
    attachments: {
      primary: {
        muzzle: 'compensator',
        grip: 'vertical',
        magazine: 'extended_quickdraw',
        sight: 'red_dot',
        stock: 'tactical_stock',
      } as WeaponAttachmentSlots,
      secondary: {
        muzzle: 'suppressor',
        grip: undefined,
        magazine: undefined,
        sight: '4x',
        stock: 'cheek_pad',
      } as WeaponAttachmentSlots,
    },
    kills: 0,
    damageDealt: 0,
    shotsFired: 0,
    shotsHit: 0,
    headshots: 0,
    isReloading: false,
    reloadProgress: 0,
    recoilKick: 0,
    recoilRecovery: 0,
  };

  // Input states
  public keysHeld: Record<string, boolean> = {};
  public mouseLeftHeld: boolean = false;
  public mouseRightHeld: boolean = false;
  public lastFireTime: number = 0;

  // Hitstop & camera shake
  private hitstopUntilTime: number = 0;
  private cameraShakeIntensity: number = 0;

  // Object pools
  private tracers: BulletTracer[] = [];
  private enemies: EnemyBot[] = [];
  private lootCrates: LootCrate[] = [];
  private targetDummies: TargetDummy[] = [];

  // 3D Meshes
  private playerMeshGroup: THREE.Group = new THREE.Group();
  private blueZoneCylinder!: THREE.Mesh;
  private airdropMeshGroup: THREE.Group = new THREE.Group();
  private airdropActive: boolean = false;
  private airdropPos: THREE.Vector3 = new THREE.Vector3(120, 180, -100);

  // Circle State
  public circleCurrentPhase = 0;
  public circlePhaseTimer = 0;
  public circleRadius = 700;
  public circleTargetRadius = 700;
  public circleCenter = new THREE.Vector2(0, 0);
  public isPlayerInBlueZone: boolean = false;
  public alivePlayersCount = 32;

  // Callbacks to notify React HUD (debounced / on change)
  public onStateUpdate?: (data: {
    health: number;
    boost: number;
    helmetDurability: number;
    helmetMax: number;
    vestDurability: number;
    vestMax: number;
    activeWeapon: WeaponData;
    currentMag: number;
    reserveAmmo: number;
    isAiming: boolean;
    stance: 'stand' | 'crouch' | 'prone';
    circlePhase: number;
    circleTimer: number;
    inBlueZone: boolean;
    aliveCount: number;
    kills: number;
    damageDealt: number;
    playerPos: { x: number; y: number; z: number };
    playerHeadingDeg: number;
  }) => void;

  public onHitFeedback?: (isHeadshot: boolean, damage: number) => void;
  public onTacticalCallout?: (urdu: string, en: string) => void;

  constructor(container: HTMLElement, mode: 'battle_royale' | 'firing_range' = 'battle_royale') {
    this.container = container;
    this.gameMode = mode;

    // 1. Detect Software WebGL
    this.isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    // 2. Setup Three.js Renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(this.renderer.domElement);

    // 3. Scene & Camera
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x7da4bd); // Atmospheric Nordic sky
    this.scene.fog = new THREE.FogExp2(0x7da4bd, 0.0018);

    this.camera = new THREE.PerspectiveCamera(
      70,
      container.clientWidth / container.clientHeight,
      0.1,
      1400
    );

    // 4. Studio Environment Reflection via RoomEnvironment
    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // 5. Lighting Rig
    this.setupLighting();

    // 6. Build World Geometry
    this.buildTerrain();
    this.buildLivikStructures();
    this.buildPlayerModel();
    this.buildBlueZone();
    this.initPools();

    if (this.gameMode === 'battle_royale') {
      this.spawnEnemyBots(8);
      this.spawnLootPickups(24);
      this.spawnAirdrop();
    } else {
      this.buildFiringRangeTargets();
    }

    // 7. Event Listeners
    this.setupInputHandlers();

    // 8. Start Loop
    this.lastFrameTime = performance.now();
    this.tick();
  }

  private lastFrameTime = 0;

  private setupLighting() {
    // Key Directional Sun
    const sunLight = new THREE.DirectionalLight(0xfffaed, 2.2);
    sunLight.position.set(150, 250, 100);
    sunLight.castShadow = !this.isSoftwareGl;
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
    sunLight.shadow.camera.near = 10;
    sunLight.shadow.camera.far = 600;
    const d = 160;
    sunLight.shadow.camera.left = -d;
    sunLight.shadow.camera.right = d;
    sunLight.shadow.camera.top = d;
    sunLight.shadow.camera.bottom = -d;
    sunLight.shadow.bias = -0.0005;
    sunLight.shadow.normalBias = 0.02;
    this.scene.add(sunLight);

    // Cool Hemisphere Sky/Ground Fill
    const hemiLight = new THREE.HemisphereLight(0xbad2e8, 0x3d4b36, 1.2);
    this.scene.add(hemiLight);
  }

  /**
   * Sample Nordic terrain height at any world coordinate (x, z)
   */
  public getTerrainHeight(x: number, z: number): number {
    // Rolling hills using procedural trigonometric harmonics
    const h1 = Math.sin(x * 0.006) * Math.cos(z * 0.006) * 14;
    const h2 = Math.sin(x * 0.015 + 1.2) * Math.cos(z * 0.012) * 5;
    const h3 = Math.sin((x + z) * 0.003) * 18;

    // Central valley for Midstein
    const distFromCenter = Math.sqrt(x * x + z * z);
    const valleyDampen = Math.min(1.0, distFromCenter / 200);

    return (h1 + h2 + h3) * valleyDampen;
  }

  private buildTerrain() {
    const size = this.terrainWidth;
    const segments = this.isSoftwareGl ? 64 : 128;
    const geo = new THREE.PlaneGeometry(size, size, segments, segments);
    geo.rotateX(-Math.PI / 2);

    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const y = this.getTerrainHeight(x, z);
      pos.setY(i, y);
    }
    geo.computeVertexNormals();

    // Procedural terrain material with grass/dirt texture palette
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#4a5d3f'; // Nordic tundra grass
    ctx.fillRect(0, 0, 512, 512);

    // Mottled earth details
    ctx.fillStyle = '#3a4732';
    for (let i = 0; i < 400; i++) {
      ctx.beginPath();
      ctx.arc(Math.random() * 512, Math.random() * 512, Math.random() * 8 + 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#5c5746'; // Dirt rocky patches
    for (let i = 0; i < 150; i++) {
      ctx.beginPath();
      ctx.arc(Math.random() * 512, Math.random() * 512, Math.random() * 14 + 4, 0, Math.PI * 2);
      ctx.fill();
    }

    const terrainTexture = new THREE.CanvasTexture(canvas);
    terrainTexture.wrapS = THREE.RepeatWrapping;
    terrainTexture.wrapT = THREE.RepeatWrapping;
    terrainTexture.repeat.set(24, 24);
    terrainTexture.colorSpace = THREE.SRGBColorSpace;

    const terrainMat = new THREE.MeshStandardMaterial({
      map: terrainTexture,
      roughness: 0.9,
      metalness: 0.05,
    });

    const terrainMesh = new THREE.Mesh(geo, terrainMat);
    terrainMesh.receiveShadow = !this.isSoftwareGl;
    this.scene.add(terrainMesh);

    // River water plane at low altitude
    const waterGeo = new THREE.PlaneGeometry(size * 1.2, 80);
    waterGeo.rotateX(-Math.PI / 2);
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x225577,
      roughness: 0.15,
      metalness: 0.8,
      transparent: true,
      opacity: 0.85,
    });
    const waterMesh = new THREE.Mesh(waterGeo, waterMat);
    waterMesh.position.set(0, -1.8, 180);
    this.scene.add(waterMesh);

    // Scattered Pine Trees & Boulders via InstancedMesh
    this.buildFoliageAndRocks();
  }

  private buildFoliageAndRocks() {
    // Pine Trees
    const treeTrunkGeo = new THREE.CylinderGeometry(0.3, 0.5, 3.5, 6);
    const treeFoliageGeo = new THREE.ConeGeometry(2.4, 6.0, 7);
    treeFoliageGeo.translate(0, 4.5, 0);

    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x3e2a1b, roughness: 0.95 });
    const foliageMat = new THREE.MeshStandardMaterial({ color: 0x1f3822, roughness: 0.85 });

    const treeCount = this.isSoftwareGl ? 60 : 180;
    const dummy = new THREE.Object3D();

    for (let i = 0; i < treeCount; i++) {
      const x = (Math.random() - 0.5) * 800;
      const z = (Math.random() - 0.5) * 800;
      // Skip center town
      if (Math.abs(x) < 80 && Math.abs(z) < 80) continue;

      const y = this.getTerrainHeight(x, z);
      const scale = 0.8 + Math.random() * 0.5;

      const treeGroup = new THREE.Group();
      const trunk = new THREE.Mesh(treeTrunkGeo, trunkMat);
      trunk.position.y = 1.75;
      trunk.castShadow = !this.isSoftwareGl;

      const crown = new THREE.Mesh(treeFoliageGeo, foliageMat);
      crown.castShadow = !this.isSoftwareGl;

      treeGroup.add(trunk);
      treeGroup.add(crown);
      treeGroup.position.set(x, y, z);
      treeGroup.scale.set(scale, scale, scale);
      treeGroup.rotation.y = Math.random() * Math.PI * 2;
      this.scene.add(treeGroup);
    }

    // Boulders
    const rockGeo = new THREE.DodecahedronGeometry(1.5, 1);
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x5a6065, roughness: 0.92 });
    for (let i = 0; i < (this.isSoftwareGl ? 30 : 70); i++) {
      const x = (Math.random() - 0.5) * 850;
      const z = (Math.random() - 0.5) * 850;
      const y = this.getTerrainHeight(x, z);
      const rock = new THREE.Mesh(rockGeo, rockMat);
      const s = 0.7 + Math.random() * 1.4;
      rock.scale.set(s * (0.8 + Math.random() * 0.4), s, s * (0.8 + Math.random() * 0.4));
      rock.position.set(x, y + s * 0.7, z);
      rock.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
      rock.castShadow = !this.isSoftwareGl;
      this.scene.add(rock);
    }
  }

  private buildLivikStructures() {
    // Midstein Buildings
    const concreteMat = new THREE.MeshStandardMaterial({ color: 0x7b848c, roughness: 0.85 });
    const brickMat = new THREE.MeshStandardMaterial({ color: 0x8a4f3d, roughness: 0.9 });
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x2b343d, roughness: 0.6 });

    // 4 major multi-story compound buildings around center
    const buildingPositions = [
      { x: -35, z: -30, w: 16, h: 10, d: 20 },
      { x: 35, z: -25, w: 20, h: 12, d: 18 },
      { x: -25, z: 40, w: 18, h: 9, d: 22 },
      { x: 40, z: 35, w: 22, h: 14, d: 24 },
    ];

    buildingPositions.forEach((b) => {
      const y = this.getTerrainHeight(b.x, b.z);
      const bGroup = new THREE.Group();

      // Main concrete block
      const bodyGeo = new THREE.BoxGeometry(b.w, b.h, b.d);
      const body = new THREE.Mesh(bodyGeo, concreteMat);
      body.position.y = b.h / 2;
      body.castShadow = !this.isSoftwareGl;
      body.receiveShadow = !this.isSoftwareGl;
      bGroup.add(body);

      // Roof rim
      const roofGeo = new THREE.BoxGeometry(b.w + 1, 0.8, b.d + 1);
      const roof = new THREE.Mesh(roofGeo, roofMat);
      roof.position.y = b.h + 0.4;
      bGroup.add(roof);

      // Windows
      const winGeo = new THREE.PlaneGeometry(1.6, 2.2);
      const winMat = new THREE.MeshStandardMaterial({ color: 0x1a2630, roughness: 0.2, metalness: 0.8 });
      for (let f = 2; f < b.h; f += 4) {
        for (let wx = -b.w / 2 + 3; wx < b.w / 2 - 2; wx += 4) {
          const winFront = new THREE.Mesh(winGeo, winMat);
          winFront.position.set(wx, f, b.d / 2 + 0.05);
          bGroup.add(winFront);

          const winBack = new THREE.Mesh(winGeo, winMat);
          winBack.position.set(wx, f, -b.d / 2 - 0.05);
          winBack.rotation.y = Math.PI;
          bGroup.add(winBack);
        }
      }

      bGroup.position.set(b.x, y, b.z);
      this.scene.add(bGroup);
    });

    // Military Watchtower at perimeter
    const towerGroup = new THREE.Group();
    const legGeo = new THREE.CylinderGeometry(0.25, 0.35, 14, 6);
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x474f57, metalness: 0.6, roughness: 0.4 });
    const legCoords = [
      [-3, -3],
      [3, -3],
      [-3, 3],
      [3, 3],
    ];
    legCoords.forEach(([lx, lz]) => {
      const leg = new THREE.Mesh(legGeo, metalMat);
      leg.position.set(lx, 7, lz);
      towerGroup.add(leg);
    });

    const cabinGeo = new THREE.BoxGeometry(7, 3.5, 7);
    const cabin = new THREE.Mesh(cabinGeo, brickMat);
    cabin.position.set(0, 14 + 1.75, 0);
    towerGroup.add(cabin);

    towerGroup.position.set(70, this.getTerrainHeight(70, -70), -70);
    this.scene.add(towerGroup);

    // Geothermal Basin Hot Springs Visual
    const steamPoolGeo = new THREE.CylinderGeometry(14, 16, 1, 16);
    const hotPoolMat = new THREE.MeshStandardMaterial({
      color: 0x4fd1c5,
      emissive: 0x14532d,
      roughness: 0.2,
      metalness: 0.3,
    });
    const pool = new THREE.Mesh(steamPoolGeo, hotPoolMat);
    pool.position.set(-180, this.getTerrainHeight(-180, 180) - 0.2, 180);
    this.scene.add(pool);
  }

  /**
   * Procedural 3-12 Part Tactical Operator (Player)
   */
  private buildPlayerModel() {
    this.playerMeshGroup = new THREE.Group();

    // 1. Boots & Legs
    const legGeo = new THREE.CylinderGeometry(0.2, 0.18, 1.0, 8);
    const camoPantsMat = new THREE.MeshStandardMaterial({ color: 0x485542, roughness: 0.85 });
    const bootMat = new THREE.MeshStandardMaterial({ color: 0x1f1f1f, roughness: 0.9, metalness: 0.2 });

    const leftLeg = new THREE.Mesh(legGeo, camoPantsMat);
    leftLeg.position.set(-0.25, 0.5, 0);
    const rightLeg = new THREE.Mesh(legGeo, camoPantsMat);
    rightLeg.position.set(0.25, 0.5, 0);

    const bootGeo = new THREE.BoxGeometry(0.3, 0.25, 0.55);
    const leftBoot = new THREE.Mesh(bootGeo, bootMat);
    leftBoot.position.set(-0.25, 0.12, 0.08);
    const rightBoot = new THREE.Mesh(bootGeo, bootMat);
    rightBoot.position.set(0.25, 0.12, 0.08);

    // 2. Torso with Tactical Armor Vest
    const torsoGeo = new THREE.BoxGeometry(0.75, 0.9, 0.45);
    const shirtMat = new THREE.MeshStandardMaterial({ color: 0x2f362e, roughness: 0.8 });
    const torso = new THREE.Mesh(torsoGeo, shirtMat);
    torso.position.y = 1.45;

    // Tactical Vest plate carrier
    const vestGeo = new THREE.BoxGeometry(0.82, 0.75, 0.52);
    const vestMat = new THREE.MeshStandardMaterial({ color: 0x222621, roughness: 0.7, metalness: 0.3 });
    const vestMesh = new THREE.Mesh(vestGeo, vestMat);
    vestMesh.position.y = 1.45;

    // Pouches on chest
    const pouchGeo = new THREE.BoxGeometry(0.2, 0.25, 0.12);
    const pouchMat = new THREE.MeshStandardMaterial({ color: 0x3d443a, roughness: 0.9 });
    for (let p = -0.22; p <= 0.22; p += 0.22) {
      const pouch = new THREE.Mesh(pouchGeo, pouchMat);
      pouch.position.set(p, 1.4, 0.28);
      this.playerMeshGroup.add(pouch);
    }

    // 3. Head & Level 2/3 Helmet
    const headGeo = new THREE.SphereGeometry(0.25, 12, 10);
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xd4a373, roughness: 0.6 });
    const head = new THREE.Mesh(headGeo, skinMat);
    head.position.y = 2.05;

    const helmetGeo = new THREE.SphereGeometry(0.32, 14, 12);
    const helmetMat = new THREE.MeshStandardMaterial({ color: 0x2d3732, metalness: 0.4, roughness: 0.5 });
    const helmet = new THREE.Mesh(helmetGeo, helmetMat);
    helmet.position.set(0, 2.12, -0.02);
    helmet.scale.set(1.0, 0.95, 1.1);

    // NVG Visor
    const visorGeo = new THREE.BoxGeometry(0.35, 0.12, 0.2);
    const visorMat = new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.9, roughness: 0.1 });
    const visor = new THREE.Mesh(visorGeo, visorMat);
    visor.position.set(0, 2.08, 0.26);

    // 4. Arms & Tactical Weapon in Hands
    const armGeo = new THREE.CylinderGeometry(0.12, 0.11, 0.75, 8);
    const leftArm = new THREE.Mesh(armGeo, shirtMat);
    leftArm.position.set(-0.48, 1.45, 0.2);
    leftArm.rotation.x = Math.PI / 4;
    leftArm.rotation.z = -Math.PI / 12;

    const rightArm = new THREE.Mesh(armGeo, shirtMat);
    rightArm.position.set(0.48, 1.45, 0.2);
    rightArm.rotation.x = Math.PI / 4;
    rightArm.rotation.z = Math.PI / 12;

    // 5. Tactical Backpack
    const packGeo = new THREE.BoxGeometry(0.65, 0.7, 0.35);
    const packMat = new THREE.MeshStandardMaterial({ color: 0x364032, roughness: 0.85 });
    const pack = new THREE.Mesh(packGeo, packMat);
    pack.position.set(0, 1.45, -0.35);

    // 6. Procedural Firearm (M416)
    const gunGroup = new THREE.Group();
    const gunBodyGeo = new THREE.BoxGeometry(0.12, 0.18, 0.8);
    const gunMat = new THREE.MeshStandardMaterial({ color: 0x151618, metalness: 0.8, roughness: 0.3 });
    const gunBody = new THREE.Mesh(gunBodyGeo, gunMat);

    const barrelGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.5, 8);
    barrelGeo.rotateX(Math.PI / 2);
    const barrel = new THREE.Mesh(barrelGeo, gunMat);
    barrel.position.set(0, 0.04, 0.6);

    const magGeo = new THREE.BoxGeometry(0.08, 0.25, 0.18);
    const mag = new THREE.Mesh(magGeo, gunMat);
    mag.position.set(0, -0.15, 0.1);
    mag.rotation.x = 0.2;

    const sightGeo = new THREE.BoxGeometry(0.08, 0.08, 0.15);
    const sightMat = new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.2 });
    const sight = new THREE.Mesh(sightGeo, sightMat);
    sight.position.set(0, 0.13, 0.0);

    gunGroup.add(gunBody);
    gunGroup.add(barrel);
    gunGroup.add(mag);
    gunGroup.add(sight);
    gunGroup.position.set(0.28, 1.35, 0.55);

    this.playerMeshGroup.add(leftLeg);
    this.playerMeshGroup.add(rightLeg);
    this.playerMeshGroup.add(leftBoot);
    this.playerMeshGroup.add(rightBoot);
    this.playerMeshGroup.add(torso);
    this.playerMeshGroup.add(vestMesh);
    this.playerMeshGroup.add(head);
    this.playerMeshGroup.add(helmet);
    this.playerMeshGroup.add(visor);
    this.playerMeshGroup.add(leftArm);
    this.playerMeshGroup.add(rightArm);
    this.playerMeshGroup.add(pack);
    this.playerMeshGroup.add(gunGroup);

    this.playerMeshGroup.position.copy(this.player.position);
    this.scene.add(this.playerMeshGroup);
  }

  /**
   * Dynamic Blue Zone Holographic Cylinder
   */
  private buildBlueZone() {
    const geo = new THREE.CylinderGeometry(this.circleRadius, this.circleRadius, 180, 48, 1, true);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x0ea5e9,
      transparent: true,
      opacity: 0.25,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.blueZoneCylinder = new THREE.Mesh(geo, mat);
    this.blueZoneCylinder.position.set(this.circleCenter.x, 80, this.circleCenter.y);
    this.scene.add(this.blueZoneCylinder);
  }

  private initPools() {
    // Tracer pool: 40 reusable laser/tracer lines
    const tracerGeo = new THREE.CylinderGeometry(0.04, 0.04, 2.5, 6);
    tracerGeo.rotateX(Math.PI / 2);
    const tracerMat = new THREE.MeshBasicMaterial({
      color: 0xfacc15, // Golden tactical tracer round
    });

    for (let i = 0; i < 40; i++) {
      const mesh = new THREE.Mesh(tracerGeo, tracerMat);
      mesh.visible = false;
      this.scene.add(mesh);
      this.tracers.push({
        mesh,
        startPos: new THREE.Vector3(),
        currentPos: new THREE.Vector3(),
        velocity: new THREE.Vector3(),
        originVelocityMuzzle: 880,
        dragCoefficient: 0.3,
        distanceTraveled: 0,
        maxDistance: 600,
        damage: 41,
        isHeadshotMultiplier: 2.3,
        fromPlayer: true,
        active: false,
        birthTime: 0,
      });
    }
  }

  /**
   * Spawn Enemy AI Bots with realistic patrol paths & tactical sightlines
   */
  public spawnEnemyBots(count: number = 8) {
    const botWeapons = [WEAPONS['akm'], WEAPONS['beryl_m762'], WEAPONS['ump45'], WEAPONS['mini14']];

    for (let i = 0; i < count; i++) {
      const group = new THREE.Group();
      // Procedural Bot Mesh (Red/Desert camo)
      const botMat = new THREE.MeshStandardMaterial({ color: 0x7c2d12, roughness: 0.8 });
      const botVestMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.6 });

      const torso = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.9, 0.4), botMat);
      torso.position.y = 1.45;
      const vest = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.75, 0.48), botVestMat);
      vest.position.y = 1.45;
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 10, 8), new THREE.MeshStandardMaterial({ color: 0x9a3412 }));
      head.position.y = 2.05;
      const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 8), new THREE.MeshStandardMaterial({ color: 0x262626 }));
      helmet.position.set(0, 2.12, 0);

      const legs = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.18, 1.0, 6), botMat);
      legs.position.set(0, 0.5, 0);

      group.add(torso);
      group.add(vest);
      group.add(head);
      group.add(helmet);
      group.add(legs);

      // Distribute bots around Midstein & POIs
      const angle = (i / count) * Math.PI * 2;
      const dist = 70 + Math.random() * 120;
      const x = Math.cos(angle) * dist;
      const z = Math.sin(angle) * dist;
      const y = this.getTerrainHeight(x, z);

      group.position.set(x, y, z);
      this.scene.add(group);

      const chosenWeapon = botWeapons[i % botWeapons.length];

      this.enemies.push({
        id: `bot_${i}`,
        name: `Operator_${100 + i}`,
        group,
        health: 100,
        maxHealth: 100,
        isDead: false,
        position: new THREE.Vector3(x, y, z),
        patrolTarget: new THREE.Vector3(x + (Math.random() - 0.5) * 40, y, z + (Math.random() - 0.5) * 40),
        state: 'patrol',
        fireTimer: Math.random() * 2,
        weapon: chosenWeapon,
        aimAngle: Math.random() * Math.PI * 2,
        helmet: HELMETS[1 + (i % 3)],
        vest: VESTS[1 + (i % 3)],
      });
    }
  }

  /**
   * Spawn Ground Loot Pickups
   */
  public spawnLootPickups(count: number = 24) {
    const weaponKeys = Object.keys(WEAPONS);
    const crateMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.5, metalness: 0.4 });
    const crateGeo = new THREE.BoxGeometry(0.9, 0.4, 0.6);

    for (let i = 0; i < count; i++) {
      const x = (Math.random() - 0.5) * 350;
      const z = (Math.random() - 0.5) * 350;
      const y = this.getTerrainHeight(x, z) + 0.2;

      const group = new THREE.Group();
      const crateMesh = new THREE.Mesh(crateGeo, crateMat);
      crateMesh.castShadow = !this.isSoftwareGl;
      group.add(crateMesh);

      // Light beam above crate for high visibility
      const beamGeo = new THREE.CylinderGeometry(0.08, 0.08, 3.5, 6);
      const beamMat = new THREE.MeshBasicMaterial({ color: 0xfef08a, transparent: true, opacity: 0.6 });
      const beam = new THREE.Mesh(beamGeo, beamMat);
      beam.position.y = 1.75;
      group.add(beam);

      group.position.set(x, y, z);
      this.scene.add(group);

      const wKey = weaponKeys[i % weaponKeys.length];
      this.lootCrates.push({
        group,
        position: new THREE.Vector3(x, y, z),
        type: 'ground_loot',
        weaponId: wKey,
        ammoCaliber: WEAPONS[wKey].caliber,
        ammoCount: 60,
        armorLevel: 2,
        opened: false,
      });
    }
  }

  /**
   * Spawn Airdrop Crate with Red Smoke Signal
   */
  public spawnAirdrop() {
    this.airdropActive = true;
    this.airdropPos.set(40 + (Math.random() - 0.5) * 80, 160, 40 + (Math.random() - 0.5) * 80);

    this.airdropMeshGroup = new THREE.Group();
    // Red & Blue military container
    const crateGeo = new THREE.BoxGeometry(2.4, 2.0, 2.4);
    const redMat = new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.4, metalness: 0.3 });
    const blueMat = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.4, metalness: 0.3 });

    const lowerPart = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.2, 2.4), redMat);
    lowerPart.position.y = 0.6;
    const upperCover = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.8, 2.5), blueMat);
    upperCover.position.y = 1.6;

    // Parachute canopy
    const canopyGeo = new THREE.SphereGeometry(4.0, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2);
    const canopyMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, side: THREE.DoubleSide });
    const canopy = new THREE.Mesh(canopyGeo, canopyMat);
    canopy.position.y = 7.5;

    this.airdropMeshGroup.add(lowerPart);
    this.airdropMeshGroup.add(upperCover);
    this.airdropMeshGroup.add(canopy);
    this.airdropMeshGroup.position.copy(this.airdropPos);

    this.scene.add(this.airdropMeshGroup);
    soundSystem.playAirdropSiren();

    if (this.onTacticalCallout) {
      this.onTacticalCallout('Airdrop Gira Hai Shumaal Mein!', 'Airdrop Inbound North! High tier loot.');
    }
  }

  /**
   * Build Target Dummies for Firing Range / Ballistics Lab Mode
   */
  private buildFiringRangeTargets() {
    const distances = [25, 50, 100, 200, 300];
    const targetMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.5 });
    const bullseyeMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });

    distances.forEach((d) => {
      const group = new THREE.Group();
      // Target board silhouette
      const board = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.2, 0.1), targetMat);
      board.position.y = 1.5;
      const bullseye = new THREE.Mesh(new THREE.CircleGeometry(0.35, 16), bullseyeMat);
      bullseye.position.set(0, 1.7, 0.06);

      // Support post
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 1.5, 8), new THREE.MeshStandardMaterial({ color: 0x475569 }));
      post.position.y = 0.75;

      group.add(board);
      group.add(bullseye);
      group.add(post);

      const targetX = 0;
      const targetZ = -d;
      const targetY = this.getTerrainHeight(targetX, targetZ);
      group.position.set(targetX, targetY, targetZ);

      this.scene.add(group);
      this.targetDummies.push({
        group,
        position: new THREE.Vector3(targetX, targetY, targetZ),
        distanceMeters: d,
        health: 100,
        maxHealth: 100,
        lastHitTime: 0,
      });
    });
  }

  /**
   * Fire active weapon with projectile ballistics, recoil climb & sound
   */
  public fireWeapon() {
    const now = performance.now();
    const activeWeapon = this.getActiveWeapon();
    const fireIntervalMs = (60 / activeWeapon.fireRateRPM) * 1000;

    if (now - this.lastFireTime < fireIntervalMs) return;
    if (this.player.isReloading) return;

    // Check ammo
    const currentMag = this.player.activeWeaponSlot === 'primary' ? this.player.primaryAmmo : this.player.secondaryAmmo;
    if (currentMag <= 0) {
      this.reloadWeapon();
      return;
    }

    // Decrement ammo
    if (this.player.activeWeaponSlot === 'primary') {
      this.player.primaryAmmo--;
    } else {
      this.player.secondaryAmmo--;
    }

    this.lastFireTime = now;
    this.player.shotsFired++;

    // Compute recoil & attachment modifiers
    const attachments = this.player.activeWeaponSlot === 'primary' ? this.player.attachments.primary : this.player.attachments.secondary;
    const mods = computeAttachmentModifiers(activeWeapon, attachments);

    // Apply vertical and horizontal recoil to pitch & yaw
    const vertClimb = (activeWeapon.verticalClimb * mods.verticalModifier * (this.player.isAiming ? 0.6 : 1.0) * (this.player.stance === 'crouch' ? 0.7 : this.player.stance === 'prone' ? 0.4 : 1.0)) * 0.012;
    const horizDrift = ((Math.random() - 0.5) * activeWeapon.horizontalDrift * mods.horizontalModifier) * 0.008;

    this.player.pitch += vertClimb;
    this.player.rotationY += horizDrift;
    this.cameraShakeIntensity = Math.min(this.cameraShakeIntensity + vertClimb * 2.5, 0.08);

    // Play procedural gunshot
    const isSuppressed = attachments.muzzle === 'suppressor';
    soundSystem.playGunshot(activeWeapon.caliber, isSuppressed);

    // Spawn tracer projectile
    this.spawnTracer(true, activeWeapon);
  }

  private spawnTracer(fromPlayer: boolean, weapon: WeaponData, originOverride?: THREE.Vector3, targetOverride?: THREE.Vector3) {
    const tracer = this.tracers.find((t) => !t.active);
    if (!tracer) return;

    let origin: THREE.Vector3;
    let forwardDir: THREE.Vector3;

    if (fromPlayer) {
      // Calculate barrel tip position in front of player camera
      origin = _vec3A.copy(this.camera.position).add(this.camera.getWorldDirection(_vec3B).multiplyScalar(0.8));
      forwardDir = this.camera.getWorldDirection(_vec3C);
      // Scope precision vs hipfire spread
      const spread = this.player.isAiming ? 0.002 : (this.player.stance === 'prone' ? 0.01 : 0.035);
      forwardDir.x += (Math.random() - 0.5) * spread;
      forwardDir.y += (Math.random() - 0.5) * spread;
      forwardDir.z += (Math.random() - 0.5) * spread;
      forwardDir.normalize();
    } else {
      origin = originOverride ?? new THREE.Vector3();
      forwardDir = targetOverride ? _vec3C.copy(targetOverride).sub(origin).normalize() : new THREE.Vector3(0, 0, -1);
      forwardDir.x += (Math.random() - 0.5) * 0.05;
      forwardDir.y += (Math.random() - 0.5) * 0.05;
      forwardDir.z += (Math.random() - 0.5) * 0.05;
      forwardDir.normalize();
    }

    tracer.active = true;
    tracer.mesh.visible = true;
    tracer.startPos.copy(origin);
    tracer.currentPos.copy(origin);
    tracer.originVelocityMuzzle = weapon.muzzleVelocity;
    tracer.dragCoefficient = weapon.dragCoefficient;
    tracer.velocity.copy(forwardDir).multiplyScalar(weapon.muzzleVelocity);
    tracer.distanceTraveled = 0;
    tracer.maxDistance = weapon.effectiveRange * 3.0;
    tracer.damage = weapon.baseDamage;
    tracer.isHeadshotMultiplier = weapon.headshotMultiplier;
    tracer.fromPlayer = fromPlayer;
    tracer.birthTime = performance.now();

    tracer.mesh.position.copy(origin);
    tracer.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), forwardDir);
  }

  public reloadWeapon() {
    if (this.player.isReloading) return;
    const activeWeapon = this.getActiveWeapon();
    const caliber = activeWeapon.caliber;
    const reserve = this.player.reserveAmmo[caliber] || 0;
    if (reserve <= 0) return;

    const attachments = this.player.activeWeaponSlot === 'primary' ? this.player.attachments.primary : this.player.attachments.secondary;
    const mods = computeAttachmentModifiers(activeWeapon, attachments);
    const capacity = mods.magCapacity;
    const currentMag = this.player.activeWeaponSlot === 'primary' ? this.player.primaryAmmo : this.player.secondaryAmmo;

    if (currentMag >= capacity) return;

    this.player.isReloading = true;
    this.player.reloadProgress = 0;
    soundSystem.playReload();

    const reloadDuration = activeWeapon.reloadTimeSec * mods.reloadTimeModifier * 1000;
    setTimeout(() => {
      if (this.isDestroyed) return;
      const needed = capacity - currentMag;
      const toLoad = Math.min(needed, this.player.reserveAmmo[caliber]);
      if (this.player.activeWeaponSlot === 'primary') {
        this.player.primaryAmmo += toLoad;
      } else {
        this.player.secondaryAmmo += toLoad;
      }
      this.player.reserveAmmo[caliber] -= toLoad;
      this.player.isReloading = false;
      this.player.reloadProgress = 1.0;
    }, reloadDuration);
  }

  public getActiveWeapon(): WeaponData {
    return this.player.activeWeaponSlot === 'primary' ? this.player.primaryWeapon : this.player.secondaryWeapon;
  }

  public switchWeapon() {
    this.player.activeWeaponSlot = this.player.activeWeaponSlot === 'primary' ? 'secondary' : 'primary';
    this.player.isReloading = false;
    soundSystem.playReload();
  }

  public useConsumable(itemKey: string) {
    if (itemKey === 'first_aid_kit') {
      soundSystem.playMedicalUse();
      setTimeout(() => {
        if (this.isDestroyed) return;
        this.player.health = Math.min(75, Math.max(this.player.health, 75));
      }, 6000);
    } else if (itemKey === 'medkit') {
      soundSystem.playMedicalUse();
      setTimeout(() => {
        if (this.isDestroyed) return;
        this.player.health = 100;
      }, 8000);
    } else if (itemKey === 'energy_drink') {
      soundSystem.playMedicalUse();
      setTimeout(() => {
        if (this.isDestroyed) return;
        this.player.boost = Math.min(100, this.player.boost + 40);
      }, 4000);
    } else if (itemKey === 'painkiller') {
      soundSystem.playMedicalUse();
      setTimeout(() => {
        if (this.isDestroyed) return;
        this.player.boost = Math.min(100, this.player.boost + 60);
      }, 6000);
    } else if (itemKey === 'adrenaline_syringe') {
      soundSystem.playMedicalUse();
      setTimeout(() => {
        if (this.isDestroyed) return;
        this.player.boost = 100;
      }, 6000);
    }
  }

  /**
   * Main Simulation Loop
   */
  private tick = () => {
    if (this.isDestroyed) return;

    const now = performance.now();
    const rawDt = (now - this.lastFrameTime) / 1000;
    this.lastFrameTime = now;
    const dt = Math.min(rawDt, 0.05); // Clamp dt for deterministic physics

    // Check hitstop pause
    if (now < this.hitstopUntilTime) {
      // Frozen for tactile heavy impact
    } else {
      this.updatePlayer(dt);
      this.updateProjectiles(dt);
      this.updateEnemies(dt);
      this.updateAirdrop(dt);
      this.updateBlueZone(dt);
      this.updateLootInteractions();
    }

    this.updateCamera(dt);

    // Render pass
    this.renderer.render(this.scene, this.camera);

    // Call React update callback periodically (e.g. 10Hz)
    this.notifyHUD();

    // Paced execution for software WebGL if active
    if (this.isSoftwareGl) {
      this.afterDraw(this.tick);
    } else {
      this.frameId = requestAnimationFrame(this.tick);
    }
  };

  private afterDraw(cb: () => void) {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (this.isDestroyed) return;
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 60);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  private updatePlayer(dt: number) {
    // 1. Move direction from WASD
    const moveDir = _vec3A.set(0, 0, 0);
    if (this.keysHeld['KeyW'] || this.keysHeld['ArrowUp']) moveDir.z -= 1;
    if (this.keysHeld['KeyS'] || this.keysHeld['ArrowDown']) moveDir.z += 1;
    if (this.keysHeld['KeyA'] || this.keysHeld['ArrowLeft']) moveDir.x -= 1;
    if (this.keysHeld['KeyD'] || this.keysHeld['ArrowRight']) moveDir.x += 1;

    // Continuous fire if mouse left held
    if (this.mouseLeftHeld) {
      this.fireWeapon();
    }

    // ADS
    this.player.isAiming = this.mouseRightHeld;

    // Sprinting (disabled in ADS or prone)
    this.player.isSprinting = !this.player.isAiming && this.player.stance === 'stand' && (this.keysHeld['ShiftLeft'] || this.keysHeld['ShiftRight']);

    // Stance adjustments
    let speed = 5.5; // m/s base run
    if (this.player.isSprinting) speed = 8.2;
    if (this.player.isAiming) speed = 3.2;
    if (this.player.stance === 'crouch') speed = 3.0;
    if (this.player.stance === 'prone') speed = 1.4;

    // Boost speed bonus (+6.2% when boost > 50%)
    if (this.player.boost > 50) speed *= 1.062;

    if (moveDir.lengthSq() > 0) {
      moveDir.normalize();
      // Rotate movement relative to player yaw
      moveDir.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.player.rotationY);
      this.player.position.x += moveDir.x * speed * dt;
      this.player.position.z += moveDir.z * speed * dt;
    }

    // Clamp terrain boundary
    const halfMap = this.terrainWidth / 2 - 10;
    this.player.position.x = Math.max(-halfMap, Math.min(halfMap, this.player.position.x));
    this.player.position.z = Math.max(-halfMap, Math.min(halfMap, this.player.position.z));

    // Ground height clamping
    const terrainY = this.getTerrainHeight(this.player.position.x, this.player.position.z);
    this.player.position.y = terrainY;

    // Passive boost health regeneration & decay
    if (this.player.boost > 0) {
      this.player.boost = Math.max(0, this.player.boost - 1.5 * dt);
      if (this.player.health < 100) {
        this.player.health = Math.min(100, this.player.health + 2.0 * dt);
      }
    }

    // Geothermal hot spring healing (+3 HP/s when inside basin)
    const distToHotSpring = Math.sqrt(Math.pow(this.player.position.x - (-180), 2) + Math.pow(this.player.position.z - 180, 2));
    if (distToHotSpring < 16) {
      this.player.health = Math.min(100, this.player.health + 3.0 * dt);
    }

    // Update 3D model orientation & stance height
    this.playerMeshGroup.position.copy(this.player.position);
    this.playerMeshGroup.rotation.y = this.player.rotationY;

    if (this.player.stance === 'crouch') {
      this.playerMeshGroup.scale.set(1.0, 0.7, 1.0);
    } else if (this.player.stance === 'prone') {
      this.playerMeshGroup.scale.set(1.0, 0.35, 1.4);
    } else {
      this.playerMeshGroup.scale.set(1.0, 1.0, 1.0);
    }
  }

  private updateProjectiles(dt: number) {
    for (const tracer of this.tracers) {
      if (!tracer.active) continue;

      const flightDuration = (performance.now() - tracer.birthTime) / 1000;
      // Gravity drop & drag computation
      const dropInfo = calculateBulletDrop(tracer.distanceTraveled, tracer.originVelocityMuzzle, tracer.dragCoefficient);

      const stepDist = tracer.originVelocityMuzzle * dt;
      const stepVec = _vec3A.copy(tracer.velocity).normalize().multiplyScalar(stepDist);

      // Apply vertical gravity drop increment
      stepVec.y -= dropInfo.dropMeters * 0.15;

      tracer.currentPos.add(stepVec);
      tracer.distanceTraveled += stepDist;
      tracer.mesh.position.copy(tracer.currentPos);

      // Check collision with enemies if shot by player
      if (tracer.fromPlayer) {
        for (const bot of this.enemies) {
          if (bot.isDead) continue;
          const distToBot = tracer.currentPos.distanceTo(bot.position);
          if (distToBot < 1.6) {
            tracer.active = false;
            tracer.mesh.visible = false;
            this.handleBotHit(bot, tracer);
            break;
          }
        }

        // Check collision with Firing Range target dummies
        for (const dummy of this.targetDummies) {
          const distToDummy = tracer.currentPos.distanceTo(dummy.position);
          if (distToDummy < 1.8) {
            tracer.active = false;
            tracer.mesh.visible = false;
            soundSystem.playHitMarker();
            dummy.lastHitTime = performance.now();
            this.player.shotsHit++;
            if (this.onHitFeedback) this.onHitFeedback(false, tracer.damage);
            break;
          }
        }
      } else {
        // Enemy shot targeting player
        const distToPlayer = tracer.currentPos.distanceTo(this.player.position);
        if (distToPlayer < 1.4) {
          tracer.active = false;
          tracer.mesh.visible = false;
          this.handlePlayerHit(tracer.damage);
        }
      }

      // Check terrain impact
      const terrainHeight = this.getTerrainHeight(tracer.currentPos.x, tracer.currentPos.z);
      if (tracer.currentPos.y <= terrainHeight || tracer.distanceTraveled >= tracer.maxDistance) {
        tracer.active = false;
        tracer.mesh.visible = false;
      }
    }
  }

  private handleBotHit(bot: EnemyBot, tracer: BulletTracer) {
    this.player.shotsHit++;
    const isHeadshot = tracer.currentPos.y > bot.position.y + 1.8;
    if (isHeadshot) this.player.headshots++;

    const mitigated = calculateMitigatedDamage(
      tracer.damage,
      isHeadshot,
      tracer.isHeadshotMultiplier,
      bot.helmet,
      bot.vest
    );

    bot.health -= mitigated.finalDamage;
    this.player.damageDealt += mitigated.finalDamage;

    if (isHeadshot) {
      soundSystem.playHeadshotDing();
      this.hitstopUntilTime = performance.now() + 45; // 45ms tactile hitstop
    } else {
      soundSystem.playHitMarker();
    }

    if (this.onHitFeedback) {
      this.onHitFeedback(isHeadshot, mitigated.finalDamage);
    }

    // Check death
    if (bot.health <= 0 && !bot.isDead) {
      bot.isDead = true;
      bot.health = 0;
      this.player.kills++;
      this.alivePlayersCount = Math.max(1, this.alivePlayersCount - 1);
      bot.group.rotation.x = Math.PI / 2; // Knocked flat
      bot.group.position.y = this.getTerrainHeight(bot.position.x, bot.position.z) + 0.2;

      // Spawn Death Crate
      this.spawnDeathCrate(bot.position);

      if (this.onTacticalCallout) {
        this.onTacticalCallout('Paitiyan Ban Gayi!', `Operator Eliminated! ${this.alivePlayersCount} Remaining.`);
      }
    }
  }

  private handlePlayerHit(rawDamage: number) {
    const isHeadshot = Math.random() < 0.2; // 20% headshot chance from AI
    const mitigated = calculateMitigatedDamage(
      rawDamage,
      isHeadshot,
      2.0,
      this.player.helmet,
      this.player.vest
    );

    this.player.health = Math.max(0, this.player.health - mitigated.finalDamage);
    soundSystem.playPlayerHurt();
    this.cameraShakeIntensity = Math.min(this.cameraShakeIntensity + 0.05, 0.12);

    if (isHeadshot && this.player.helmet) {
      this.player.helmet.currentDurability = Math.max(0, this.player.helmet.currentDurability - mitigated.absorbedDamage);
    } else if (this.player.vest) {
      this.player.vest.currentDurability = Math.max(0, this.player.vest.currentDurability - mitigated.absorbedDamage);
    }
  }

  private spawnDeathCrate(pos: THREE.Vector3) {
    const crateGroup = new THREE.Group();
    const crate = new THREE.Mesh(
      new THREE.BoxGeometry(0.8, 0.4, 0.5),
      new THREE.MeshStandardMaterial({ color: 0x166534, roughness: 0.6 })
    );
    crate.position.y = 0.2;
    crateGroup.add(crate);
    crateGroup.position.copy(pos);
    this.scene.add(crateGroup);

    this.lootCrates.push({
      group: crateGroup,
      position: pos.clone(),
      type: 'death_crate',
      weaponId: 'akm',
      ammoCaliber: '7.62mm',
      ammoCount: 90,
      opened: false,
    });
  }

  private updateEnemies(dt: number) {
    const playerPos = this.player.position;

    for (const bot of this.enemies) {
      if (bot.isDead) continue;

      const distToPlayer = bot.position.distanceTo(playerPos);

      // AI States: Patrol vs Attack
      if (distToPlayer < 90) {
        bot.state = 'attack';
        // Turn towards player
        const dx = playerPos.x - bot.position.x;
        const dz = playerPos.z - bot.position.z;
        bot.group.rotation.y = Math.atan2(dx, dz);

        // Fire burst periodically
        bot.fireTimer -= dt;
        if (bot.fireTimer <= 0) {
          bot.fireTimer = 0.8 + Math.random() * 1.2;
          const barrelPos = bot.position.clone().add(new THREE.Vector3(0, 1.4, 0));
          soundSystem.playGunshot(bot.weapon.caliber, false);
          this.spawnTracer(false, bot.weapon, barrelPos, playerPos.clone().add(new THREE.Vector3(0, 1.2, 0)));
        }
      } else {
        bot.state = 'patrol';
        // Move towards patrol target
        const pDist = bot.position.distanceTo(bot.patrolTarget);
        if (pDist < 2.0) {
          bot.patrolTarget.set(
            bot.position.x + (Math.random() - 0.5) * 50,
            0,
            bot.position.z + (Math.random() - 0.5) * 50
          );
        } else {
          const move = _vec3A.copy(bot.patrolTarget).sub(bot.position).normalize().multiplyScalar(2.2 * dt);
          bot.position.add(move);
          bot.position.y = this.getTerrainHeight(bot.position.x, bot.position.z);
          bot.group.position.copy(bot.position);
          bot.group.rotation.y = Math.atan2(move.x, move.z);
        }
      }
    }
  }

  private updateAirdrop(dt: number) {
    if (!this.airdropActive) return;

    if (this.airdropPos.y > this.getTerrainHeight(this.airdropPos.x, this.airdropPos.z) + 0.8) {
      this.airdropPos.y -= 7.0 * dt; // Fall with parachute
      this.airdropMeshGroup.position.copy(this.airdropPos);
    } else {
      this.airdropActive = false;
      this.lootCrates.push({
        group: this.airdropMeshGroup,
        position: this.airdropPos.clone(),
        type: 'airdrop',
        weaponId: 'awm',
        ammoCaliber: '.300 Magnum',
        ammoCount: 20,
        armorLevel: 3,
        opened: false,
      });
    }
  }

  private updateBlueZone(dt: number) {
    if (this.gameMode !== 'battle_royale') return;

    const currentPhaseConfig = CIRCLE_PHASES[this.circleCurrentPhase];
    this.circlePhaseTimer += dt;

    // Check shrink transition
    if (this.circlePhaseTimer > currentPhaseConfig.delaySec) {
      const shrinkProgress = Math.min(1.0, (this.circlePhaseTimer - currentPhaseConfig.delaySec) / currentPhaseConfig.shrinkDurationSec);
      this.circleRadius = currentPhaseConfig.diameterMeters / 2 * (1.0 - shrinkProgress * 0.35);

      if (shrinkProgress >= 1.0 && this.circleCurrentPhase < CIRCLE_PHASES.length - 1) {
        this.circleCurrentPhase++;
        this.circlePhaseTimer = 0;
        if (this.onTacticalCallout) {
          this.onTacticalCallout('Zone Aa Raha Hai, Niklo!', `Phase ${this.circleCurrentPhase + 1} Danger Zone Active!`);
        }
      }
    }

    // Update 3D cylinder scale
    const targetScale = this.circleRadius;
    this.blueZoneCylinder.scale.set(targetScale, 1.0, targetScale);

    // Player blue zone check
    const distToCenter = Math.sqrt(
      Math.pow(this.player.position.x - this.circleCenter.x, 2) +
      Math.pow(this.player.position.z - this.circleCenter.y, 2)
    );

    this.isPlayerInBlueZone = distToCenter > this.circleRadius;
    if (this.isPlayerInBlueZone) {
      const dps = currentPhaseConfig.dps;
      this.player.health = Math.max(0, this.player.health - dps * dt);
    }
  }

  private updateLootInteractions() {
    for (const crate of this.lootCrates) {
      if (crate.opened) continue;
      const dist = crate.position.distanceTo(this.player.position);
      if (dist < 2.5) {
        crate.opened = true;
        crate.group.visible = false;
        soundSystem.playLootPickup();

        // Equip / add loot
        if (crate.weaponId && WEAPONS[crate.weaponId]) {
          this.player.secondaryWeapon = WEAPONS[crate.weaponId];
        }
        if (crate.ammoCaliber && crate.ammoCount) {
          this.player.reserveAmmo[crate.ammoCaliber as keyof typeof this.player.reserveAmmo] += crate.ammoCount;
        }
        if (crate.armorLevel && crate.armorLevel === 3) {
          this.player.helmet = HELMETS[3];
          this.player.vest = VESTS[3];
        }

        if (this.onTacticalCallout) {
          this.onTacticalCallout('Loot Hasil Hua!', `Acquired ${crate.weaponId?.toUpperCase() ?? 'Supplies'}.`);
        }
      }
    }
  }

  private updateCamera(dt: number) {
    // Camera recoil decay
    if (this.cameraShakeIntensity > 0) {
      this.cameraShakeIntensity = Math.max(0, this.cameraShakeIntensity - dt * 0.4);
    }

    // Smooth ADS camera zoom
    const targetFov = this.player.isAiming ? 42 : 70;
    this.camera.fov = THREE.MathUtils.damp(this.camera.fov, targetFov, 12, dt);
    this.camera.updateProjectionMatrix();

    // Over-the-shoulder third-person camera offset (PUBG-style right shoulder vantage)
    const shoulderOffset = this.player.isAiming
      ? new THREE.Vector3(0.55, 1.65, 1.1) // Tight ADS cheek weld
      : new THREE.Vector3(1.35, 1.85, 3.8); // Tactical third-person offset clear of crosshair

    // Rotate shoulder offset with player yaw
    shoulderOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.player.rotationY);

    const targetCamPos = _vec3A.copy(this.player.position).add(shoulderOffset);
    // Camera shake offset
    if (this.cameraShakeIntensity > 0) {
      targetCamPos.x += (Math.random() - 0.5) * this.cameraShakeIntensity;
      targetCamPos.y += (Math.random() - 0.5) * this.cameraShakeIntensity;
    }

    this.camera.position.lerp(targetCamPos, 0.25);

    // Look target in front of player
    const lookTarget = _vec3B.copy(this.player.position).add(new THREE.Vector3(0, 1.5, 0));
    const forwardLook = new THREE.Vector3(0, 0, -20);
    forwardLook.applyAxisAngle(new THREE.Vector3(1, 0, 0), this.player.pitch);
    forwardLook.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.player.rotationY);
    lookTarget.add(forwardLook);

    this.camera.lookAt(lookTarget);
  }

  private setupInputHandlers() {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('blur', this.handleWindowBlur);
    this.container.addEventListener('mousedown', this.handleMouseDown);
    this.container.addEventListener('mouseup', this.handleMouseUp);
    this.container.addEventListener('contextmenu', (e) => e.preventDefault());
    this.container.addEventListener('mousemove', this.handleMouseMove);
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    this.keysHeld[e.code] = true;

    if (e.code === 'KeyC') {
      this.player.stance = this.player.stance === 'crouch' ? 'stand' : 'crouch';
    } else if (e.code === 'KeyZ') {
      this.player.stance = this.player.stance === 'prone' ? 'stand' : 'prone';
    } else if (e.code === 'KeyR') {
      this.reloadWeapon();
    } else if (e.code === 'Digit1') {
      this.player.activeWeaponSlot = 'primary';
      soundSystem.playReload();
    } else if (e.code === 'Digit2') {
      this.player.activeWeaponSlot = 'secondary';
      soundSystem.playReload();
    } else if (e.code === 'KeyX') {
      this.switchWeapon();
    }
  };

  private handleKeyUp = (e: KeyboardEvent) => {
    this.keysHeld[e.code] = false;
  };

  private handleWindowBlur = () => {
    this.keysHeld = {};
    this.mouseLeftHeld = false;
    this.mouseRightHeld = false;
  };

  private handleMouseDown = (e: MouseEvent) => {
    if (e.button === 0) {
      this.mouseLeftHeld = true;
      this.fireWeapon();
    } else if (e.button === 2) {
      this.mouseRightHeld = true;
    }
  };

  private handleMouseUp = (e: MouseEvent) => {
    if (e.button === 0) {
      this.mouseLeftHeld = false;
    } else if (e.button === 2) {
      this.mouseRightHeld = false;
    }
  };

  private handleMouseMove = (e: MouseEvent) => {
    // Standard mouse aim control
    const sens = this.player.isAiming ? 0.0018 : 0.0032;
    this.player.rotationY -= e.movementX * sens;
    this.player.pitch -= e.movementY * sens;
    // Clamp pitch between -60 and +60 degrees
    this.player.pitch = Math.max(-1.1, Math.min(1.1, this.player.pitch));
  };

  private lastHudTime = 0;
  private notifyHUD() {
    const now = performance.now();
    if (now - this.lastHudTime < 80) return; // 12Hz HUD update throttling
    this.lastHudTime = now;

    if (!this.onStateUpdate) return;
    const activeWeapon = this.getActiveWeapon();
    const currentMag = this.player.activeWeaponSlot === 'primary' ? this.player.primaryAmmo : this.player.secondaryAmmo;
    const reserve = this.player.reserveAmmo[activeWeapon.caliber] ?? 0;
    const headingDeg = Math.round(((-this.player.rotationY * 180) / Math.PI + 360) % 360);

    this.onStateUpdate({
      health: Math.round(this.player.health),
      boost: Math.round(this.player.boost),
      helmetDurability: this.player.helmet ? Math.round(this.player.helmet.currentDurability) : 0,
      helmetMax: this.player.helmet ? this.player.helmet.maxDurability : 0,
      vestDurability: this.player.vest ? Math.round(this.player.vest.currentDurability) : 0,
      vestMax: this.player.vest ? this.player.vest.maxDurability : 0,
      activeWeapon,
      currentMag,
      reserveAmmo: reserve,
      isAiming: this.player.isAiming,
      stance: this.player.stance,
      circlePhase: this.circleCurrentPhase + 1,
      circleTimer: Math.max(0, Math.round(CIRCLE_PHASES[this.circleCurrentPhase].delaySec - this.circlePhaseTimer)),
      inBlueZone: this.isPlayerInBlueZone,
      aliveCount: this.alivePlayersCount,
      kills: this.player.kills,
      damageDealt: Math.round(this.player.damageDealt),
      playerPos: {
        x: Math.round(this.player.position.x),
        y: Math.round(this.player.position.y),
        z: Math.round(this.player.position.z),
      },
      playerHeadingDeg: headingDeg,
    });
  }

  public handleResize() {
    if (!this.container || !this.renderer || !this.camera) return;
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  public destroy() {
    this.isDestroyed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);

    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('blur', this.handleWindowBlur);
    this.container.removeEventListener('mousedown', this.handleMouseDown);
    this.container.removeEventListener('mouseup', this.handleMouseUp);
    this.container.removeEventListener('mousemove', this.handleMouseMove);

    this.renderer.dispose();
    if (this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }
  }
}
