/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Unit Tests for Ballistics, Recoil, Armor Mitigation & TTK Math
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateBulletDrop,
  calculateDamageFalloff,
  calculateMitigatedDamage,
  calculateTTK,
  computeAttachmentModifiers,
  calculatePenetration,
  calculateEDPI,
  calculateFovScaledSensitivity
} from './ballistics';
import { ArmorItem, WeaponData } from './types';

test('bullet drop math calculates realistic parabolic trajectory', () => {
  // M416: 880 m/s muzzle velocity, 0.30 Cd
  const drop100m = calculateBulletDrop(100, 880, 0.30);
  assert.ok(drop100m.flightTimeSec > 0.11 && drop100m.flightTimeSec < 0.13, 'Flight time at 100m should be ~0.11-0.13s');
  assert.ok(drop100m.dropMeters > 0.05 && drop100m.dropMeters < 0.12, 'Drop at 100m should be ~6-10cm');

  // AWM: 945 m/s muzzle velocity at 300m
  const drop300m = calculateBulletDrop(300, 945, 0.28);
  assert.ok(drop300m.dropMeters > 0.45 && drop300m.dropMeters < 0.70, 'Drop at 300m should be ~50-65cm');
  assert.ok(drop300m.terminalVelocity < 945, 'Terminal velocity should decay due to drag');
});

test('effective damage falloff reduces damage beyond effective range', () => {
  const atZero = calculateDamageFalloff(50, 100);
  assert.equal(atZero, 1.0, 'No falloff within effective range');

  const atLongRange = calculateDamageFalloff(250, 100);
  assert.ok(atLongRange < 1.0 && atLongRange >= 0.35, 'Damage falls off smoothly above effective range');
});

test('armor mitigation properly reduces damage by helmet and vest levels', () => {
  const helm3: ArmorItem = {
    id: 'helm_3',
    name: 'Spetsnaz Helmet (Level 3)',
    level: 3,
    type: 'helmet',
    damageMitigation: 0.55, // 55% reduction
    maxDurability: 250,
    currentDurability: 250,
    weight: 20
  };

  const vest2: ArmorItem = {
    id: 'vest_2',
    name: 'Military Vest (Level 2)',
    level: 2,
    type: 'vest',
    damageMitigation: 0.40, // 40% reduction
    maxDurability: 220,
    currentDurability: 220,
    weight: 15
  };

  // M416 Base Damage 41, Headshot Multiplier 2.3x
  const headHit = calculateMitigatedDamage(41, true, 2.3, helm3, vest2);
  // Raw head damage = 41 * 2.3 = 94.3
  // With 55% mitigation = 94.3 * 0.45 = 42.4
  assert.equal(headHit.armorDamaged, 'helmet');
  assert.ok(headHit.finalDamage >= 42 && headHit.finalDamage <= 43);

  // Body hit against Level 2 Vest
  const bodyHit = calculateMitigatedDamage(41, false, 2.3, helm3, vest2);
  // Raw body damage = 41
  // With 40% mitigation = 41 * 0.60 = 24.6
  assert.equal(bodyHit.armorDamaged, 'vest');
  assert.equal(bodyHit.finalDamage, 24.6);
});

test('TTK calculation computes exact shots and duration against 100 HP target', () => {
  // AKM: 47 damage, 600 RPM (0.10s between shots)
  // Level 2 Vest: 40% mitigation => 47 * 0.6 = 28.2 damage/shot
  // Shots needed = ceil(100 / 28.2) = 4 shots
  // First shot instantaneous, 3 intervals => 3 * 0.10s = 0.30s TTK
  const akmBody = calculateTTK(47, 600, 2.3, 0.40, false);
  assert.equal(akmBody.shotsToKill, 4);
  assert.equal(akmBody.ttkSeconds, 0.30);

  // AWM: 105 damage, 2.5x headshot against Level 3 Helmet (55% mitigation)
  // Headshot damage = 105 * 2.5 * 0.45 = 118.125 => 1 shot kill!
  const awmHead = calculateTTK(105, 34, 2.5, 0.55, true);
  assert.equal(awmHead.shotsToKill, 1);
  assert.equal(awmHead.ttkSeconds, 0.0);
});

test('attachment modifiers accurately reduce vertical and horizontal recoil', () => {
  const dummyM416: WeaponData = {
    id: 'm416',
    name: 'M416',
    category: 'AR',
    caliber: '5.56mm',
    baseDamage: 41,
    muzzleVelocity: 880,
    dragCoefficient: 0.30,
    effectiveRange: 100,
    fireRateRPM: 700,
    magCapacity: 30,
    extendedMagCapacity: 40,
    reloadTimeSec: 2.1,
    tacticalReloadSec: 1.9,
    verticalClimb: 1.8,
    horizontalDrift: 0.4,
    firstShotMultiplier: 1.5,
    recoveryDecayRate: 8.0,
    headshotMultiplier: 2.3,
    penetrationPower: 55
  };

  const mods = computeAttachmentModifiers(dummyM416, {
    muzzle: 'compensator',
    grip: 'vertical',
    magazine: 'extended_quickdraw',
    stock: 'tactical_stock'
  });

  // Vertical = 1.0 * 0.75 * 0.80 * 0.92 = 0.552 (approx -45% vertical climb)
  assert.ok(mods.verticalModifier < 0.60, 'Full attachments should cut vertical climb substantially');
  assert.equal(mods.magCapacity, 40, 'Extended mag increases capacity to 40');
  assert.equal(mods.reloadTimeModifier, 0.70, 'Quickdraw reload modifier is 0.70');
});

test('penetration math checks materials correctly', () => {
  const sniperPen = calculatePenetration(90, 'wood');
  assert.equal(sniperPen.canPenetrate, true);
  assert.ok(sniperPen.remainingDamagePercent > 50);

  const pistolPen = calculatePenetration(30, 'sheet_metal');
  assert.equal(pistolPen.canPenetrate, false);
});

test('eDPI and FOV sensitivity math', () => {
  const edpi = calculateEDPI(800, 1.25);
  assert.equal(edpi, 1000);

  const adsSens = calculateFovScaledSensitivity(1.0, 90, 45);
  assert.ok(adsSens < 1.0, 'Higher zoom (lower FOV) requires lower angular sensitivity');
});
