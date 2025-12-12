import React, { useState, useEffect } from 'react';
import { Key, ExternalLink } from 'lucide-react';

interface ApiKeySelectorProps {
  onKeySelected: () => void;
}

export const ApiKeySelector: React.FC<ApiKeySelectorProps> = ({ onKeySelected }) => {
  const [hasKey, setHasKey] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  const checkKey = async () => {
    const aiStudio = (window as any).aistudio;
    
    if (aiStudio?.hasSelectedApiKey) {
      const selected = await aiStudio.hasSelectedApiKey();
      setHasKey(selected);
      if (selected) {
        onKeySelected();
      }
    } else {
      if (process.env.API_KEY) {
        setHasKey(true);
        onKeySelected();
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    checkKey();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelectKey = async () => {
    const aiStudio = (window as any).aistudio;
    if (aiStudio?.openSelectKey) {
      try {
        await aiStudio.openSelectKey();
        await checkKey();
        onKeySelected(); 
      } catch (error) {
        console.error("Key selection failed", error);
        setHasKey(false);
      }
    } else {
      alert("API Key selection helper not available.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-[#ff6b35]">
        <div className="animate-pulse flex flex-col items-center">
          <Key className="w-12 h-12 mb-4" />
          <p>Checking Access...</p>
        </div>
      </div>
    );
  }

  if (hasKey) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl text-center">
        <div className="w-16 h-16 bg-[#ff6b35]/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <Key className="w-8 h-8 text-[#ff6b35]" />
        </div>
        
        <h1 className="text-2xl font-bold text-white mb-2">API Key Required</h1>
        <p className="text-slate-400 mb-8">
          To use the advanced image generation features (Gemini 3 Pro Image) in "Level Up Life", you need to connect your own paid Google Cloud Project API Key.
        </p>

        <button
          onClick={handleSelectKey}
          className="w-full py-3 px-4 bg-[#ff6b35] hover:bg-orange-500 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 mb-4"
        >
          <Key className="w-5 h-5" />
          Select API Key
        </button>

        <a 
          href="https://ai.google.dev/gemini-api/docs/billing" 
          target="_blank" 
          rel="noopener noreferrer"
          className="inline-flex items-center text-sm text-slate-500 hover:text-[#ff6b35] transition-colors"
        >
          Billing Information <ExternalLink className="w-3 h-3 ml-1" />
        </a>
      </div>
    </div>
  );
};