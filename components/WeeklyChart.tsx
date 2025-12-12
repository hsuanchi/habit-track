import React from 'react';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { eachDayOfInterval, format, addDays } from 'date-fns';
import { Habit } from '../types';

interface WeeklyChartProps {
  habits: Habit[];
}

export const WeeklyChart: React.FC<WeeklyChartProps> = ({ habits }) => {
  // Generate last 7 days including today
  const data = eachDayOfInterval({ 
    start: addDays(new Date(), -6), 
    end: new Date() 
  }).map(day => {
    const dateStr = format(day, 'yyyy-MM-dd');
    const count = habits.reduce((acc, h) => {
      // Only count good habits for progress visualization
      if (h.type === 'good' && h.completedDates.includes(dateStr)) {
        return acc + 1;
      }
      return acc;
    }, 0);
    return { 
      day: format(day, 'EEE'), // Mon, Tue...
      date: dateStr,
      count: count 
    };
  });

  return (
    <div className="w-full h-[200px] mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <XAxis 
            dataKey="day" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#94a3b8', fontSize: 12 }} 
          />
          <Tooltip 
            cursor={{ fill: 'rgba(255, 107, 53, 0.1)' }}
            contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f1f5f9' }}
          />
          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
             {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.count > 0 ? '#ff6b35' : '#334155'} />
             ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};