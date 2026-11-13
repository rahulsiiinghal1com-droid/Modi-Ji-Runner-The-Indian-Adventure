import React, { useRef } from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Coins,
  Feather,
  Home,
  Pause,
  Play,
  RotateCcw,
  Shield,
} from 'lucide-react';
import { GameOverStats, RunHUDState, ScreenState } from '../game/types';

interface GameHUDProps {
  screen: ScreenState;
  hud: RunHUDState;
  gameOverStats: GameOverStats | null;
  onMoveLeft: () => void;
  onMoveRight: () => void;
  onJump: () => void;
  onSlide: () => void;
  onPause: () => void;
  onResume: () => void;
  onRestart: () => void;
  onMainMenu: () => void;
}

export const GameHUD: React.FC<GameHUDProps> = ({
  screen,
  hud,
  gameOverStats,
  onMoveLeft,
  onMoveRight,
  onJump,
  onSlide,
  onPause,
  onResume,
  onRestart,
  onMainMenu,
}) => {
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const swipeHandled = useRef(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 0) return;
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    swipeHandled.current = false;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStart.current || swipeHandled.current || e.touches.length === 0) return;
    const dx = e.touches[0].clientX - touchStart.current.x;
    const dy = e.touches[0].clientY - touchStart.current.y;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);

    if (Math.max(absX, absY) > 26) {
      swipeHandled.current = true;
      if (absX > absY) {
        if (dx < 0) onMoveLeft();
        else onMoveRight();
      } else {
        if (dy < 0) onJump();
        else onSlide();
      }
    }
  };

  if (screen === 'playing') {
    const wingPct =
      hud.activeWingTotal > 0
        ? Math.min(100, Math.round((hud.activeWingRemaining / hud.activeWingTotal) * 100))
        : 0;

    return (
      <div
        className="fixed inset-0 z-20 flex flex-col justify-between pointer-events-auto touch-none"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
      >
        {/* TOP HUD BAR */}
        <div className="p-3 sm:p-4 flex items-start justify-between gap-2 pointer-events-none">
          <div className="bg-[#0b1120]/85 border border-white/12 rounded-xl px-3.5 py-2.5 min-w-[148px]">
            <div className="font-mono-num text-xl sm:text-2xl font-bold text-white leading-none">
              {hud.score.toLocaleString()}
            </div>
            <div className="mt-1 flex items-center gap-2 text-[11px] font-medium text-slate-300 font-mono-num">
              <span>{hud.distance}m</span>
              <span aria-hidden="true">·</span>
              <span>{hud.speedKmh} km/h</span>
              {hud.multiplier > 1 && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="text-[#fbbf24] font-bold">{hud.multiplier}x</span>
                </>
              )}
            </div>
            <div className="mt-1 text-[10px] text-slate-400 truncate max-w-[180px]">
              {hud.zoneName} · {hud.timePhase}
            </div>
          </div>

          <div className="flex items-center gap-2 pointer-events-auto">
            {hud.hasShield && (
              <div className="h-11 px-2.5 rounded-xl bg-[#06b6d4]/20 border border-[#06b6d4] flex items-center gap-1 text-xs font-bold text-[#67e8f9]">
                <Shield className="w-4 h-4" />
                <span className="hidden sm:inline">Shield</span>
              </div>
            )}

            <div className="h-11 px-3 rounded-xl bg-[#0b1120]/85 border border-white/12 flex items-center gap-1.5 font-mono-num text-sm font-bold text-[#fbbf24]">
              <Coins className="w-4 h-4" />
              <span>{hud.coins}</span>
            </div>

            <button
              onClick={onPause}
              aria-label="Pause Game"
              className="min-h-[44px] min-w-[44px] rounded-xl bg-[#0b1120]/85 border border-white/15 hover:bg-[#1e293b] active:scale-95 transition flex items-center justify-center text-white cursor-pointer"
            >
              <Pause className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ACTIVE WING POWER-UP + OTHER POWER-UPS TIMERS */}
        {(hud.activeWingId !== null || hud.activePowerUps.length > 0) && (
          <div className="px-3 sm:px-4 flex flex-col gap-1.5 items-start pointer-events-none">
            {hud.activeWingId !== null && (
              <div className="bg-[#0b1120]/90 border border-[#fbbf24] rounded-xl px-3 py-2 w-52">
                <div className="flex items-center justify-between gap-2 text-xs font-bold text-[#fbbf24]">
                  <span className="flex items-center gap-1.5 truncate">
                    <Feather className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{hud.activeWingName}</span>
                  </span>
                  <span className="font-mono-num text-white shrink-0">
                    {hud.activeWingRemaining.toFixed(1)}s
                  </span>
                </div>
                <div className="text-[10px] text-slate-300 mt-0.5 mb-1.5 truncate">
                  {hud.activeWingAbility}
                </div>
                <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-[#fbbf24] transition-all"
                    style={{ width: `${wingPct}%` }}
                  />
                </div>
              </div>
            )}

            {hud.activePowerUps.map((p) => {
              const pct = Math.min(100, Math.round((p.remaining / p.total) * 100));
              return (
                <div
                  key={p.type}
                  className="bg-[#0b1120]/85 border border-white/12 rounded-lg px-2.5 py-1.5 w-40"
                >
                  <div className="flex items-center justify-between text-[11px] font-bold text-white mb-1">
                    <span>{p.label}</span>
                    <span className="font-mono-num">{p.remaining.toFixed(1)}s</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full transition-all"
                      style={{ width: `${pct}%`, backgroundColor: p.color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* BOTTOM CONTROLS: SWIPE + QUICK TOUCH BUTTONS */}
        <div className="p-3 sm:p-5 flex items-end justify-between gap-3 mt-auto">
          <div className="flex items-center gap-2">
            <button
              onPointerDown={(e) => {
                e.stopPropagation();
                onMoveLeft();
              }}
              aria-label="Move Left"
              className="min-h-[48px] min-w-[48px] rounded-xl bg-[#0b1120]/75 border border-white/15 active:scale-90 transition flex items-center justify-center text-white cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <button
              onPointerDown={(e) => {
                e.stopPropagation();
                onMoveRight();
              }}
              aria-label="Move Right"
              className="min-h-[48px] min-w-[48px] rounded-xl bg-[#0b1120]/75 border border-white/15 active:scale-90 transition flex items-center justify-center text-white cursor-pointer"
            >
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>

          <div className="hidden sm:block text-[11px] font-medium text-white/75 bg-[#0b1120]/65 px-3 py-1.5 rounded-lg pointer-events-none">
            Swipe or Arrow Keys · Collect Floating Wings & Power-Ups
          </div>

          <div className="flex items-center gap-2">
            <button
              onPointerDown={(e) => {
                e.stopPropagation();
                onSlide();
              }}
              aria-label="Slide"
              className="min-h-[48px] min-w-[48px] rounded-xl bg-[#0b1120]/75 border border-white/15 active:scale-90 transition flex items-center justify-center text-white cursor-pointer"
            >
              <ArrowDown className="w-5 h-5" />
            </button>
            <button
              onPointerDown={(e) => {
                e.stopPropagation();
                onJump();
              }}
              aria-label="Jump"
              className="min-h-[48px] min-w-[48px] rounded-xl bg-[#0b1120]/75 border border-white/15 active:scale-90 transition flex items-center justify-center text-white cursor-pointer"
            >
              <ArrowUp className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- PAUSE OVERLAY ---
  if (screen === 'paused') {
    return (
      <div className="fixed inset-0 z-30 bg-[#070b14]/80 flex items-center justify-center p-4">
        <div className="w-full max-w-sm rounded-2xl bg-[#0f172a] border border-white/15 p-6 text-center space-y-4">
          <h2 className="font-display text-2xl font-extrabold text-white">Run Paused</h2>
          <p className="text-xs text-slate-400">
            Score {hud.score.toLocaleString()} · {hud.distance}m · {hud.coins} coins
          </p>

          <div className="space-y-2.5 pt-2">
            <button
              onClick={onResume}
              className="min-h-[48px] w-full rounded-xl bg-[#ff6b1a] hover:bg-[#ea580c] text-white font-bold text-sm flex items-center justify-center gap-2 cursor-pointer transition"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Resume Run</span>
            </button>
            <button
              onClick={onRestart}
              className="min-h-[48px] w-full rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-sm flex items-center justify-center gap-2 cursor-pointer transition"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Restart</span>
            </button>
            <button
              onClick={onMainMenu}
              className="min-h-[48px] w-full rounded-xl bg-white/8 hover:bg-white/12 text-slate-200 font-semibold text-sm flex items-center justify-center gap-2 cursor-pointer transition"
            >
              <Home className="w-4 h-4" />
              <span>Main Menu</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- GAME OVER SCREEN ---
  if (screen === 'gameover' && gameOverStats) {
    return (
      <div className="fixed inset-0 z-30 bg-[#070b14]/82 flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl bg-[#0f172a] border border-white/15 p-6 space-y-5">
          <div className="text-center">
            {gameOverStats.isNewBest && (
              <div className="text-xs font-bold text-[#fbbf24] tracking-wider uppercase mb-1">
                New Personal Best
              </div>
            )}
            <h2 className="font-display text-3xl font-extrabold text-white">Run Complete</h2>
            <p className="text-xs text-slate-400 mt-1 capitalize">
              {gameOverStats.character === 'gandhi' ? 'Gandhi Ji' : 'Modi Ji'} ·{' '}
              {gameOverStats.mode.replace('_', ' ')} Mode
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-[#1e293b]/80 border border-white/10">
              <div className="text-xs text-slate-400">Final Score</div>
              <div className="font-mono-num text-xl font-bold text-white mt-0.5">
                {gameOverStats.score.toLocaleString()}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-[#1e293b]/80 border border-white/10">
              <div className="text-xs text-slate-400">Best Score</div>
              <div className="font-mono-num text-xl font-bold text-[#fbbf24] mt-0.5">
                {gameOverStats.bestScore.toLocaleString()}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-[#1e293b]/80 border border-white/10">
              <div className="text-xs text-slate-400">Distance</div>
              <div className="font-mono-num text-lg font-bold text-white mt-0.5">
                {gameOverStats.distance.toLocaleString()} m
              </div>
            </div>
            <div className="p-3 rounded-xl bg-[#1e293b]/80 border border-white/10">
              <div className="text-xs text-slate-400">Coins Collected</div>
              <div className="font-mono-num text-lg font-bold text-[#fbbf24] mt-0.5">
                +{gameOverStats.coins}
              </div>
            </div>
          </div>

          {gameOverStats.missionsCompletedThisRun.length > 0 && (
            <div className="p-3 rounded-xl bg-[#10b981]/15 border border-[#10b981]/40">
              <div className="text-xs font-bold text-[#34d399] mb-1">
                Missions Completed This Run
              </div>
              <ul className="text-xs text-slate-200 space-y-0.5">
                {gameOverStats.missionsCompletedThisRun.map((title) => (
                  <li key={title}>· {title}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 pt-1">
            <button
              onClick={onMainMenu}
              className="min-h-[48px] rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-sm flex items-center justify-center gap-2 cursor-pointer transition"
            >
              <Home className="w-4 h-4" />
              <span>Main Menu</span>
            </button>
            <button
              onClick={onRestart}
              className="min-h-[48px] rounded-xl bg-[#ff6b1a] hover:bg-[#ea580c] text-white font-bold text-sm flex items-center justify-center gap-2 cursor-pointer transition"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Play Again</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};
