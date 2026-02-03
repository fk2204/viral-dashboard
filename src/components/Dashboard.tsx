'use client';

import { useState } from 'react';
import { Sparkles, Loader2, Newspaper, Zap, Crown, Heart, Cpu, Palette } from 'lucide-react';
import { Generation, TrendData, ViralConcept } from '@/types';
import ConceptCard from './ConceptCard';
import TrendScanner from './TrendScanner';
import ExportButton from './ExportButton';
import { saveGeneration, toggleFavorite } from '@/lib/storage';

const CATEGORY_INFO: Record<string, { label: string; icon: React.ElementType; description: string }> = {
  news: { label: 'Breaking News Style', icon: Newspaper, description: 'Daily moments as urgent news stories' },
  absurd: { label: 'Absurd Reality', icon: Zap, description: 'Everyday life with broken physics' },
  luxury: { label: 'Billionaire Version', icon: Crown, description: 'Mundane activities, unlimited budget' },
  emotional: { label: 'Nostalgic Feels', icon: Heart, description: 'Common moments that hit different' },
  tech: { label: 'Future Tech', icon: Cpu, description: 'Daily life in year 2050' },
  cartoon: { label: 'Cartoon Chaos', icon: Palette, description: 'Looney Tunes meets real life' },
};

const CATEGORY_ORDER = ['news', 'absurd', 'luxury', 'emotional', 'tech', 'cartoon'];

export default function Dashboard() {
  const [generation, setGeneration] = useState<Generation | null>(null);
  const [trends, setTrends] = useState<TrendData[]>([]);
  const [loading, setLoading] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const handleGenerate = async () => {
    setLoading(true);
    setActiveCategory(null);
    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
      });
      const data: Generation = await response.json();
      setGeneration(data);
      setTrends(data.trends);

      await saveGeneration(data);
    } catch (error) {
      console.error('Generation failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFavorite = async (conceptId: string) => {
    if (!generation) return;

    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(conceptId)) {
        next.delete(conceptId);
      } else {
        next.add(conceptId);
      }
      return next;
    });

    const newFavorites = new Set(favorites);
    if (newFavorites.has(conceptId)) {
      newFavorites.delete(conceptId);
    } else {
      newFavorites.add(conceptId);
    }

    if (newFavorites.size > 0 && !generation.isFavorite) {
      await toggleFavorite(generation.id);
    }
  };

  // Group concepts by category
  const groupedConcepts: Record<string, ViralConcept[]> = {};
  if (generation) {
    generation.concepts.forEach(concept => {
      if (!groupedConcepts[concept.category]) {
        groupedConcepts[concept.category] = [];
      }
      groupedConcepts[concept.category].push(concept);
    });
  }

  const filteredCategories = activeCategory
    ? [activeCategory]
    : CATEGORY_ORDER.filter(cat => groupedConcepts[cat]?.length > 0);

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-fuchsia-500/10 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-cyan-500/10 via-transparent to-transparent" />

        <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
              <span className="bg-gradient-to-r from-fuchsia-400 via-cyan-400 to-fuchsia-400 bg-clip-text text-transparent">
                Viral Content Generator
              </span>
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-zinc-400">
              Generate 18 viral TikTok concepts (3 per category) based on everyday moments,
              with Sora & Veo 3 prompts ready to use.
            </p>

            <div className="mt-8 flex items-center justify-center gap-4">
              <button
                onClick={handleGenerate}
                disabled={loading}
                className="group relative flex items-center gap-3 rounded-2xl bg-gradient-to-r from-fuchsia-500 to-cyan-500 px-8 py-4 text-lg font-semibold text-white shadow-lg shadow-fuchsia-500/25 transition-all hover:shadow-fuchsia-500/40 hover:scale-105 disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Generating 18 Ideas...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-5 w-5" />
                    Generate Daily Viral Ideas
                  </>
                )}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-fuchsia-500 to-cyan-500 opacity-0 blur-xl transition-opacity group-hover:opacity-50" />
              </button>

              {generation && (
                <ExportButton generation={generation} />
              )}
            </div>

            {generation && (
              <p className="mt-4 text-sm text-zinc-500">
                Generated {generation.concepts.length} concepts at {new Date(generation.date).toLocaleString()}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Category Filter Tabs */}
      {generation && (
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mb-6">
          <div className="flex flex-wrap gap-2 justify-center">
            <button
              onClick={() => setActiveCategory(null)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                activeCategory === null
                  ? 'bg-white text-zinc-900'
                  : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
              }`}
            >
              All Categories
            </button>
            {CATEGORY_ORDER.map(cat => {
              const info = CATEGORY_INFO[cat];
              const Icon = info.icon;
              const count = groupedConcepts[cat]?.length || 0;
              if (count === 0) return null;
              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    activeCategory === cat
                      ? 'bg-white text-zinc-900'
                      : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {info.label}
                  <span className="text-xs opacity-60">({count})</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Concepts Grid */}
          <div className="lg:col-span-2">
            {loading ? (
              <div className="space-y-8">
                {CATEGORY_ORDER.map((cat) => (
                  <div key={cat} className="space-y-4">
                    <div className="h-8 w-48 bg-zinc-800 rounded animate-pulse" />
                    <div className="grid gap-4">
                      {[1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className="h-64 rounded-2xl border border-zinc-800 bg-zinc-900/50 animate-pulse"
                          style={{ animationDelay: `${i * 100}ms` }}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : generation ? (
              <div className="space-y-10">
                {filteredCategories.map(category => {
                  const info = CATEGORY_INFO[category];
                  const Icon = info.icon;
                  const concepts = groupedConcepts[category] || [];

                  return (
                    <div key={category} className="space-y-4">
                      {/* Category Header */}
                      <div className="flex items-center gap-3 pb-2 border-b border-zinc-800">
                        <div className={`p-2 rounded-xl ${
                          category === 'news' ? 'bg-red-500/20' :
                          category === 'absurd' ? 'bg-purple-500/20' :
                          category === 'luxury' ? 'bg-amber-500/20' :
                          category === 'emotional' ? 'bg-blue-500/20' :
                          category === 'tech' ? 'bg-emerald-500/20' :
                          'bg-pink-500/20'
                        }`}>
                          <Icon className={`h-5 w-5 ${
                            category === 'news' ? 'text-red-400' :
                            category === 'absurd' ? 'text-purple-400' :
                            category === 'luxury' ? 'text-amber-400' :
                            category === 'emotional' ? 'text-blue-400' :
                            category === 'tech' ? 'text-emerald-400' :
                            'text-pink-400'
                          }`} />
                        </div>
                        <div>
                          <h2 className="text-xl font-bold text-white">{info.label}</h2>
                          <p className="text-sm text-zinc-500">{info.description}</p>
                        </div>
                        <span className="ml-auto text-sm text-zinc-500">{concepts.length} ideas</span>
                      </div>

                      {/* Category Concepts */}
                      <div className="grid gap-6">
                        {concepts.map((concept, index) => (
                          <ConceptCard
                            key={concept.id}
                            concept={concept}
                            index={index}
                            onFavorite={handleFavorite}
                            isFavorite={favorites.has(concept.id)}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-12 text-center">
                <Sparkles className="h-16 w-16 text-zinc-700 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">Ready to go viral?</h3>
                <p className="text-zinc-500 max-w-md mx-auto mb-6">
                  Generate 18 unique viral concepts across 6 categories, all based on relatable
                  everyday moments with professional Sora and Veo 3 prompts.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-lg mx-auto">
                  {CATEGORY_ORDER.map(cat => {
                    const info = CATEGORY_INFO[cat];
                    const Icon = info.icon;
                    return (
                      <div key={cat} className="flex items-center gap-2 text-sm text-zinc-400 bg-zinc-800/50 rounded-lg px-3 py-2">
                        <Icon className="h-4 w-4" />
                        <span>{info.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Trends Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              <TrendScanner trends={trends} loading={loading} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
