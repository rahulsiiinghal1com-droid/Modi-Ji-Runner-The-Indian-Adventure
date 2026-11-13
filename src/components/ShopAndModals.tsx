import React from 'react';
import {
  ArrowLeft,
  Check,
  Coins,
  Crown,
  Eye,
  Feather,
  Lock,
  Maximize2,
  Minimize2,
  Shirt,
  Target,
  Trophy,
  User,
  Volume2,
  VolumeX,
} from 'lucide-react';
import {
  CHARACTER_CATALOG,
  CharacterId,
  DAILY_MISSIONS,
  OUTFIT_CATALOG,
  OutfitId,
  QualityLevel,
  SaveData,
  ScreenState,
  TimeOfDayMode,
  WING_CATALOG,
  WingId,
} from '../game/types';

interface ModalProps {
  screen: ScreenState;
  save: SaveData;
  previewCharacterId: CharacterId;
  isFullscreen: boolean;
  onClose: () => void;
  onPreviewCharacter: (id: CharacterId) => void;
  onSelectCharacter: (id: CharacterId, price: number) => void;
  onSelectOutfit: (id: OutfitId, price: number) => void;
  onSelectWing: (id: WingId, price: number) => void;
  onClaimMission: (missionId: string) => void;
  onUpdateSettings: (partial: Partial<SaveData['settings']>) => void;
  onToggleFullscreen: () => void;
}

export const ShopAndModals: React.FC<ModalProps> = ({
  screen,
  save,
  previewCharacterId,
  isFullscreen,
  onClose,
  onPreviewCharacter,
  onSelectCharacter,
  onSelectOutfit,
  onSelectWing,
  onClaimMission,
  onUpdateSettings,
  onToggleFullscreen,
}) => {
  if (
    screen !== 'shop_characters' &&
    screen !== 'shop_outfits' &&
    screen !== 'shop_wings' &&
    screen !== 'missions' &&
    screen !== 'leaderboard' &&
    screen !== 'settings'
  ) {
    return null;
  }

  const isLivePreviewShop =
    screen === 'shop_characters' || screen === 'shop_outfits' || screen === 'shop_wings';

  return (
    <div
      className={`fixed inset-0 z-30 flex flex-col pointer-events-none ${
        isLivePreviewShop ? 'justify-between' : 'justify-center items-center p-4 bg-[#070b14]/75'
      }`}
    >
      {/* Top Bar inside modal */}
      <div
        className={`pointer-events-auto flex items-center justify-between gap-4 px-4 py-3 ${
          isLivePreviewShop
            ? 'bg-[#0b1120]/90 border-b border-white/10'
            : 'w-full max-w-xl rounded-t-2xl bg-[#0f172a] border border-b-0 border-white/15'
        }`}
      >
        <button
          onClick={onClose}
          className="min-h-[44px] min-w-[44px] px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 active:scale-95 transition flex items-center gap-2 text-sm font-semibold text-white cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        <div className="flex items-center gap-2 font-display text-lg font-bold tracking-tight text-white">
          {screen === 'shop_characters' && (
            <>
              <User className="w-5 h-5 text-[#ff6b1a]" />
              <span>Character Shop</span>
            </>
          )}
          {screen === 'shop_outfits' && (
            <>
              <Shirt className="w-5 h-5 text-[#ff6b1a]" />
              <span>Modi Ji Outfits</span>
            </>
          )}
          {screen === 'shop_wings' && (
            <>
              <Feather className="w-5 h-5 text-[#fbbf24]" />
              <span>12 Wing Powers</span>
            </>
          )}
          {screen === 'missions' && (
            <>
              <Target className="w-5 h-5 text-[#10b981]" />
              <span>Daily Missions</span>
            </>
          )}
          {screen === 'leaderboard' && (
            <>
              <Trophy className="w-5 h-5 text-[#fbbf24]" />
              <span>Device Top 10</span>
            </>
          )}
          {screen === 'settings' && <span>Game Settings</span>}
        </div>

        <div className="flex items-center gap-1.5 font-mono-num text-sm font-bold text-[#fbbf24]">
          <Coins className="w-4 h-4" />
          <span>{save.totalCoins.toLocaleString()}</span>
        </div>
      </div>

      {/* Modal Body */}
      <div
        className={`pointer-events-auto custom-scroll overflow-y-auto ${
          isLivePreviewShop
            ? 'w-full max-h-[52vh] bg-[#0b1120]/94 border-t border-white/15 px-4 py-4'
            : 'w-full max-w-xl max-h-[72vh] rounded-b-2xl bg-[#0f172a] border border-white/15 p-4'
        }`}
      >
        {/* --- CHARACTER SHOP (MODI JI & GANDHI JI) --- */}
        {screen === 'shop_characters' && (
          <div className="mx-auto max-w-3xl space-y-3">
            <div className="text-xs text-slate-300 text-center">
              Rotating 3D character preview above · Wings are collected as power-ups during runs
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {CHARACTER_CATALOG.map((char) => {
                const unlocked = save.unlockedCharacters.includes(char.id);
                const equipped = save.selectedCharacter === char.id;
                const previewing = previewCharacterId === char.id;
                const canAfford = save.totalCoins >= char.price;

                return (
                  <div
                    key={char.id}
                    className={`flex flex-col justify-between p-4 rounded-xl border transition ${
                      equipped
                        ? 'bg-[#1e293b] border-[#ff6b1a]'
                        : previewing
                          ? 'bg-[#172033] border-[#fbbf24]/60'
                          : 'bg-[#111827]/90 border-white/10'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div>
                          <span className="font-display font-bold text-lg text-white">
                            {char.name}
                          </span>
                          <span className="ml-2 text-xs text-slate-400">{char.title}</span>
                        </div>
                        <span className="font-mono-num text-xs font-bold text-[#fbbf24]">
                          {char.price === 0 ? 'FREE' : `${char.price.toLocaleString()} Coins`}
                        </span>
                      </div>

                      <div className="text-[11px] font-semibold mb-2">
                        {equipped ? (
                          <span className="text-[#34d399]">Selected Runner</span>
                        ) : unlocked ? (
                          <span className="text-slate-300">Unlocked</span>
                        ) : (
                          <span className="text-amber-300">Locked</span>
                        )}
                      </div>

                      <p className="text-xs text-slate-300 leading-relaxed mb-4">
                        {char.description}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onPreviewCharacter(char.id)}
                        className={`min-h-[44px] px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                          previewing
                            ? 'bg-white/20 text-white'
                            : 'bg-white/8 hover:bg-white/15 text-slate-300'
                        }`}
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>3D Preview</span>
                      </button>

                      <button
                        onClick={() => onSelectCharacter(char.id, char.price)}
                        disabled={!unlocked && !canAfford}
                        className={`flex-1 min-h-[44px] rounded-lg px-3 py-2 text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                          equipped
                            ? 'bg-[#ff6b1a] text-white'
                            : unlocked
                              ? 'bg-[#10b981] hover:bg-[#059669] text-[#0b1120]'
                              : canAfford
                                ? 'bg-[#f59e0b] hover:bg-[#d97706] text-[#0b1120]'
                                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                        }`}
                      >
                        {equipped ? (
                          <>
                            <Check className="w-4 h-4" />
                            <span>Equipped</span>
                          </>
                        ) : unlocked ? (
                          <span>Equip {char.name}</span>
                        ) : (
                          <>
                            <Lock className="w-3.5 h-3.5" />
                            <span>Buy · {char.price.toLocaleString()} Coins</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* --- OUTFIT SHOP --- */}
        {screen === 'shop_outfits' && (
          <div className="mx-auto max-w-4xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {OUTFIT_CATALOG.map((outfit) => {
              const unlocked = save.unlockedOutfits.includes(outfit.id);
              const equipped = save.selectedOutfit === outfit.id;
              const canAfford = save.totalCoins >= outfit.price;

              return (
                <div
                  key={outfit.id}
                  className={`flex flex-col justify-between p-3.5 rounded-xl border transition ${
                    equipped
                      ? 'bg-[#1e293b] border-[#ff6b1a]'
                      : 'bg-[#111827]/90 border-white/10'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="font-display font-bold text-base text-white">
                        {outfit.name}
                      </span>
                      <span
                        className="w-4 h-4 rounded-full shrink-0 border border-white/30"
                        style={{ backgroundColor: outfit.accentHex }}
                      />
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed mb-3">
                      {outfit.description}
                    </p>
                  </div>

                  <button
                    onClick={() => onSelectOutfit(outfit.id, outfit.price)}
                    disabled={!unlocked && !canAfford}
                    className={`min-h-[44px] w-full rounded-lg px-3 py-2 text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                      equipped
                        ? 'bg-[#ff6b1a] text-white'
                        : unlocked
                          ? 'bg-white/12 hover:bg-white/20 text-white'
                          : canAfford
                            ? 'bg-[#f59e0b] hover:bg-[#d97706] text-[#0b1120]'
                            : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    {equipped ? (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Equipped</span>
                      </>
                    ) : unlocked ? (
                      <span>Equip Outfit</span>
                    ) : (
                      <>
                        <Lock className="w-3.5 h-3.5" />
                        <span>Unlock · {outfit.price} Coins</span>
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* --- 12 WINGS SHOP --- */}
        {screen === 'shop_wings' && (
          <div className="mx-auto max-w-5xl space-y-3">
            <div className="text-xs text-slate-300 text-center">
              All 12 wings spawn as temporary glowing power-ups on the road during gameplay!
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {WING_CATALOG.map((wing) => {
                const unlocked = save.unlockedWings.includes(wing.id);
                const equipped = save.selectedWing === wing.id;
                const canAfford = save.totalCoins >= wing.price;

                return (
                  <div
                    key={wing.id}
                    className={`flex flex-col justify-between p-3.5 rounded-xl border transition ${
                      equipped
                        ? 'bg-[#1e293b] border-[#fbbf24]'
                        : 'bg-[#111827]/90 border-white/10'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-display font-bold text-base text-white">
                          {wing.name}
                        </span>
                        <span
                          className="w-4 h-4 rounded-full shrink-0 border border-white/30"
                          style={{ backgroundColor: wing.accentHex }}
                        />
                      </div>
                      <div className="text-[11px] font-bold text-[#fbbf24] mb-1">
                        {wing.abilityName} · {wing.duration}s
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed mb-3">
                        {wing.description}
                      </p>
                    </div>

                    <button
                      onClick={() => onSelectWing(wing.id, wing.price)}
                      disabled={!unlocked && !canAfford}
                      className={`min-h-[44px] w-full rounded-lg px-3 py-2 text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                        equipped
                          ? 'bg-[#fbbf24] text-[#0b1120]'
                          : unlocked
                            ? 'bg-white/12 hover:bg-white/20 text-white'
                            : canAfford
                              ? 'bg-[#f59e0b] hover:bg-[#d97706] text-[#0b1120]'
                              : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      {equipped ? (
                        <>
                          <Check className="w-4 h-4" />
                          <span>Previewing</span>
                        </>
                      ) : unlocked ? (
                        <span>Preview Wings</span>
                      ) : (
                        <>
                          <Lock className="w-3.5 h-3.5" />
                          <span>Unlock · {wing.price.toLocaleString()} Coins</span>
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* --- DAILY MISSIONS --- */}
        {screen === 'missions' && (
          <div className="space-y-3">
            {DAILY_MISSIONS.map((m) => {
              const st = save.missions[m.id] ?? { progress: 0, completed: false, claimed: false };
              const pct = Math.min(100, Math.round((st.progress / m.target) * 100));
              return (
                <div
                  key={m.id}
                  className="p-3.5 rounded-xl bg-[#1e293b]/80 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="font-semibold text-sm text-white">{m.title}</span>
                      <span className="font-mono-num text-xs text-slate-300">
                        {st.progress}/{m.target}
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-900 overflow-hidden">
                      <div
                        className="h-full bg-[#10b981] transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>

                  <button
                    onClick={() => onClaimMission(m.id)}
                    disabled={!st.completed || st.claimed}
                    className={`min-h-[44px] px-4 py-2 rounded-lg text-xs font-bold shrink-0 cursor-pointer transition ${
                      st.claimed
                        ? 'bg-slate-800 text-slate-400 cursor-default'
                        : st.completed
                          ? 'bg-[#10b981] hover:bg-[#059669] text-[#0b1120]'
                          : 'bg-white/8 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    {st.claimed
                      ? 'Claimed'
                      : st.completed
                        ? `Claim +${m.reward}`
                        : `+${m.reward} Coins`}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* --- LOCAL DEVICE LEADERBOARD --- */}
        {screen === 'leaderboard' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#1e293b] border border-[#fbbf24]/40">
              <div className="flex items-center gap-2.5">
                <Crown className="w-5 h-5 text-[#fbbf24]" />
                <span className="text-sm font-semibold text-white">Your Personal Best</span>
              </div>
              <span className="font-mono-num text-xl font-bold text-[#fbbf24]">
                {save.bestScore.toLocaleString()}
              </span>
            </div>

            {save.leaderboard.length === 0 ? (
              <div className="py-8 text-center text-sm text-slate-400">
                No runs recorded yet. Complete a run to set your first high score on this device!
              </div>
            ) : (
              <div className="divide-y divide-white/10">
                {save.leaderboard.map((entry, idx) => (
                  <div key={entry.id} className="py-2.5 flex items-center justify-between text-sm">
                    <div className="flex items-center gap-3">
                      <span className="font-mono-num w-6 text-slate-400 font-bold">
                        #{idx + 1}
                      </span>
                      <div>
                        <div className="font-semibold text-white capitalize">
                          {entry.character === 'gandhi' ? 'Gandhi Ji' : 'Modi Ji'} ·{' '}
                          {entry.mode.replace('_', ' ')}
                        </div>
                        <div className="text-xs text-slate-400">
                          {entry.distance}m · {entry.coins} coins · {entry.date}
                        </div>
                      </div>
                    </div>
                    <span className="font-mono-num font-bold text-white">
                      {entry.score.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <p className="text-xs text-slate-400 text-center pt-2 border-t border-white/10">
              Scores are stored locally in your browser. Online multiplayer leaderboard is not
              configured.
            </p>
          </div>
        )}

        {/* --- SETTINGS --- */}
        {screen === 'settings' && (
          <div className="space-y-5">
            <div>
              <div className="flex items-center justify-between text-sm font-semibold mb-2">
                <span className="flex items-center gap-2 text-white">
                  {save.settings.musicVolume > 0 ? (
                    <Volume2 className="w-4 h-4 text-[#ff6b1a]" />
                  ) : (
                    <VolumeX className="w-4 h-4 text-slate-400" />
                  )}
                  Indian Instrumental Music
                </span>
                <span className="font-mono-num text-slate-300">
                  {Math.round(save.settings.musicVolume * 100)}%
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={save.settings.musicVolume}
                onChange={(e) => onUpdateSettings({ musicVolume: parseFloat(e.target.value) })}
                className="w-full accent-[#ff6b1a] cursor-pointer h-2"
              />
            </div>

            <div>
              <div className="flex items-center justify-between text-sm font-semibold mb-2">
                <span className="text-white">Sound Effects</span>
                <span className="font-mono-num text-slate-300">
                  {Math.round(save.settings.sfxVolume * 100)}%
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={save.settings.sfxVolume}
                onChange={(e) => onUpdateSettings({ sfxVolume: parseFloat(e.target.value) })}
                className="w-full accent-[#fbbf24] cursor-pointer h-2"
              />
            </div>

            <div>
              <div className="text-sm font-semibold text-white mb-2">Graphics Quality</div>
              <div className="grid grid-cols-3 gap-2">
                {(['low', 'medium', 'high'] as QualityLevel[]).map((q) => (
                  <button
                    key={q}
                    onClick={() => onUpdateSettings({ quality: q })}
                    className={`min-h-[44px] rounded-lg text-xs font-bold capitalize transition cursor-pointer ${
                      save.settings.quality === q
                        ? 'bg-[#ff6b1a] text-white'
                        : 'bg-white/10 text-slate-300 hover:bg-white/15'
                    }`}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="text-sm font-semibold text-white mb-2">Time of Day</div>
              <div className="grid grid-cols-4 gap-2">
                {(['auto', 'day', 'sunset', 'night'] as TimeOfDayMode[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => onUpdateSettings({ timeOfDay: t })}
                    className={`min-h-[44px] rounded-lg text-xs font-bold capitalize transition cursor-pointer ${
                      save.settings.timeOfDay === t
                        ? 'bg-[#fbbf24] text-[#0b1120]'
                        : 'bg-white/10 text-slate-300 hover:bg-white/15'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={onToggleFullscreen}
              className="min-h-[44px] w-full rounded-xl bg-white/10 hover:bg-white/15 text-white text-sm font-semibold flex items-center justify-center gap-2 transition cursor-pointer"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              <span>{isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen Mode'}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
