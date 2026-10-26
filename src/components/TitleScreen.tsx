/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Game Shell & Title Screen (Game Craft Compliant)
 * Bespoke inline SVG title lockup, primary Start CTA, flat control hint line
 */

import React, { useEffect } from 'react';

interface TitleScreenProps {
  onStartGame: (mode: 'battle_royale' | 'firing_range') => void;
  onOpenGDD: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({ onStartGame, onOpenGDD }) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Enter' || e.code === 'Space') {
        onStartGame('battle_royale');
      } else if (e.code === 'KeyG') {
        onOpenGDD();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onStartGame, onOpenGDD]);

  return (
    <div className="fixed inset-0 z-40 flex flex-col justify-between p-6 sm:p-12 bg-gradient-to-t from-black via-black/80 to-transparent pointer-events-auto select-none">
      {/* Top Bar with Tactical Classification Badge */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="w-2.5 h-2.5 bg-amber-500 rounded-xs"></span>
          <span className="font-tactical font-bold text-xs tracking-widest text-amber-400 uppercase">
            MILITARY OPERATIONAL BRIEFING // CLASSIFIED 60HZ
          </span>
        </div>
        <div className="font-code text-xs text-slate-400">
          BUILD VER: 5.4.2-LIVIK
        </div>
      </div>

      {/* Centerpiece: Bespoke Inline SVG Title Lockup over 30-40% Negative Space */}
      <div className="max-w-2xl flex flex-col gap-5 my-auto">
        {/* Inline SVG Tactical Logo */}
        <div className="flex items-center gap-4">
          <svg className="w-14 h-14 sm:w-20 sm:h-20 text-amber-500" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <polygon points="50,5 95,28 95,72 50,95 5,72 5,28" stroke="currentColor" strokeWidth="4" fill="rgba(245, 158, 11, 0.08)" />
            <circle cx="50" cy="50" r="28" stroke="currentColor" strokeWidth="3" strokeDasharray="6 4" />
            <line x1="50" y1="12" x2="50" y2="30" stroke="currentColor" strokeWidth="3" />
            <line x1="50" y1="70" x2="50" y2="88" stroke="currentColor" strokeWidth="3" />
            <line x1="12" y1="50" x2="30" y2="50" stroke="currentColor" strokeWidth="3" />
            <line x1="70" y1="50" x2="88" y2="50" stroke="currentColor" strokeWidth="3" />
            <circle cx="50" cy="50" r="4" fill="currentColor" />
          </svg>

          <div>
            <div className="text-amber-500 font-code text-xs sm:text-sm tracking-widest font-bold">
              TACTICAL BATTLE ROYALE SIMULATOR
            </div>
            <h1 className="font-tactical font-black text-4xl sm:text-6xl text-white tracking-wider leading-none mt-1">
              OP: LIVIK
            </h1>
            <div className="font-tactical font-semibold text-xs sm:text-sm text-slate-400 tracking-widest mt-1">
              NORDIC FAST-PACED (2x2KM) COMBAT BLUEPRINT
            </div>
          </div>
        </div>

        <p className="text-slate-300 text-xs sm:text-sm leading-relaxed max-w-xl font-sans">
          Drop into the Livik Fast-Paced warzone. Experience true projectile travel ballistics, atmospheric drag decay,
          first-shot kick recoil recovery, 6-phase dynamic circle contractions, and server-authoritative 60Hz tactical gunplay.
        </p>

        {/* Start Game Action Buttons */}
        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            onClick={() => onStartGame('battle_royale')}
            aria-label="Deploy Livik Battle Royale"
            className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-tactical font-bold text-sm sm:text-base px-6 py-3 rounded-sm shadow-xl transition-all cursor-pointer flex items-center gap-3 active:scale-95"
          >
            <span>DROP INTO LIVIK (BR MATCH)</span>
            <span className="bg-slate-950 text-amber-400 px-2 py-0.5 rounded text-xs font-code font-bold">[ENTER / SPACE]</span>
          </button>

          <button
            onClick={() => onStartGame('firing_range')}
            aria-label="Enter Ballistics Firing Range"
            className="bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-700 font-tactical font-bold text-sm px-5 py-3 rounded-sm transition-all cursor-pointer"
          >
            FIRING RANGE & BALLISTICS LAB
          </button>

          <button
            onClick={onOpenGDD}
            aria-label="Inspect GDD Architecture"
            className="bg-slate-900/90 hover:bg-slate-800 text-amber-400 border border-amber-500/40 font-tactical font-bold text-sm px-5 py-3 rounded-sm transition-all cursor-pointer flex items-center gap-2"
          >
            <span>INSPECT TECH GDD</span>
            <span className="bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded text-xs font-code">[G]</span>
          </button>
        </div>
      </div>

      {/* Bottom Flat Control Hint Line (Game Craft Mandate) */}
      <div className="w-full flex items-center justify-between border-t border-slate-800/80 pt-4 text-slate-400 font-tactical text-xs">
        <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
          <span><strong className="text-amber-400">WASD</strong> Move</span>
          <span>·</span>
          <span><strong className="text-amber-400">Shift</strong> Sprint</span>
          <span>·</span>
          <span><strong className="text-amber-400">Left-Click</strong> Fire</span>
          <span>·</span>
          <span><strong className="text-amber-400">Right-Click</strong> ADS Scope</span>
          <span>·</span>
          <span><strong className="text-amber-400">C / Z</strong> Crouch / Prone</span>
          <span>·</span>
          <span><strong className="text-amber-400">R</strong> Reload</span>
          <span>·</span>
          <span><strong className="text-amber-400">Tab</strong> Inventory</span>
          <span>·</span>
          <span><strong className="text-amber-400">G</strong> Technical GDD</span>
        </div>

        <div className="hidden sm:block text-slate-500 text-[11px] font-code">
          DUAL ROMAN URDU & ENGLISH VOICE COMMS
        </div>
      </div>
    </div>
  );
};
