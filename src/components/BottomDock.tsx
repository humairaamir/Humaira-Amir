/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Collapsible Bottom Dock (Zero Viewport Occlusion)
 * Compliant with Three.js Skill Directive 5: Ergonomic UI Layout & Cinema Mode
 */

import React, { useState } from 'react';
import { GRAPHICS_TIERS, SENSITIVITY_PRESETS } from '../game/data';
import { calculateBulletDrop } from '../game/ballistics';
import { WeaponData } from '../game/types';

interface BottomDockProps {
  currentTier: string;
  onSelectTier: (tierName: string) => void;
  currentPreset: string;
  onSelectPreset: (presetName: string) => void;
  activeWeapon: WeaponData;
  gameMode: 'battle_royale' | 'firing_range';
  onSwitchMode: (mode: 'battle_royale' | 'firing_range') => void;
}

export const BottomDock: React.FC<BottomDockProps> = ({
  currentTier,
  onSelectTier,
  currentPreset,
  onSelectPreset,
  activeWeapon,
  gameMode,
  onSwitchMode,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(true); // Default collapsed for clean 85%+ viewport view
  const [activeTab, setActiveTab] = useState<'graphics' | 'sens' | 'ballistics'>('ballistics');

  const drop100 = calculateBulletDrop(100, activeWeapon.muzzleVelocity, activeWeapon.dragCoefficient);
  const drop200 = calculateBulletDrop(200, activeWeapon.muzzleVelocity, activeWeapon.dragCoefficient);
  const drop300 = calculateBulletDrop(300, activeWeapon.muzzleVelocity, activeWeapon.dragCoefficient);

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center pointer-events-auto select-none max-w-[94vw] w-full sm:w-auto">
      {/* Collapse / Expand Toggle Button */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        aria-label="Toggle Control Dock"
        className="bg-slate-950/90 hover:bg-slate-900 border border-slate-700/80 text-amber-400 hover:text-amber-300 font-tactical text-xs px-3.5 py-1 rounded-t flex items-center gap-1.5 shadow-lg cursor-pointer transition-colors"
      >
        <span>{isCollapsed ? '▴ SHOW QUICK CONTROLS' : '▾ HIDE QUICK CONTROLS'}</span>
        <span className="text-slate-500 text-[10px]">[H]</span>
      </button>

      {/* Dock Container */}
      {!isCollapsed && (
        <div className="bg-slate-950/95 border border-slate-800 p-3 rounded-b rounded-t-none shadow-2xl flex flex-col gap-2.5 min-w-[340px] sm:min-w-[560px] text-slate-200">
          {/* Sub-tab Navigation */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-1.5 font-tactical text-xs">
              <button
                onClick={() => setActiveTab('ballistics')}
                className={`px-2.5 py-1 rounded cursor-pointer ${activeTab === 'ballistics' ? 'bg-amber-600 text-slate-950 font-bold' : 'bg-slate-900 text-slate-400 hover:text-white'}`}
              >
                BALLISTICS TELEMETRY
              </button>
              <button
                onClick={() => setActiveTab('graphics')}
                className={`px-2.5 py-1 rounded cursor-pointer ${activeTab === 'graphics' ? 'bg-amber-600 text-slate-950 font-bold' : 'bg-slate-900 text-slate-400 hover:text-white'}`}
              >
                GRAPHICS TIER
              </button>
              <button
                onClick={() => setActiveTab('sens')}
                className={`px-2.5 py-1 rounded cursor-pointer ${activeTab === 'sens' ? 'bg-amber-600 text-slate-950 font-bold' : 'bg-slate-900 text-slate-400 hover:text-white'}`}
              >
                SENSITIVITY PRESET
              </button>
            </div>

            {/* Mode Switcher */}
            <div className="flex items-center gap-1 font-tactical text-[11px]">
              <button
                onClick={() => onSwitchMode('battle_royale')}
                className={`px-2 py-0.5 rounded cursor-pointer ${gameMode === 'battle_royale' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' : 'text-slate-500 hover:text-slate-300'}`}
              >
                LIVIK BR
              </button>
              <button
                onClick={() => onSwitchMode('firing_range')}
                className={`px-2 py-0.5 rounded cursor-pointer ${gameMode === 'firing_range' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' : 'text-slate-500 hover:text-slate-300'}`}
              >
                FIRING RANGE
              </button>
            </div>
          </div>

          {/* Tab 1: Ballistics Telemetry */}
          {activeTab === 'ballistics' && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-code">
              <div className="bg-slate-900 p-2 rounded border border-slate-800/80">
                <span className="text-[10px] text-slate-500 block font-tactical">MUZZLE VELOCITY</span>
                <span className="text-amber-400 font-bold text-sm tabular-nums">{activeWeapon.muzzleVelocity} m/s</span>
              </div>
              <div className="bg-slate-900 p-2 rounded border border-slate-800/80">
                <span className="text-[10px] text-slate-500 block font-tactical">DROP AT 100M</span>
                <span className="text-slate-200 font-bold tabular-nums">{(drop100.dropMeters * 100).toFixed(1)} cm</span>
              </div>
              <div className="bg-slate-900 p-2 rounded border border-slate-800/80">
                <span className="text-[10px] text-slate-500 block font-tactical">DROP AT 200M</span>
                <span className="text-slate-200 font-bold tabular-nums">{(drop200.dropMeters * 100).toFixed(1)} cm</span>
              </div>
              <div className="bg-slate-900 p-2 rounded border border-slate-800/80">
                <span className="text-[10px] text-slate-500 block font-tactical">DROP AT 300M</span>
                <span className="text-sky-400 font-bold tabular-nums">{(drop300.dropMeters * 100).toFixed(1)} cm</span>
              </div>
            </div>
          )}

          {/* Tab 2: Graphics Tier */}
          {activeTab === 'graphics' && (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 text-xs font-tactical">
              {Object.keys(GRAPHICS_TIERS).map((tierKey) => (
                <button
                  key={tierKey}
                  onClick={() => onSelectTier(tierKey)}
                  className={`p-1.5 rounded border text-center transition-colors cursor-pointer ${
                    currentTier === tierKey
                      ? 'bg-amber-600/20 border-amber-500 text-amber-300 font-bold'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {tierKey}
                </button>
              ))}
            </div>
          )}

          {/* Tab 3: Sensitivity Preset */}
          {activeTab === 'sens' && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-xs font-tactical">
              {Object.keys(SENSITIVITY_PRESETS).map((presetKey) => (
                <button
                  key={presetKey}
                  onClick={() => onSelectPreset(presetKey)}
                  className={`p-1.5 rounded border text-center transition-colors cursor-pointer ${
                    currentPreset === presetKey
                      ? 'bg-amber-600/20 border-amber-500 text-amber-300 font-bold'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {presetKey}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
