/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Comprehensive PUBG-Style Battle Royale System & Technical GDD Architecture Suite
 * Complete Implementation-Ready Game Design Document with Data Tables, Formulas & Code Snippets
 */

import React, { useState } from 'react';
import { CIRCLE_PHASES, LIVIK_POIS, WEAPONS, HELMETS, VESTS, SENSITIVITY_PRESETS, GRAPHICS_TIERS, TACTICAL_CALLOUTS } from '../game/data';
import { calculateTTK } from '../game/ballistics';

interface GDDModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GDDDocumentModal: React.FC<GDDModalProps> = ({ isOpen, onClose }) => {
  const [activePillar, setActivePillar] = useState<number>(1);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  if (!isOpen) return null;

  const copySnippet = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const ue5Snippet = `// ============================================================================
// UNREAL ENGINE 5.4 BALLISTICS COMPONENT (C++)
// UBallisticsTrajectoryComponent: Realistic Drag & Parabolic Gravity Drop
// ============================================================================

#include "BallisticsTrajectoryComponent.h"
#include "Kismet/KismetMathLibrary.h"

void UBallisticsTrajectoryComponent::SimulateBulletStep(
    FVector& InOutPosition,
    FVector& InOutVelocity,
    float DeltaTime,
    float DragCoefficient,
    float BulletMassKg,
    float CrossSectionAreaM2)
{
    // 1. Atmosphere density (rho = 1.225 kg/m^3 at sea level)
    const float AirDensity = 1.225f;

    // 2. Velocity magnitude & drag force: F_d = 0.5 * rho * v^2 * C_d * A
    const float SpeedSquared = InOutVelocity.SizeSquared();
    const float DragForceMag = 0.5f * AirDensity * SpeedSquared * DragCoefficient * CrossSectionAreaM2;

    // 3. Drag acceleration vector opposing direction of travel
    const FVector DragAcceleration = -InOutVelocity.GetSafeNormal() * (DragForceMag / BulletMassKg);

    // 4. Gravity acceleration vector (Z downwards)
    const FVector GravityAcceleration(0.0f, 0.0f, -980.665f); // cm/s^2 (Unreal Units)

    // 5. Total kinematic acceleration & Euler-Verlet integration
    const FVector TotalAcceleration = DragAcceleration + GravityAcceleration;
    InOutVelocity += TotalAcceleration * DeltaTime;
    InOutPosition += InOutVelocity * DeltaTime;
}`;

  const unityNetcodeSnippet = `// ============================================================================
// UNITY 6 NETCODE FOR ENTITIES / GAME OBJECTS (C#)
// ClientPrediction & Server-Authoritative Reconciliation (60Hz Tick-Rate)
// ============================================================================

using Unity.Netcode;
using UnityEngine;

public struct PlayerMoveInput : INetworkSerializable
{
    public uint Tick;
    public Vector3 MoveDirection;
    public float Yaw;
    public float Pitch;
    public bool IsSprinting;

    public void NetworkSerialize<T>(BufferSerializer<T> serializer) where T : IReaderWriter
    {
        serializer.SerializeValue(ref Tick);
        serializer.SerializeValue(ref MoveDirection);
        serializer.SerializeValue(ref Yaw);
        serializer.SerializeValue(ref Pitch);
        serializer.SerializeValue(ref IsSprinting);
    }
}

public class ServerAuthoritativeCombatKernel : NetworkBehaviour
{
    private const int BUFFER_SIZE = 128;
    private PlayerState[] stateBuffer = new PlayerState[BUFFER_SIZE];
    private PlayerMoveInput[] inputBuffer = new PlayerMoveInput[BUFFER_SIZE];

    [ServerRpc]
    public void SubmitInputServerRpc(PlayerMoveInput input)
    {
        // 1. Validate delta time and movement speed bounds against anti-speedhack capsule
        float maxAllowedSpeed = input.IsSprinting ? 8.5f : 5.8f;
        if (input.MoveDirection.sqrMagnitude > 1.05f) return; // Malformed client packet dropped

        // 2. Deterministic Server Step Execution
        SimulatePhysicsTick(input);

        // 3. Broadcast reconciled canonical state back to client
        ConfirmStateClientRpc(CurrentState, input.Tick);
    }

    [ClientRpc]
    private void ConfirmStateClientRpc(PlayerState serverState, uint validatedTick)
    {
        // Client reconciliation: Rewind and replay unacknowledged local inputs
        uint bufferIndex = validatedTick % BUFFER_SIZE;
        if (Vector3.Distance(stateBuffer[bufferIndex].Position, serverState.Position) > 0.08f)
        {
            // Reconcile rollback error
            transform.position = serverState.Position;
            ReplayInputsSince(validatedTick);
        }
    }
}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-2 sm:p-6 select-none">
      <div className="bg-slate-950 border border-amber-500/50 w-full max-w-6xl max-h-[94vh] rounded-sm flex flex-col shadow-2xl overflow-hidden text-slate-100">
        {/* Header */}
        <div className="bg-slate-900/90 px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 bg-amber-500 rounded-xs"></span>
            <div>
              <h1 className="font-tactical font-bold text-base sm:text-lg text-amber-400 tracking-wider">
                PUBG-STYLE TACTICAL BATTLE ROYALE TECHNICAL GDD & ARCHITECTURE
              </h1>
              <p className="text-[11px] text-slate-400">
                Authored by Lead Technical Game Architect | Dual Roman Urdu & English Tactical Specifications
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close GDD"
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3.5 py-1.5 rounded text-xs font-tactical cursor-pointer"
          >
            ESC / CLOSE
          </button>
        </div>

        {/* 6-Pillar Tab Navigation Bar */}
        <div className="bg-slate-900 border-b border-slate-800 px-6 py-2 flex items-center gap-2 overflow-x-auto text-xs font-tactical">
          {[
            { id: 1, label: 'PILLAR 1: MAP & PACING' },
            { id: 2, label: 'PILLAR 2: BALLISTICS & TTK' },
            { id: 3, label: 'PILLAR 3: INVENTORY & PASS' },
            { id: 4, label: 'PILLAR 4: SENSITIVITY & HUD' },
            { id: 5, label: 'PILLAR 5: GRAPHICS & PROFILING' },
            { id: 6, label: 'PILLAR 6: NETCODE & ANTI-CHEAT' },
            { id: 7, label: 'ROADMAP CHECKLIST' },
          ].map((pillar) => (
            <button
              key={pillar.id}
              onClick={() => setActivePillar(pillar.id)}
              className={`px-3 py-1.5 rounded whitespace-nowrap cursor-pointer transition-colors ${
                activePillar === pillar.id
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-md'
                  : 'bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700'
              }`}
            >
              {pillar.label}
            </button>
          ))}
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 text-slate-200 text-xs sm:text-sm leading-relaxed space-y-6">
          {/* ================= PILLAR 1: MAP ARCHITECTURE & SPATIAL PACING ================= */}
          {activePillar === 1 && (
            <div className="space-y-6">
              <div className="bg-slate-900/80 border border-slate-800 p-4 rounded">
                <h2 className="font-tactical font-bold text-base text-amber-400 mb-2">
                  1. LIVIK FAST-PACED (2x2KM) SPATIAL BLUEPRINT & PACING
                </h2>
                <p className="text-slate-300 text-xs">
                  Livik is engineered specifically for competitive 15-minute match cycles on a 2x2km spatial footprint.
                  High player concentration (32 to 52 players) triggers immediate engagement upon boots-on-the-ground drop,
                  eliminating mid-game lull through aggressive 6-phase circle shrink intervals and high-density tactical airdrops.
                </p>
                <div className="mt-2 text-[11px] text-amber-300 font-tactical">
                  *Urdu Tactical Note: 2x2km chota naqsha fast rotations aur aggressive gunfights ke liye tayyar kiya gaya hai.*
                </div>
              </div>

              {/* Dynamic Circle Timings Table */}
              <div>
                <h3 className="font-tactical font-bold text-sm text-slate-200 uppercase mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 bg-sky-400 rounded-full"></span>
                  Dynamic Circle Shrink Timings & Blue-Zone DPS Matrix
                </h3>
                <div className="overflow-x-auto border border-slate-800 rounded">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-900 text-amber-400 font-tactical border-b border-slate-800">
                        <th className="p-2.5">Zone Phase</th>
                        <th className="p-2.5">Diameter (Meters)</th>
                        <th className="p-2.5">Delay / Wait Time</th>
                        <th className="p-2.5">Shrink Duration</th>
                        <th className="p-2.5">Blue Zone DPS</th>
                        <th className="p-2.5">Tactical Urgency Level</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 font-code">
                      {CIRCLE_PHASES.map((p) => (
                        <tr key={p.phase} className="hover:bg-slate-900/50">
                          <td className="p-2.5 font-bold text-sky-400">Phase {p.phase}</td>
                          <td className="p-2.5 tabular-nums">{p.diameterMeters}m</td>
                          <td className="p-2.5 tabular-nums">{p.delaySec}s ({Math.floor(p.delaySec / 60)}m {p.delaySec % 60}s)</td>
                          <td className="p-2.5 tabular-nums">{p.shrinkDurationSec}s</td>
                          <td className="p-2.5 tabular-nums text-red-400 font-bold">{p.dps} HP/sec</td>
                          <td className="p-2.5 text-slate-300 font-tactical">
                            {p.phase === 1 ? 'Looting & Vehicle Acquisition' : p.phase < 4 ? 'Flank Rotations & Compound Holds' : 'Endgame Positioning (Smoke Wall Meta)'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* POI Table */}
              <div>
                <h3 className="font-tactical font-bold text-sm text-slate-200 uppercase mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 bg-amber-400 rounded-full"></span>
                  Livik POI Hierarchy, Biomes & Tactical Vehicle Distribution
                </h3>
                <div className="overflow-x-auto border border-slate-800 rounded">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-900 text-amber-400 font-tactical border-b border-slate-800">
                        <th className="p-2.5">POI Name (EN / Roman Urdu)</th>
                        <th className="p-2.5">Biome</th>
                        <th className="p-2.5">Loot Tier</th>
                        <th className="p-2.5">Hot-Drop?</th>
                        <th className="p-2.5">Vehicle Garage</th>
                        <th className="p-2.5">Tactical Landmark Characteristics</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {LIVIK_POIS.map((poi) => (
                        <tr key={poi.id} className="hover:bg-slate-900/50">
                          <td className="p-2.5 font-bold text-slate-100 font-tactical">
                            {poi.name} <span className="block text-[11px] text-amber-400/80 font-normal">({poi.nameUrdu})</span>
                          </td>
                          <td className="p-2.5 font-code text-slate-300">{poi.biome}</td>
                          <td className="p-2.5 font-code">
                            <span className={`px-2 py-0.5 rounded text-[10px] ${poi.tier === 'High' ? 'bg-amber-950 text-amber-300' : 'bg-slate-800 text-slate-300'}`}>
                              {poi.tier} Tier
                            </span>
                          </td>
                          <td className="p-2.5 font-code">
                            {poi.hotDrop ? <span className="text-red-400 font-bold">YES (HIGH CONTEST)</span> : <span className="text-slate-500">NO</span>}
                          </td>
                          <td className="p-2.5 font-code">
                            {poi.vehicleGarage ? <span className="text-emerald-400">4x4 Buggy / Monster Truck</span> : <span className="text-slate-500">None</span>}
                          </td>
                          <td className="p-2.5 text-slate-300">{poi.description}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ================= PILLAR 2: WEAPON BALLISTICS, RECOIL & ATTACHMENT LAB ================= */}
          {activePillar === 2 && (
            <div className="space-y-6">
              <div className="bg-slate-900/80 border border-slate-800 p-4 rounded">
                <h2 className="font-tactical font-bold text-base text-amber-400 mb-2">
                  2. TRUE PROJECTILE BALLISTICS PHYSICS & RECOIL KINEMATICS
                </h2>
                <p className="text-slate-300 text-xs">
                  Zero hitscan simulation. Every projectile is computed as an independent point-mass experiencing atmospheric air drag
                  (Fd = 0.5 · ρ · v² · Cd · A) and parabolic gravitational drop (y(t) = 0.5 · g · t²).
                  Recoil utilizes a dual-axis kinematic model featuring exponential vertical climb, stochastic horizontal drift, first-shot kick multipliers, and linear damping recovery decay.
                </p>

                {/* Mathematical Formula Box */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3 text-xs font-code bg-slate-950 p-3 rounded border border-slate-800">
                  <div>
                    <div className="text-amber-400 font-tactical font-bold">Velocity Decay & Drop:</div>
                    <div className="text-slate-200 mt-1">v(t) = v_0 / (1 + k · v_0 · t)</div>
                    <div className="text-slate-400">where k = 0.5 · ρ · C_d · A / m</div>
                    <div className="text-slate-200 mt-1">y_drop(d) = 0.5 · g · (d / v_avg)^2</div>
                  </div>
                  <div>
                    <div className="text-amber-400 font-tactical font-bold">Recoil Climb Kinematics:</div>
                    <div className="text-slate-200 mt-1">R_v(n) = Base_Climb · [1 + FSK · δ(n,1)] · Att_Mod</div>
                    <div className="text-slate-400">FSK = First Shot Kick (1.45x - 2.5x)</div>
                    <div className="text-slate-200 mt-1">Recovery: θ(t) = θ_max · e^(-λ · t)</div>
                  </div>
                </div>
              </div>

              {/* Complete TTK & Armor Mitigation Table across all 9 Weapons */}
              <div>
                <h3 className="font-tactical font-bold text-sm text-slate-200 uppercase mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 bg-emerald-400 rounded-full"></span>
                  Weapon Balance Matrix & Time-To-Kill (TTK) across Helmet/Vest Levels 0–3
                </h3>
                <div className="overflow-x-auto border border-slate-800 rounded">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-900 text-amber-400 font-tactical border-b border-slate-800">
                        <th className="p-2.5">Weapon</th>
                        <th className="p-2.5">Caliber</th>
                        <th className="p-2.5">Base DMG</th>
                        <th className="p-2.5">Velocity</th>
                        <th className="p-2.5">RPM</th>
                        <th className="p-2.5">TTK Chest (Lv.0)</th>
                        <th className="p-2.5">TTK Chest (Lv.2 40%)</th>
                        <th className="p-2.5">TTK Chest (Lv.3 55%)</th>
                        <th className="p-2.5">Headshot Shots (Lv.3 Helm)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 font-code">
                      {Object.values(WEAPONS).map((w) => {
                        const ttk0 = calculateTTK(w.baseDamage, w.fireRateRPM, w.headshotMultiplier, 0.0, false);
                        const ttk2 = calculateTTK(w.baseDamage, w.fireRateRPM, w.headshotMultiplier, 0.40, false);
                        const ttk3 = calculateTTK(w.baseDamage, w.fireRateRPM, w.headshotMultiplier, 0.55, false);
                        const headshotsLv3 = calculateTTK(w.baseDamage, w.fireRateRPM, w.headshotMultiplier, 0.55, true);

                        return (
                          <tr key={w.id} className="hover:bg-slate-900/50">
                            <td className="p-2.5 font-bold text-slate-100 font-tactical">{w.name} ({w.category})</td>
                            <td className="p-2.5 text-slate-400">{w.caliber}</td>
                            <td className="p-2.5 tabular-nums text-amber-300">{w.baseDamage}</td>
                            <td className="p-2.5 tabular-nums">{w.muzzleVelocity} m/s</td>
                            <td className="p-2.5 tabular-nums">{w.fireRateRPM}</td>
                            <td className="p-2.5 tabular-nums text-emerald-400">{ttk0.ttkSeconds}s ({ttk0.shotsToKill} shots)</td>
                            <td className="p-2.5 tabular-nums text-amber-400">{ttk2.ttkSeconds}s ({ttk2.shotsToKill} shots)</td>
                            <td className="p-2.5 tabular-nums text-red-400">{ttk3.ttkSeconds}s ({ttk3.shotsToKill} shots)</td>
                            <td className="p-2.5 tabular-nums font-bold text-sky-400">
                              {headshotsLv3.shotsToKill === 1 ? '1 SHOT (INSTA-KILL)' : `${headshotsLv3.shotsToKill} Shots`}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Material Penetration Specifications */}
              <div className="bg-slate-900/60 border border-slate-800 p-4 rounded text-xs">
                <h4 className="font-tactical font-bold text-sm text-slate-200 uppercase mb-2">
                  Tactical Material Penetration Thresholds (Ballistic RHA Equivalence)
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 font-code">
                  <div className="bg-slate-950 p-2.5 rounded border border-slate-800">
                    <div className="text-slate-400 font-tactical">DRYWALL / THIN WOOD</div>
                    <div className="text-emerald-400 font-bold mt-1">15 RHA Rating</div>
                    <div className="text-[11px] text-slate-400">All 9mm, 5.56, 7.62 penetrate (85% residual DMG)</div>
                  </div>
                  <div className="bg-slate-950 p-2.5 rounded border border-slate-800">
                    <div className="text-slate-400 font-tactical">VEHICLE SAFETY GLASS</div>
                    <div className="text-emerald-400 font-bold mt-1">25 RHA Rating</div>
                    <div className="text-[11px] text-slate-400">Shatters on hit 1; bullet trajectory deflects ~2.5°</div>
                  </div>
                  <div className="bg-slate-950 p-2.5 rounded border border-slate-800">
                    <div className="text-slate-400 font-tactical">SHEET METAL / CAR DOORS</div>
                    <div className="text-amber-400 font-bold mt-1">70 RHA Rating</div>
                    <div className="text-[11px] text-slate-400">5.56 & 7.62 ARs penetrate (45% residual DMG); SMGs ricochet</div>
                  </div>
                  <div className="bg-slate-950 p-2.5 rounded border border-slate-800">
                    <div className="text-slate-400 font-tactical">SOLID CONCRETE & ROCKS</div>
                    <div className="text-red-400 font-bold mt-1">95 RHA Rating</div>
                    <div className="text-[11px] text-slate-400">100% impenetrable cover; bullet ricochet particle FX</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================= PILLAR 3: CHARACTER INVENTORY & COSMETIC MONETIZATION ================= */}
          {activePillar === 3 && (
            <div className="space-y-6">
              <div className="bg-slate-900/80 border border-slate-800 p-4 rounded">
                <h2 className="font-tactical font-bold text-base text-amber-400 mb-2">
                  3. 250-CAPACITY TACTICAL INVENTORY & FAIR-PLAY BATTLE PASS ARCHITECTURE
                </h2>
                <p className="text-slate-300 text-xs">
                  A strict capacity weight budget of 250 units forces deliberate resource management between ammunition count,
                  protective armor vests, and medical supplies. Consumable timings are balanced to enable counter-play during tactical pushes.
                  Monetization enforces a strict <strong>Zero Pay-to-Win</strong> rule: cosmetic weapons offer custom kill effects, broadcast banners, and inspect animations with zero stat or hitbox modifications.
                </p>
                <div className="mt-2 text-[11px] text-amber-300 font-tactical">
                  *Urdu Tactical Note: Kisi bhi skin se damage ya reload speed barhane ki ijazat nahi hai. Sirf visual aur sound effects.*
                </div>
              </div>

              {/* Medical Timers & Specifications */}
              <div>
                <h3 className="font-tactical font-bold text-sm text-slate-200 uppercase mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 bg-indigo-400 rounded-full"></span>
                  Tactical Consumable Activation & Health Recovery Timetable
                </h3>
                <div className="overflow-x-auto border border-slate-800 rounded">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-900 text-amber-400 font-tactical border-b border-slate-800">
                        <th className="p-2.5">Consumable Item</th>
                        <th className="p-2.5">Activation Duration</th>
                        <th className="p-2.5">Weight (kg)</th>
                        <th className="p-2.5">Max Carry Stack</th>
                        <th className="p-2.5">Health / Boost Granted</th>
                        <th className="p-2.5">Tactical Usage Scenario</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 font-code">
                      <tr>
                        <td className="p-2.5 font-bold font-tactical text-slate-100">Bandage (Patti)</td>
                        <td className="p-2.5 text-amber-400 tabular-nums">3.0s</td>
                        <td className="p-2.5 tabular-nums">2</td>
                        <td className="p-2.5 tabular-nums">10</td>
                        <td className="p-2.5 text-emerald-400">+10 HP (Cap: 75% HP)</td>
                        <td className="p-2.5 text-slate-300 font-sans">Quick patch during early blue zone or behind tree cover.</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-bold font-tactical text-slate-100">First Aid Kit (Tibbi Imdad)</td>
                        <td className="p-2.5 text-amber-400 tabular-nums">6.0s</td>
                        <td className="p-2.5 tabular-nums">10</td>
                        <td className="p-2.5 tabular-nums">5</td>
                        <td className="p-2.5 text-emerald-400">Instantly sets HP to 75%</td>
                        <td className="p-2.5 text-slate-300 font-sans">Core mid-combat survival dressing after body damage.</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-bold font-tactical text-slate-100">Medkit (Mukammal Ilaj)</td>
                        <td className="p-2.5 text-amber-400 tabular-nums">8.0s</td>
                        <td className="p-2.5 tabular-nums">20</td>
                        <td className="p-2.5 tabular-nums">2</td>
                        <td className="p-2.5 text-emerald-400">100% Full Health Restoration</td>
                        <td className="p-2.5 text-slate-300 font-sans">High commitment reset before entering final compound.</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-bold font-tactical text-slate-100">Energy Drink (Tawanai Drink)</td>
                        <td className="p-2.5 text-amber-400 tabular-nums">4.0s</td>
                        <td className="p-2.5 tabular-nums">4</td>
                        <td className="p-2.5 tabular-nums">10</td>
                        <td className="p-2.5 text-amber-300">+40 Boost Units</td>
                        <td className="p-2.5 text-slate-300 font-sans">Fast boost primer for passive HP regeneration on the move.</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-bold font-tactical text-slate-100">Painkillers (Dard Ki Goli)</td>
                        <td className="p-2.5 text-amber-400 tabular-nums">6.0s</td>
                        <td className="p-2.5 tabular-nums">10</td>
                        <td className="p-2.5 tabular-nums">5</td>
                        <td className="p-2.5 text-amber-300">+60 Boost Units</td>
                        <td className="p-2.5 text-slate-300 font-sans">Crosses 50% boost threshold to unlock +6.2% sprint speed.</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-bold font-tactical text-slate-100">Adrenaline Syringe (Josh Tikka)</td>
                        <td className="p-2.5 text-amber-400 tabular-nums">6.0s</td>
                        <td className="p-2.5 tabular-nums">20</td>
                        <td className="p-2.5 tabular-nums">2</td>
                        <td className="p-2.5 text-amber-300">100% Max Boost Instantly</td>
                        <td className="p-2.5 text-slate-300 font-sans">Air-drop high-value stimulant for maximum mobility and regeneration.</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Progressive Gun Skin Framework */}
              <div className="bg-slate-900/60 border border-slate-800 p-4 rounded text-xs space-y-2">
                <h4 className="font-tactical font-bold text-sm text-amber-400 uppercase">
                  Progressive Gun Skin Laboratory Hierarchy (7 Upgrade Tiers)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 pt-2">
                  <div className="bg-slate-950 p-2.5 rounded border border-slate-800">
                    <span className="font-tactical text-amber-400 font-bold">LV.1 - Base Skin</span>
                    <p className="text-slate-400 mt-1">Unique 3D procedural chassis with PBR metallic sheen.</p>
                  </div>
                  <div className="bg-slate-950 p-2.5 rounded border border-slate-800">
                    <span className="font-tactical text-amber-400 font-bold">LV.4 - Kill Effect</span>
                    <p className="text-slate-400 mt-1">Sub-zero crystalline smoke burst at enemy hitbox.</p>
                  </div>
                  <div className="bg-slate-950 p-2.5 rounded border border-slate-800">
                    <span className="font-tactical text-amber-400 font-bold">LV.6 - Kill Broadcast</span>
                    <p className="text-slate-400 mt-1">Gilded UI typography in match-wide elimination ticker.</p>
                  </div>
                  <div className="bg-slate-950 p-2.5 rounded border border-slate-800">
                    <span className="font-tactical text-amber-400 font-bold">LV.7 - Death Crate</span>
                    <p className="text-slate-400 mt-1">Replaces opponent loot box with custom sculpted monolith.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================= PILLAR 4: CONTROLS, SENSITIVITY CALCULATION & HUD ARCHITECTURE ================= */}
          {activePillar === 4 && (
            <div className="space-y-6">
              <div className="bg-slate-900/80 border border-slate-800 p-4 rounded">
                <h2 className="font-tactical font-bold text-base text-amber-400 mb-2">
                  4. MULTI-FINGER CLAW SCHEMES, GYROSCOPE CURVES & eDPI FORMULAS
                </h2>
                <p className="text-slate-300 text-xs">
                  Mobile touch digitizer latency and PC mouse raw input pipelines require mathematically sound focal-length scaling.
                  To ensure that 1cm of screen flick or 1° of physical phone tilt sweeps identical visual angular displacement regardless of zoom magnification,
                  ADS sensitivity uses tangent-based field-of-view scaling.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3 text-xs font-code bg-slate-950 p-3 rounded border border-slate-800">
                  <div>
                    <div className="text-amber-400 font-tactical font-bold">Focal-Length ADS Scaling Formula:</div>
                    <div className="text-slate-200 mt-1">Sens_Scope = Sens_Hipfire · [tan(FOV_Scope / 2) / tan(FOV_Hip / 2)]</div>
                    <div className="text-slate-400">Preserves screen-center motor memory across 1x to 8x scopes</div>
                  </div>
                  <div>
                    <div className="text-amber-400 font-tactical font-bold">Gyroscope Acceleration Curve:</div>
                    <div className="text-slate-200 mt-1">ω_eff = ω_raw · [1 + α · (|ω_raw| / ω_thresh)^p]</div>
                    <div className="text-slate-400">α = 0.35 (accel exponent), allows micro-aim & rapid 180° sweeps</div>
                  </div>
                </div>
              </div>

              {/* Sensitivity Preset Matrices */}
              <div>
                <h3 className="font-tactical font-bold text-sm text-slate-200 uppercase mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 bg-amber-400 rounded-full"></span>
                  Esports Sensitivity Matrix: 2-Finger, 3-Finger Claw, 4-Finger & Full-Gyroscope
                </h3>
                <div className="overflow-x-auto border border-slate-800 rounded">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-900 text-amber-400 font-tactical border-b border-slate-800">
                        <th className="p-2.5">Preset Name</th>
                        <th className="p-2.5">Camera No-Scope</th>
                        <th className="p-2.5">Red Dot / Holo</th>
                        <th className="p-2.5">2x Scope</th>
                        <th className="p-2.5">3x Scope</th>
                        <th className="p-2.5">4x ACOG</th>
                        <th className="p-2.5">6x Scope</th>
                        <th className="p-2.5">8x Sniper</th>
                        <th className="p-2.5">Gyroscope Multiplier</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 font-code">
                      {Object.entries(SENSITIVITY_PRESETS).map(([name, conf]) => (
                        <tr key={name} className="hover:bg-slate-900/50">
                          <td className="p-2.5 font-bold text-slate-100 font-tactical">{name}</td>
                          <td className="p-2.5 tabular-nums text-slate-300">{conf.cameraNoScope}%</td>
                          <td className="p-2.5 tabular-nums text-amber-300">{conf.adsRedDot}%</td>
                          <td className="p-2.5 tabular-nums text-amber-300">{conf.ads2x}%</td>
                          <td className="p-2.5 tabular-nums text-amber-300">{conf.ads3x}%</td>
                          <td className="p-2.5 tabular-nums text-sky-400 font-bold">{conf.ads4x}%</td>
                          <td className="p-2.5 tabular-nums text-sky-400 font-bold">{conf.ads6x}%</td>
                          <td className="p-2.5 tabular-nums text-indigo-400 font-bold">{conf.ads8x}%</td>
                          <td className="p-2.5 tabular-nums">
                            {conf.gyroscopeEnabled ? (
                              <span className="text-emerald-400 font-bold">{conf.gyroSensitivity}% ({conf.gyroCurve})</span>
                            ) : (
                              <span className="text-slate-500">Disabled</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ================= PILLAR 5: PERFORMANCE, GRAPHICS SCALABILITY & LOW-END PROFILING ================= */}
          {activePillar === 5 && (
            <div className="space-y-6">
              <div className="bg-slate-900/80 border border-slate-800 p-4 rounded">
                <h2 className="font-tactical font-bold text-base text-amber-400 mb-2">
                  5. LOW-END DEVICE PROFILING & ANTI-FOLIAGE-EXPLOIT TERRAIN SYSTEM
                </h2>
                <p className="text-slate-300 text-xs">
                  Battle royale shooters frequently suffer from a visual unfairness bug: competitive players lower graphic settings to "Smooth"
                  to remove distant grass and see prone enemies ("snakes in the grass") exposed on bare ground.
                  Our architecture implements a <strong>Fallback Ground Shadow Mask</strong>: beyond the foliage cull radius (80m on low, 240m on HDR),
                  the terrain shader automatically activates a high-frequency stipple baked ambient occlusion layer that mimics the exact light absorption
                  and camouflage silhouette of dense grass, guaranteeing competitive parity across all device tiers.
                </p>
                <div className="mt-2 text-[11px] text-amber-300 font-tactical">
                  *Urdu Tactical Note: Low graphics par ghas band hone ke bawajood dushman chupay ga, flat zameen par expose nahi hoga.*
                </div>
              </div>

              {/* Graphics Tier Matrix */}
              <div>
                <h3 className="font-tactical font-bold text-sm text-slate-200 uppercase mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 bg-emerald-400 rounded-full"></span>
                  Hardware Scalability & Profiling Tiers (Vulkan / Metal / GLES 3.2)
                </h3>
                <div className="overflow-x-auto border border-slate-800 rounded">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-900 text-amber-400 font-tactical border-b border-slate-800">
                        <th className="p-2.5">Tier</th>
                        <th className="p-2.5">Target FPS</th>
                        <th className="p-2.5">Internal Res Scale</th>
                        <th className="p-2.5">Foliage Cull Radius</th>
                        <th className="p-2.5">Max Draw Distance</th>
                        <th className="p-2.5">Shadow Cascade</th>
                        <th className="p-2.5">Anti-Aliasing</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 font-code">
                      {Object.values(GRAPHICS_TIERS).map((t) => (
                        <tr key={t.name} className="hover:bg-slate-900/50">
                          <td className="p-2.5 font-bold text-slate-100 font-tactical">{t.name}</td>
                          <td className="p-2.5 tabular-nums text-emerald-400 font-bold">{t.targetFps} FPS</td>
                          <td className="p-2.5 tabular-nums">{Math.round(t.resolutionScale * 100)}%</td>
                          <td className="p-2.5 tabular-nums text-amber-300">{t.foliageCullRadius}m</td>
                          <td className="p-2.5 tabular-nums">{t.drawDistance}m</td>
                          <td className="p-2.5 uppercase text-slate-300">{t.shadowQuality}</td>
                          <td className="p-2.5 font-tactical text-sky-400">{t.antiAliasing}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ================= PILLAR 6: ANTI-CHEAT, NETWORK ARCHITECTURE & SNIPPETS ================= */}
          {activePillar === 6 && (
            <div className="space-y-6">
              <div className="bg-slate-900/80 border border-slate-800 p-4 rounded">
                <h2 className="font-tactical font-bold text-base text-amber-400 mb-2">
                  6. 60HZ DETERMINISTIC NETCODE & ANTI-CHEAT ARCHITECTURE
                </h2>
                <p className="text-slate-300 text-xs">
                  All hit registration is 100% server-authoritative. The client sends player inputs (Tick, MoveVector, AimAngles, FireTrigger).
                  The server maintains a 1000ms rolling rewind buffer of all client player hitbox capsules.
                  When a hit packet is processed, the server rewinds world entities to the shooter's ping timestamp, verifies trajectory line-of-sight against geometric occlusion colliders,
                  and executes health deductions. Anti-ESP utilizes Fog-of-War spatial occlusion culling on the server: player network positions are never streamed to clients if obstructed by opaque terrain or thick compound walls.
                </p>
              </div>

              {/* Unreal Engine 5.4 Snippet */}
              <div className="bg-slate-900 border border-slate-800 rounded overflow-hidden">
                <div className="bg-slate-950 px-4 py-2 border-b border-slate-800 flex items-center justify-between">
                  <span className="font-tactical text-xs text-amber-400 font-bold">
                    UNREAL ENGINE 5.4 C++ BALLISTICS RUNTIME COMPONENT
                  </span>
                  <button
                    onClick={() => copySnippet(ue5Snippet, 'ue5')}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] px-2.5 py-1 rounded cursor-pointer font-tactical"
                  >
                    {copiedCode === 'ue5' ? 'COPIED!' : 'COPY CODE'}
                  </button>
                </div>
                <pre className="p-4 font-code text-xs text-slate-300 overflow-x-auto bg-slate-950/80">
                  {ue5Snippet}
                </pre>
              </div>

              {/* Unity 6 Netcode Snippet */}
              <div className="bg-slate-900 border border-slate-800 rounded overflow-hidden">
                <div className="bg-slate-950 px-4 py-2 border-b border-slate-800 flex items-center justify-between">
                  <span className="font-tactical text-xs text-sky-400 font-bold">
                    UNITY 6 C# DETERMINISTIC PREDICTION & RECONCILIATION NETCODE
                  </span>
                  <button
                    onClick={() => copySnippet(unityNetcodeSnippet, 'unity')}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] px-2.5 py-1 rounded cursor-pointer font-tactical"
                  >
                    {copiedCode === 'unity' ? 'COPIED!' : 'COPY CODE'}
                  </button>
                </div>
                <pre className="p-4 font-code text-xs text-slate-300 overflow-x-auto bg-slate-950/80">
                  {unityNetcodeSnippet}
                </pre>
              </div>

              {/* Dual Roman Urdu / English Tactical Glossary */}
              <div className="bg-slate-900/60 border border-slate-800 p-4 rounded text-xs space-y-2">
                <h4 className="font-tactical font-bold text-sm text-amber-400 uppercase">
                  Dual Roman Urdu / English Tactical Comms Glossary
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 font-tactical">
                  {TACTICAL_CALLOUTS.map((callout, i) => (
                    <div key={i} className="bg-slate-950 p-2 rounded border border-slate-800">
                      <span className="text-white font-bold">"{callout.urdu}"</span>
                      <span className="block text-slate-400 text-[11px] mt-0.5">{callout.en}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ================= ROADMAP CHECKLIST ================= */}
          {activePillar === 7 && (
            <div className="space-y-5">
              <div className="bg-slate-900/80 border border-slate-800 p-4 rounded">
                <h2 className="font-tactical font-bold text-base text-amber-400 mb-2">
                  PRODUCTION ROADMAP & MILESTONE ACCEPTANCE GATES
                </h2>
                <p className="text-slate-300 text-xs">
                  Step-by-step engineering schedule spanning pre-production greybox prototyping to global high-concurrency launch.
                </p>
              </div>

              <div className="space-y-3 font-tactical text-xs">
                <div className="bg-slate-900 border border-slate-800 p-3.5 rounded flex items-start gap-3">
                  <div className="bg-emerald-950 text-emerald-400 font-bold px-2 py-1 rounded text-xs">PHASE 1</div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-200">Prototype / Greybox Mechanics (Weeks 1–6)</h4>
                    <p className="text-slate-400 mt-0.5">
                      Implement core character controller (WASD, crouch, prone, jump), client-predicted movement, and basic raycast/projectile ballistics.
                      Test Midstein compound greybox geometry for sightline balance.
                    </p>
                  </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 p-3.5 rounded flex items-start gap-3">
                  <div className="bg-amber-950 text-amber-400 font-bold px-2 py-1 rounded text-xs">PHASE 2</div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-200">Vertical Slice & Ballistics Netcode (Weeks 7–16)</h4>
                    <p className="text-slate-400 mt-0.5">
                      Incorporate 60Hz server reconciliation and rollback buffer. Implement realistic air drag, bullet drop equations, recoil climb, and attachment modifiers.
                      Integrate procedural audio synth engine and 250-weight tactical inventory.
                    </p>
                  </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 p-3.5 rounded flex items-start gap-3">
                  <div className="bg-sky-950 text-sky-400 font-bold px-2 py-1 rounded text-xs">PHASE 3</div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-200">Closed Beta & Anti-Cheat Hardening (Weeks 17–28)</h4>
                    <p className="text-slate-400 mt-0.5">
                      Deploy server-side Fog-of-War spatial occlusion (Anti-ESP) and speed-hack rollback verification.
                      Test 32-player live matches on Livik 2x2km terrain with dynamic circle shrink phases and low-end hardware profiling.
                    </p>
                  </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 p-3.5 rounded flex items-start gap-3">
                  <div className="bg-purple-950 text-purple-400 font-bold px-2 py-1 rounded text-xs">PHASE 4</div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-200">Global Launch & Esports Operations (Weeks 29+)</h4>
                    <p className="text-slate-400 mt-0.5">
                      Launch global matchmaker with automated clan scrim custom rooms, 4v4 TDM mode, and Fair-Play Progressive Battle Pass Season 1.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
