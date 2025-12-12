import React, { useState, useEffect } from 'react';
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer,
  Tooltip
} from 'recharts';
import { Plus, Check, Trash2, Trophy, Zap, Brain, Activity, Sword, Calendar, LogOut, Skull, AlertCircle, Heart, Send, ChevronDown, ChevronUp } from 'lucide-react';
import { format, isSameDay } from 'date-fns';
import { Habit, UserStats, StatType, STAT_LABELS, User, HabitType, GratitudeEntry } from './types';
import { Login } from './components/Login';
import { ContributionGraph } from './components/ContributionGraph';
import { MockDB } from './services/db';

const STAT_ICONS: Record<StatType, React.ReactNode> = {
  BODY: <Activity className="w-4 h-4" />,
  MIND: <Brain className="w-4 h-4" />,
  SOUL: <Heart className="w-4 h-4" />,
};

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
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
  const [showGratitudeHistory, setShowGratitudeHistory] = useState(false);
  
  // Dashboard view state: 'positive' or 'negative'
  const [dashboardView, setDashboardView] = useState<'positive' | 'negative'>('positive');
  
  // Form State
  const [newHabitTitle, setNewHabitTitle] = useState('');
  const [newHabitStat, setNewHabitStat] = useState<StatType>('BODY');
  const [newHabitType, setNewHabitType] = useState<HabitType>('good');
  const [gratitudeInput, setGratitudeInput] = useState('');

  // Check for existing session
  useEffect(() => {
    const savedUser = localStorage.getItem('rpg_current_user');
    if (savedUser) {
      handleLogin(savedUser);
    } else {
      setLoading(false);
    }
  }, []);

  const handleLogin = async (username: string) => {
    setLoading(true);
    const data = await MockDB.login(username);
    const migratedHabits = data.habits.map(h => ({ ...h, type: h.type || 'good' }));
    setHabits(migratedHabits);
    setGratitudeLogs(data.gratitudeLogs || []);
    setStats(data.stats);
    setUser({ username, isLoggedIn: true });
    localStorage.setItem('rpg_current_user', username);
    setLoading(false);
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('rpg_current_user');
    setHabits([]);
    setGratitudeLogs([]);
  };

  // Auto-save whenever data changes
  useEffect(() => {
    if (user) {
      MockDB.save(user.username, { habits, gratitudeLogs, stats });
    }
  }, [habits, gratitudeLogs, stats, user]);

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
    if (confirm('Are you sure you want to delete this habit? History will be kept but it will disappear from the list.')) {
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
        // Undoing
        newCompletedDates = habit.completedDates.filter(d => d !== dateStr);
        xpChange = -1 * habit.xpReward * multiplier;
        statChange = -1 * habit.statReward * multiplier;
      } else {
        // Doing
        newCompletedDates = [...habit.completedDates, dateStr];
        xpChange = habit.xpReward * multiplier;
        statChange = habit.statReward * multiplier;
      }

      updateStats(xpChange, habit.stat, statChange);

      return prevHabits.map(h => 
        h.id === id 
          ? { ...h, completedDates: newCompletedDates } 
          : h
      );
    });
  };

  const addGratitude = () => {
    if (!gratitudeInput.trim()) return;
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    
    const newEntry: GratitudeEntry = {
      id: crypto.randomUUID(),
      date: dateStr,
      content: gratitudeInput,
      createdAt: new Date().toISOString()
    };

    setGratitudeLogs(prev => [newEntry, ...prev]);
    setGratitudeInput('');
    // Reward for gratitude: XP +5, Soul +1
    updateStats(5, 'SOUL', 1);
  };

  const deleteGratitude = (id: string) => {
    if (confirm('Delete this gratitude entry? (Rewards will be deducted)')) {
      setGratitudeLogs(prev => prev.filter(g => g.id !== id));
      updateStats(-5, 'SOUL', -1);
    }
  };

  const openAddModal = (type: HabitType) => {
    setNewHabitType(type);
    setIsModalOpen(true);
  };

  if (loading) {
    return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-500">Loading...</div>;
  }

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  const radarData = Object.entries(stats.attributes).map(([key, value]) => ({
    subject: STAT_LABELS[key as StatType],
    A: value,
    fullMark: Math.max(...(Object.values(stats.attributes) as number[])) * 1.2
  }));

  const isSelectedToday = isSameDay(selectedDate, new Date());
  const dateStr = format(selectedDate, 'yyyy-MM-dd');
  
  const goodHabits = habits.filter(h => h.type === 'good');
  const badHabits = habits.filter(h => h.type === 'bad');
  const dailyGratitudes = gratitudeLogs.filter(g => g.date === dateStr);
  const historyGratitudes = gratitudeLogs.slice(0, 30); // Last 30 entries

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
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        
        {/* Top Section: Character Stats Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Level & XP Card - Square Layout */}
          <div className="aspect-square bg-slate-900 rounded-2xl border border-slate-800 p-8 shadow-xl relative overflow-hidden flex flex-col items-center justify-center text-center">
             {/* Background Decoration */}
             <div className="absolute top-0 right-0 w-64 h-64 bg-[#ff6b35]/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

             <div className="flex items-center gap-2 mb-6">
                <Sword className="w-6 h-6 text-[#ff6b35]" />
                <h2 className="text-2xl font-bold text-white">Status</h2>
             </div>

             <div className="relative mb-8">
               <div className="w-32 h-32 bg-slate-950 rounded-full border-4 border-[#ff6b35]/30 flex items-center justify-center shadow-[0_0_30px_rgba(255,107,53,0.2)]">
                  <span className="text-6xl font-black text-white">{stats.level}</span>
               </div>
               <span className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-[#ff6b35] text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-lg">Level</span>
             </div>

             <div className="w-full max-w-xs space-y-2">
               <div className="flex justify-between text-xs font-mono text-[#ff6b35]/80 uppercase tracking-wider">
                  <span>Experience</span>
                  <span>{stats.currentXp} / {stats.nextLevelXp}</span>
               </div>
               
               <div className="w-full h-4 bg-slate-950 rounded-full overflow-hidden border border-slate-700/50">
                  <div 
                    className="h-full bg-gradient-to-r from-[#ff6b35] to-orange-400 shadow-[0_0_15px_rgba(255,107,53,0.5)] transition-all duration-700 ease-out"
                    style={{ width: `${Math.min(100, (stats.currentXp / stats.nextLevelXp) * 100)}%` }}
                  />
               </div>
               <p className="text-slate-500 text-sm mt-4">Rank: {Math.floor(stats.level / 10) + 1} • {user.username}</p>
             </div>
          </div>

          {/* Attributes Radar (Square) */}
          <div className="aspect-square bg-slate-900 rounded-2xl border border-slate-800 p-4 shadow-xl flex flex-col justify-center items-center relative overflow-hidden">
             <div className="absolute top-6 left-6 flex items-center gap-2">
                <Activity className="w-5 h-5 text-[#ff6b35]" />
                <h3 className="text-lg font-bold text-slate-300">Attributes</h3>
             </div>
             
             <div className="w-full h-full p-4 mt-4">
                <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                    <PolarGrid stroke="#334155" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 14, fontWeight: 'bold' }} />
                    <PolarRadiusAxis angle={30} domain={[0, 'auto']} tick={false} axisLine={false} />
                    <Radar
                        name="Stats"
                        dataKey="A"
                        stroke="#ff6b35"
                        fill="#ff6b35"
                        fillOpacity={0.5}
                    />
                    <Tooltip 
                        contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f1f5f9', fontSize: '14px' }}
                        itemStyle={{ color: '#ff6b35' }}
                    />
                    </RadarChart>
                </ResponsiveContainer>
             </div>
             
             <div className="absolute bottom-6 w-full flex justify-center gap-6 text-sm font-mono text-slate-400">
                {Object.entries(stats.attributes).map(([k, v]) => (
                  <div key={k} className="flex flex-col items-center">
                    <span className="text-xs text-[#ff6b35] font-bold">{k}</span>
                    <span className="text-white font-bold text-lg">{v}</span>
                  </div>
                ))}
             </div>
          </div>
        </div>

        {/* Middle Section: Dashboard */}
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-8 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold flex items-center gap-2 text-white">
                <Calendar className="w-6 h-6 text-[#ff6b35]" />
                Activity Log
              </h2>
              
              <div className="flex gap-2 p-1 bg-slate-950 rounded-lg border border-slate-800">
                <button
                  onClick={() => setDashboardView('positive')}
                  className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${
                    dashboardView === 'positive' 
                      ? 'bg-[#ff6b35] text-white shadow shadow-orange-500/20' 
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  Positive
                </button>
                <button
                  onClick={() => setDashboardView('negative')}
                  className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${
                    dashboardView === 'negative' 
                      ? 'bg-rose-600 text-white shadow' 
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  Negative
                </button>
              </div>
            </div>

            {dashboardView === 'positive' ? (
              <ContributionGraph 
                title="Consistency Tracker"
                habits={goodHabits}
                gratitudeLogs={gratitudeLogs}
                selectedDate={selectedDate}
                onDateSelect={setSelectedDate}
                theme="emerald" 
              />
            ) : (
              <ContributionGraph 
                title="Relapse Tracker"
                habits={badHabits}
                selectedDate={selectedDate}
                onDateSelect={setSelectedDate}
                theme="rose"
              />
            )}
        </div>

        <div className="text-center text-3xl font-bold text-white mb-2 sticky top-16 z-20 bg-slate-950/90 backdrop-blur-md py-4 border-b border-slate-800/50 shadow-sm">
             {format(selectedDate, 'MMMM d, yyyy')}
        </div>

        {/* Bottom Grid: Habits & Logs */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Column 1: Habits */}
          <div className="space-y-8">
             {/* Good Habits */}
            <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 shadow-xl">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Zap className="w-5 h-5 text-[#ff6b35]" /> Good Habits
                </h2>
                <button 
                  onClick={() => openAddModal('good')}
                  className="bg-[#ff6b35] hover:bg-orange-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 shadow-lg shadow-[#ff6b35]/20"
                >
                  <Plus className="w-4 h-4" /> Add
                </button>
              </div>

              <div className="space-y-3">
                {goodHabits.length === 0 && <p className="text-slate-500 text-center py-4">No habits added yet.</p>}
                {goodHabits.map(habit => {
                  const isCompleted = habit.completedDates.includes(dateStr);
                  return (
                    <div key={habit.id} className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                      isCompleted ? 'bg-[#ff6b35]/20 border-[#ff6b35]/50' : 'bg-slate-950 border-slate-800'
                    }`}>
                      <div className="flex items-center gap-4 flex-1">
                        <button
                          onClick={() => toggleHabitCompletion(habit.id)}
                          className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
                            isCompleted ? 'bg-[#ff6b35] text-white scale-110' : 'bg-slate-800 text-slate-600 hover:bg-slate-700'
                          }`}
                        >
                          <Check className="w-6 h-6" />
                        </button>
                        <div>
                          <h3 className={`font-semibold text-lg ${isCompleted ? 'text-slate-400' : 'text-slate-100'}`}>{habit.title}</h3>
                          <div className="flex gap-2 text-xs text-slate-500">
                            <span className="bg-slate-900 px-2 py-0.5 rounded text-[#ff6b35] font-bold">{habit.stat} +{habit.statReward}</span>
                            <span className="bg-slate-900 px-2 py-0.5 rounded text-indigo-300 font-bold">XP +{habit.xpReward}</span>
                          </div>
                        </div>
                      </div>
                      <button onClick={() => deleteHabit(habit.id)} className="text-slate-600 hover:text-red-400 p-2">
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bad Habits */}
            <div className="bg-slate-900 rounded-2xl border border-rose-900/30 p-6 shadow-xl">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Skull className="w-5 h-5 text-rose-400" /> Bad Habits
                </h2>
                <button 
                  onClick={() => openAddModal('bad')}
                  className="bg-rose-600 hover:bg-rose-500 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 shadow-lg shadow-rose-500/20"
                >
                  <Plus className="w-4 h-4" /> Add
                </button>
              </div>

              <div className="space-y-3">
                {badHabits.length === 0 && <p className="text-slate-500 text-center py-4">No bad habits tracked.</p>}
                {badHabits.map(habit => {
                  const isCompleted = habit.completedDates.includes(dateStr);
                  return (
                    <div key={habit.id} className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                      isCompleted ? 'bg-rose-950/20 border-rose-900/50' : 'bg-slate-950 border-slate-800'
                    }`}>
                      <div className="flex items-center gap-4 flex-1">
                        <button
                          onClick={() => toggleHabitCompletion(habit.id)}
                          className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
                            isCompleted ? 'bg-rose-500 text-white scale-110' : 'bg-slate-800 text-slate-600 hover:bg-slate-700'
                          }`}
                          title="Click to log relapse (Penalty)"
                        >
                          <AlertCircle className="w-6 h-6" />
                        </button>
                        <div>
                          <h3 className={`font-semibold text-lg ${isCompleted ? 'text-rose-300' : 'text-slate-100'}`}>{habit.title}</h3>
                          <div className="flex gap-2 text-xs text-slate-500">
                            <span className="bg-slate-900 px-2 py-0.5 rounded text-rose-400 font-bold">{habit.stat} -{habit.statReward}</span>
                            <span className="bg-slate-900 px-2 py-0.5 rounded text-rose-400 font-bold">XP -{habit.xpReward}</span>
                          </div>
                        </div>
                      </div>
                      <button onClick={() => deleteHabit(habit.id)} className="text-slate-600 hover:text-red-400 p-2">
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Column 2: Gratitude */}
          <div className="space-y-8">
            <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 shadow-xl relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-1 h-full bg-amber-500"></div>
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Heart className="w-5 h-5 text-amber-500" /> Gratitude Journal
              </h2>
              
              <div className="mb-4">
                {dailyGratitudes.map(entry => (
                  <div key={entry.id} className="bg-amber-950/20 border border-amber-900/30 p-4 rounded-lg mb-3 flex justify-between items-start animate-in fade-in slide-in-from-bottom-2">
                    <p className="text-amber-100 text-lg">{entry.content}</p>
                    <button onClick={() => deleteGratitude(entry.id)} className="text-slate-600 hover:text-amber-500 transition-colors p-1">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                ))}
                {dailyGratitudes.length === 0 && (
                  <p className="text-slate-500 text-sm italic mb-4">No gratitude entries for this day yet...</p>
                )}
              </div>

              <div className="flex gap-2 mb-6">
                <input 
                  type="text" 
                  value={gratitudeInput}
                  onChange={(e) => setGratitudeInput(e.target.value)}
                  placeholder="What are you grateful for today? (SOUL +1)"
                  className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-amber-500 outline-none"
                  onKeyDown={(e) => e.key === 'Enter' && addGratitude()}
                />
                <button 
                  onClick={addGratitude}
                  className="bg-amber-600 hover:bg-amber-500 text-white px-6 py-2 rounded-lg transition-colors flex items-center shadow-lg shadow-amber-500/20"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>

              {/* Collapsible History Section */}
              <div className="border-t border-slate-800 pt-4">
                <button 
                  onClick={() => setShowGratitudeHistory(!showGratitudeHistory)}
                  className="flex items-center gap-2 text-slate-400 hover:text-amber-400 transition-colors text-sm font-bold mb-4"
                >
                  {showGratitudeHistory ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  History (Last 30)
                </button>

                {showGratitudeHistory && (
                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                     {historyGratitudes.map(entry => (
                        <div key={entry.id} className="text-sm border-b border-slate-800/50 pb-2 mb-2 last:border-0">
                           <div className="text-slate-500 text-xs mb-1 flex justify-between">
                              <span>{entry.date}</span>
                              <button onClick={() => deleteGratitude(entry.id)} className="hover:text-red-400">
                                <Trash2 className="w-3 h-3" />
                              </button>
                           </div>
                           <p className="text-slate-300">{entry.content}</p>
                        </div>
                     ))}
                     {historyGratitudes.length === 0 && <p className="text-slate-500 text-xs">No history yet.</p>}
                  </div>
                )}
              </div>
            </div>
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