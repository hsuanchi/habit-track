import React from 'react';
import { UserStats, STAT_LABELS, StatType } from '../types';
import { Sword, Activity } from 'lucide-react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts';

interface StatsOverviewProps {
  stats: UserStats;
  username: string;
}

export const StatsOverview: React.FC<StatsOverviewProps> = ({ stats, username }) => {
  const radarData = Object.entries(stats.attributes).map(([key, value]) => ({
    subject: STAT_LABELS[key as StatType],
    A: value,
    fullMark: Math.max(...(Object.values(stats.attributes) as number[])) * 1.2
  }));

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      {/* Level & XP Card */}
      <div className="aspect-square bg-slate-900 rounded-2xl border border-slate-800 p-8 shadow-xl relative overflow-hidden flex flex-col items-center justify-center text-center">
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
          <p className="text-slate-500 text-sm mt-4">Rank: {Math.floor(stats.level / 10) + 1} • {username}</p>
        </div>
      </div>

      {/* Attributes Radar */}
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
  );
};