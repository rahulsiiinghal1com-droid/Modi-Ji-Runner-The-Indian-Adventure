import {
  CharacterId,
  DAILY_MISSIONS,
  GameMode,
  GameSettings,
  LeaderboardEntry,
  MissionProgress,
  OutfitId,
  SaveData,
  WingId,
} from './types';

const STORAGE_KEY = 'modi_ji_runner_save_v1';

function todayKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate()
  ).padStart(2, '0')}`;
}

function createInitialMissions(): Record<string, MissionProgress> {
  const map: Record<string, MissionProgress> = {};
  for (const m of DAILY_MISSIONS) {
    map[m.id] = { progress: 0, completed: false, claimed: false };
  }
  return map;
}

export function getDefaultSaveData(): SaveData {
  return {
    totalCoins: 100,
    bestScore: 0,
    unlockedCharacters: ['modi'],
    selectedCharacter: 'modi',
    unlockedOutfits: ['original'],
    unlockedWings: ['golden'],
    selectedOutfit: 'original',
    selectedWing: 'golden',
    selectedMode: 'classic',
    missions: createInitialMissions(),
    missionResetDate: todayKey(),
    lastDailyRewardDate: '',
    dailyStreak: 0,
    leaderboard: [],
    settings: {
      musicVolume: 0.45,
      sfxVolume: 0.75,
      quality: 'medium',
      timeOfDay: 'auto',
    },
  };
}

export function loadSaveData(): SaveData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const fresh = getDefaultSaveData();
      persistSaveData(fresh);
      return fresh;
    }
    const parsed = JSON.parse(raw) as Partial<SaveData>;
    const defaults = getDefaultSaveData();
    const merged: SaveData = {
      ...defaults,
      ...parsed,
      settings: {
        ...defaults.settings,
        ...(parsed.settings ?? {}),
      },
      missions: {
        ...defaults.missions,
        ...(parsed.missions ?? {}),
      },
      unlockedCharacters:
        Array.isArray(parsed.unlockedCharacters) && parsed.unlockedCharacters.length > 0
          ? parsed.unlockedCharacters
          : ['modi'],
      selectedCharacter: parsed.selectedCharacter === 'gandhi' && parsed.unlockedCharacters?.includes('gandhi')
        ? 'gandhi'
        : 'modi',
      unlockedOutfits:
        Array.isArray(parsed.unlockedOutfits) && parsed.unlockedOutfits.length > 0
          ? parsed.unlockedOutfits
          : ['original'],
      unlockedWings:
        Array.isArray(parsed.unlockedWings) && parsed.unlockedWings.length > 0
          ? parsed.unlockedWings
          : ['golden'],
      leaderboard: Array.isArray(parsed.leaderboard) ? parsed.leaderboard : [],
    };

    const today = todayKey();
    if (merged.missionResetDate !== today) {
      merged.missions = createInitialMissions();
      merged.missionResetDate = today;
      persistSaveData(merged);
    }

    return merged;
  } catch {
    return getDefaultSaveData();
  }
}

export function persistSaveData(data: SaveData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Ignore storage quota errors gracefully
  }
}

export function canClaimDailyReward(data: SaveData): boolean {
  return data.lastDailyRewardDate !== todayKey();
}

export function claimDailyReward(data: SaveData): { updated: SaveData; rewardCoins: number } {
  const today = todayKey();
  if (data.lastDailyRewardDate === today) {
    return { updated: data, rewardCoins: 0 };
  }
  const nextStreak = Math.min(data.dailyStreak + 1, 7);
  const rewardCoins = 100 + (nextStreak - 1) * 50;
  const updated: SaveData = {
    ...data,
    totalCoins: data.totalCoins + rewardCoins,
    lastDailyRewardDate: today,
    dailyStreak: nextStreak,
  };
  persistSaveData(updated);
  return { updated, rewardCoins };
}

export function recordRunCompletion(
  data: SaveData,
  run: {
    score: number;
    distance: number;
    coins: number;
    obstaclesAvoided: number;
    wingsUsed: number;
    powerUpsCollected: number;
    crashed: boolean;
    mode: GameMode;
    character: CharacterId;
  }
): {
  updated: SaveData;
  isNewBest: boolean;
  newlyCompletedMissions: string[];
} {
  const isNewBest = run.score > data.bestScore;
  const newBest = Math.max(data.bestScore, run.score);

  const entry: LeaderboardEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    score: Math.floor(run.score),
    distance: Math.floor(run.distance),
    coins: run.coins,
    mode: run.mode,
    character: run.character,
    date: new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
  };

  const nextLeaderboard = [...data.leaderboard, entry]
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

  const nextMissions: Record<string, MissionProgress> = { ...data.missions };
  const newlyCompletedMissions: string[] = [];

  for (const m of DAILY_MISSIONS) {
    const prev = nextMissions[m.id] ?? { progress: 0, completed: false, claimed: false };
    if (prev.completed) continue;

    let delta = 0;
    if (m.metric === 'coins') delta = run.coins;
    else if (m.metric === 'distance') delta = Math.floor(run.distance);
    else if (m.metric === 'obstacles') delta = run.obstaclesAvoided;
    else if (m.metric === 'wings') delta = run.wingsUsed;
    else if (m.metric === 'powerups') delta = run.powerUpsCollected;
    else if (m.metric === 'clean_run') {
      delta = !run.crashed && run.distance >= 500 ? 1 : 0;
    }

    const nextProgress = Math.min(m.target, prev.progress + delta);
    const completed = nextProgress >= m.target;
    if (completed && !prev.completed) {
      newlyCompletedMissions.push(m.title);
    }
    nextMissions[m.id] = {
      progress: nextProgress,
      completed,
      claimed: prev.claimed,
    };
  }

  const updated: SaveData = {
    ...data,
    totalCoins: data.totalCoins + run.coins,
    bestScore: newBest,
    leaderboard: nextLeaderboard,
    missions: nextMissions,
  };
  persistSaveData(updated);
  return { updated, isNewBest, newlyCompletedMissions };
}

export function claimMissionReward(data: SaveData, missionId: string): { updated: SaveData; reward: number } {
  const def = DAILY_MISSIONS.find((m) => m.id === missionId);
  const status = data.missions[missionId];
  if (!def || !status || !status.completed || status.claimed) {
    return { updated: data, reward: 0 };
  }
  const updated: SaveData = {
    ...data,
    totalCoins: data.totalCoins + def.reward,
    missions: {
      ...data.missions,
      [missionId]: {
        ...status,
        claimed: true,
      },
    },
  };
  persistSaveData(updated);
  return { updated, reward: def.reward };
}

export function unlockOrEquipCharacter(
  data: SaveData,
  charId: CharacterId,
  price: number
): { updated: SaveData; success: boolean; purchased: boolean } {
  const isUnlocked = data.unlockedCharacters.includes(charId);
  if (isUnlocked) {
    const updated = { ...data, selectedCharacter: charId };
    persistSaveData(updated);
    return { updated, success: true, purchased: false };
  }
  if (data.totalCoins < price) {
    return { updated: data, success: false, purchased: false };
  }
  const updated: SaveData = {
    ...data,
    totalCoins: data.totalCoins - price,
    unlockedCharacters: [...data.unlockedCharacters, charId],
    selectedCharacter: charId,
  };
  persistSaveData(updated);
  return { updated, success: true, purchased: true };
}

export function unlockOrEquipOutfit(
  data: SaveData,
  outfitId: OutfitId,
  price: number
): { updated: SaveData; success: boolean } {
  const isUnlocked = data.unlockedOutfits.includes(outfitId);
  if (isUnlocked) {
    const updated = { ...data, selectedOutfit: outfitId };
    persistSaveData(updated);
    return { updated, success: true };
  }
  if (data.totalCoins < price) {
    return { updated: data, success: false };
  }
  const updated: SaveData = {
    ...data,
    totalCoins: data.totalCoins - price,
    unlockedOutfits: [...data.unlockedOutfits, outfitId],
    selectedOutfit: outfitId,
  };
  persistSaveData(updated);
  return { updated, success: true };
}

export function unlockOrEquipWing(
  data: SaveData,
  wingId: WingId,
  price: number
): { updated: SaveData; success: boolean } {
  const isUnlocked = data.unlockedWings.includes(wingId);
  if (isUnlocked) {
    const updated = { ...data, selectedWing: wingId };
    persistSaveData(updated);
    return { updated, success: true };
  }
  if (data.totalCoins < price) {
    return { updated: data, success: false };
  }
  const updated: SaveData = {
    ...data,
    totalCoins: data.totalCoins - price,
    unlockedWings: [...data.unlockedWings, wingId],
    selectedWing: wingId,
  };
  persistSaveData(updated);
  return { updated, success: true };
}

export function updateSettings(data: SaveData, partial: Partial<GameSettings>): SaveData {
  const updated: SaveData = {
    ...data,
    settings: {
      ...data.settings,
      ...partial,
    },
  };
  persistSaveData(updated);
  return updated;
}

export function updateSelectedMode(data: SaveData, mode: GameMode): SaveData {
  const updated: SaveData = {
    ...data,
    selectedMode: mode,
  };
  persistSaveData(updated);
  return updated;
}
