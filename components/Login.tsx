import React, { useState } from 'react';
import { Sword, LogIn } from 'lucide-react';

interface LoginProps {
  onLogin: (username: string) => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;
    
    setIsLoading(true);
    // Simulate network request
    setTimeout(() => {
      onLogin(username);
      setIsLoading(false);
    }, 800);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-[#ff6b35] rounded-2xl flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(255,107,53,0.5)] transform rotate-3">
            <Sword className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Level Up Life</h1>
          <p className="text-slate-400 mt-2">Gamify Your Life</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Adventurer Name
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white focus:ring-2 focus:ring-[#ff6b35] focus:border-[#ff6b35] transition-all outline-none"
              placeholder="Enter your name..."
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-[#ff6b35] hover:bg-orange-500 text-white font-bold py-3 px-4 rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#ff6b35]/20"
          >
            {isLoading ? (
              <span className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <LogIn className="w-5 h-5" />
                Start Adventure
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-slate-500">
          Enter any name to create or load profile
        </div>
      </div>
    </div>
  );
};