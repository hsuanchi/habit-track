import React, { useState } from 'react';
import { Sword, LogIn, UserPlus, AlertCircle } from 'lucide-react';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth } from '../services/firebase';

interface LoginProps {
  onLogin?: (username: string) => void; // Optional now as App.tsx handles state via listener
}

export const Login: React.FC<LoginProps> = () => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState(''); // Only for display name during registration
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (isRegistering) {
        if (!username.trim()) throw new Error("Adventurer name is required");
        
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        // Set the display name for the user
        await updateProfile(userCredential.user, {
          displayName: username
        });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      // Success is handled by the onAuthStateChanged listener in App.tsx
    } catch (err: any) {
      console.error(err);
      let msg = "An error occurred.";
      if (err.code === 'auth/invalid-email') msg = "Invalid email address.";
      if (err.code === 'auth/user-not-found') msg = "No adventurer found with this email.";
      if (err.code === 'auth/wrong-password') msg = "Incorrect password.";
      if (err.code === 'auth/email-already-in-use') msg = "Email already registered.";
      if (err.code === 'auth/weak-password') msg = "Password should be at least 6 characters.";
      setError(msg);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
        
        {/* Decorative Background */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#ff6b35]/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

        <div className="flex flex-col items-center mb-8 relative z-10">
          <div className="w-16 h-16 bg-[#ff6b35] rounded-2xl flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(255,107,53,0.5)] transform rotate-3">
            <Sword className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Level Up Life</h1>
          <p className="text-slate-400 mt-2">
            {isRegistering ? "Begin Your Journey" : "Continue Your Adventure"}
          </p>
        </div>

        {error && (
          <div className="mb-6 bg-red-500/10 border border-red-500/20 text-red-200 px-4 py-3 rounded-lg flex items-center gap-2 text-sm">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
          {isRegistering && (
             <div>
               <label className="block text-sm font-medium text-slate-300 mb-1.5">Adventurer Name</label>
               <input
                 type="text"
                 required={isRegistering}
                 value={username}
                 onChange={(e) => setUsername(e.target.value)}
                 className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white focus:ring-2 focus:ring-[#ff6b35] focus:border-[#ff6b35] transition-all outline-none placeholder:text-slate-600"
                 placeholder="Hero Name"
               />
             </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Email Scroll</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white focus:ring-2 focus:ring-[#ff6b35] focus:border-[#ff6b35] transition-all outline-none placeholder:text-slate-600"
              placeholder="name@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Secret Passphrase</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white focus:ring-2 focus:ring-[#ff6b35] focus:border-[#ff6b35] transition-all outline-none placeholder:text-slate-600"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-[#ff6b35] hover:bg-orange-500 text-white font-bold py-3 px-4 rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#ff6b35]/20 mt-2"
          >
            {isLoading ? (
              <span className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                {isRegistering ? <UserPlus className="w-5 h-5" /> : <LogIn className="w-5 h-5" />}
                {isRegistering ? "Create Account" : "Enter Realm"}
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => {
              setIsRegistering(!isRegistering);
              setError('');
            }}
            className="text-sm text-slate-400 hover:text-[#ff6b35] transition-colors"
          >
            {isRegistering ? "Already have an account? Login" : "New to the realm? Create Account"}
          </button>
        </div>
      </div>
    </div>
  );
};