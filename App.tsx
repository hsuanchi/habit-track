import React, { useState, useEffect } from 'react';
import { Trophy, LogOut, Calendar, BarChart2 } from 'lucide-react';
import { format } from 'date-fns';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { Habit, UserStats, StatType, STAT_LABELS, User, HabitType, GratitudeEntry } from './types';
import { Login } from './components/Login';
import { ContributionGraph } from './components/ContributionGraph';
import { MockDB } from './services/db';
import { auth } from './services/firebase';

// Sub Components
import { StatsOverview } from './components/StatsOverview';
import { HabitList, STAT_ICONS } from './components/HabitList';
import { GratitudeSection } from './components/GratitudeSection';
import { WeeklyChart } from './components/WeeklyChart';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUid, setFirebaseUid] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Data State
  const [habits, setHabits] = useState<Habit[]>([]);
  const [gratitudeLogs, setGratitudeLogs] = useState<GratitudeEntry[]>([]);
  const [stats, setStats] = useState<UserStats>({
    level: 1, currentXp: 0, nextLevelXp: 100,
    attributes: { BODY: 1, MIND: 1, SOUL: 1 }
  });

  // UI State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  
  // View States
  const [dashboardView, setDashboardView] = useState<'positive' | 'negative'>('positive');
  const [chartMode, setChartMode] = useState<'monthly' | 'weekly'>('monthly');

  // Form State
  const [newHabitTitle, setNewHabitTitle] = useState('');
  const [newHabitStat, setNewHabitStat] = useState<StatType>('BODY');
  const [newHabitType, setNewHabitType] = useState<HabitType>('good');

  // Firebase Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        // User is signed in
        const uid = firebaseUser.uid;
        const displayName = firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Adventurer';
        
        setFirebaseUid(uid);
        setUser({ username: displayName, isLoggedIn: true });
        
        // Load data from LocalStorage using UID as key
        const data = MockDB.loadData(uid);
        
        // Ensure habit types exist (migration helper)
        const migratedHabits = data.habits.map(h => ({ ...h, type: h.type || 'good' }));
        setHabits(migratedHabits);
        setGratitudeLogs(data.gratitudeLogs || []);
        setStats(data.stats);
      } else {
        // User is signed out
        setUser(null);
        setFirebaseUid(null);
        setHabits([]);
        setGratitudeLogs([]);
        setStats({
          level: 1, currentXp: 0, nextLevelXp: 100,
          attributes: { BODY: 1, MIND: 1, SOUL: 1 }
        });
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  // Auto-save to LocalStorage whenever data changes
  useEffect(() => {
    if (firebaseUid) {
      MockDB.save(firebaseUid, { habits, gratitudeLogs, stats });
    }
  }, [habits, gratitudeLogs, stats, firebaseUid]);

  const addHabit = () => {
    if (!newHabitTitle.trim()) return;

    const newHabit: Habit = {
      id: crypto.randomUUID(),
      title: newHabitTitle,
      type: newHabitType,
      stat: newHabitStat,
      xpReward: 10,
      statReward: 1,
      completedDates: [],
      streak: 0,
      createdAt: new Date().toISOString()
    };

    setHabits([...habits, newHabit]);
    setNewHabitTitle('');
    setIsModalOpen(false);
  };

  const deleteHabit = (id: string) => {
    if (confirm('Delete this habit?')) {
       setHabits(habits.filter(h => h.id !== id));
    }
  };

  const updateStats = (xpChange: number, stat: StatType, statChange: number) => {
    setStats(prevStats => {
      let newXp = Math.max(0, prevStats.currentXp + xpChange);
      let newAttributes = { ...prevStats.attributes };
      newAttributes[stat] = Math.max(1, newAttributes[stat] + statChange);
      
      let newLevel = prevStats.level;
      let nextXp = prevStats.nextLevelXp;

      while (newXp >= nextXp) {
        newXp -= nextXp;
        newLevel += 1;
        nextXp = Math.floor(nextXp * 1.2);
      }
      
      return {
        ...prevStats,
        level: newLevel,
        currentXp: newXp,
        nextLevelXp: nextXp,
        attributes: newAttributes
      };
    });
  };

  const toggleHabitCompletion = (id: string) => {
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    
    setHabits(prevHabits => {
      const habit = prevHabits.find(h => h.id === id);
      if (!habit) return prevHabits;

      const isCompleted = habit.completedDates.includes(dateStr);
      let newCompletedDates: string[];
      let xpChange = 0;
      let statChange = 0;

      const multiplier = habit.type === 'good' ? 1 : -1;

      if (isCompleted) {
        newCompletedDates = habit.completedDates.filter(d => d !== dateStr);
        xpChange = -1 * habit.xpReward * multiplier;
        statChange = -1 * habit.statReward * multiplier;
      } else {
        newCompletedDates = [...habit.completedDates, dateStr];
        xpChange = habit.xpReward * multiplier;
        statChange = habit.statReward * multiplier;
      }

      updateStats(xpChange, habit.stat, statChange);

      return prevHabits.map(h => 
        h.id === id ? { ...h, completedDates: newCompletedDates } : h
      );
    });
  };

  const handleAddGratitude = (text: string) => {
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const newEntry: GratitudeEntry = {
      id: crypto.randomUUID(),
      date: dateStr,
      content: text,
      createdAt: new Date().toISOString()
    };
    setGratitudeLogs(prev => [newEntry, ...prev]);
    updateStats(5, 'SOUL', 1);
  };

  const handleDeleteGratitude = (id: string) => {
    if (confirm('Delete this gratitude entry?')) {
      setGratitudeLogs(prev => prev.filter(g => g.id !== id));
      updateStats(-5, 'SOUL', -1);
    }
  };

  const openAddModal = (type: HabitType) => {
    setNewHabitType(type);
    setIsModalOpen(true);
  };

  if (loading) {
    return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-500 animate-pulse">Loading Realm...</div>;
  }

  if (!user) {
    return <Login />;
  }

  const dateStr = format(selectedDate, 'yyyy-MM-dd');
  const goodHabits = habits.filter(h => h.type === 'good');
  const badHabits = habits.filter(h => h.type === 'bad');
  const dailyGratitudes = gratitudeLogs.filter(g => g.date === dateStr);
  const historyGratitudes = gratitudeLogs.slice(0, 30);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-20">
      
      {/* Header */}
      <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#ff6b35] rounded flex items-center justify-center shadow-lg shadow-[#ff6b35]/20">
              <Trophy className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg tracking-wide hidden sm:inline">Level Up Life</span>
          </div>
          
          <div className="flex items-center gap-4">
             <div className="text-sm text-slate-400 mr-2">
                Hello, <span className="text-white font-semibold">{user.username}</span>
             </div>
            <button 
              onClick={handleLogout}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors flex items-center gap-2"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        
        {/* New Refactored Stats Overview */}
        <StatsOverview stats={stats} username={user.username} />

        {/* Dashboard (Monthly/Weekly Charts) */}
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-8 shadow-xl">
            <div className="flex flex-col sm:flex-row items-center justify-between mb-6 gap-4">
              <h2 className="text-xl font-bold flex items-center gap-2 text-white">
                {chartMode === 'monthly' ? <Calendar className="w-6 h-6 text-[#ff6b35]" /> : <BarChart2 className="w-6 h-6 text-[#ff6b35]" />}
                Activity Log
              </h2>
              
              <div className="flex gap-4">
                {/* View Toggle (Monthly / Weekly) */}
                <div className="flex gap-1 p-1 bg-slate-950 rounded-lg border border-slate-800">
                   <button
                    onClick={() => setChartMode('monthly')}
                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                      chartMode === 'monthly' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-300'
                    }`}
                   >
                     Monthly
                   </button>
                   <button
                    onClick={() => setChartMode('weekly')}
                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                      chartMode === 'weekly' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-300'
                    }`}
                   >
                     Weekly
                   </button>
                </div>

                {/* Filter Toggle (Positive / Negative) */}
                <div className="flex gap-1 p-1 bg-slate-950 rounded-lg border border-slate-800">
                  <button
                    onClick={() => setDashboardView('positive')}
                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                      dashboardView === 'positive' 
                        ? 'bg-[#ff6b35] text-white shadow shadow-orange-500/20' 
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    Good
                  </button>
                  <button
                    onClick={() => setDashboardView('negative')}
                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                      dashboardView === 'negative' 
                        ? 'bg-rose-600 text-white shadow' 
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    Bad
                  </button>
                </div>
              </div>
            </div>

            {chartMode === 'monthly' ? (
               <ContributionGraph 
                 title={dashboardView === 'positive' ? "Consistency Map" : "Relapse Map"}
                 habits={dashboardView === 'positive' ? goodHabits : badHabits}
                 gratitudeLogs={dashboardView === 'positive' ? gratitudeLogs : []}
                 selectedDate={selectedDate}
                 onDateSelect={setSelectedDate}
                 theme={dashboardView === 'positive' ? 'emerald' : 'rose'}
               />
            ) : (
               <>
                 <h3 className="text-lg font-bold text-slate-300 mb-2">Weekly Completion (Good Habits)</h3>
                 <WeeklyChart habits={habits} />
               </>
            )}
        </div>

        <div className="text-center text-3xl font-bold text-white mb-2 sticky top-16 z-20 bg-slate-950/90 backdrop-blur-md py-4 border-b border-slate-800/50 shadow-sm">
             {format(selectedDate, 'MMMM d, yyyy')}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-8">
             <HabitList 
                type="good" 
                habits={goodHabits} 
                dateStr={dateStr}
                onAdd={() => openAddModal('good')}
                onDelete={deleteHabit}
                onToggle={toggleHabitCompletion}
             />
             <HabitList 
                type="bad" 
                habits={badHabits} 
                dateStr={dateStr}
                onAdd={() => openAddModal('bad')}
                onDelete={deleteHabit}
                onToggle={toggleHabitCompletion}
             />
          </div>

          <div className="space-y-8">
            <GratitudeSection 
              logs={dailyGratitudes}
              history={historyGratitudes}
              onAdd={handleAddGratitude}
              onDelete={handleDeleteGratitude}
            />
          </div>
        </div>
      </main>

      {/* Add Habit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl transform transition-all scale-100 animate-in fade-in zoom-in duration-200">
            <h3 className="text-xl font-bold mb-4 text-white">Add {newHabitType === 'good' ? 'Good Habit' : 'Bad Habit'}</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Title</label>
                <input
                  type="text"
                  value={newHabitTitle}
                  onChange={(e) => setNewHabitTitle(e.target.value)}
                  placeholder={newHabitType === 'good' ? "e.g. Meditate for 10 mins" : "e.g. Stay up late"}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-slate-100 focus:ring-2 focus:ring-[#ff6b35] outline-none transition-all"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">
                  {newHabitType === 'good' ? 'Stat Reward' : 'Stat Penalty'}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(STAT_LABELS).map(([key, label]) => (
                    <button
                      key={key}
                      onClick={() => setNewHabitStat(key as StatType)}
                      className={`p-2 text-sm rounded-lg border flex flex-col items-center gap-1 transition-all ${
                        newHabitStat === key 
                          ? (newHabitType === 'good' 
                              ? 'bg-[#ff6b35] border-[#ff6b35] text-white' 
                              : 'bg-rose-600 border-rose-500 text-white')
                          : 'bg-slate-950 border-slate-700 text-slate-400 hover:border-slate-600 hover:bg-slate-900'
                      }`}
                    >
                      {STAT_ICONS[key as StatType]}
                      <span className="text-xs">{label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button
                onClick={() => setIsModalOpen(false)}
                className="flex-1 py-2.5 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={addHabit}
                className={`flex-1 py-2.5 rounded-lg text-white font-medium transition-colors shadow-lg ${
                   newHabitType === 'good'
                    ? 'bg-[#ff6b35] hover:bg-orange-500 shadow-orange-500/20'
                    : 'bg-rose-600 hover:bg-rose-500 shadow-rose-500/20'
                }`}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;