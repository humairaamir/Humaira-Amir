/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * World-Matched, Low-Occlusion Tactical Battle Royale HUD
 * Compliant with Three.js & Game Craft Guidelines (<15% occlusion, zero backdrop-filter over WebGL)
 */

import React, { useState, useEffect } from 'react';
import { WeaponData } from '../game/types';
import { LIVIK_POIS } from '../game/data';
import { soundSystem } from '../game/audio';

interface HUDProps {
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
  lastHitInfo: { isHeadshot: boolean; damage: number; timestamp: number } | null;
  calloutInfo: { urdu: string; en: string; timestamp: number } | null;
  onOpenInventory: () => void;
  onOpenGDD: () => void;
  onSwitchWeapon: () => void;
  onReload: () => void;
  gameMode: 'battle_royale' | 'firing_range';
}

export const HUD: React.FC<HUDProps> = ({
  health,
  boost,
  helmetDurability,
  helmetMax,
  vestDurability,
  vestMax,
  activeWeapon,
  currentMag,
  reserveAmmo,
  isAiming,
  stance,
  circlePhase,
  circleTimer,
  inBlueZone,
  aliveCount,
  kills,
  damageDealt,
  playerPos,
  playerHeadingDeg,
  lastHitInfo,
  calloutInfo,
  onOpenInventory,
  onOpenGDD,
  onSwitchWeapon,
  onReload,
  gameMode,
}) => {
  const [isMuted, setIsMuted] = useState(soundSystem.isMuted);

  const toggleSound = () => {
    const muted = soundSystem.toggleMute();
    setIsMuted(muted);
  };

  // Hit marker decay
  const isHitActive = lastHitInfo && Date.now() - lastHitInfo.timestamp < 350;
  // Tactical callout active
  const isCalloutActive = calloutInfo && Date.now() - calloutInfo.timestamp < 4500;

  // Format compass directions
  const getCompassDirection = (deg: number) => {
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const idx = Math.round(deg / 45) % 8;
    return directions[idx];
  };

  return (
    <div className="fixed inset-0 pointer-events-none select-none z-20 flex flex-col justify-between p-3 sm:p-5 text-slate-100">
      {/* ================= TOP PERIMETER: COMPASS, MATCH STATUS & RADIO BANNER ================= */}
      <div className="w-full flex flex-col items-center gap-2">
        <div className="w-full flex items-start justify-between">
          {/* Top Left: Game Info & Quick Controls */}
          <div className="flex items-center gap-3">
            <div className="bg-slate-950/80 border border-amber-500/40 px-3 py-1.5 rounded-sm flex items-center gap-2.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-none"></span>
              <span className="font-tactical font-bold text-xs tracking-wider text-amber-400 uppercase">
                {gameMode === 'battle_royale' ? 'LIVIK FAST-PACED (2x2KM)' : 'BALLISTICS LAB & FIRING RANGE'}
              </span>
              <span className="text-slate-500 text-xs">|</span>
              <span className="font-code text-xs text-slate-300 tabular-nums">
                {playerPos.x},{playerPos.z}
              </span>
            </div>

            {/* Quick GDD Architecture & Inventory CTA */}
            <div className="pointer-events-auto flex items-center gap-1.5">
              <button
                onClick={onOpenGDD}
                aria-label="Open GDD Architecture"
                className="bg-amber-600/90 hover:bg-amber-500 text-slate-950 font-tactical font-bold text-xs px-2.5 py-1.5 rounded-sm shadow-md transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <span className="bg-slate-950 text-amber-300 px-1 py-0.2 rounded text-[10px]">G</span>
                <span>TECH GDD SPEC</span>
              </button>
              <button
                onClick={onOpenInventory}
                aria-label="Open Tactical Backpack"
                className="bg-slate-900/80 hover:bg-slate-800 text-slate-200 border border-slate-700 font-tactical text-xs px-2.5 py-1.5 rounded-sm transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <span className="bg-slate-800 text-slate-300 px-1 py-0.2 rounded text-[10px]">TAB</span>
                <span>BACKPACK</span>
              </button>
              <button
                onClick={toggleSound}
                aria-label="Toggle Sound"
                className="bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-slate-700 px-2 py-1.5 rounded-sm text-xs cursor-pointer"
              >
                {isMuted ? '🔇 MUTED' : '🔊 SFX'}
              </button>
            </div>

            {/* Tactical Circular Mini-Map Radar */}
            <div className="hidden lg:flex items-center gap-2 bg-slate-950/85 border border-slate-800 p-1.5 rounded-sm">
              <div className="relative w-14 h-14 rounded-full border border-slate-700 bg-slate-900 flex items-center justify-center overflow-hidden">
                {/* Radar Grid Crosshair */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-full h-px bg-slate-800"></div>
                  <div className="absolute h-full w-px bg-slate-800"></div>
                </div>
                {/* Distance Ring */}
                <div className="w-9 h-9 rounded-full border border-slate-700/60"></div>
                {/* Safe Zone Ring */}
                <div className="absolute w-11 h-11 rounded-full border border-sky-400/50"></div>
                {/* Player Blip & Heading Cone */}
                <div
                  className="w-2.5 h-2.5 bg-amber-400 rounded-full shadow-[0_0_6px_rgba(251,191,36,0.9)] relative flex items-center justify-center"
                  style={{ transform: `rotate(${playerHeadingDeg}deg)` }}
                >
                  <div className="w-1 h-2 bg-amber-200 -top-1.5 absolute rounded-xs"></div>
                </div>
                {/* Cardinal N mark */}
                <div className="absolute top-0.5 text-[8px] font-bold text-slate-500 font-code">N</div>
              </div>
            </div>
          </div>

          {/* Top Center: Heading Compass Tape */}
          <div className="hidden sm:flex flex-col items-center bg-slate-950/85 border border-slate-700/60 px-5 py-1.5 rounded-sm">
            <div className="flex items-center gap-2">
              <span className="font-code text-sm font-bold text-amber-400 tabular-nums">
                {String(playerHeadingDeg).padStart(3, '0')}°
              </span>
              <span className="font-tactical font-bold text-xs text-slate-200 tracking-wider">
                {getCompassDirection(playerHeadingDeg)}
              </span>
            </div>
            {/* Compass degree ticks */}
            <div className="w-48 h-1 flex justify-between items-center mt-1 border-t border-slate-700">
              <div className="w-0.5 h-1.5 bg-slate-500"></div>
              <div className="w-0.5 h-1 bg-slate-600"></div>
              <div className="w-0.5 h-2.5 bg-amber-400"></div>
              <div className="w-0.5 h-1 bg-slate-600"></div>
              <div className="w-0.5 h-1.5 bg-slate-500"></div>
            </div>
          </div>

          {/* Top Right: Alive Players, Kills & Circle Phase */}
          <div className="flex items-center gap-2">
            {gameMode === 'battle_royale' && (
              <>
                <div className="bg-slate-950/85 border border-slate-700/80 px-3 py-1.5 rounded-sm text-right">
                  <div className="text-[10px] text-slate-400 font-tactical">ALIVE / ZINDA</div>
                  <div className="font-code text-base font-bold text-emerald-400 tabular-nums">
                    {aliveCount} <span className="text-xs text-slate-500">/ 32</span>
                  </div>
                </div>

                <div className="bg-slate-950/85 border border-slate-700/80 px-3 py-1.5 rounded-sm text-right">
                  <div className="text-[10px] text-slate-400 font-tactical">KILLS / SHIKAAR</div>
                  <div className="font-code text-base font-bold text-amber-400 tabular-nums">
                    {kills}
                  </div>
                </div>

                <div className={`bg-slate-950/85 border px-3 py-1.5 rounded-sm text-right ${inBlueZone ? 'border-red-500 bg-red-950/40' : 'border-sky-500/50'}`}>
                  <div className="text-[10px] text-slate-400 font-tactical">
                    {inBlueZone ? '⚠️ BLUE ZONE DAMAGE!' : `PHASE ${circlePhase}`}
                  </div>
                  <div className={`font-code text-base font-bold tabular-nums ${inBlueZone ? 'text-red-400' : 'text-sky-400'}`}>
                    {circleTimer}s
                  </div>
                </div>
              </>
            )}

            {gameMode === 'firing_range' && (
              <div className="bg-slate-950/85 border border-slate-700/80 px-3 py-1.5 rounded-sm text-right">
                <div className="text-[10px] text-slate-400 font-tactical">HITS / DAMAGE</div>
                <div className="font-code text-base font-bold text-amber-400 tabular-nums">
                  {damageDealt} DMG
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Dual Roman Urdu / English Tactical Radio Callout Banner */}
        {isCalloutActive && calloutInfo && (
          <div className="mt-1 bg-slate-950/90 border-l-4 border-amber-500 px-4 py-2 rounded-r shadow-xl max-w-xl transition-all">
            <div className="flex items-center gap-2">
              <span className="text-amber-400 text-xs font-tactical font-bold uppercase tracking-wider">
                RADIO COMMS // TACTICAL CALLOUT
              </span>
            </div>
            <div className="text-sm font-bold text-white tracking-wide">
              "{calloutInfo.urdu}"
            </div>
            <div className="text-xs text-slate-400 italic">
              {calloutInfo.en}
            </div>
          </div>
        )}
      </div>

      {/* ================= CENTER: DYNAMIC CROSSHAIR, SCOPE & HIT MARKER ================= */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {/* If ADS is active: Scope Reticle */}
        {isAiming ? (
          <div className="relative w-72 h-72 flex items-center justify-center">
            {/* Scope outer ring */}
            <div className="absolute inset-0 rounded-full border border-slate-500/30"></div>
            <div className="w-48 h-48 rounded-full border border-slate-600/50 relative flex items-center justify-center">
              {/* Horizontal & Vertical Crosshair Lines */}
              <div className="w-full h-px bg-slate-700"></div>
              <div className="absolute h-full w-px bg-slate-700"></div>
              {/* Red Dot / Chevron Center */}
              <div className="absolute w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.9)]"></div>
              {/* Mildot Ranging Hash Marks */}
              <div className="absolute top-8 w-2 h-px bg-slate-500"></div>
              <div className="absolute top-14 w-3 h-px bg-slate-500"></div>
              <div className="absolute bottom-8 w-2 h-px bg-slate-500"></div>
              <div className="absolute bottom-14 w-3 h-px bg-slate-500"></div>
            </div>
          </div>
        ) : (
          /* Hipfire Dynamic Crosshair */
          <div className="relative w-8 h-8 flex items-center justify-center">
            <div className="absolute w-1 h-1 rounded-full bg-amber-400/80"></div>
            <div className="absolute -top-3 w-0.5 h-2 bg-white/70"></div>
            <div className="absolute -bottom-3 w-0.5 h-2 bg-white/70"></div>
            <div className="absolute -left-3 h-0.5 w-2 bg-white/70"></div>
            <div className="absolute -right-3 h-0.5 w-2 bg-white/70"></div>
          </div>
        )}

        {/* Reactive Hit Marker */}
        {isHitActive && (
          <div className="absolute flex items-center justify-center animate-ping">
            {lastHitInfo?.isHeadshot ? (
              <div className="w-12 h-12 border-2 border-red-500 rotate-45 flex items-center justify-center">
                <span className="text-[10px] font-bold text-red-500 -rotate-45 font-tactical">HEADSHOT</span>
              </div>
            ) : (
              <div className="w-8 h-8 border-2 border-amber-400 rotate-45"></div>
            )}
          </div>
        )}
      </div>

      {/* ================= BOTTOM PERIMETER: HEALTH/ARMOR, MINIMAP & WEAPON SLOTS ================= */}
      <div className="w-full flex items-end justify-between">
        {/* Bottom Left: Health, Boost & Armor Plate Durability */}
        <div className="flex flex-col gap-2 max-w-xs sm:max-w-sm">
          {/* Stance Indicator */}
          <div className="flex items-center gap-2">
            <span className="bg-slate-950/80 border border-slate-700 px-2 py-0.5 rounded text-[11px] font-tactical text-amber-400 uppercase">
              STANCE: {stance} [C / Z]
            </span>
            <span className="text-slate-400 text-xs">
              SPRINT: [SHIFT]
            </span>
          </div>

          <div className="bg-slate-950/90 border border-slate-800 p-3 rounded-sm flex flex-col gap-2 shadow-2xl">
            {/* Health Bar (100 HP) */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between items-center text-xs">
                <span className="font-tactical font-semibold text-slate-300">HEALTH / SEHAT</span>
                <span className="font-code font-bold text-emerald-400 tabular-nums">{health} / 100</span>
              </div>
              <div className="w-full h-2.5 bg-slate-800 rounded-sm overflow-hidden p-0.5">
                <div
                  className={`h-full rounded-xs transition-all duration-150 ${health > 60 ? 'bg-emerald-500' : health > 25 ? 'bg-amber-500' : 'bg-red-600'}`}
                  style={{ width: `${health}%` }}
                ></div>
              </div>
            </div>

            {/* Boost Gauge (0-100) */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between items-center text-[11px]">
                <span className="font-tactical text-slate-400">BOOST / TAWANAI</span>
                <span className="font-code text-amber-400 tabular-nums">{boost}%</span>
              </div>
              <div className="w-full h-1.5 bg-slate-800 rounded-sm overflow-hidden">
                <div
                  className="h-full bg-amber-400 transition-all duration-150"
                  style={{ width: `${boost}%` }}
                ></div>
              </div>
            </div>

            {/* Armor Status: Helmet & Vest Durability */}
            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800/80 text-[11px]">
              <div>
                <div className="text-slate-400 flex justify-between">
                  <span>HELMET</span>
                  <span className="font-code text-slate-200 tabular-nums">{helmetDurability}/{helmetMax}</span>
                </div>
                <div className="w-full h-1 bg-slate-800 rounded mt-0.5">
                  <div
                    className="h-full bg-sky-400"
                    style={{ width: `${helmetMax > 0 ? (helmetDurability / helmetMax) * 100 : 0}%` }}
                  ></div>
                </div>
              </div>

              <div>
                <div className="text-slate-400 flex justify-between">
                  <span>VEST</span>
                  <span className="font-code text-slate-200 tabular-nums">{vestDurability}/{vestMax}</span>
                </div>
                <div className="w-full h-1 bg-slate-800 rounded mt-0.5">
                  <div
                    className="h-full bg-indigo-400"
                    style={{ width: `${vestMax > 0 ? (vestDurability / vestMax) * 100 : 0}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Center: Flat Control Hint Bar (Game Craft compliant) */}
        <div className="hidden md:flex bg-slate-950/90 border border-slate-800 px-4 py-1.5 rounded-sm text-xs text-slate-300 font-tactical items-center gap-3 mb-1">
          <span><strong className="text-amber-400">WASD</strong> Move</span>
          <span>·</span>
          <span><strong className="text-amber-400">Left-Click</strong> Fire</span>
          <span>·</span>
          <span><strong className="text-amber-400">Right-Click</strong> ADS</span>
          <span>·</span>
          <span><strong className="text-amber-400">R</strong> Reload</span>
          <span>·</span>
          <span><strong className="text-amber-400">1 / 2</strong> Switch Weapon</span>
          <span>·</span>
          <span><strong className="text-amber-400">Tab</strong> Inventory</span>
          <span>·</span>
          <span><strong className="text-amber-400">G</strong> GDD Specs</span>
        </div>

        {/* Bottom Right: Weapon Card & Ammunition Readout */}
        <div className="flex flex-col items-end gap-2 max-w-xs pointer-events-auto">
          <div className="bg-slate-950/90 border border-amber-500/40 p-3.5 rounded-sm flex flex-col gap-2 shadow-2xl min-w-[200px]">
            <div className="flex justify-between items-center">
              <span className="font-tactical font-bold text-base text-amber-400 tracking-wide">
                {activeWeapon.name}
              </span>
              <span className="bg-slate-800 text-slate-300 font-code text-[10px] px-1.5 py-0.5 rounded">
                {activeWeapon.caliber}
              </span>
            </div>

            {/* Massive Tabular Ammo Count */}
            <div className="flex items-baseline justify-between py-1">
              <div className="font-code text-3xl font-extrabold text-white tracking-tight tabular-nums">
                {currentMag}
              </div>
              <div className="font-code text-sm font-semibold text-slate-400 tabular-nums">
                / {reserveAmmo}
              </div>
            </div>

            {/* Fire Mode & Hotkeys */}
            <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800">
              <span className="bg-amber-950 text-amber-300 px-2 py-0.5 rounded font-tactical text-[11px] font-bold">
                AUTO [FULL]
              </span>
              <div className="flex items-center gap-2 text-slate-400 text-[11px]">
                <button
                  onClick={onSwitchWeapon}
                  aria-label="Switch Weapon"
                  className="hover:text-amber-400 cursor-pointer underline text-[10px]"
                >
                  [1 / 2] SWITCH
                </button>
                <button
                  onClick={onReload}
                  aria-label="Reload Weapon"
                  className="hover:text-amber-400 cursor-pointer underline text-[10px]"
                >
                  [R] RELOAD
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
