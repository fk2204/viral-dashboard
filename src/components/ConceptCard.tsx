'use client';

import { useState } from 'react';
import { Star, Clock, Hash, Download, ChevronDown, ChevronUp, Zap, BarChart3, X } from 'lucide-react';
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
  gaming: {
    bg: 'from-violet-500/10 to-purple-500/10',
    border: 'border-violet-500/30',
    badge: 'bg-violet-500/20 text-violet-400',
    icon: 'text-violet-400',
  },
  fitness: {
    bg: 'from-orange-500/10 to-red-500/10',
    border: 'border-orange-500/30',
    badge: 'bg-orange-500/20 text-orange-400',
    icon: 'text-orange-400',
  },
  food: {
    bg: 'from-yellow-500/10 to-orange-500/10',
    border: 'border-yellow-500/30',
    badge: 'bg-yellow-500/20 text-yellow-400',
    icon: 'text-yellow-400',
  },
  finance: {
    bg: 'from-green-500/10 to-emerald-500/10',
    border: 'border-green-500/30',
    badge: 'bg-green-500/20 text-green-400',
    icon: 'text-green-400',
  },
  music: {
    bg: 'from-indigo-500/10 to-blue-500/10',
    border: 'border-indigo-500/30',
    badge: 'bg-indigo-500/20 text-indigo-400',
    icon: 'text-indigo-400',
  },
  relationships: {
    bg: 'from-rose-500/10 to-pink-500/10',
    border: 'border-rose-500/30',
    badge: 'bg-rose-500/20 text-rose-400',
    icon: 'text-rose-400',
  },
};

export default function ConceptCard({ concept, onFavorite, isFavorite, index }: ConceptCardProps) {
  const [showScript, setShowScript] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackPlatform, setFeedbackPlatform] = useState<'tiktok' | 'youtube-shorts'>('tiktok');
  const [feedbackViews, setFeedbackViews] = useState('');
  const [feedbackLikes, setFeedbackLikes] = useState('');
  const [feedbackShares, setFeedbackShares] = useState('');
  const [feedbackComments, setFeedbackComments] = useState('');
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [feedbackResult, setFeedbackResult] = useState<{ success: boolean; message: string } | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);
  const style = categoryStyles[concept.category] || categoryStyles.tech;

  const handleFeedbackSubmit = async () => {
    setFeedbackSubmitting(true);
    setFeedbackResult(null);
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conceptId: concept.id,
          conceptTitle: selectedVariant
            ? concept.variants?.find(v => v.id === selectedVariant)?.title || concept.title
            : concept.title,
          category: concept.category,
          platform: feedbackPlatform,
          variantId: selectedVariant || undefined,
          metrics: {
            views: parseInt(feedbackViews) || 0,
            likes: parseInt(feedbackLikes) || 0,
            shares: parseInt(feedbackShares) || 0,
            comments: parseInt(feedbackComments) || 0,
          },
        }),
      });
      const data = await res.json();
      if (data.success) {
        setFeedbackResult({ success: true, message: data.message });
        setTimeout(() => {
          setShowFeedback(false);
          setFeedbackResult(null);
          setFeedbackViews('');
          setFeedbackLikes('');
          setFeedbackShares('');
          setFeedbackComments('');
        }, 2000);
      } else {
        setFeedbackResult({ success: false, message: data.error || 'Failed to submit' });
      }
    } catch {
      setFeedbackResult({ success: false, message: 'Network error' });
    } finally {
      setFeedbackSubmitting(false);
    }
  };

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
              onClick={() => setShowFeedback(true)}
              className="p-2 rounded-lg text-zinc-500 hover:text-emerald-400 hover:bg-zinc-800 transition-colors"
              title="Report Performance"
            >
              <BarChart3 className="h-4 w-4" />
            </button>
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

      {/* A/B Variants */}
      {concept.variants && concept.variants.length > 0 && (
        <div className="px-5 py-4 border-t border-zinc-800/50">
          <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">A/B Test Variants</span>
          <div className="mt-2 space-y-2">
            {concept.variants.map((variant) => (
              <button
                key={variant.id}
                onClick={() => setSelectedVariant(selectedVariant === variant.id ? null : variant.id)}
                className={`w-full text-left rounded-lg p-3 border transition-all ${
                  selectedVariant === variant.id
                    ? 'border-emerald-500/50 bg-emerald-500/10'
                    : 'border-zinc-800 bg-zinc-900/50 hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                      variant.label === 'A' ? 'bg-blue-500/20 text-blue-400' :
                      variant.label === 'B' ? 'bg-purple-500/20 text-purple-400' :
                      'bg-amber-500/20 text-amber-400'
                    }`}>
                      {variant.label}
                    </span>
                    <span className="text-xs text-zinc-500">{variant.hookSource}</span>
                  </div>
                  {selectedVariant === variant.id && (
                    <span className="text-xs text-emerald-400 font-medium">Selected</span>
                  )}
                </div>
                <p className="text-sm text-zinc-300 leading-snug">{variant.title}</p>
                {selectedVariant === variant.id && (
                  <p className="text-xs text-zinc-500 mt-1.5">{variant.caption}</p>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Platform Virality Scores */}
      {concept.platformVirality && (
        <div className="px-5 py-4 border-t border-zinc-800/50">
          <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">Platform Virality</span>
          <div className="mt-2 space-y-2">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-zinc-400">TikTok</span>
                <span className="text-zinc-300 font-medium">{concept.platformVirality.tiktok.score}% — {concept.platformVirality.tiktok.label}</span>
              </div>
              <div className="w-full bg-zinc-800 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-fuchsia-500 to-pink-500 h-2 rounded-full transition-all"
                  style={{ width: `${concept.platformVirality.tiktok.score}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-zinc-400">YouTube Shorts</span>
                <span className="text-zinc-300 font-medium">{concept.platformVirality.youtubeShorts.score}% — {concept.platformVirality.youtubeShorts.label}</span>
              </div>
              <div className="w-full bg-zinc-800 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-red-500 to-orange-500 h-2 rounded-full transition-all"
                  style={{ width: `${concept.platformVirality.youtubeShorts.score}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Monetization Estimate */}
      {concept.monetization && (
        <div className="px-5 py-4 border-t border-zinc-800/50 bg-gradient-to-r from-green-900/20 to-emerald-900/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">Monetization</span>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
              concept.monetization.sponsorPotential === 'premium' ? 'bg-yellow-500/20 text-yellow-400' :
              concept.monetization.sponsorPotential === 'high' ? 'bg-green-500/20 text-green-400' :
              concept.monetization.sponsorPotential === 'medium' ? 'bg-blue-500/20 text-blue-400' :
              'bg-zinc-500/20 text-zinc-400'
            }`}>
              {concept.monetization.sponsorPotential.toUpperCase()} SPONSOR
            </span>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <div className="flex-1">
              <div className="flex justify-between mb-1">
                <span className="text-zinc-500">Revenue Score</span>
                <span className="text-zinc-300 font-medium">{concept.monetization.score}/100</span>
              </div>
              <div className="w-full bg-zinc-800 rounded-full h-1.5">
                <div
                  className="bg-gradient-to-r from-green-500 to-emerald-400 h-1.5 rounded-full"
                  style={{ width: `${concept.monetization.score}%` }}
                />
              </div>
            </div>
          </div>
          <div className="flex gap-4 mt-2 text-xs text-zinc-400">
            <span>TikTok RPM: ${concept.monetization.estimatedRPM.tiktok}</span>
            <span>Shorts RPM: ${concept.monetization.estimatedRPM.youtubeShorts}</span>
          </div>
          <p className="text-xs text-zinc-500 mt-2">{concept.monetization.bestStrategy}</p>
        </div>
      )}

      {showFeedback && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowFeedback(false)}>
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">Report Performance</h3>
              <button onClick={() => setShowFeedback(false)} className="p-1 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-sm text-zinc-400 mb-4 truncate">{concept.title}</p>

            {/* Platform selector */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setFeedbackPlatform('tiktok')}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                  feedbackPlatform === 'tiktok'
                    ? 'bg-fuchsia-500/20 text-fuchsia-400 border border-fuchsia-500/50'
                    : 'bg-zinc-800 text-zinc-400 border border-zinc-700 hover:border-zinc-600'
                }`}
              >
                TikTok
              </button>
              <button
                onClick={() => setFeedbackPlatform('youtube-shorts')}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                  feedbackPlatform === 'youtube-shorts'
                    ? 'bg-red-500/20 text-red-400 border border-red-500/50'
                    : 'bg-zinc-800 text-zinc-400 border border-zinc-700 hover:border-zinc-600'
                }`}
              >
                YouTube Shorts
              </button>
            </div>

            {/* Metrics inputs */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Views</label>
                <input
                  type="number"
                  min="0"
                  value={feedbackViews}
                  onChange={e => setFeedbackViews(e.target.value)}
                  placeholder="0"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Likes</label>
                <input
                  type="number"
                  min="0"
                  value={feedbackLikes}
                  onChange={e => setFeedbackLikes(e.target.value)}
                  placeholder="0"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Shares</label>
                <input
                  type="number"
                  min="0"
                  value={feedbackShares}
                  onChange={e => setFeedbackShares(e.target.value)}
                  placeholder="0"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Comments</label>
                <input
                  type="number"
                  min="0"
                  value={feedbackComments}
                  onChange={e => setFeedbackComments(e.target.value)}
                  placeholder="0"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
                />
              </div>
            </div>

            {/* Result message */}
            {feedbackResult && (
              <div className={`mb-3 p-2 rounded-lg text-sm ${
                feedbackResult.success
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'bg-red-500/20 text-red-400'
              }`}>
                {feedbackResult.message}
              </div>
            )}

            {/* Submit */}
            <button
              onClick={handleFeedbackSubmit}
              disabled={feedbackSubmitting || !feedbackViews}
              className="w-full py-2.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-medium text-sm hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {feedbackSubmitting ? 'Submitting...' : 'Submit Performance Data'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
