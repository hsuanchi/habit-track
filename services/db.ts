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
  // Use unique User ID (uid) for the storage key to prevent collision
  private static getKey(uid: string) {
    return `rpg_tracker_v3_${uid}`; 
  }

  // Changed from login to loadData, no async delay needed for local storage
  static loadData(uid: string): AppData {
    const key = this.getKey(uid);
    const stored = localStorage.getItem(key);
    
    if (stored) {
      return JSON.parse(stored);
    }
    
    // Create new user data if none exists
    this.save(uid, INITIAL_DATA);
    return INITIAL_DATA;
  }

  static save(uid: string, data: AppData): void {
    const key = this.getKey(uid);
    localStorage.setItem(key, JSON.stringify(data));
  }
}