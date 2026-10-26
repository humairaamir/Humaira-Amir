/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Tactical Inventory & Non-P2W Progressive Skin Lab Modal (Pillar 3)
 */

import React, { useState } from 'react';
import { CONSUMABLES, AMMO_WEIGHTS } from '../game/data';
import { WeaponData, WeaponAttachmentSlots } from '../game/types';

interface BackpackModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeWeapon: WeaponData;
  secondaryWeapon: WeaponData;
  primaryAttachments: WeaponAttachmentSlots;
  reserveAmmo: Record<string, number>;
  onUseConsumable: (itemKey: string) => void;
  onUpdateAttachments: (slot: 'primary' | 'secondary', attachmentKey: keyof WeaponAttachmentSlots, value: string | undefined) => void;
}

export const BackpackModal: React.FC<BackpackModalProps> = ({
  isOpen,
  onClose,
  activeWeapon,
  secondaryWeapon,
  primaryAttachments,
  reserveAmmo,
  onUseConsumable,
  onUpdateAttachments,
}) => {
  const [activeTab, setActiveTab] = useState<'inventory' | 'skin_lab' | 'loadout'>('inventory');
  const [activeConsumableCountdown, setActiveConsumableCountdown] = useState<{ name: string; secondsLeft: number } | null>(null);

  if (!isOpen) return null;

  // Calculate current weight
  let totalWeight = 0;
  Object.entries(reserveAmmo).forEach(([cal, count]) => {
    const w = AMMO_WEIGHTS[cal]?.weightPerRound ?? 0.5;
    totalWeight += count * w;
  });
  // Add base weapons and armor weight
  totalWeight += 65; // base gear
  const maxCapacity = 250;
  const weightPercent = Math.min(100, Math.round((totalWeight / maxCapacity) * 100));

  const handleUseItem = (itemKey: string, timeSec: number, name: string) => {
    setActiveConsumableCountdown({ name, secondsLeft: timeSec });
    onUseConsumable(itemKey);

    let current = timeSec;
    const interval = setInterval(() => {
      current -= 1;
      if (current <= 0) {
        clearInterval(interval);
        setActiveConsumableCountdown(null);
      } else {
        setActiveConsumableCountdown({ name, secondsLeft: current });
      }
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 select-none">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-4xl max-h-[90vh] rounded flex flex-col shadow-2xl overflow-hidden text-slate-100">
        {/* Header */}
        <div className="bg-slate-950 px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="font-tactical font-bold text-lg text-amber-400 tracking-wider">
              TACTICAL BACKPACK & LOADOUT MATRIX
            </h2>
            <span className="text-xs text-slate-400">
              (250-Capacity Tactical Grid)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex bg-slate-800 rounded p-0.5 text-xs font-tactical">
              <button
                onClick={() => setActiveTab('inventory')}
                className={`px-3 py-1 rounded cursor-pointer ${activeTab === 'inventory' ? 'bg-amber-600 text-slate-950 font-bold' : 'text-slate-300 hover:text-white'}`}
              >
                BACKPACK
              </button>
              <button
                onClick={() => setActiveTab('skin_lab')}
                className={`px-3 py-1 rounded cursor-pointer ${activeTab === 'skin_lab' ? 'bg-amber-600 text-slate-950 font-bold' : 'text-slate-300 hover:text-white'}`}
              >
                PROGRESSIVE SKIN LAB
              </button>
              <button
                onClick={() => setActiveTab('loadout')}
                className={`px-3 py-1 rounded cursor-pointer ${activeTab === 'loadout' ? 'bg-amber-600 text-slate-950 font-bold' : 'text-slate-300 hover:text-white'}`}
              >
                TACTICAL GEAR
              </button>
            </div>

            <button
              onClick={onClose}
              aria-label="Close Backpack"
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1 rounded text-xs font-tactical cursor-pointer"
            >
              ESC / CLOSE
            </button>
          </div>
        </div>

        {/* Weight Capacity Bar */}
        <div className="bg-slate-950/60 px-6 py-2 border-b border-slate-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-tactical">WEIGHT BUDGET:</span>
            <span className="font-code font-bold text-amber-400 tabular-nums">
              {Math.round(totalWeight)} / {maxCapacity} kg
            </span>
          </div>
          <div className="w-64 h-2 bg-slate-800 rounded overflow-hidden">
            <div
              className={`h-full ${weightPercent > 90 ? 'bg-red-500' : 'bg-amber-500'}`}
              style={{ width: `${weightPercent}%` }}
            ></div>
          </div>
        </div>

        {/* Consumable Countdown Toast */}
        {activeConsumableCountdown && (
          <div className="bg-amber-950/90 border-b border-amber-500/60 px-6 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-tactical text-amber-300">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
              <span>APPLYING {activeConsumableCountdown.name.toUpperCase()}...</span>
            </div>
            <div className="font-code text-sm font-bold text-white tabular-nums">
              {activeConsumableCountdown.secondsLeft}s
            </div>
          </div>
        )}

        {/* Tab 1: Inventory Grid & Consumables */}
        {activeTab === 'inventory' && (
          <div className="p-6 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left: Consumables & Activation Timers */}
            <div className="flex flex-col gap-3">
              <h3 className="font-tactical font-semibold text-xs text-slate-400 uppercase tracking-wider">
                TACTICAL MEDICAL & BOOST CONSUMABLES
              </h3>

              <div className="grid grid-cols-1 gap-2.5">
                {Object.entries(CONSUMABLES).map(([k, item]) => (
                  <div
                    key={k}
                    className="bg-slate-800/80 border border-slate-700/80 p-3 rounded flex items-center justify-between hover:border-amber-500/50 transition-colors"
                  >
                    <div>
                      <div className="font-tactical font-bold text-sm text-slate-100 flex items-center gap-2">
                        <span>{item.name}</span>
                        <span className="bg-slate-900 text-slate-400 text-[10px] px-1.5 py-0.2 rounded font-code">
                          {item.weight} wt
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        {item.description}
                      </div>
                      <div className="text-[11px] text-amber-400 font-code mt-1">
                        ⏱️ Activation Time: {item.useTimeSec}s
                      </div>
                    </div>

                    <button
                      onClick={() => handleUseItem(k, item.useTimeSec || 5, item.name)}
                      disabled={!!activeConsumableCountdown}
                      className="bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-slate-950 font-tactical font-bold text-xs px-3 py-2 rounded cursor-pointer"
                    >
                      USE [{item.useTimeSec}s]
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Weapon Attachment Lab */}
            <div className="flex flex-col gap-3">
              <h3 className="font-tactical font-semibold text-xs text-slate-400 uppercase tracking-wider">
                WEAPON ATTACHMENT SLOTS & RECOIL TUNING ({activeWeapon.name})
              </h3>

              <div className="bg-slate-800/60 border border-slate-700 p-4 rounded flex flex-col gap-4">
                {/* Muzzle */}
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-tactical text-slate-300 font-bold">MUZZLE SLOT</div>
                    <div className="text-[11px] text-slate-400">Compensator (-25% climb) / Suppressor</div>
                  </div>
                  <select
                    value={primaryAttachments.muzzle || 'none'}
                    onChange={(e) => onUpdateAttachments('primary', 'muzzle', e.target.value === 'none' ? undefined : e.target.value)}
                    className="bg-slate-900 border border-slate-700 text-xs px-2.5 py-1.5 rounded text-amber-300 font-tactical cursor-pointer"
                  >
                    <option value="none">Empty Slot</option>
                    <option value="compensator">Compensator (-25% Vert Climb)</option>
                    <option value="flash_hider">Flash Hider (-10% Sway)</option>
                    <option value="suppressor">Suppressor (Stealth Audio)</option>
                  </select>
                </div>

                {/* Foregrip */}
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-tactical text-slate-300 font-bold">FOREGRIP SLOT</div>
                    <div className="text-[11px] text-slate-400">Vertical (-20% vert) / Angled (-25% horiz)</div>
                  </div>
                  <select
                    value={primaryAttachments.grip || 'none'}
                    onChange={(e) => onUpdateAttachments('primary', 'grip', e.target.value === 'none' ? undefined : e.target.value)}
                    className="bg-slate-900 border border-slate-700 text-xs px-2.5 py-1.5 rounded text-amber-300 font-tactical cursor-pointer"
                  >
                    <option value="none">Empty Slot</option>
                    <option value="vertical">Vertical Foregrip (-20% Climb)</option>
                    <option value="angled">Angled Foregrip (-25% Drift)</option>
                    <option value="half">Half Grip (Balanced Spray)</option>
                  </select>
                </div>

                {/* Magazine */}
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-tactical text-slate-300 font-bold">MAGAZINE SLOT</div>
                    <div className="text-[11px] text-slate-400">Extended (+10 rounds) & Quickdraw (-30% reload)</div>
                  </div>
                  <select
                    value={primaryAttachments.magazine || 'none'}
                    onChange={(e) => onUpdateAttachments('primary', 'magazine', e.target.value === 'none' ? undefined : e.target.value)}
                    className="bg-slate-900 border border-slate-700 text-xs px-2.5 py-1.5 rounded text-amber-300 font-tactical cursor-pointer"
                  >
                    <option value="none">Standard Mag (30 Rds)</option>
                    <option value="extended">Extended Mag (40 Rds)</option>
                    <option value="quickdraw">Quickdraw Mag (1.4s Reload)</option>
                    <option value="extended_quickdraw">Extended Quickdraw (40 Rds / 1.4s)</option>
                  </select>
                </div>

                {/* Optic Sight */}
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-tactical text-slate-300 font-bold">OPTIC SCOPE SLOT</div>
                    <div className="text-[11px] text-slate-400">Red Dot / Holographic / 4x ACOG / 8x Sniper</div>
                  </div>
                  <select
                    value={primaryAttachments.sight || 'red_dot'}
                    onChange={(e) => onUpdateAttachments('primary', 'sight', e.target.value)}
                    className="bg-slate-900 border border-slate-700 text-xs px-2.5 py-1.5 rounded text-amber-300 font-tactical cursor-pointer"
                  >
                    <option value="iron">Iron Sights (1.0x)</option>
                    <option value="red_dot">Red Dot Sight (1.2x Reticle)</option>
                    <option value="holo">Holographic Sight</option>
                    <option value="2x">2x Aimpoint Scope</option>
                    <option value="3x">3x Backlit Optic</option>
                    <option value="4x">4x ACOG Chevron Scope</option>
                    <option value="6x">6x Tactical Scope</option>
                    <option value="8x">8x CQB Sniper Scope</option>
                  </select>
                </div>

                {/* Stock */}
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-tactical text-slate-300 font-bold">TACTICAL STOCK</div>
                    <div className="text-[11px] text-slate-400">Recoil Recovery Speed +20%</div>
                  </div>
                  <select
                    value={primaryAttachments.stock || 'none'}
                    onChange={(e) => onUpdateAttachments('primary', 'stock', e.target.value === 'none' ? undefined : e.target.value)}
                    className="bg-slate-900 border border-slate-700 text-xs px-2.5 py-1.5 rounded text-amber-300 font-tactical cursor-pointer"
                  >
                    <option value="none">No Stock</option>
                    <option value="tactical_stock">Tactical Stock (+20% Recoil Recovery)</option>
                    <option value="cheek_pad">Cheek Pad (Sniper Sway Reset)</option>
                  </select>
                </div>
              </div>

              {/* Ammo Reserves */}
              <div className="bg-slate-800/40 border border-slate-700 p-3 rounded">
                <div className="text-xs font-tactical text-slate-400 uppercase mb-2">AMMUNITION RESERVES</div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  {Object.entries(reserveAmmo).map(([cal, count]) => (
                    <div key={cal} className="bg-slate-900 p-2 rounded flex justify-between items-center">
                      <span className="font-code text-slate-300">{cal}</span>
                      <span className="font-code font-bold text-amber-400 tabular-nums">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Progressive Gun Skin Laboratory */}
        {activeTab === 'skin_lab' && (
          <div className="p-6 overflow-y-auto flex flex-col gap-5">
            <div className="bg-gradient-to-r from-amber-950/40 to-slate-900 p-4 border border-amber-500/30 rounded">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-tactical font-bold text-base text-amber-400">
                    M416 - GLACIER / CYBER DRAGON (PROGRESSIVE LEVEL 7)
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Strict Fair-Play Standard: 100% cosmetic visual and audio upgrades only. Zero stat boosts, zero recoil alterations, zero damage modifiers.
                  </p>
                </div>
                <span className="bg-emerald-950 border border-emerald-500 text-emerald-300 text-[11px] font-tactical font-bold px-3 py-1 rounded">
                  FAIR-PLAY VERIFIED
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
              <div className="bg-slate-800 border border-slate-700 p-3.5 rounded flex flex-col gap-2">
                <div className="text-amber-400 font-tactical font-bold text-sm">LEVEL 1: BASIC FINISH</div>
                <p className="text-slate-400 text-[11px]">Procedural anodized arctic crystalline mesh finish with ice-blue specular reflection.</p>
                <div className="mt-auto text-emerald-400 font-tactical font-semibold">✓ UNLOCKED</div>
              </div>

              <div className="bg-slate-800 border border-slate-700 p-3.5 rounded flex flex-col gap-2">
                <div className="text-amber-400 font-tactical font-bold text-sm">LEVEL 4: KILL EFFECT</div>
                <p className="text-slate-400 text-[11px]">Sub-zero frost vapor blast triggered at elimination point with procedural audio chime.</p>
                <div className="mt-auto text-emerald-400 font-tactical font-semibold">✓ ACTIVE</div>
              </div>

              <div className="bg-slate-800 border border-slate-700 p-3.5 rounded flex flex-col gap-2">
                <div className="text-amber-400 font-tactical font-bold text-sm">LEVEL 6: KILL BROADCAST</div>
                <p className="text-slate-400 text-[11px]">Bespoke gold & ice banner rendered in global match feed across all client HUDs.</p>
                <div className="mt-auto text-emerald-400 font-tactical font-semibold">✓ ACTIVE</div>
              </div>

              <div className="bg-slate-800 border border-slate-700 p-3.5 rounded flex flex-col gap-2">
                <div className="text-amber-400 font-tactical font-bold text-sm">LEVEL 7: DEATH CRATE</div>
                <p className="text-slate-400 text-[11px]">Replaces standard wooden death crate with an ornate frozen monolith and glowing aura.</p>
                <div className="mt-auto text-emerald-400 font-tactical font-semibold">✓ EQUIPPED</div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Tactical Operator Gear */}
        {activeTab === 'loadout' && (
          <div className="p-6 overflow-y-auto flex flex-col gap-4 text-xs">
            <h3 className="font-tactical font-bold text-sm text-slate-300">
              MODULAR CHARACTER OUTFIT SLOTS (6-SLOT SYSTEM)
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div className="bg-slate-800/80 border border-slate-700 p-3 rounded">
                <div className="text-slate-400 font-tactical">SLOT 1: HEADGEAR</div>
                <div className="font-bold text-slate-200 mt-1">Ops-Core FAST Carbon Ballistic</div>
              </div>
              <div className="bg-slate-800/80 border border-slate-700 p-3 rounded">
                <div className="text-slate-400 font-tactical">SLOT 2: EYEWEAR</div>
                <div className="font-bold text-slate-200 mt-1">Tactical Polarized Ballistic Visor</div>
              </div>
              <div className="bg-slate-800/80 border border-slate-700 p-3 rounded">
                <div className="text-slate-400 font-tactical">SLOT 3: PLATE CARRIER</div>
                <div className="font-bold text-slate-200 mt-1">Crye Precision JPC 2.0 (Level 2)</div>
              </div>
              <div className="bg-slate-800/80 border border-slate-700 p-3 rounded">
                <div className="text-slate-400 font-tactical">SLOT 4: COMBAT UNIFORM</div>
                <div className="font-bold text-slate-200 mt-1">Nordic Multicam BDU Shirt & Pants</div>
              </div>
              <div className="bg-slate-800/80 border border-slate-700 p-3 rounded">
                <div className="text-slate-400 font-tactical">SLOT 5: GLOVES</div>
                <div className="font-bold text-slate-200 mt-1">Mechanix Wear M-Pact Hard Knuckle</div>
              </div>
              <div className="bg-slate-800/80 border border-slate-700 p-3 rounded">
                <div className="text-slate-400 font-tactical">SLOT 6: COMBAT BOOTS</div>
                <div className="font-bold text-slate-200 mt-1">Lowa Zephyr GTX Mid TF Boots</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
