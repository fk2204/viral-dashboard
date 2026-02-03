'use client';

import { useState, useEffect } from 'react';
import { Search, Star, Trash2, Calendar, Clock, Filter } from 'lucide-react';
import { Generation } from '@/types';
import { getGenerations, deleteGeneration, toggleFavorite, searchGenerations } from '@/lib/storage';
import ConceptCard from '@/components/ConceptCard';

export default function HistoryPage() {
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterFavorites, setFilterFavorites] = useState(false);
  const [selectedGeneration, setSelectedGeneration] = useState<Generation | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadGenerations();
  }, []);

  const loadGenerations = async () => {
    setLoading(true);
    try {
      const data = await getGenerations();
      setGenerations(data);
    } catch (error) {
      console.error('Failed to load generations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      loadGenerations();
      return;
    }
    const results = await searchGenerations(searchQuery);
    setGenerations(results);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this generation?')) {
      await deleteGeneration(id);
      setGenerations(prev => prev.filter(g => g.id !== id));
      if (selectedGeneration?.id === id) {
        setSelectedGeneration(null);
      }
    }
  };

  const handleToggleFavorite = async (id: string) => {
    await toggleFavorite(id);
    setGenerations(prev =>
      prev.map(g => (g.id === id ? { ...g, isFavorite: !g.isFavorite } : g))
    );
  };

  const filteredGenerations = filterFavorites
    ? generations.filter(g => g.isFavorite)
    : generations;

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Generation History</h1>
          <p className="text-zinc-400">View and manage your past viral concept generations</p>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-500" />
            <input
              type="text"
              placeholder="Search concepts, hashtags, trends..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900/50 pl-12 pr-4 py-3 text-white placeholder-zinc-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            />
          </div>
          <button
            onClick={handleSearch}
            className="rounded-xl bg-cyan-500 px-6 py-3 text-sm font-medium text-white hover:bg-cyan-600 transition-colors"
          >
            Search
          </button>
          <button
            onClick={() => setFilterFavorites(!filterFavorites)}
            className={`flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-medium transition-colors ${
              filterFavorites
                ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50'
                : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
            }`}
          >
            <Star className={`h-4 w-4 ${filterFavorites ? 'fill-current' : ''}`} />
            Favorites
          </button>
        </div>

        {/* Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Generations List */}
          <div className="lg:col-span-1 space-y-4">
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-32 rounded-xl bg-zinc-800/50 animate-pulse" />
                ))}
              </div>
            ) : filteredGenerations.length === 0 ? (
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-8 text-center">
                <Calendar className="h-12 w-12 text-zinc-600 mx-auto mb-3" />
                <p className="text-zinc-500">
                  {filterFavorites
                    ? 'No favorite generations yet'
                    : 'No generations yet. Go generate some viral concepts!'}
                </p>
              </div>
            ) : (
              filteredGenerations.map(gen => (
                <button
                  key={gen.id}
                  onClick={() => setSelectedGeneration(gen)}
                  className={`w-full rounded-xl border p-4 text-left transition-all ${
                    selectedGeneration?.id === gen.id
                      ? 'border-cyan-500 bg-cyan-500/10'
                      : 'border-zinc-800 bg-zinc-900/50 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-zinc-500" />
                      <span className="text-sm text-zinc-400">
                        {new Date(gen.date).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      {gen.isFavorite && (
                        <Star className="h-4 w-4 text-yellow-400 fill-current" />
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-white font-medium mb-1">
                    {gen.concepts.length} concepts generated
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {gen.concepts.slice(0, 3).map(c => (
                      <span
                        key={c.id}
                        className="text-xs bg-zinc-800 px-2 py-0.5 rounded text-zinc-400"
                      >
                        {c.category}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-xs text-zinc-500 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(gen.date).toLocaleTimeString()}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleFavorite(gen.id);
                        }}
                        className="p-1.5 rounded-lg text-zinc-500 hover:text-yellow-400 hover:bg-zinc-800 transition-colors"
                      >
                        <Star className={`h-4 w-4 ${gen.isFavorite ? 'fill-current text-yellow-400' : ''}`} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(gen.id);
                        }}
                        className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-zinc-800 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Selected Generation Details */}
          <div className="lg:col-span-2">
            {selectedGeneration ? (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-white">
                      Generation from {new Date(selectedGeneration.date).toLocaleDateString()}
                    </h2>
                    <p className="text-sm text-zinc-500">
                      {selectedGeneration.concepts.length} concepts • {selectedGeneration.trends.length} trends analyzed
                    </p>
                  </div>
                </div>
                <div className="grid gap-6">
                  {selectedGeneration.concepts.map((concept, index) => (
                    <ConceptCard
                      key={concept.id}
                      concept={concept}
                      index={index}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-12 text-center">
                <Filter className="h-12 w-12 text-zinc-600 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-white mb-2">Select a generation</h3>
                <p className="text-zinc-500">
                  Click on a generation from the list to view its concepts
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
