import React, { useState } from 'react';
import { GratitudeEntry } from '../types';
import { Heart, Send, Trash2, ChevronUp, ChevronDown } from 'lucide-react';

interface GratitudeSectionProps {
  logs: GratitudeEntry[];
  history: GratitudeEntry[];
  onAdd: (text: string) => void;
  onDelete: (id: string) => void;
}

export const GratitudeSection: React.FC<GratitudeSectionProps> = ({ logs, history, onAdd, onDelete }) => {
  const [input, setInput] = useState('');
  const [showHistory, setShowHistory] = useState(false);

  const handleSubmit = () => {
    if (input.trim()) {
      onAdd(input);
      setInput('');
    }
  };

  return (
    <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 shadow-xl relative overflow-hidden group">
      <div className="absolute top-0 left-0 w-1 h-full bg-amber-500"></div>
      <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
        <Heart className="w-5 h-5 text-amber-500" /> Gratitude Journal
      </h2>
      
      <div className="mb-4">
        {logs.map(entry => (
          <div key={entry.id} className="bg-amber-950/20 border border-amber-900/30 p-4 rounded-lg mb-3 flex justify-between items-start animate-in fade-in slide-in-from-bottom-2">
            <p className="text-amber-100 text-lg">{entry.content}</p>
            <button onClick={() => onDelete(entry.id)} className="text-slate-600 hover:text-amber-500 transition-colors p-1">
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        ))}
        {logs.length === 0 && (
          <p className="text-slate-500 text-sm italic mb-4">No gratitude entries for this day yet...</p>
        )}
      </div>

      <div className="flex gap-2 mb-6">
        <input 
          type="text" 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="What are you grateful for today? (SOUL +1)"
          className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-amber-500 outline-none"
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
        />
        <button 
          onClick={handleSubmit}
          className="bg-amber-600 hover:bg-amber-500 text-white px-6 py-2 rounded-lg transition-colors flex items-center shadow-lg shadow-amber-500/20"
        >
          <Send className="w-5 h-5" />
        </button>
      </div>

      <div className="border-t border-slate-800 pt-4">
        <button 
          onClick={() => setShowHistory(!showHistory)}
          className="flex items-center gap-2 text-slate-400 hover:text-amber-400 transition-colors text-sm font-bold mb-4"
        >
          {showHistory ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          History (Last 30)
        </button>

        {showHistory && (
          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
              {history.map(entry => (
                <div key={entry.id} className="text-sm border-b border-slate-800/50 pb-2 mb-2 last:border-0">
                    <div className="text-slate-500 text-xs mb-1 flex justify-between">
                      <span>{entry.date}</span>
                      <button onClick={() => onDelete(entry.id)} className="hover:text-red-400">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                    <p className="text-slate-300">{entry.content}</p>
                </div>
              ))}
              {history.length === 0 && <p className="text-slate-500 text-xs">No history yet.</p>}
          </div>
        )}
      </div>
    </div>
  );
};