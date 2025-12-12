export type StatType = 'BODY' | 'MIND' | 'SOUL';
export type HabitType = 'good' | 'bad';

export const STAT_LABELS: Record<StatType, string> = {
  BODY: 'Body',
  MIND: 'Mind',
  SOUL: 'Soul',
};

export interface Habit {
  id: string;
  title: string;
  description?: string;
  type: HabitType;
  stat: StatType;
  xpReward: number;
  statReward: number;
  completedDates: string[]; // ISO date strings YYYY-MM-DD
  streak: number;
  createdAt: string;
}

export interface GratitudeEntry {
  id: string;
  date: string; // YYYY-MM-DD
  content: string;
  createdAt: string;
}

export interface UserStats {
  level: number;
  currentXp: number;
  nextLevelXp: number;
  attributes: Record<StatType, number>;
}

export interface User {
  username: string;
  isLoggedIn: boolean;
}

export interface AppData {
  habits: Habit[];
  gratitudeLogs: GratitudeEntry[];
  stats: UserStats;
}