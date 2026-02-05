import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { getPerformanceHistory } from './performance-tracker';
import { extractPatterns } from './pattern-extractor';

// ============================================================
// TEMPLATE EVOLVER — Genetic algorithm for title/caption templates
// ============================================================

export interface TemplateGenome {
  id: string;
  template: string;          // e.g., "POV: {topic} But Everything Changed"
  type: 'title' | 'caption';
  category: string;
  fitness: number;            // 0-100, derived from engagement data
  generation: number;         // which evolution generation
  parentIds: string[];        // IDs of parent templates
  mutations: string[];        // what mutations were applied
  createdAt: string;
}

export interface EvolutionResult {
  evolved: TemplateGenome[];
  survived: TemplateGenome[];
  eliminated: TemplateGenome[];
  generation: number;
  timestamp: string;
}

interface EvolutionState {
  population: TemplateGenome[];
  generation: number;
  lastEvolved: string;
}

const EVOLUTION_PATH = path.join(process.cwd(), 'src', 'lib', 'learning', 'evolution-state.json');

// ============================================================
// SEED STRUCTURAL COMPONENTS — building blocks for templates
// ============================================================
const PREFIXES = [
  'POV:', 'BREAKING:', 'When', 'Why', 'How', 'If', 'The',
  'Nobody Expected', 'The Truth About', 'Wait For It:',
  'Pro Tip:', 'Hot Take:', 'Unpopular Opinion:',
  'Day 1 of', 'Rating', 'Trying', 'Exposing',
];

const CONNECTORS = [
  'But', 'And', 'That', 'After', 'Before', 'Without',
  'While', 'During', 'Because', 'Until', 'Since',
  'Gone Wrong', 'Gone Right', 'Hits Different',
  'Changed Everything', 'Broke The Internet',
  'Nobody Saw Coming', 'Just Dropped',
  'Is Actually Insane', 'Goes Too Far',
];

const SUFFIXES = [
  'In 2026', 'Challenge', 'Edition', 'Explained',
  'No Cap', 'Fr Fr', 'And Im Not OK',
  'Watch Till End', 'Part 1', 'You Wont Believe This',
  'The Honest Truth', 'A Thread', 'Storytime',
  'Hits Different At 3AM', 'On God',
];

const CAPTION_STARTERS = [
  'the way', 'not me', 'pov:', 'when', 'if you know you know.',
  'this changes everything.', 'nobody is talking about',
  'subscribe for more', 'drop a comment if',
  'wait for it.', 'hear me out.',
];

const CAPTION_ENDERS = [
  'no cap.', 'fr fr.', 'and thats on period.',
  'watch till end.', 'its giving everything.',
  'this is not a drill.', 'save this for later.',
  'link in bio.', 'part 2?', 'thoughts?',
];

// ============================================================
// STATE MANAGEMENT
// ============================================================
function loadEvolutionState(): EvolutionState {
  try {
    const raw = fs.readFileSync(EVOLUTION_PATH, 'utf-8');
    return JSON.parse(raw) as EvolutionState;
  } catch {
    return {
      population: [],
      generation: 0,
      lastEvolved: '',
    };
  }
}

function saveEvolutionState(state: EvolutionState): void {
  const dir = path.dirname(EVOLUTION_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(EVOLUTION_PATH, JSON.stringify(state, null, 2), 'utf-8');
}

// ============================================================
// GENETIC OPERATIONS
// ============================================================

/**
 * Selection — pick the fittest templates (tournament selection)
 */
function tournamentSelect(population: TemplateGenome[], tournamentSize: number = 3): TemplateGenome {
  const tournament: TemplateGenome[] = [];
  for (let i = 0; i < tournamentSize; i++) {
    tournament.push(population[Math.floor(Math.random() * population.length)]);
  }
  return tournament.sort((a, b) => b.fitness - a.fitness)[0];
}

/**
 * Crossover — combine elements from two parent templates
 */
function crossover(parent1: TemplateGenome, parent2: TemplateGenome): string {
  const words1 = parent1.template.split(/\s+/);
  const words2 = parent2.template.split(/\s+/);

  // Single-point crossover
  const crossPoint1 = Math.floor(Math.random() * words1.length);
  const crossPoint2 = Math.floor(Math.random() * words2.length);

  const child = [
    ...words1.slice(0, crossPoint1),
    ...words2.slice(crossPoint2),
  ];

  // Ensure {topic} placeholder exists
  let result = child.join(' ');
  if (!result.includes('{topic}')) {
    // Insert {topic} at a natural position
    const insertPos = Math.floor(child.length / 2);
    child.splice(insertPos, 0, '{topic}');
    result = child.join(' ');
  }

  return result;
}

/**
 * Mutation — random modifications to a template
 */
function mutate(template: string, mutationRate: number = 0.3): { result: string; mutations: string[] } {
  const mutations: string[] = [];
  let result = template;

  // Mutation 1: Swap prefix (20% chance)
  if (Math.random() < mutationRate * 0.7) {
    const newPrefix = PREFIXES[Math.floor(Math.random() * PREFIXES.length)];
    const words = result.split(/\s+/);
    // Check if first word(s) look like a prefix
    if (words[0].endsWith(':') || ['When', 'Why', 'How', 'If', 'The'].includes(words[0])) {
      words[0] = newPrefix;
      result = words.join(' ');
      mutations.push(`prefix_swap:${newPrefix}`);
    }
  }

  // Mutation 2: Add/swap connector (15% chance)
  if (Math.random() < mutationRate * 0.5) {
    const connector = CONNECTORS[Math.floor(Math.random() * CONNECTORS.length)];
    if (result.includes('{topic}')) {
      // Add connector after {topic}
      result = result.replace('{topic}', `{topic} ${connector}`);
      mutations.push(`connector_add:${connector}`);
    }
  }

  // Mutation 3: Add/swap suffix (15% chance)
  if (Math.random() < mutationRate * 0.5) {
    const suffix = SUFFIXES[Math.floor(Math.random() * SUFFIXES.length)];
    // Replace existing suffix or append
    const words = result.split(/\s+/);
    if (words.length > 8) {
      // Trim and add new suffix
      result = words.slice(0, 6).join(' ') + ' ' + suffix;
    } else {
      result = result + ' ' + suffix;
    }
    mutations.push(`suffix:${suffix}`);
  }

  // Mutation 4: Capitalize for emphasis (10% chance)
  if (Math.random() < mutationRate * 0.3) {
    const words = result.split(/\s+/);
    const idx = Math.floor(Math.random() * words.length);
    if (words[idx] !== '{topic}' && words[idx].length > 2) {
      words[idx] = words[idx].toUpperCase();
      result = words.join(' ');
      mutations.push('emphasis_caps');
    }
  }

  // Ensure {topic} placeholder still exists
  if (!result.includes('{topic}')) {
    result = '{topic} ' + result;
    mutations.push('topic_prepend');
  }

  return { result, mutations };
}

/**
 * Generate a random template from building blocks
 */
function generateRandom(type: 'title' | 'caption', category: string): string {
  if (type === 'caption') {
    const starter = CAPTION_STARTERS[Math.floor(Math.random() * CAPTION_STARTERS.length)];
    const ender = CAPTION_ENDERS[Math.floor(Math.random() * CAPTION_ENDERS.length)];
    return `${starter} {topic} ${ender}`;
  }

  const prefix = PREFIXES[Math.floor(Math.random() * PREFIXES.length)];
  const connector = CONNECTORS[Math.floor(Math.random() * CONNECTORS.length)];

  if (Math.random() > 0.5) {
    return `${prefix} {topic} ${connector}`;
  }
  const suffix = SUFFIXES[Math.floor(Math.random() * SUFFIXES.length)];
  return `${prefix} {topic} ${suffix}`;
}

/**
 * Calculate fitness from performance data
 */
function calculateFitness(template: string, entries: { title: string; engagement: number }[]): number {
  const templateLower = template.toLowerCase().replace(/\{topic\}/g, '');
  const templateWords = templateLower.split(/\s+/).filter(w => w.length > 2);

  if (templateWords.length === 0) return 30; // Base fitness for new templates

  let totalScore = 0;
  let matches = 0;

  entries.forEach(entry => {
    const titleLower = entry.title.toLowerCase();
    const matchCount = templateWords.filter(w => titleLower.includes(w)).length;
    const matchRatio = matchCount / templateWords.length;

    if (matchRatio > 0.3) {
      totalScore += entry.engagement;
      matches++;
    }
  });

  if (matches === 0) return 30; // Base fitness for unmatched templates
  const avgEngagement = totalScore / matches;

  // Normalize to 0-100 fitness score
  // Engagement rates: <1% = poor, 2-5% = good, >5% = excellent
  return Math.min(100, Math.round(avgEngagement * 10));
}

// ============================================================
// MAIN EVOLUTION FUNCTION
// ============================================================

/**
 * Run one generation of evolution
 */
export function evolveTemplates(options?: {
  populationSize?: number;
  mutationRate?: number;
  eliteRatio?: number;
  newRandomRatio?: number;
}): EvolutionResult {
  const {
    populationSize = 50,
    mutationRate = 0.3,
    eliteRatio = 0.2,
    newRandomRatio = 0.1,
  } = options || {};

  const state = loadEvolutionState();
  const history = getPerformanceHistory();

  // Build fitness data from performance entries
  const fitnessData = history.entries.map(e => ({
    title: e.conceptTitle,
    engagement: e.engagementRate,
    category: e.category,
  }));

  // Initialize population if empty
  if (state.population.length === 0) {
    const categories = ['news', 'absurd', 'luxury', 'emotional', 'tech', 'cartoon', 'gaming', 'fitness', 'food', 'finance', 'music', 'relationships'];

    categories.forEach(cat => {
      // Generate seed templates per category
      for (let i = 0; i < 4; i++) {
        state.population.push({
          id: uuidv4(),
          template: generateRandom('title', cat),
          type: 'title',
          category: cat,
          fitness: 30,
          generation: 0,
          parentIds: [],
          mutations: ['seed'],
          createdAt: new Date().toISOString(),
        });
      }
    });
  }

  // Recalculate fitness for all genomes
  state.population.forEach(genome => {
    const categoryData = fitnessData.filter(d => d.category === genome.category);
    genome.fitness = calculateFitness(genome.template, categoryData);
  });

  // Sort by fitness
  state.population.sort((a, b) => b.fitness - a.fitness);

  const eliteCount = Math.floor(populationSize * eliteRatio);
  const newRandomCount = Math.floor(populationSize * newRandomRatio);
  const childCount = populationSize - eliteCount - newRandomCount;

  // Elite survivors (top performers pass through unchanged)
  const survived = state.population.slice(0, eliteCount);

  // Generate children via crossover + mutation
  const evolved: TemplateGenome[] = [];
  for (let i = 0; i < childCount; i++) {
    const parent1 = tournamentSelect(state.population);
    const parent2 = tournamentSelect(state.population);

    const childTemplate = crossover(parent1, parent2);
    const { result: mutatedTemplate, mutations } = mutate(childTemplate, mutationRate);

    evolved.push({
      id: uuidv4(),
      template: mutatedTemplate,
      type: parent1.type,
      category: Math.random() > 0.5 ? parent1.category : parent2.category,
      fitness: 30, // New children start at base fitness
      generation: state.generation + 1,
      parentIds: [parent1.id, parent2.id],
      mutations,
      createdAt: new Date().toISOString(),
    });
  }

  // Inject fresh random templates (genetic diversity)
  const categories = ['news', 'absurd', 'luxury', 'emotional', 'tech', 'cartoon', 'gaming', 'fitness', 'food', 'finance', 'music', 'relationships'];
  for (let i = 0; i < newRandomCount; i++) {
    const cat = categories[Math.floor(Math.random() * categories.length)];
    evolved.push({
      id: uuidv4(),
      template: generateRandom(Math.random() > 0.7 ? 'caption' : 'title', cat),
      type: Math.random() > 0.7 ? 'caption' : 'title',
      category: cat,
      fitness: 30,
      generation: state.generation + 1,
      parentIds: [],
      mutations: ['random_injection'],
      createdAt: new Date().toISOString(),
    });
  }

  // Record eliminated
  const eliminated = state.population.slice(eliteCount);

  // Update state
  state.population = [...survived, ...evolved];
  state.generation++;
  state.lastEvolved = new Date().toISOString();

  saveEvolutionState(state);

  return {
    evolved,
    survived,
    eliminated,
    generation: state.generation,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Get best evolved templates for a category
 */
export function getEvolvedTemplates(category: string, type: 'title' | 'caption' = 'title', limit: number = 5): string[] {
  const state = loadEvolutionState();
  return state.population
    .filter(g => g.category === category && g.type === type)
    .sort((a, b) => b.fitness - a.fitness)
    .slice(0, limit)
    .map(g => g.template);
}

/**
 * Get evolution stats for display
 */
export function getEvolutionStats(): {
  generation: number;
  populationSize: number;
  avgFitness: number;
  topFitness: number;
  lastEvolved: string;
  categoryCoverage: Record<string, number>;
} {
  const state = loadEvolutionState();
  const pop = state.population;

  const categoryCoverage: Record<string, number> = {};
  pop.forEach(g => {
    categoryCoverage[g.category] = (categoryCoverage[g.category] || 0) + 1;
  });

  return {
    generation: state.generation,
    populationSize: pop.length,
    avgFitness: pop.length > 0 ? Math.round(pop.reduce((s, g) => s + g.fitness, 0) / pop.length) : 0,
    topFitness: pop.length > 0 ? pop.sort((a, b) => b.fitness - a.fitness)[0].fitness : 0,
    lastEvolved: state.lastEvolved,
    categoryCoverage,
  };
}
