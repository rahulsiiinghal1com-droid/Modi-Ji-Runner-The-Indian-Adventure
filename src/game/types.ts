export type GameMode = 'classic' | 'flying' | 'coin_rush' | 'challenge' | 'speed_run';

export type CharacterId = 'modi' | 'gandhi';

export type WingId =
  | 'golden'
  | 'fire'
  | 'diamond'
  | 'rainbow'
  | 'lightning'
  | 'garuda'
  | 'peacock'
  | 'lotus'
  | 'surya'
  | 'ice'
  | 'tiranga'
  | 'cosmic';

export type OutfitId = 'original' | 'golden' | 'superhero' | 'royal' | 'space' | 'festival';

export type PowerUpType =
  | 'magnet'
  | 'jetpack'
  | 'wings'
  | 'shield'
  | 'chai'
  | 'double_coins'
  | 'super_jump'
  | 'slow_mo';

export type ObstacleType =
  | 'car'
  | 'auto'
  | 'bus'
  | 'barricade'
  | 'cone'
  | 'cow'
  | 'vendor_cart'
  | 'construction'
  | 'truck';

export type QualityLevel = 'low' | 'medium' | 'high';
export type TimeOfDayMode = 'auto' | 'day' | 'sunset' | 'night';

export type ScreenState =
  | 'menu'
  | 'playing'
  | 'paused'
  | 'gameover'
  | 'shop_characters'
  | 'shop_outfits'
  | 'shop_wings'
  | 'missions'
  | 'leaderboard'
  | 'settings';

export interface CharacterDefinition {
  id: CharacterId;
  name: string;
  title: string;
  description: string;
  price: number;
  accentHex: string;
}

export interface WingDefinition {
  id: WingId;
  name: string;
  abilityName: string;
  description: string;
  price: number;
  duration: number;
  primaryColor: number;
  secondaryColor: number;
  emissiveColor: number;
  particleColor: number;
  accentHex: string;
  // Special ability modifiers when collected
  speedMult?: number;
  scoreMult?: number;
  coinMult?: number;
  magnetOn?: boolean;
  grantShield?: boolean;
  slowObstacles?: boolean;
}

export interface OutfitDefinition {
  id: OutfitId;
  name: string;
  description: string;
  price: number;
  kurtaColor: number;
  jacketColor: number;
  churidarColor: number;
  accentColor: number;
  hasCape?: boolean;
  hasJetTrim?: boolean;
  accentHex: string;
}

export interface PowerUpDefinition {
  type: PowerUpType;
  name: string;
  shortLabel: string;
  duration: number; // seconds (0 = until hit / single-use)
  color: string;
  hexNum: number;
}

export interface MissionItem {
  id: string;
  title: string;
  target: number;
  reward: number;
  metric: 'coins' | 'distance' | 'obstacles' | 'wings' | 'powerups' | 'clean_run';
}

export interface MissionProgress {
  progress: number;
  completed: boolean;
  claimed: boolean;
}

export interface LeaderboardEntry {
  id: string;
  score: number;
  distance: number;
  coins: number;
  mode: GameMode;
  character: CharacterId;
  date: string;
}

export interface GameSettings {
  musicVolume: number;
  sfxVolume: number;
  quality: QualityLevel;
  timeOfDay: TimeOfDayMode;
}

export interface SaveData {
  totalCoins: number;
  bestScore: number;
  unlockedCharacters: CharacterId[];
  selectedCharacter: CharacterId;
  unlockedOutfits: OutfitId[];
  unlockedWings: WingId[];
  selectedOutfit: OutfitId;
  selectedWing: WingId;
  selectedMode: GameMode;
  missions: Record<string, MissionProgress>;
  missionResetDate: string;
  lastDailyRewardDate: string;
  dailyStreak: number;
  leaderboard: LeaderboardEntry[];
  settings: GameSettings;
}

export interface ActivePowerUpHUD {
  type: PowerUpType;
  label: string;
  remaining: number;
  total: number;
  color: string;
}

export interface RunHUDState {
  score: number;
  coins: number;
  distance: number;
  speedKmh: number;
  multiplier: number;
  isFlying: boolean;
  activeWingId: WingId | null;
  activeWingName: string | null;
  activeWingAbility: string | null;
  activeWingRemaining: number;
  activeWingTotal: number;
  hasShield: boolean;
  zoneName: string;
  timePhase: 'Day' | 'Sunset' | 'Night';
  activePowerUps: ActivePowerUpHUD[];
  obstaclesAvoided: number;
  wingsUsed: number;
  powerUpsCollected: number;
  crashed: boolean;
}

export interface GameOverStats {
  score: number;
  distance: number;
  coins: number;
  bestScore: number;
  isNewBest: boolean;
  obstaclesAvoided: number;
  wingsUsed: number;
  powerUpsCollected: number;
  missionsCompletedThisRun: string[];
  mode: GameMode;
  character: CharacterId;
}

export const CHARACTER_CATALOG: CharacterDefinition[] = [
  {
    id: 'modi',
    name: 'Modi Ji',
    title: 'Default Runner',
    description: 'Crisp white kurta-churidar, saffron jacket, round glasses & white beard.',
    price: 0,
    accentHex: '#FF6B1A',
  },
  {
    id: 'gandhi',
    name: 'Gandhi Ji',
    title: 'Legend Runner',
    description: 'Traditional white dhoti, round spectacles, bald head & walking stick.',
    price: 1000,
    accentHex: '#F59E0B',
  },
];

export const WING_CATALOG: WingDefinition[] = [
  {
    id: 'golden',
    name: 'Golden Angel Wings',
    abilityName: 'Solar Magnet Flight',
    description: 'Soar above traffic for 10s while attracting nearby coins.',
    price: 0,
    duration: 10,
    primaryColor: 0xffc107,
    secondaryColor: 0xffe082,
    emissiveColor: 0xff8f00,
    particleColor: 0xffd54f,
    accentHex: '#F59E0B',
    magnetOn: true,
  },
  {
    id: 'fire',
    name: 'Agni Fire Wings',
    abilityName: 'Blaze Speed Surge',
    description: 'Blazing high-speed flight with 2x score multiplier for 10s.',
    price: 250,
    duration: 10,
    primaryColor: 0xff3d00,
    secondaryColor: 0xffab00,
    emissiveColor: 0xff5722,
    particleColor: 0xff6e40,
    accentHex: '#EF4444',
    speedMult: 1.35,
    scoreMult: 2,
  },
  {
    id: 'diamond',
    name: 'Kohinoor Diamond Wings',
    abilityName: 'Crystal Shield Flight',
    description: 'Glittering flight for 10s plus a protective Super Shield.',
    price: 500,
    duration: 10,
    primaryColor: 0x80deea,
    secondaryColor: 0xe0f7fa,
    emissiveColor: 0x26c6da,
    particleColor: 0xb2ebf2,
    accentHex: '#06B6D4',
    grantShield: true,
  },
  {
    id: 'rainbow',
    name: 'Indradhanush Wings',
    abilityName: 'Prismatic 2x Coins',
    description: 'Color-shifting flight for 10s that doubles all coin pickups.',
    price: 750,
    duration: 10,
    primaryColor: 0xff4081,
    secondaryColor: 0x7c4dff,
    emissiveColor: 0x00e5ff,
    particleColor: 0xffea00,
    accentHex: '#EC4899',
    coinMult: 2,
  },
  {
    id: 'lightning',
    name: 'Vajra Lightning Wings',
    abilityName: 'Thunder Dash 2.5x',
    description: 'Supersonic storm flight with 2.5x score multiplier for 10s.',
    price: 1000,
    duration: 10,
    primaryColor: 0x3d5afe,
    secondaryColor: 0x00e5ff,
    emissiveColor: 0x651fff,
    particleColor: 0x40c4ff,
    accentHex: '#6366F1',
    speedMult: 1.45,
    scoreMult: 2.5,
  },
  {
    id: 'garuda',
    name: 'Garuda Eagle Wings',
    abilityName: 'Sky King Extended Flight',
    description: 'Extended 14s flight with wide-range coin magnet.',
    price: 1250,
    duration: 14,
    primaryColor: 0xb45309,
    secondaryColor: 0xfde68a,
    emissiveColor: 0xd97706,
    particleColor: 0xfbbf24,
    accentHex: '#D97706',
    magnetOn: true,
  },
  {
    id: 'peacock',
    name: 'Mayur Peacock Wings',
    abilityName: 'Royal 3x Coin Aura',
    description: 'Emerald-sapphire plumes granting 3x coins while flying for 10s.',
    price: 1500,
    duration: 10,
    primaryColor: 0x059669,
    secondaryColor: 0x0284c7,
    emissiveColor: 0x10b981,
    particleColor: 0x34d399,
    accentHex: '#10B981',
    coinMult: 3,
  },
  {
    id: 'lotus',
    name: 'Lotus Chakra Wings',
    abilityName: 'Zen Slow-Mo Flight',
    description: 'Serene pink-gold flight that slows traffic and attracts coins.',
    price: 1750,
    duration: 10,
    primaryColor: 0xf472b6,
    secondaryColor: 0xfef08a,
    emissiveColor: 0xec4899,
    particleColor: 0xf9a8d4,
    accentHex: '#F472B6',
    magnetOn: true,
    slowObstacles: true,
  },
  {
    id: 'surya',
    name: 'Surya Sun Wings',
    abilityName: 'Radiant Nova Shield',
    description: '12s blazing flight with Super Shield and 2x score boost.',
    price: 2000,
    duration: 12,
    primaryColor: 0xf97316,
    secondaryColor: 0xfef08a,
    emissiveColor: 0xea580c,
    particleColor: 0xfdba74,
    accentHex: '#EA580C',
    grantShield: true,
    scoreMult: 2,
  },
  {
    id: 'ice',
    name: 'Himalayan Ice Wings',
    abilityName: 'Frost Time Slow',
    description: 'Chilling flight for 10s that slows down oncoming vehicles.',
    price: 2250,
    duration: 10,
    primaryColor: 0x38bdf8,
    secondaryColor: 0xf0f9ff,
    emissiveColor: 0x0ea5e9,
    particleColor: 0xbae6fd,
    accentHex: '#38BDF8',
    slowObstacles: true,
  },
  {
    id: 'tiranga',
    name: 'Tiranga Pride Wings',
    abilityName: 'Tricolor Double Boost',
    description: '12s patriotic flight with 2x coins and 2x score multiplier.',
    price: 2500,
    duration: 12,
    primaryColor: 0xff9933,
    secondaryColor: 0x138808,
    emissiveColor: 0xf59e0b,
    particleColor: 0xffffff,
    accentHex: '#16A34A',
    coinMult: 2,
    scoreMult: 2,
  },
  {
    id: 'cosmic',
    name: 'Cosmic Nebula Wings',
    abilityName: 'Hyper Galaxy Mastery',
    description: 'Ultimate 14s flight with magnet, shield, and 3x score.',
    price: 3000,
    duration: 14,
    primaryColor: 0x7c3aed,
    secondaryColor: 0x22d3ee,
    emissiveColor: 0xa855f7,
    particleColor: 0xc084fc,
    accentHex: '#8B5CF6',
    magnetOn: true,
    grantShield: true,
    scoreMult: 3,
  },
];

export const OUTFIT_CATALOG: OutfitDefinition[] = [
  {
    id: 'original',
    name: 'Classic Modi Kurta',
    description: 'Crisp white kurta-churidar with iconic saffron sleeveless jacket.',
    price: 0,
    kurtaColor: 0xfaf7f0,
    jacketColor: 0xff6b1a,
    churidarColor: 0xf1ede4,
    accentColor: 0xd97706,
    accentHex: '#FF6B1A',
  },
  {
    id: 'golden',
    name: 'Swarna Golden Modi',
    description: 'Imperial brushed-gold bandi jacket over ivory silk kurta.',
    price: 300,
    kurtaColor: 0xfff8e7,
    jacketColor: 0xf59e0b,
    churidarColor: 0xfde68a,
    accentColor: 0xffffff,
    accentHex: '#F59E0B',
  },
  {
    id: 'superhero',
    name: 'Saffron Sentinel',
    description: 'Armored hero vest with billowing crimson-saffron cape.',
    price: 550,
    kurtaColor: 0x1e293b,
    jacketColor: 0xf97316,
    churidarColor: 0x0f172a,
    accentColor: 0xfacc15,
    hasCape: true,
    accentHex: '#EA580C',
  },
  {
    id: 'royal',
    name: 'Maharaja Royal',
    description: 'Deep maroon velvet bandhgala with gold heritage brocade.',
    price: 800,
    kurtaColor: 0xfef3c7,
    jacketColor: 0x881337,
    churidarColor: 0xfde68a,
    accentColor: 0xfbbf24,
    accentHex: '#BE123C',
  },
  {
    id: 'space',
    name: 'Gaganyaan Space Modi',
    description: 'Orbital mission suit with cobalt thrusters and chrome trim.',
    price: 1100,
    kurtaColor: 0xf8fafc,
    jacketColor: 0x1d4ed8,
    churidarColor: 0xe2e8f0,
    accentColor: 0x38bdf8,
    hasJetTrim: true,
    accentHex: '#0284C7',
  },
  {
    id: 'festival',
    name: 'Diwali Festival Modi',
    description: 'Emerald celebration silk with marigold & gold trim.',
    price: 1400,
    kurtaColor: 0xfffbeb,
    jacketColor: 0x059669,
    churidarColor: 0xfef3c7,
    accentColor: 0xf59e0b,
    accentHex: '#10B981',
  },
];

export const POWERUP_DEFS: Record<PowerUpType, PowerUpDefinition> = {
  magnet: {
    type: 'magnet',
    name: 'Coin Magnet',
    shortLabel: 'Coin Magnet',
    duration: 15,
    color: '#F59E0B',
    hexNum: 0xf59e0b,
  },
  jetpack: {
    type: 'jetpack',
    name: 'Jetpack Flight',
    shortLabel: 'Jetpack',
    duration: 10,
    color: '#EF4444',
    hexNum: 0xef4444,
  },
  wings: {
    type: 'wings',
    name: 'Wing Power-Up',
    shortLabel: 'Wings',
    duration: 10,
    color: '#FBBF24',
    hexNum: 0xfbbf24,
  },
  shield: {
    type: 'shield',
    name: 'Super Shield',
    shortLabel: 'Super Shield',
    duration: 0,
    color: '#06B6D4',
    hexNum: 0x06b6d4,
  },
  chai: {
    type: 'chai',
    name: 'Score Multiplier 2x',
    shortLabel: '2x Score',
    duration: 15,
    color: '#FB923C',
    hexNum: 0xfb923c,
  },
  double_coins: {
    type: 'double_coins',
    name: 'Double Coins',
    shortLabel: '2x Coins',
    duration: 15,
    color: '#10B981',
    hexNum: 0x10b981,
  },
  super_jump: {
    type: 'super_jump',
    name: 'Magic Shoes',
    shortLabel: 'Magic Shoes',
    duration: 15,
    color: '#8B5CF6',
    hexNum: 0x8b5cf6,
  },
  slow_mo: {
    type: 'slow_mo',
    name: 'Slow Motion',
    shortLabel: 'Slow-Mo',
    duration: 10,
    color: '#38BDF8',
    hexNum: 0x38bdf8,
  },
};

export const DAILY_MISSIONS: MissionItem[] = [
  {
    id: 'm_coins_100',
    title: 'Collect 100 golden coins',
    target: 100,
    reward: 150,
    metric: 'coins',
  },
  {
    id: 'm_dist_1000',
    title: 'Run 1,000 meters across Delhi',
    target: 1000,
    reward: 200,
    metric: 'distance',
  },
  {
    id: 'm_obs_20',
    title: 'Avoid 20 street obstacles',
    target: 20,
    reward: 150,
    metric: 'obstacles',
  },
  {
    id: 'm_wings_5',
    title: 'Collect 5 Wing power-ups',
    target: 5,
    reward: 250,
    metric: 'wings',
  },
  {
    id: 'm_power_3',
    title: 'Collect 3 street power-ups',
    target: 3,
    reward: 180,
    metric: 'powerups',
  },
  {
    id: 'm_clean_run',
    title: 'Reach 500m in a run without crashing',
    target: 1,
    reward: 300,
    metric: 'clean_run',
  },
];

export const GAME_MODES: Array<{
  id: GameMode;
  name: string;
  tagline: string;
  scoreMult: number;
}> = [
  {
    id: 'classic',
    name: 'Classic Endless',
    tagline: 'Balanced pace across evolving New Delhi landmarks',
    scoreMult: 1,
  },
  {
    id: 'flying',
    name: 'Flying Wings',
    tagline: 'Frequent collectible Wing power-ups & sky coin trails',
    scoreMult: 1.25,
  },
  {
    id: 'coin_rush',
    name: 'Coin Rush',
    tagline: 'Double coin waves across all 3 lanes',
    scoreMult: 1.2,
  },
  {
    id: 'challenge',
    name: 'Challenge Mode',
    tagline: 'Dense traffic, tricky barricades & 2x score bonus',
    scoreMult: 2,
  },
  {
    id: 'speed_run',
    name: 'Speed Run',
    tagline: 'High-velocity turbo dash with 2.5x score multiplier',
    scoreMult: 2.5,
  },
];
