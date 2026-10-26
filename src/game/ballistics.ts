/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Pure Tactical Ballistics & Recoil Kinematics Calculations
 */

import { WeaponData, ArmorItem, WeaponAttachmentSlots } from './types';

export const GRAVITY = 9.80665; // m/s^2 standard gravity
export const AIR_DENSITY = 1.225; // kg/m^3 standard sea-level air density

/**
 * Calculates bullet velocity after time t taking drag into account
 * v(t) = v0 / (1 + (Cd * rho * A * v0 * t) / (2 * m))
 * Using simplified drag deceleration: k = 0.5 * rho * Cd * Area / mass
 */
export function calculateDecayedVelocity(
  initialVelocity: number, // m/s
  dragCoefficient: number,
  timeSec: number
): number {
  if (timeSec <= 0) return initialVelocity;
  // Standard ballistic decay factor: k is proportional to drag coefficient
  const k = dragCoefficient * 0.0012;
  const decayed = initialVelocity / (1 + k * initialVelocity * timeSec);
  return Math.max(decayed, 50); // Minimum terminal subsonic floor
}

/**
 * Calculates bullet drop in meters at distance d
 * y = 0.5 * g * (d / avgVelocity)^2
 */
export function calculateBulletDrop(
  distanceMeters: number,
  muzzleVelocity: number,
  dragCoefficient: number = 0.30
): { dropMeters: number; flightTimeSec: number; terminalVelocity: number } {
  if (distanceMeters <= 0) {
    return { dropMeters: 0, flightTimeSec: 0, terminalVelocity: muzzleVelocity };
  }

  // Iterative flight time with drag deceleration
  // t = d / v_avg where v_avg is estimated
  const k = dragCoefficient * 0.0012;
  // Closed form approximation for distance: d = (1/k) * ln(1 + k * v0 * t) => t = (exp(k*d) - 1) / (k * v0)
  let flightTimeSec: number;
  if (k > 0.00001) {
    flightTimeSec = (Math.exp(k * distanceMeters) - 1) / (k * muzzleVelocity);
  } else {
    flightTimeSec = distanceMeters / muzzleVelocity;
  }

  // Realistic gravity drop y = 0.5 * g * t^2
  const dropMeters = 0.5 * GRAVITY * flightTimeSec * flightTimeSec;
  const terminalVelocity = calculateDecayedVelocity(muzzleVelocity, dragCoefficient, flightTimeSec);

  return {
    dropMeters,
    flightTimeSec,
    terminalVelocity,
  };
}

/**
 * Effective damage falloff multiplier over distance
 */
export function calculateDamageFalloff(
  distanceMeters: number,
  effectiveRange: number
): number {
  if (distanceMeters <= effectiveRange) return 1.0;
  // Linear drop off down to a 35% minimum floor at 2.5x effective range
  const overRangeRatio = (distanceMeters - effectiveRange) / (effectiveRange * 1.5);
  const multiplier = 1.0 - overRangeRatio * 0.65;
  return Math.max(multiplier, 0.35);
}

/**
 * Calculates armor mitigation and remaining damage
 */
export function calculateMitigatedDamage(
  rawDamage: number,
  isHeadshot: boolean,
  weaponHeadshotMultiplier: number,
  helmet?: ArmorItem | null,
  vest?: ArmorItem | null
): {
  finalDamage: number;
  armorDamaged: 'helmet' | 'vest' | 'none';
  absorbedDamage: number;
} {
  let effectiveDamage = rawDamage;

  if (isHeadshot) {
    effectiveDamage *= weaponHeadshotMultiplier;
    if (helmet && helmet.currentDurability > 0) {
      const mitigation = helmet.damageMitigation;
      const absorbed = effectiveDamage * mitigation;
      const finalDamage = effectiveDamage - absorbed;
      return {
        finalDamage: Math.round(finalDamage * 10) / 10,
        armorDamaged: 'helmet',
        absorbedDamage: Math.round(absorbed * 10) / 10,
      };
    }
    return {
      finalDamage: Math.round(effectiveDamage * 10) / 10,
      armorDamaged: 'none',
      absorbedDamage: 0,
    };
  } else {
    if (vest && vest.currentDurability > 0) {
      const mitigation = vest.damageMitigation;
      const absorbed = effectiveDamage * mitigation;
      const finalDamage = effectiveDamage - absorbed;
      return {
        finalDamage: Math.round(finalDamage * 10) / 10,
        armorDamaged: 'vest',
        absorbedDamage: Math.round(absorbed * 10) / 10,
      };
    }
    return {
      finalDamage: Math.round(effectiveDamage * 10) / 10,
      armorDamaged: 'none',
      absorbedDamage: 0,
    };
  }
}

/**
 * Calculates Time-To-Kill (TTK) in seconds against a 100 HP target
 */
export function calculateTTK(
  baseDamage: number,
  fireRateRPM: number,
  headshotMultiplier: number,
  armorMitigation: number,
  isHeadshot: boolean = false
): { shotsToKill: number; ttkSeconds: number } {
  const mult = isHeadshot ? headshotMultiplier : 1.0;
  const damagePerShot = baseDamage * mult * (1.0 - armorMitigation);
  const shotsToKill = Math.ceil(100 / damagePerShot);
  // Time between shots = 60 / RPM
  // First shot is instantaneous, so (shotsToKill - 1) intervals
  const shotIntervalSec = 60 / fireRateRPM;
  const ttkSeconds = Math.max(0, (shotsToKill - 1) * shotIntervalSec);

  return {
    shotsToKill,
    ttkSeconds: Math.round(ttkSeconds * 1000) / 1000,
  };
}

/**
 * Calculates Recoil Modifiers based on equipped attachments
 */
export interface RecoilModifiers {
  verticalModifier: number; // multiplier, e.g. 0.75 for 25% reduction
  horizontalModifier: number; // multiplier, e.g. 0.80 for 20% reduction
  recoveryRateModifier: number; // multiplier, e.g. 1.15 for 15% faster recovery
  magCapacity: number;
  reloadTimeModifier: number;
}

export function computeAttachmentModifiers(
  weapon: WeaponData,
  attachments: WeaponAttachmentSlots
): RecoilModifiers {
  let vertical = 1.0;
  let horizontal = 1.0;
  let recovery = 1.0;
  let reloadMod = 1.0;
  let capacity = weapon.magCapacity;

  // Muzzle modifications
  if (attachments.muzzle === 'compensator') {
    vertical *= 0.75; // -25% vertical climb
    horizontal *= 0.85; // -15% horizontal drift
  } else if (attachments.muzzle === 'flash_hider') {
    vertical *= 0.90;
    horizontal *= 0.90;
  } else if (attachments.muzzle === 'suppressor') {
    // Suppressor has minimal recoil reduction but removes flash and dampens sound
    vertical *= 0.97;
  }

  // Grip modifications
  if (attachments.grip === 'vertical') {
    vertical *= 0.80; // -20% vertical
  } else if (attachments.grip === 'angled') {
    horizontal *= 0.75; // -25% horizontal drift
    recovery *= 1.15; // +15% ADS/recovery speed
  } else if (attachments.grip === 'half') {
    vertical *= 0.88;
    horizontal *= 0.88;
    recovery *= 1.10;
  }

  // Stock
  if (attachments.stock === 'tactical_stock') {
    vertical *= 0.92;
    horizontal *= 0.92;
    recovery *= 1.20; // faster recoil reset
  }

  // Magazine
  if (attachments.magazine === 'extended') {
    capacity = weapon.extendedMagCapacity;
  } else if (attachments.magazine === 'quickdraw') {
    reloadMod = 0.70; // 30% faster reload
  } else if (attachments.magazine === 'extended_quickdraw') {
    capacity = weapon.extendedMagCapacity;
    reloadMod = 0.70;
  }

  return {
    verticalModifier: Math.round(vertical * 100) / 100,
    horizontalModifier: Math.round(horizontal * 100) / 100,
    recoveryRateModifier: Math.round(recovery * 100) / 100,
    magCapacity: capacity,
    reloadTimeModifier: Math.round(reloadMod * 100) / 100,
  };
}

/**
 * Material penetration check (wood, drywall, sheet metal, vehicle glass)
 */
export function calculatePenetration(
  weaponPenetrationPower: number, // 0-100 rating
  materialType: 'wood' | 'drywall' | 'sheet_metal' | 'vehicle_glass' | 'concrete'
): { canPenetrate: boolean; remainingDamagePercent: number } {
  const materialResistance: Record<string, number> = {
    drywall: 15,
    vehicle_glass: 25,
    wood: 40,
    sheet_metal: 70,
    concrete: 95,
  };

  const resistance = materialResistance[materialType] ?? 50;
  if (weaponPenetrationPower < resistance) {
    return { canPenetrate: false, remainingDamagePercent: 0 };
  }

  // Remaining damage after passing through barrier
  const penetrationRatio = (weaponPenetrationPower - resistance) / weaponPenetrationPower;
  const remaining = Math.max(0.2, Math.min(0.9, penetrationRatio));

  return {
    canPenetrate: true,
    remainingDamagePercent: Math.round(remaining * 100),
  };
}

/**
 * Calculates effective sensitivity (eDPI)
 * eDPI = DPI * Sensitivity
 */
export function calculateEDPI(dpi: number, inGameSens: number): number {
  return Math.round(dpi * inGameSens);
}

/**
 * Calculates ADS sensitivity scaled by Scope Field of View (FOV)
 * Uses focal-length scaling to preserve muscle memory:
 * Sens_ADS = Sens_Hip * tan(FOV_ADS / 2) / tan(FOV_Hip / 2)
 */
export function calculateFovScaledSensitivity(
  hipfireSens: number,
  hipFovDegrees: number,
  scopeFovDegrees: number
): number {
  const hipRad = (hipFovDegrees * Math.PI) / 360;
  const scopeRad = (scopeFovDegrees * Math.PI) / 360;
  const ratio = Math.tan(scopeRad) / Math.tan(hipRad);
  return Math.round(hipfireSens * ratio * 100) / 100;
}
