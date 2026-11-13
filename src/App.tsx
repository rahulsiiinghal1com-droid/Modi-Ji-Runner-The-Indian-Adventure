/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Coins,
  Crown,
  Feather,
  Gift,
  Maximize2,
  Minimize2,
  Play,
  Settings,
  Shirt,
  Target,
  Trophy,
  User,
} from 'lucide-react';
import { GameHUD } from './components/GameHUD';
import { ShopAndModals } from './components/ShopAndModals';
import { soundEngine } from './game/audio';
import { GameEngine } from './game/GameEngine';
import {
  canClaimDailyReward,
  claimDailyReward,
  claimMissionReward,
  loadSaveData,
  recordRunCompletion,
  unlockOrEquipCharacter,
  unlockOrEquipOutfit,
  unlockOrEquipWing,
  updateSelectedMode,
  updateSettings,
} from './game/storage';
import {
  CharacterId,
  GAME_MODES,
  GameMode,
  GameOverStats,
  OutfitId,
  RunHUDState,
  SaveData,
  ScreenState,
  WingId,
} from './game/types';

const INITIAL_HUD: RunHUDState = {
  score: 0,
  coins: 0,
  distance: 0,
  speedKmh: 48,
  multiplier: 1,
  isFlying: false,
  activeWingId: null,
  activeWingName: null,
  activeWingAbility: null,
  activeWingRemaining: 0,
  activeWingTotal: 10,
  hasShield: false,
  zoneName: 'New Delhi · India Gate',
  timePhase: 'Day',
  activePowerUps: [],
  obstaclesAvoided: 0,
  wingsUsed: 0,
  powerUpsCollected: 0,
  crashed: false,
};

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);

  const [save, setSave] = useState<SaveData>(() => loadSaveData());
  const [screen, setScreen] = useState<ScreenState>('menu');
  const [previewChar, setPreviewChar] = useState<CharacterId>(save.selectedCharacter);
  const [hud, setHud] = useState<RunHUDState>(INITIAL_HUD);
  const [gameOverStats, setGameOverStats] = useState<GameOverStats | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [contextLost, setContextLost] = useState(false);

  const saveRef = useRef(save);
  saveRef.current = save;

  const screenRef = useRef(screen);
  screenRef.current = screen;

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    window.setTimeout(() => {
      setToastMsg((prev) => (prev === msg ? null : prev));
    }, 2400);
  }, []);

  useEffect(() => {
    const mount = canvasMountRef.current;
    if (!mount) return;

    const engine = new GameEngine(mount, {
      onHUDUpdate: (nextHud) => {
        setHud(nextHud);
      },
      onGameOver: (finalHud) => {
        const currentSave = saveRef.current;
        const result = recordRunCompletion(currentSave, {
          score: finalHud.score,
          distance: finalHud.distance,
          coins: finalHud.coins,
          obstaclesAvoided: finalHud.obstaclesAvoided,
          wingsUsed: finalHud.wingsUsed,
          powerUpsCollected: finalHud.powerUpsCollected,
          crashed: finalHud.crashed,
          mode: currentSave.selectedMode,
          character: currentSave.selectedCharacter,
        });
        setSave(result.updated);
        setGameOverStats({
          score: finalHud.score,
          distance: finalHud.distance,
          coins: finalHud.coins,
          bestScore: result.updated.bestScore,
          isNewBest: result.isNewBest,
          obstaclesAvoided: finalHud.obstaclesAvoided,
          wingsUsed: finalHud.wingsUsed,
          powerUpsCollected: finalHud.powerUpsCollected,
          missionsCompletedThisRun: result.newlyCompletedMissions,
          mode: currentSave.selectedMode,
          character: currentSave.selectedCharacter,
        });
        setScreen('gameover');
      },
      onContextLost: (lost) => setContextLost(lost),
    });

    engine.applyCustomization(
      saveRef.current.selectedCharacter,
      saveRef.current.selectedOutfit,
      saveRef.current.selectedWing
    );
    engine.applySettings(saveRef.current.settings.quality, saveRef.current.settings.timeOfDay);
    soundEngine.setVolumes(
      saveRef.current.settings.musicVolume,
      saveRef.current.settings.sfxVolume
    );

    engineRef.current = engine;

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  // Sync character appearance (previewChar in Character Shop, otherwise selectedCharacter) & settings
  const displayedCharacter = screen === 'shop_characters' ? previewChar : save.selectedCharacter;

  useEffect(() => {
    engineRef.current?.applyCustomization(
      displayedCharacter,
      save.selectedOutfit,
      save.selectedWing
    );
    engineRef.current?.applySettings(save.settings.quality, save.settings.timeOfDay);
    soundEngine.setVolumes(save.settings.musicVolume, save.settings.sfxVolume);
  }, [
    displayedCharacter,
    save.selectedOutfit,
    save.selectedWing,
    save.settings.quality,
    save.settings.timeOfDay,
    save.settings.musicVolume,
    save.settings.sfxVolume,
  ]);

  useEffect(() => {
    if (screen === 'shop_characters') {
      setPreviewChar(saveRef.current.selectedCharacter);
      engineRef.current?.setShowcaseMode('shop_characters');
    } else if (screen === 'shop_wings') {
      engineRef.current?.setShowcaseMode('shop_wings');
    } else if (screen === 'shop_outfits') {
      engineRef.current?.setShowcaseMode('shop_outfits');
    } else if (screen === 'menu') {
      engineRef.current?.setShowcaseMode('menu');
    }
  }, [screen]);

  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (screenRef.current === 'playing') {
        if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
          e.preventDefault();
          engineRef.current?.moveLeft();
        } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
          e.preventDefault();
          engineRef.current?.moveRight();
        } else if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W' || e.key === ' ') {
          e.preventDefault();
          engineRef.current?.jump();
        } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
          e.preventDefault();
          engineRef.current?.slide();
        } else if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
          e.preventDefault();
          engineRef.current?.setPaused(true);
          setScreen('paused');
        }
      } else if (screenRef.current === 'paused') {
        if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
          e.preventDefault();
          engineRef.current?.setPaused(false);
          setScreen('playing');
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const handleStartRun = useCallback((modeOverride?: GameMode) => {
    soundEngine.unlock();
    soundEngine.startMusic();
    const activeMode = modeOverride ?? saveRef.current.selectedMode;
    engineRef.current?.applyCustomization(
      saveRef.current.selectedCharacter,
      saveRef.current.selectedOutfit,
      saveRef.current.selectedWing
    );
    setGameOverStats(null);
    setScreen('playing');
    engineRef.current?.startRun(activeMode);
  }, []);

  const handleSelectMode = (mode: GameMode) => {
    soundEngine.unlock();
    const updated = updateSelectedMode(save, mode);
    setSave(updated);
  };

  const handleDailyReward = () => {
    soundEngine.unlock();
    const res = claimDailyReward(save);
    if (res.rewardCoins > 0) {
      soundEngine.playUnlock();
      setSave(res.updated);
      showToast(`Daily Reward Claimed: +${res.rewardCoins} Coins`);
    }
  };

  const handleSelectCharacter = (id: CharacterId, price: number) => {
    soundEngine.unlock();
    setPreviewChar(id);
    const res = unlockOrEquipCharacter(save, id, price);
    if (res.success) {
      soundEngine.playUnlock();
      setSave(res.updated);
      if (res.purchased) {
        showToast('Gandhi Ji Unlocked & Equipped!');
      }
    } else {
      showToast(`Need ${price.toLocaleString()} coins to unlock!`);
    }
  };

  const handleSelectOutfit = (id: OutfitId, price: number) => {
    soundEngine.unlock();
    const res = unlockOrEquipOutfit(save, id, price);
    if (res.success) {
      soundEngine.playUnlock();
      setSave(res.updated);
    } else {
      showToast('Not enough coins yet!');
    }
  };

  const handleSelectWing = (id: WingId, price: number) => {
    soundEngine.unlock();
    const res = unlockOrEquipWing(save, id, price);
    if (res.success) {
      soundEngine.playUnlock();
      setSave(res.updated);
    } else {
      showToast('Not enough coins yet!');
    }
  };

  const handleClaimMission = (missionId: string) => {
    soundEngine.unlock();
    const res = claimMissionReward(save, missionId);
    if (res.reward > 0) {
      soundEngine.playUnlock();
      setSave(res.updated);
      showToast(`Mission Reward: +${res.reward} Coins`);
    }
  };

  const handleUpdateSettings = (partial: Partial<SaveData['settings']>) => {
    soundEngine.unlock();
    const updated = updateSettings(save, partial);
    setSave(updated);
  };

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      showToast('Fullscreen unavailable in this frame');
    }
  };

  const claimableMissionsCount = useMemo(() => {
    return Object.values(save.missions).filter((m) => m.completed && !m.claimed).length;
  }, [save.missions]);

  const dailyAvailable = canClaimDailyReward(save);
  const currentModeDef = GAME_MODES.find((m) => m.id === save.selectedMode) ?? GAME_MODES[0];

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#0b1120]">
      <div ref={canvasMountRef} className="absolute inset-0 w-full h-full" />

      {contextLost && (
        <div className="fixed inset-0 z-50 bg-[#0b1120] flex flex-col items-center justify-center p-6 text-center">
          <h2 className="font-display text-2xl font-bold text-white mb-2">
            3D Graphics Context Restoring
          </h2>
          <p className="text-sm text-slate-400">
            Your browser paused WebGL rendering. Tap reload if it does not resume automatically.
          </p>
        </div>
      )}

      {toastMsg && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl bg-[#fbbf24] text-[#0b1120] font-bold text-xs shadow-lg">
          {toastMsg}
        </div>
      )}

      {/* --- MAIN MENU OVERLAY --- */}
      {screen === 'menu' && (
        <div className="fixed inset-0 z-20 flex flex-col justify-between p-3 sm:p-5 pointer-events-none">
          <div className="flex items-center justify-between gap-2 pointer-events-auto">
            <div className="flex items-center gap-2">
              <div className="h-11 px-3 rounded-xl bg-[#0b1120]/88 border border-white/15 flex items-center gap-1.5 font-mono-num text-sm font-bold text-[#fbbf24]">
                <Coins className="w-4 h-4" />
                <span>{save.totalCoins.toLocaleString()}</span>
              </div>
              <div className="h-11 px-3 rounded-xl bg-[#0b1120]/88 border border-white/15 flex items-center gap-1.5 font-mono-num text-xs font-semibold text-white">
                <Crown className="w-4 h-4 text-[#ff6b1a]" />
                <span>Best {save.bestScore.toLocaleString()}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {dailyAvailable && (
                <button
                  onClick={handleDailyReward}
                  className="min-h-[44px] px-3 rounded-xl bg-[#10b981] hover:bg-[#059669] text-[#0b1120] font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Gift className="w-4 h-4" />
                  <span>Daily Gift</span>
                </button>
              )}
              <button
                onClick={toggleFullscreen}
                aria-label="Toggle Fullscreen"
                className="min-h-[44px] min-w-[44px] rounded-xl bg-[#0b1120]/88 border border-white/15 hover:bg-[#1e293b] text-white flex items-center justify-center transition cursor-pointer"
              >
                {isFullscreen ? (
                  <Minimize2 className="w-4 h-4" />
                ) : (
                  <Maximize2 className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          <div className="pointer-events-none flex flex-col items-center text-center mt-2">
            <h1 className="font-display text-3xl sm:text-5xl font-extrabold tracking-tight text-white drop-shadow-[0_3px_12px_rgba(0,0,0,0.8)]">
              MODI JI RUNNER
            </h1>
            <p className="text-xs sm:text-sm font-semibold tracking-wider uppercase text-[#fbbf24] drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)]">
              The Indian Adventure · {save.selectedCharacter === 'gandhi' ? 'Gandhi Ji' : 'Modi Ji'}
            </p>
          </div>

          <div className="mx-auto w-full max-w-2xl space-y-2.5 pointer-events-auto">
            <div className="bg-[#0b1120]/90 border border-white/15 rounded-2xl p-2.5 space-y-2">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
                {GAME_MODES.map((m) => {
                  const active = save.selectedMode === m.id;
                  return (
                    <button
                      key={m.id}
                      onClick={() => handleSelectMode(m.id)}
                      className={`min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap shrink-0 transition cursor-pointer ${
                        active
                          ? 'bg-[#ff6b1a] text-white'
                          : 'bg-white/8 text-slate-300 hover:bg-white/15'
                      }`}
                    >
                      {m.name}
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-300 px-1">
                <span className="truncate">{currentModeDef.tagline}</span>
                <span className="font-mono-num font-bold text-[#fbbf24] shrink-0 ml-2">
                  {currentModeDef.scoreMult}x Score
                </span>
              </div>
            </div>

            <button
              onClick={() => handleStartRun()}
              className="min-h-[54px] w-full rounded-2xl bg-[#ff6b1a] hover:bg-[#ea580c] active:scale-[0.99] text-white font-display font-extrabold text-lg tracking-wide flex items-center justify-center gap-2.5 shadow-xl border border-[#fbbf24]/50 transition cursor-pointer"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>START ADVENTURE</span>
            </button>

            <div className="grid grid-cols-6 gap-1 bg-[#0b1120]/92 border border-white/15 rounded-2xl p-1.5">
              <button
                onClick={() => {
                  soundEngine.unlock();
                  setScreen('shop_characters');
                }}
                className="min-h-[48px] rounded-xl hover:bg-white/10 text-slate-200 flex flex-col items-center justify-center gap-1 text-[10px] sm:text-[11px] font-semibold transition cursor-pointer"
              >
                <User className="w-4 h-4 text-[#fbbf24]" />
                <span>Runners</span>
              </button>

              <button
                onClick={() => {
                  soundEngine.unlock();
                  setScreen('shop_outfits');
                }}
                className="min-h-[48px] rounded-xl hover:bg-white/10 text-slate-200 flex flex-col items-center justify-center gap-1 text-[10px] sm:text-[11px] font-semibold transition cursor-pointer"
              >
                <Shirt className="w-4 h-4 text-[#ff6b1a]" />
                <span>Outfits</span>
              </button>

              <button
                onClick={() => {
                  soundEngine.unlock();
                  setScreen('shop_wings');
                }}
                className="min-h-[48px] rounded-xl hover:bg-white/10 text-slate-200 flex flex-col items-center justify-center gap-1 text-[10px] sm:text-[11px] font-semibold transition cursor-pointer"
              >
                <Feather className="w-4 h-4 text-[#fbbf24]" />
                <span>12 Wings</span>
              </button>

              <button
                onClick={() => {
                  soundEngine.unlock();
                  setScreen('missions');
                }}
                className="relative min-h-[48px] rounded-xl hover:bg-white/10 text-slate-200 flex flex-col items-center justify-center gap-1 text-[10px] sm:text-[11px] font-semibold transition cursor-pointer"
              >
                <Target className="w-4 h-4 text-[#10b981]" />
                <span>Missions</span>
                {claimableMissionsCount > 0 && (
                  <span className="absolute top-1 right-2 font-mono-num text-[10px] font-bold text-[#10b981]">
                    {claimableMissionsCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => {
                  soundEngine.unlock();
                  setScreen('leaderboard');
                }}
                className="min-h-[48px] rounded-xl hover:bg-white/10 text-slate-200 flex flex-col items-center justify-center gap-1 text-[10px] sm:text-[11px] font-semibold transition cursor-pointer"
              >
                <Trophy className="w-4 h-4 text-[#fbbf24]" />
                <span>Top 10</span>
              </button>

              <button
                onClick={() => {
                  soundEngine.unlock();
                  setScreen('settings');
                }}
                className="min-h-[48px] rounded-xl hover:bg-white/10 text-slate-200 flex flex-col items-center justify-center gap-1 text-[10px] sm:text-[11px] font-semibold transition cursor-pointer"
              >
                <Settings className="w-4 h-4 text-slate-300" />
                <span>Settings</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- GAMEPLAY HUD / PAUSE / GAME OVER --- */}
      <GameHUD
        screen={screen}
        hud={hud}
        gameOverStats={gameOverStats}
        onMoveLeft={() => engineRef.current?.moveLeft()}
        onMoveRight={() => engineRef.current?.moveRight()}
        onJump={() => engineRef.current?.jump()}
        onSlide={() => engineRef.current?.slide()}
        onPause={() => {
          engineRef.current?.setPaused(true);
          setScreen('paused');
        }}
        onResume={() => {
          engineRef.current?.setPaused(false);
          setScreen('playing');
        }}
        onRestart={() => handleStartRun()}
        onMainMenu={() => {
          engineRef.current?.setShowcaseMode('menu');
          setScreen('menu');
        }}
      />

      {/* --- CHARACTER SHOP, OUTFIT SHOP, 12 WINGS SHOP, MISSIONS, LEADERBOARD & SETTINGS --- */}
      <ShopAndModals
        screen={screen}
        save={save}
        previewCharacterId={previewChar}
        isFullscreen={isFullscreen}
        onClose={() => setScreen('menu')}
        onPreviewCharacter={(id) => {
          soundEngine.unlock();
          setPreviewChar(id);
        }}
        onSelectCharacter={handleSelectCharacter}
        onSelectOutfit={handleSelectOutfit}
        onSelectWing={handleSelectWing}
        onClaimMission={handleClaimMission}
        onUpdateSettings={handleUpdateSettings}
        onToggleFullscreen={toggleFullscreen}
      />
    </div>
  );
}
