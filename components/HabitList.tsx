import React from 'react';
import { Habit, HabitType, StatType, STAT_LABELS } from '../types';
import { Plus, Check, Trash2, Skull, Zap, AlertCircle, Activity, Brain, Heart } from 'lucide-react';

export const STAT_ICONS: Record<StatType, React.ReactNode> = {
  BODY: <Activity className="w-4 h-4" />,
  MIND: <Brain className="w-4 h-4" />,
  SOUL: <Heart className="w-4 h-4" />,
};

interface HabitListProps {
  type: HabitType;
  habits: Habit[];
  dateStr: string;
  onAdd: () => void;
  onDelete: (id: string) => void;
  onToggle: (id: string) => void;
}

export const HabitList: React.FC<HabitListProps> = ({ type, habits, dateStr, onAdd, onDelete, onToggle }) => {
  const isGood = type === 'good';
  
  return (
    <div className={`bg-slate-900 rounded-2xl border ${isGood ? 'border-slate-800' : 'border-rose-900/30'} p-6 shadow-xl`}>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          {isGood ? <Zap className="w-5 h-5 text-[#ff6b35]" /> : <Skull className="w-5 h-5 text-rose-400" />}
          {isGood ? 'Good Habits' : 'Bad Habits'}
        </h2>
        <button 
          onClick={onAdd}
          className={`${isGood ? 'bg-[#ff6b35] hover:bg-orange-600' : 'bg-rose-600 hover:bg-rose-500'} text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 shadow-lg`}
        >
          <Plus className="w-4 h-4" /> Add
        </button>
      </div>

      <div className="space-y-3">
        {habits.length === 0 && <p className="text-slate-500 text-center py-4">No habits tracked.</p>}
        {habits.map(habit => {
          const isCompleted = habit.completedDates.includes(dateStr);
          return (
            <div key={habit.id} className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
              isCompleted 
                ? (isGood ? 'bg-[#ff6b35]/20 border-[#ff6b35]/50' : 'bg-rose-950/20 border-rose-900/50') 
                : 'bg-slate-950 border-slate-800'
            }`}>
              <div className="flex items-center gap-4 flex-1">
                <button
                  onClick={() => onToggle(habit.id)}
                  className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
                    isCompleted 
                      ? (isGood ? 'bg-[#ff6b35] text-white scale-110' : 'bg-rose-500 text-white scale-110') 
                      : 'bg-slate-800 text-slate-600 hover:bg-slate-700'
                  }`}
                >
                  {isGood ? <Check className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />}
                </button>
                <div>
                  <h3 className={`font-semibold text-lg ${isCompleted ? (isGood ? 'text-slate-400' : 'text-rose-300') : 'text-slate-100'}`}>
                    {habit.title}
                  </h3>
                  <div className="flex gap-2 text-xs text-slate-500 items-center mt-1">
                    <span className={`bg-slate-900 px-2 py-0.5 rounded font-bold flex items-center gap-1 ${isGood ? 'text-[#ff6b35]' : 'text-rose-400'}`}>
                      {STAT_ICONS[habit.stat]}
                      {habit.stat} {isGood ? '+' : '-'}{habit.statReward}
                    </span>
                    <span className={`bg-slate-900 px-2 py-0.5 rounded font-bold ${isGood ? 'text-indigo-300' : 'text-rose-400'}`}>
                      XP {isGood ? '+' : '-'}{habit.xpReward}
                    </span>
                  </div>
                </div>
              </div>
              <button onClick={() => onDelete(habit.id)} className="text-slate-600 hover:text-red-400 p-2">
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};