/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * OP: LIVIK - Tactical Battle Royale System & GDD Architecture
 * Core Application Shell
 */

import React, { useEffect, useRef, useState } from 'react';
import { TacticalGameEngine } from './game/scene';
import { HUD } from './components/HUD';
import { TitleScreen } from './components/TitleScreen';
import { BackpackModal } from './components/BackpackModal';
import { GDDDocumentModal } from './components/GDDDocumentModal';
import { BottomDock } from './components/BottomDock';
import { GameOverModal } from './components/GameOverModal';
import { WeaponData, WeaponAttachmentSlots } from './game/types';
import { WEAPONS } from './game/data';

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<TacticalGameEngine | null>(null);

  // Game Lifecycle State: 'title' | 'playing' | 'game_over' | 'victory'
  const [gameState, setGameState] = useState<'title' | 'playing' | 'game_over' | 'victory'>('title');
  const [gameMode, setGameMode] = useState<'battle_royale' | 'firing_range'>('battle_royale');

  // Modal Visibilities
  const [isInventoryOpen, setIsInventoryOpen] = useState(false);
  const [isGDDOpen, setIsGDDOpen] = useState(false);

  // Settings
  const [currentTier, setCurrentTier] = useState<string>('Smooth 90/120');
  const [currentPreset, setCurrentPreset] = useState<string>('4-Finger Competitive');

  // Dynamic HUD state populated by engine at throttle rate
  const [hudState, setHudState] = useState({
    health: 100,
    boost: 0,
    helmetDurability: 150,
    helmetMax: 150,
    vestDurability: 220,
    vestMax: 220,
    activeWeapon: WEAPONS['m416'] as WeaponData,
    currentMag: 30,
    reserveAmmo: 180,
    isAiming: false,
    stance: 'stand' as 'stand' | 'crouch' | 'prone',
    circlePhase: 1,
    circleTimer: 150,
    inBlueZone: false,
    aliveCount: 32,
    kills: 0,
    damageDealt: 0,
    playerPos: { x: 0, y: 0, z: 0 },
    playerHeadingDeg: 0,
  });

  const [lastHitFeedback, setLastHitFeedback] = useState<{ isHeadshot: boolean; damage: number; timestamp: number } | null>(null);
  const [calloutBanner, setCalloutBanner] = useState<{ urdu: string; en: string; timestamp: number } | null>(null);

  // Check URL ?autostart=1
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('autostart') === '1') {
      setGameState('playing');
    }
  }, []);

  // Initialize Three.js Engine once on mount inside isolated ref container
  useEffect(() => {
    if (!canvasMountRef.current) return;

    const engine = new TacticalGameEngine(canvasMountRef.current, gameMode);
    engineRef.current = engine;

    // Attach callbacks
    engine.onStateUpdate = (data) => {
      setHudState(data);
      if (data.health <= 0 && gameState === 'playing') {
        setGameState('game_over');
      } else if (data.aliveCount <= 1 && gameState === 'playing' && gameMode === 'battle_royale') {
        setGameState('victory');
      }
    };

    engine.onHitFeedback = (isHeadshot, damage) => {
      setLastHitFeedback({ isHeadshot, damage, timestamp: Date.now() });
    };

    engine.onTacticalCallout = (urdu, en) => {
      setCalloutBanner({ urdu, en, timestamp: Date.now() });
    };

    const handleResize = () => {
      engine.handleResize();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      engine.destroy();
    };
  }, [gameMode]);

  // Global Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Tab') {
        e.preventDefault();
        setIsInventoryOpen((prev) => !prev);
      } else if (e.code === 'KeyG') {
        setIsGDDOpen((prev) => !prev);
      } else if (e.code === 'Escape') {
        setIsInventoryOpen(false);
        setIsGDDOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleStartGame = (mode: 'battle_royale' | 'firing_range') => {
    setGameMode(mode);
    setGameState('playing');
  };

  const handleRestart = () => {
    window.location.reload();
  };

  const handleUseConsumable = (itemKey: string) => {
    if (engineRef.current) {
      engineRef.current.useConsumable(itemKey);
    }
  };

  const handleUpdateAttachments = (
    slot: 'primary' | 'secondary',
    attachmentKey: keyof WeaponAttachmentSlots,
    value: string | undefined
  ) => {
    if (engineRef.current) {
      if (slot === 'primary') {
        engineRef.current.player.attachments.primary[attachmentKey] = value;
      } else {
        engineRef.current.player.attachments.secondary[attachmentKey] = value;
      }
    }
  };

  return (
    <div
      className="relative w-screen h-screen overflow-hidden bg-black select-none font-sans"
      data-state={gameState}
    >
      {/* Isolated Three.js WebGL Canvas Mount Container */}
      <div
        ref={canvasMountRef}
        className="absolute inset-0 z-0 cursor-crosshair"
        data-testid="three-canvas-container"
      />

      {/* Title Screen Overlay */}
      {gameState === 'title' && (
        <TitleScreen
          onStartGame={handleStartGame}
          onOpenGDD={() => setIsGDDOpen(true)}
        />
      )}

      {/* Active In-Game HUD Overlay */}
      {gameState === 'playing' && (
        <>
          <HUD
            health={hudState.health}
            boost={hudState.boost}
            helmetDurability={hudState.helmetDurability}
            helmetMax={hudState.helmetMax}
            vestDurability={hudState.vestDurability}
            vestMax={hudState.vestMax}
            activeWeapon={hudState.activeWeapon}
            currentMag={hudState.currentMag}
            reserveAmmo={hudState.reserveAmmo}
            isAiming={hudState.isAiming}
            stance={hudState.stance}
            circlePhase={hudState.circlePhase}
            circleTimer={hudState.circleTimer}
            inBlueZone={hudState.inBlueZone}
            aliveCount={hudState.aliveCount}
            kills={hudState.kills}
            damageDealt={hudState.damageDealt}
            playerPos={hudState.playerPos}
            playerHeadingDeg={hudState.playerHeadingDeg}
            lastHitInfo={lastHitFeedback}
            calloutInfo={calloutBanner}
            onOpenInventory={() => setIsInventoryOpen(true)}
            onOpenGDD={() => setIsGDDOpen(true)}
            onSwitchWeapon={() => engineRef.current?.switchWeapon()}
            onReload={() => engineRef.current?.reloadWeapon()}
            gameMode={gameMode}
          />

          {/* Collapsible Bottom Control Dock */}
          <BottomDock
            currentTier={currentTier}
            onSelectTier={setCurrentTier}
            currentPreset={currentPreset}
            onSelectPreset={setCurrentPreset}
            activeWeapon={hudState.activeWeapon}
            gameMode={gameMode}
            onSwitchMode={(m) => setGameMode(m)}
          />
        </>
      )}

      {/* Game Over / Victory Modal */}
      {(gameState === 'game_over' || gameState === 'victory') && (
        <GameOverModal
          isVictory={gameState === 'victory'}
          kills={hudState.kills}
          damageDealt={hudState.damageDealt}
          aliveCount={hudState.aliveCount}
          onPlayAgain={handleRestart}
          onOpenGDD={() => setIsGDDOpen(true)}
        />
      )}

      {/* Tactical Backpack Modal (TAB) */}
      <BackpackModal
        isOpen={isInventoryOpen}
        onClose={() => setIsInventoryOpen(false)}
        activeWeapon={hudState.activeWeapon}
        secondaryWeapon={engineRef.current?.player.secondaryWeapon ?? WEAPONS['kar98k']}
        primaryAttachments={engineRef.current?.player.attachments.primary ?? {}}
        reserveAmmo={engineRef.current?.player.reserveAmmo ?? {}}
        onUseConsumable={handleUseConsumable}
        onUpdateAttachments={handleUpdateAttachments}
      />

      {/* Comprehensive Technical GDD Suite Modal (G) */}
      <GDDDocumentModal
        isOpen={isGDDOpen}
        onClose={() => setIsGDDOpen(false)}
      />
    </div>
  );
}
