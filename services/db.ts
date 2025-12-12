import { AppData, UserStats } from '../types';

const INITIAL_STATS: UserStats = {
  level: 1,
  currentXp: 0,
  nextLevelXp: 100,
  attributes: {
    BODY: 1,
    MIND: 1,
    SOUL: 1,
  },
};

const INITIAL_DATA: AppData = {
  habits: [],
  gratitudeLogs: [],
  stats: INITIAL_STATS,
};

export class MockDB {
  private static getKey(username: string) {
    return `rpg_tracker_v3_${username}`; // Bumped version to v3 to reset schema cleanly for new stats
  }

  static async login(username: string): Promise<AppData> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const key = this.getKey(username);
    const stored = localStorage.getItem(key);
    
    if (stored) {
      return JSON.parse(stored);
    }
    
    // Create new user data
    this.save(username, INITIAL_DATA);
    return INITIAL_DATA;
  }

  static save(username: string, data: AppData): void {
    const key = this.getKey(username);
    localStorage.setItem(key, JSON.stringify(data));
  }
}