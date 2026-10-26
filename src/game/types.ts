/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Tactical Battle Royale System Types & Architecture
 */

export type WeaponCategory = 'AR' | 'SMG' | 'DMR' | 'SR' | 'PISTOL';

export interface WeaponAttachmentSlots {
  muzzle?: string; // 'compensator' | 'flash_hider' | 'suppressor'
  grip?: string;   // 'vertical' | 'angled' | 'half' | 'laser'
  magazine?: string; // 'extended' | 'quickdraw' | 'extended_quickdraw'
  sight?: string;  // 'iron' | 'red_dot' | 'holo' | '2x' | '3x' | '4x' | '6x' | '8x'
  stock?: string;  // 'tactical_stock' | 'cheek_pad'
}

export interface WeaponData {
  id: string;
  name: string;
  category: WeaponCategory;
  caliber: '5.56mm' | '7.62mm' | '9mm' | '.300 Magnum' | '.45 ACP';
  baseDamage: number;
  muzzleVelocity: number; // m/s
  dragCoefficient: number; // Cd
  effectiveRange: number; // meters
  fireRateRPM: number; // rounds per minute
  magCapacity: number;
  extendedMagCapacity: number;
  reloadTimeSec: number;
  tacticalReloadSec: number;
  // Recoil Kinematics
  verticalClimb: number; // base climb per shot
  horizontalDrift: number; // base horizontal deviation
  firstShotMultiplier: number;
  recoveryDecayRate: number; // recoil reset speed
  headshotMultiplier: number;
  penetrationPower: number; // 0-100 mm RHA equivalent
}

export interface ArmorItem {
  id: string;
  name: string;
  level: 0 | 1 | 2 | 3;
  type: 'helmet' | 'vest';
  damageMitigation: number; // e.g. 0.30 for 30% reduction
  maxDurability: number;
  currentDurability: number;
  weight: number;
}

export interface CirclePhase {
  phase: number;
  diameterMeters: number;
  delaySec: number;
  shrinkDurationSec: number;
  dps: number; // Damage per second when in blue zone
  colorHex: string;
}

export interface POI {
  id: string;
  name: string;
  nameUrdu: string;
  description: string;
  tier: 'High' | 'Medium' | 'Low';
  coords: [number, number]; // [x, z] in normalized 2x2km coordinates (-1000 to 1000)
  biome: 'Nordic Grass' | 'Geothermal Basin' | 'Industrial Factory' | 'Coastal Water' | 'Snowy Foothills';
  vehicleGarage: boolean;
  hotDrop: boolean;
}

export interface InventoryItem {
  id: string;
  name: string;
  nameUrdu?: string;
  category: 'ammo' | 'med' | 'attachment' | 'throwable' | 'armor' | 'weapon';
  weight: number; // per unit weight
  quantity: number;
  maxStack?: number;
  description?: string;
  useTimeSec?: number;
  healAmount?: number;
  boostAmount?: number;
}

export interface SensitivityConfig {
  cameraFreeLook: number;
  cameraNoScope: number;
  adsRedDot: number;
  ads2x: number;
  ads3x: number;
  ads4x: number;
  ads6x: number;
  ads8x: number;
  gyroscopeEnabled: boolean;
  gyroSensitivity: number;
  gyroCurve: 'linear' | 'acceleration';
  layoutScheme: '2-Finger' | '3-Finger Claw' | '4-Finger Competitive' | 'Full-Gyroscope';
}

export interface GraphicsTier {
  name: 'Smooth 90/120' | 'Balanced' | 'HD' | 'HDR' | 'Ultra HD';
  targetFps: number;
  resolutionScale: number;
  foliageCullRadius: number; // meters
  drawDistance: number;
  shadowQuality: 'off' | 'low' | 'medium' | 'high';
  postProcessing: boolean;
  antiAliasing: 'FXAA' | 'TAA' | 'FSR' | 'None';
}

export interface GameTelemetry {
  fps: number;
  pingMs: number;
  tickRate: number;
  shotsFired: number;
  shotsHit: number;
  headshots: number;
  damageDealt: number;
  kills: number;
  distanceTraveledM: number;
  blueZonePhase: number;
  timeRemainingSec: number;
  alivePlayers: number;
}
