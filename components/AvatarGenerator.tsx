import React, { useState } from 'react';
import { UserStats, STAT_LABELS } from '../types';
import { generateAvatarImage } from '../services/geminiService';
import { Wand2, Download, RefreshCw, AlertCircle } from 'lucide-react';

interface AvatarGeneratorProps {
  stats: UserStats;
}

const ASPECT_RATIOS = [
  { value: '1:1', label: '1:1 (Square)' },
  { value: '2:3', label: '2:3 (Portrait)' },
  { value: '3:2', label: '3:2 (Landscape)' },
  { value: '3:4', label: '3:4 (Vertical)' },
  { value: '4:3', label: '4:3 (Horizontal)' },
  { value: '9:16', label: '9:16 (Mobile)' },
  { value: '16:9', label: '16:9 (Desktop)' },
  { value: '21:9', label: '21:9 (Ultrawide)' },
];

const IMAGE_SIZES = [
  { value: '1K', label: '1K (Standard)' },
  { value: '2K', label: '2K (HD)' },
  { value: '4K', label: '4K (Ultra HD)' },
];

export const AvatarGenerator: React.FC<AvatarGeneratorProps> = ({ stats }) => {
  const [loading, setLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const [customPrompt, setCustomPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [imageSize, setImageSize] = useState('1K');

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);

    // Construct a prompt based on stats if custom prompt is empty, or combine them
    const statsDesc = Object.entries(stats.attributes)
      .map(([key, val]) => `${STAT_LABELS[key as keyof typeof STAT_LABELS]}: ${val}`)
      .join(', ');

    const basePrompt = customPrompt.trim() 
      ? customPrompt 
      : `An epic RPG character portrait, digital painting style, high quality. Character Level ${stats.level}. Attributes: ${statsDesc}. Looks powerful and detailed.`;
    
    const finalPrompt = `Create an image of: ${basePrompt}`;

    try {
      const result = await generateAvatarImage({
        prompt: finalPrompt,
        aspectRatio,
        imageSize
      });
      setImageUrl(result);
    } catch (err) {
      setError("Failed to generate image. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800 shadow-xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-[#ff6b35]/20 rounded-lg">
          <Wand2 className="w-6 h-6 text-[#ff6b35]" />
        </div>
        <h2 className="text-xl font-bold text-white">Avatar Generator</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Controls */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">
              Appearance Description (Prompt)
            </label>
            <textarea
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm text-slate-200 focus:ring-2 focus:ring-[#ff6b35] focus:border-transparent outline-none resize-none h-24"
              placeholder="e.g. A cyberpunk knight in glowing armor holding a blue laser sword..."
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">
                Aspect Ratio
              </label>
              <select
                value={aspectRatio}
                onChange={(e) => setAspectRatio(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm text-slate-200 outline-none focus:ring-2 focus:ring-[#ff6b35]"
              >
                {ASPECT_RATIOS.map((ratio) => (
                  <option key={ratio.value} value={ratio.value}>
                    {ratio.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">
                Resolution
              </label>
              <select
                value={imageSize}
                onChange={(e) => setImageSize(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm text-slate-200 outline-none focus:ring-2 focus:ring-[#ff6b35]"
              >
                {IMAGE_SIZES.map((size) => (
                  <option key={size.value} value={size.value}>
                    {size.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={loading}
            className={`w-full py-3 px-4 rounded-lg font-bold flex items-center justify-center gap-2 transition-all ${
              loading
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-[#ff6b35] to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white shadow-lg hover:shadow-[#ff6b35]/25'
            }`}
          >
            {loading ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Wand2 className="w-5 h-5" />
                Generate
              </>
            )}
          </button>
          
          {error && (
            <div className="flex items-center gap-2 text-red-400 text-sm bg-red-900/20 p-3 rounded-lg">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}
        </div>

        {/* Preview */}
        <div className="flex flex-col items-center justify-center bg-slate-950 rounded-xl border border-slate-800 min-h-[300px] relative overflow-hidden group">
          {imageUrl ? (
            <>
              <img 
                src={imageUrl} 
                alt="Generated Avatar" 
                className="w-full h-full object-contain max-h-[400px]"
              />
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <a 
                  href={imageUrl} 
                  download="rpg-avatar.png"
                  className="bg-white text-slate-900 px-4 py-2 rounded-full font-bold flex items-center gap-2 hover:scale-105 transition-transform"
                >
                  <Download className="w-4 h-4" />
                  Download
                </a>
              </div>
            </>
          ) : (
            <div className="text-center text-slate-500">
              <div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-3 border border-slate-800">
                <Wand2 className="w-8 h-8 opacity-20" />
              </div>
              <p>Preview Area</p>
              <p className="text-xs mt-1">Your avatar will appear here</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};