// Central game state store — kept flat and simple so future multiplayer sync
// can replace local state by swapping this module.

export type Zone = 'entrance' | 'slots' | 'poker' | 'bar' | 'blackjack' | 'roulette' | 'plinko' | 'bingo' | 'horses' | 'vip' | 'floor';
export type InteractionState = 'free' | 'slots' | 'poker' | 'bar' | 'blackjack' | 'roulette' | 'plinko' | 'bingo' | 'horses';

export interface SessionStats {
  slotsSpins: number;
  slotsWagered: number;
  slotsWon: number;
  slotsMaxWin: number;
  slotsWinStreak: number;
  slotsMaxWinStreak: number;

  pokerHandsPlayed: number;
  pokerHandsWon: number;
  pokerWagered: number;
  pokerWon: number;
  pokerMaxPotWon: number;

  bjHandsPlayed: number;
  bjHandsWon: number;
  bjHandsLosses: number;
  bjHandsTied: number;
  bjWagered: number;
  bjWon: number;
  bjDoubleDowns: number;
  bjSplits: number;
  bjBlackjacks: number;

  rouletteSpins: number;
  rouletteWagered: number;
  rouletteWon: number;
  rouletteMaxWin: number;

  plinkoDrops: number;
  plinkoWagered: number;
  plinkoWon: number;
  plinkoMaxWin: number;

  bingoCardsPlayed: number;
  bingoCardsWon: number;
  bingoWagered: number;
  bingoWon: number;

  horseRacesBet: number;
  horseRacesWon: number;
  horseWagered: number;
  horseWon: number;
  horseMaxPayout: number;

  barDrinksOrdered: number;
  barChipsTipped: number;
  barLuckyShotsClaimed: number;
}

export interface PlayerState {
  displayName: string;
  chips: number;
  zone: Zone;
  interaction: InteractionState;
  seated: boolean;
  avatarTextureKey?: string;
  stats: SessionStats;
  activeBuffs: Record<string, number>;
  lastDailyClaim: number;
  claimedAchievements: string[];
  unlockedAvatars: string[];
}

const DEFAULT_STATS: SessionStats = {
  slotsSpins: 0, slotsWagered: 0, slotsWon: 0, slotsMaxWin: 0, slotsWinStreak: 0, slotsMaxWinStreak: 0,
  pokerHandsPlayed: 0, pokerHandsWon: 0, pokerWagered: 0, pokerWon: 0, pokerMaxPotWon: 0,
  bjHandsPlayed: 0, bjHandsWon: 0, bjHandsLosses: 0, bjHandsTied: 0, bjWagered: 0, bjWon: 0, bjDoubleDowns: 0, bjSplits: 0, bjBlackjacks: 0,
  rouletteSpins: 0, rouletteWagered: 0, rouletteWon: 0, rouletteMaxWin: 0,
  plinkoDrops: 0, plinkoWagered: 0, plinkoWon: 0, plinkoMaxWin: 0,
  bingoCardsPlayed: 0, bingoCardsWon: 0, bingoWagered: 0, bingoWon: 0,
  horseRacesBet: 0, horseRacesWon: 0, horseWagered: 0, horseWon: 0, horseMaxPayout: 0,
  barDrinksOrdered: 0, barChipsTipped: 0, barLuckyShotsClaimed: 0,
};

const DEFAULT_PLAYER: PlayerState = {
  displayName: 'Guest',
  chips: 1000,
  zone: 'entrance',
  interaction: 'free',
  seated: false,
  avatarTextureKey: 'avatar_player',
  stats: { ...DEFAULT_STATS },
  activeBuffs: {},
  lastDailyClaim: 0,
  claimedAchievements: [],
  unlockedAvatars: ['avatar_player'],
};

class GameStateStore {
  private player: PlayerState = { ...DEFAULT_PLAYER };
  private listeners: Array<(state: PlayerState) => void> = [];

  private saveTimer: number | null = null;

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    try {
      const saved = localStorage.getItem('slot-city-save');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Only restore specific fields so we don't restore old session zone/seated states
        this.player.chips = parsed.chips ?? DEFAULT_PLAYER.chips;
        this.player.displayName = parsed.displayName ?? DEFAULT_PLAYER.displayName;
        this.player.avatarTextureKey = parsed.avatarTextureKey ?? DEFAULT_PLAYER.avatarTextureKey;
        this.player.stats = { ...DEFAULT_STATS, ...(parsed.stats || {}) };
        this.player.lastDailyClaim = parsed.lastDailyClaim ?? 0;
        this.player.claimedAchievements = parsed.claimedAchievements ?? [];
      }
    } catch (e) {
      console.warn('Failed to load session from local storage', e);
    }
  }

  private saveToStorage(): void {
    if (this.saveTimer !== null) {
      clearTimeout(this.saveTimer);
    }
    this.saveTimer = window.setTimeout(() => {
      try {
        const toSave = {
          chips: this.player.chips,
          displayName: this.player.displayName,
          avatarTextureKey: this.player.avatarTextureKey,
          stats: this.player.stats,
          lastDailyClaim: this.player.lastDailyClaim,
          claimedAchievements: this.player.claimedAchievements,
        };
        localStorage.setItem('slot-city-save', JSON.stringify(toSave));
      } catch (e) {
        console.warn('Failed to save session', e);
      }
      this.saveTimer = null;
    }, 500);
  }

  get(): PlayerState {
    return { ...this.player, stats: { ...this.player.stats } };
  }

  update(partial: Partial<PlayerState>): void {
    if (partial.chips !== undefined) {
      partial = { ...partial, chips: Math.max(0, partial.chips) };
    }
    this.player = { ...this.player, ...partial };
    this.listeners.forEach(fn => fn(this.get()));
    this.saveToStorage();
  }

  claimAchievement(key: string, reward: number): void {
    if (!this.player.claimedAchievements.includes(key)) {
      this.update({
        chips: this.player.chips + reward,
        claimedAchievements: [...this.player.claimedAchievements, key]
      });
    }
  }

  unlockAvatar(key: string): void {
    if (!this.player.unlockedAvatars.includes(key)) {
      this.update({
        unlockedAvatars: [...this.player.unlockedAvatars, key]
      });
    }
  }

  addChips(amount: number): void {
    this.update({ chips: Math.max(0, this.player.chips + amount) });
  }

  setZone(zone: Zone): void {
    this.update({ zone });
  }

  setInteraction(interaction: InteractionState): void {
    this.update({ interaction, seated: interaction !== 'free' });
  }

  clearInteraction(): void {
    this.update({ interaction: 'free', seated: false });
  }

  recordStat<K extends keyof SessionStats>(key: K, delta: number): void {
    this.update({
      stats: {
        ...this.player.stats,
        [key]: this.player.stats[key] + delta,
      },
    });
  }

  recordMaxStat<K extends keyof SessionStats>(key: K, value: number): void {
    this.update({
      stats: {
        ...this.player.stats,
        [key]: Math.max(this.player.stats[key], value),
      },
    });
  }

  subscribe(fn: (state: PlayerState) => void): () => void {
    this.listeners.push(fn);
    return () => {
      this.listeners = this.listeners.filter(l => l !== fn);
    };
  }

  addBuff(key: string, duration: number): void {
    const buffs = { ...this.player.activeBuffs };
    buffs[key] = (buffs[key] || 0) + duration;
    this.update({ activeBuffs: buffs });
  }

  hasBuff(key: string): boolean {
    return (this.player.activeBuffs[key] || 0) > 0;
  }

  consumeBuff(key: string): void {
    if (this.hasBuff(key)) {
      const buffs = { ...this.player.activeBuffs };
      buffs[key] -= 1;
      if (buffs[key] <= 0) delete buffs[key];
      this.update({ activeBuffs: buffs });
    }
  }

  reset(): void {
    this.player = { ...DEFAULT_PLAYER, stats: { ...DEFAULT_STATS } };
    this.listeners.forEach(fn => fn(this.get()));
  }
}

// Singleton
export const GameState = new GameStateStore();

