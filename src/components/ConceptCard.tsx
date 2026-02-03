'use client';

import { useState } from 'react';
import { Star, Clock, Hash, Download, ChevronDown, ChevronUp, Zap } from 'lucide-react';
import { ViralConcept } from '@/types';
import PromptViewer from './PromptViewer';
import { exportConceptAsTxt } from '@/lib/export';

interface ConceptCardProps {
  concept: ViralConcept;
  onFavorite?: (id: string) => void;
  isFavorite?: boolean;
  index: number;
}

const categoryStyles: Record<string, { bg: string; border: string; badge: string; icon: string }> = {
  news: {
    bg: 'from-red-500/10 to-orange-500/10',
    border: 'border-red-500/30',
    badge: 'bg-red-500/20 text-red-400',
    icon: 'text-red-400',
  },
  absurd: {
    bg: 'from-purple-500/10 to-pink-500/10',
    border: 'border-purple-500/30',
    badge: 'bg-purple-500/20 text-purple-400',
    icon: 'text-purple-400',
  },
  luxury: {
    bg: 'from-amber-500/10 to-yellow-500/10',
    border: 'border-amber-500/30',
    badge: 'bg-amber-500/20 text-amber-400',
    icon: 'text-amber-400',
  },
  emotional: {
    bg: 'from-blue-500/10 to-cyan-500/10',
    border: 'border-blue-500/30',
    badge: 'bg-blue-500/20 text-blue-400',
    icon: 'text-blue-400',
  },
  tech: {
    bg: 'from-emerald-500/10 to-teal-500/10',
    border: 'border-emerald-500/30',
    badge: 'bg-emerald-500/20 text-emerald-400',
    icon: 'text-emerald-400',
  },
  cartoon: {
    bg: 'from-pink-500/10 to-orange-500/10',
    border: 'border-pink-500/30',
    badge: 'bg-pink-500/20 text-pink-400',
    icon: 'text-pink-400',
  },
};

export default function ConceptCard({ concept, onFavorite, isFavorite, index }: ConceptCardProps) {
  const [showScript, setShowScript] = useState(false);
  const style = categoryStyles[concept.category] || categoryStyles.tech;

  return (
    <div
      className={`rounded-2xl border ${style.border} bg-gradient-to-br ${style.bg} backdrop-blur-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500`}
      style={{ animationDelay: `${index * 100}ms` }}
    >
      {/* Header */}
      <div className="p-5 border-b border-zinc-800/50">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wide ${style.badge}`}>
                {concept.category}
              </span>
              <span className="text-xs text-zinc-500">#{index + 1}</span>
            </div>
            <h3 className="text-lg font-bold text-white leading-tight">{concept.title}</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => exportConceptAsTxt(concept)}
              className="p-2 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors"
              title="Download as TXT"
            >
              <Download className="h-4 w-4" />
            </button>
            {onFavorite && (
              <button
                onClick={() => onFavorite(concept.id)}
                className={`p-2 rounded-lg transition-colors ${
                  isFavorite
                    ? 'text-yellow-400 bg-yellow-400/20'
                    : 'text-zinc-500 hover:text-yellow-400 hover:bg-zinc-800'
                }`}
                title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
              >
                <Star className={`h-4 w-4 ${isFavorite ? 'fill-current' : ''}`} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Script Section */}
      <div className="px-5 py-4 border-b border-zinc-800/50">
        <button
          onClick={() => setShowScript(!showScript)}
          className="flex items-center justify-between w-full text-left group"
        >
          <span className="text-sm font-medium text-zinc-300 group-hover:text-white transition-colors">
            Visual Script
          </span>
          {showScript ? (
            <ChevronUp className="h-4 w-4 text-zinc-500" />
          ) : (
            <ChevronDown className="h-4 w-4 text-zinc-500" />
          )}
        </button>
        {showScript && (
          <div className="mt-3 space-y-3">
            {concept.script.map((segment, i) => (
              <div
                key={i}
                className="rounded-lg bg-zinc-900/50 p-3 border border-zinc-800"
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-xs font-mono text-zinc-500">{segment.timeRange}</span>
                  {segment.onScreenText && (
                    <span className="text-xs bg-zinc-800 px-2 py-0.5 rounded text-zinc-400">
                      {segment.onScreenText}
                    </span>
                  )}
                </div>
                <p className="text-sm text-zinc-300">{segment.visual}</p>
                <p className="text-xs text-zinc-500 mt-1">Camera: {segment.camera}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Prompts */}
      <div className="p-5 space-y-4">
        <PromptViewer
          title="Sora Prompt"
          prompt={concept.soraPrompt}
          gradient="bg-gradient-to-r from-violet-600 to-fuchsia-600"
        />
        <PromptViewer
          title="Veo 3 Prompt"
          prompt={concept.veoPrompt}
          gradient="bg-gradient-to-r from-cyan-600 to-blue-600"
        />
      </div>

      {/* Posting Details */}
      <div className="px-5 py-4 border-t border-zinc-800/50 bg-zinc-900/30">
        <p className="text-sm text-zinc-300 mb-3">{concept.caption}</p>
        <div className="flex flex-wrap gap-1.5 mb-3">
          {concept.hashtags.map((tag, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 text-xs text-zinc-400 bg-zinc-800/50 px-2 py-1 rounded"
            >
              <Hash className="h-3 w-3" />
              {tag.replace('#', '')}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-4 text-xs text-zinc-500">
          <span className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            Best time: {concept.postTime.est}
          </span>
        </div>
      </div>

      {/* Why It Works */}
      <div className="px-5 py-4 border-t border-zinc-800/50 bg-gradient-to-r from-zinc-900/50 to-zinc-800/30">
        <div className="flex items-start gap-2">
          <Zap className={`h-4 w-4 mt-0.5 ${style.icon}`} />
          <div>
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">Why it works</span>
            <p className="text-sm text-zinc-300 mt-1">{concept.whyItWorks}</p>
            <p className="text-xs text-zinc-500 mt-2">Trend: {concept.trendSource}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
