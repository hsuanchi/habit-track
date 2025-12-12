import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';
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

export class FirestoreDB {
  /**
   * Fetches user data from Firestore.
   * If the user document doesn't exist (first login), it creates one with initial data.
   * This is why you don't need to manually create the collection.
   */
  static async fetchUserDocument(uid: string): Promise<AppData> {
    const userDocRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userDocRef);

    if (userSnap.exists()) {
      return userSnap.data() as AppData;
    } else {
      // Create new user document automatically
      await setDoc(userDocRef, INITIAL_DATA);
      return INITIAL_DATA;
    }
  }

  /**
   * Updates the user's document in Firestore.
   */
  static async updateUserDocument(uid: string, data: AppData): Promise<void> {
    const userDocRef = doc(db, 'users', uid);
    // merge: true ensures we don't accidentally wipe fields if the schema changes
    await setDoc(userDocRef, data, { merge: true });
  }
}