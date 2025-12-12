import React, { useState } from 'react';
import { 
  eachDayOfInterval, 
  format, 
  isSameDay, 
  getDay, 
  endOfMonth, 
  endOfWeek, 
  addMonths, 
  isSameMonth
} from 'date-fns';
import { twMerge } from 'tailwind-merge';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Habit, GratitudeEntry } from '../types';

interface ContributionGraphProps {
  habits: Habit[];
  gratitudeLogs?: GratitudeEntry[]; 
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  theme?: 'emerald' | 'rose';
  title: string;
}

export const ContributionGraph: React.FC<ContributionGraphProps> = ({ 
  habits, 
  gratitudeLogs = [],
  selectedDate,
  onDateSelect,
  theme = 'emerald',
  title
}) => {
  const [viewDate, setViewDate] = useState(new Date());

  const handlePrevMonth = () => setViewDate(addMonths(viewDate, -1));
  const handleNextMonth = () => setViewDate(addMonths(viewDate, 1));

  // Calculate range for the view
  // Manual startOfMonth implementation to avoid import issues
  const monthStart = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
  const monthEnd = endOfMonth(viewDate);
  
  // Manual startOfWeek implementation (Sunday start)
  const calendarStart = new Date(monthStart);
  calendarStart.setDate(monthStart.getDate() - monthStart.getDay());
  
  const calendarEnd = endOfWeek(monthEnd);

  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  // Calculate intensity map
  const intensityMap = new Map<string, number>();
  
  days.forEach(day => {
    const dateStr = format(day, 'yyyy-MM-dd');
    let score = 0;
    
    // Count habits
    habits.forEach(habit => {
      if (habit.completedDates.includes(dateStr)) {
        score++;
      }
    });

    // Count gratitude
    const gratitudeCount = gratitudeLogs.filter(log => log.date === dateStr).length;
    score += gratitudeCount;

    intensityMap.set(dateStr, score);
  });

  const getColorClass = (count: number) => {
    if (count === 0) return 'bg-slate-800/50 hover:bg-slate-700';
    
    if (theme === 'rose') {
        if (count === 1) return 'bg-rose-900 hover:bg-rose-800';
        if (count === 2) return 'bg-rose-700 hover:bg-rose-600';
        if (count >= 3) return 'bg-rose-500 hover:bg-rose-400 shadow-[0_0_10px_rgba(244,63,94,0.4)]';
        return 'bg-rose-500';
    } else {
        if (count === 1) return 'bg-[#ff6b35]/30 hover:bg-[#ff6b35]/40';
        if (count === 2) return 'bg-[#ff6b35]/60 hover:bg-[#ff6b35]/70';
        if (count >= 3) return 'bg-[#ff6b35] hover:bg-[#ff8f66] shadow-[0_0_10px_rgba(255,107,53,0.4)]';
        return 'bg-[#ff6b35]';
    }
  };

  // Group by weeks for the grid
  const weeks: Date[][] = [];
  let currentWeek: Date[] = [];

  days.forEach((day) => {
    if (getDay(day) === 0 && currentWeek.length > 0) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
    currentWeek.push(day);
  });
  if (currentWeek.length > 0) weeks.push(currentWeek);

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-6">
        <h3 className={`font-bold text-lg ${theme === 'rose' ? 'text-rose-400' : 'text-[#ff6b35]'}`}>
          {title}
        </h3>
        <div className="flex items-center gap-4 bg-slate-950 rounded-lg p-1 border border-slate-800">
          <button onClick={handlePrevMonth} className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-sm font-bold min-w-[100px] text-center text-slate-200">
            {format(viewDate, 'MMMM yyyy')}
          </span>
          <button onClick={handleNextMonth} className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="w-full overflow-x-auto pb-4 custom-scrollbar">
        <div className="flex gap-2 min-w-max justify-center">
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="flex flex-col gap-2">
              {week.map((day) => {
                const dateStr = format(day, 'yyyy-MM-dd');
                const count = intensityMap.get(dateStr) || 0;
                const isSelected = isSameDay(day, selectedDate);
                const isToday = isSameDay(day, new Date());
                const inCurrentMonth = isSameMonth(day, viewDate);

                return (
                  <div
                    key={dateStr}
                    onClick={() => onDateSelect(day)}
                    title={`${dateStr}: ${count} entries`}
                    className={twMerge(
                      "w-12 h-12 rounded-lg cursor-pointer transition-all duration-200 border border-transparent flex items-center justify-center relative",
                      getColorClass(count),
                      !inCurrentMonth && "opacity-20 grayscale",
                      isSelected && "ring-2 ring-white border-transparent z-10 scale-110 shadow-lg",
                      isToday && !isSelected && "border-[#ff6b35]/80"
                    )}
                  >
                    <span className={`text-xs font-medium ${count > 0 ? 'text-white/90' : 'text-slate-600'}`}>
                      {format(day, 'd')}
                    </span>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      
      <div className="flex justify-center items-center gap-3 mt-4 text-xs text-slate-500">
        <span>Less</span>
        <div className="w-4 h-4 bg-slate-800 rounded"></div>
        <div className={`w-4 h-4 rounded ${theme === 'rose' ? 'bg-rose-900' : 'bg-[#ff6b35]/30'}`}></div>
        <div className={`w-4 h-4 rounded ${theme === 'rose' ? 'bg-rose-700' : 'bg-[#ff6b35]/60'}`}></div>
        <div className={`w-4 h-4 rounded ${theme === 'rose' ? 'bg-rose-500' : 'bg-[#ff6b35]'}`}></div>
        <span>More</span>
      </div>
    </div>
  );
};