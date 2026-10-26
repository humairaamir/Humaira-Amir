/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Game Over & Victory Modal ("Winner Winner Chicken Dinner" / "Eliminated")
 */

import React from 'react';

interface GameOverModalProps {
  isVictory: boolean;
  kills: number;
  damageDealt: number;
  aliveCount: number;
  onPlayAgain: () => void;
  onOpenGDD: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  isVictory,
  kills,
  damageDealt,
  aliveCount,
  onPlayAgain,
  onOpenGDD,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 select-none">
      <div className="bg-slate-950 border border-amber-500/50 p-6 sm:p-8 rounded max-w-lg w-full text-center shadow-2xl flex flex-col items-center gap-4 text-slate-100">
        {/* Title */}
        {isVictory ? (
          <div>
            <div className="text-amber-400 font-tactical font-black text-2xl sm:text-3xl tracking-widest uppercase">
              #1 / WINNER WINNER CHICKEN DINNER!
            </div>
            <div className="text-xs text-amber-300 font-tactical mt-1">
              FATEH MUBARAK! MUKAMMAL MATCH JEET GAYE!
            </div>
          </div>
        ) : (
          <div>
            <div className="text-red-500 font-tactical font-black text-2xl sm:text-3xl tracking-widest uppercase">
              BETTER LUCK NEXT TIME!
            </div>
            <div className="text-xs text-slate-400 font-tactical mt-1">
              OPERATOR ELIMINATED // RANK: #{aliveCount}
            </div>
          </div>
        )}

        {/* Match Statistics */}
        <div className="w-full grid grid-cols-2 gap-3 my-2 font-code">
          <div className="bg-slate-900 p-3 rounded border border-slate-800">
            <span className="text-slate-400 text-xs block font-tactical">ELIMINATIONS (KILLS)</span>
            <span className="text-2xl font-bold text-amber-400 tabular-nums">{kills}</span>
          </div>
          <div className="bg-slate-900 p-3 rounded border border-slate-800">
            <span className="text-slate-400 text-xs block font-tactical">DAMAGE DEALT</span>
            <span className="text-2xl font-bold text-emerald-400 tabular-nums">{damageDealt}</span>
          </div>
        </div>

        {/* Action CTAs */}
        <div className="flex items-center gap-3 w-full pt-2">
          <button
            onClick={onPlayAgain}
            className="flex-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-tactical font-bold py-2.5 rounded cursor-pointer transition-colors"
          >
            PLAY AGAIN [ENTER]
          </button>
          <button
            onClick={onOpenGDD}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-tactical px-4 py-2.5 rounded cursor-pointer"
          >
            INSPECT GDD [G]
          </button>
        </div>
      </div>
    </div>
  );
};
