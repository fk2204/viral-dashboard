import { ViralConcept, TrendData } from '@/types';
import { generateSoraPrompt, generateVeoPrompt, generateScript } from './prompts';
import { v4 as uuidv4 } from 'uuid';

// Everyday happenings that people relate to
const DAILY_EVENTS = [
  'morning coffee routine',
  'commute to work',
  'Monday morning alarm',
  'waiting in line',
  'grocery shopping',
  'cooking dinner',
  'doing laundry',
  'working from home',
  'zoom meeting',
  'gym workout',
  'scrolling phone at 3am',
  'finding parking',
  'ordering takeout',
  'weekend cleaning',
  'Netflix binge',
  'payday vs end of month',
  'forgetting headphones',
  'phone battery dying',
  'losing WiFi',
  'microwave meal',
  'running late',
  'hitting snooze',
  'forgetting why you walked into a room',
  'pretending to work',
  'avoiding eye contact in elevator',
  'awkward small talk',
  'stepping on lego',
  'untangling headphones',
  'spilling coffee',
  'finding matching socks',
];

const TITLE_TEMPLATES: Record<string, string[]> = {
  news: [
    'Breaking: {event} Gone Wrong',
    'Scientists Discover Why {event}',
    'New Study Shows {event} Truth',
    '{event} Is Actually Dangerous',
    'What Really Happens During {event}',
    'The Hidden Truth About {event}',
  ],
  absurd: [
    'POV: {event} In Parallel Universe',
    'When {event} Goes Completely Wrong',
    '{event} But Physics Broke',
    'If {event} Was A Horror Movie',
    '{event} In 4th Dimension',
    'What {event} Feels Like Inside',
  ],
  luxury: [
    '{event} But You Are Rich',
    'Billionaire Version Of {event}',
    'When {event} Costs $1 Million',
    '{event} In Your Private Island',
    'POV: Rich People During {event}',
    '{event} But Make It Luxury',
  ],
  emotional: [
    'When {event} Hits Different',
    '{event} And You Start Crying',
    'Why {event} Makes Me Feel',
    'The Last Time I Did {event}',
    '{event} Brought Back Memories',
    'Missing The Simple Days Of {event}',
  ],
  tech: [
    'AI Recreates What {event} Looks Like',
    '{event} In Year 2050',
    'If Robots Did {event}',
    '{event} But Its Cyberpunk',
    'AI Shows The Future Of {event}',
    'What AI Thinks {event} Is',
  ],
  cartoon: [
    '{event} But Its Looney Tunes',
    'Cartoon Physics During {event}',
    'If Disney Made {event}',
    '{event} As Anime Episode',
    'SpongeBob Version Of {event}',
    'Rick And Morty {event} Episode',
  ],
};

const CAPTION_TEMPLATES: Record<string, string[]> = {
  news: [
    'BREAKING: We investigated {event} and what we found will shock you. Scientists are concerned.',
    'New research reveals the TRUTH about {event}. This changes everything we thought we knew.',
    'WARNING: {event} is more dangerous than you think. Here is what the experts say.',
  ],
  absurd: [
    'My brain broke watching {event} in this alternate reality. This shouldnt be possible.',
    'POV: {event} but the simulation is glitching. I cant unsee this.',
    'When {event} goes wrong in the multiverse. Reality is broken fr fr.',
  ],
  luxury: [
    'POV: {event} when money is unlimited. This is how the 1% actually lives.',
    'Normal people: {event}. Meanwhile billionaires... Manifest this energy.',
    '{event} but you are in your Dubai penthouse. Luxury version hits different.',
  ],
  emotional: [
    'Not me getting emotional over {event}. Why does this hit so hard at 2am.',
    '{event} used to be so simple. Now Im crying in the club thinking about it.',
    'The way {event} brings back so many memories. This generation will understand.',
  ],
  tech: [
    'Asked AI to show what {event} will look like in 2050. We are NOT ready.',
    'AI generated {event} and now I cant sleep. The future is here and its terrifying.',
    '{event} reimagined with AI. This is what robots think we do.',
  ],
  cartoon: [
    'If {event} was a cartoon episode. The physics dont make sense but neither does life.',
    '{event} but drawn by Disney animators on crack. This is canon now.',
    'Cartoon version of {event} is TOO accurate. Why is this more real than reality.',
  ],
};

const HASHTAG_SETS: Record<string, string[][]> = {
  news: [
    ['#breaking', '#news', '#viral', '#fyp', '#exposed', '#truth'],
    ['#breakingnews', '#fyp', '#viral', '#shocking', '#mustwatch', '#facts'],
  ],
  absurd: [
    ['#wtf', '#fyp', '#viral', '#funny', '#absurd', '#multiverse'],
    ['#brainrot', '#fyp', '#unhinged', '#viral', '#simulation', '#glitch'],
  ],
  luxury: [
    ['#luxury', '#rich', '#billionaire', '#fyp', '#lifestyle', '#goals'],
    ['#luxurylife', '#wealthy', '#fyp', '#viral', '#manifest', '#richlife'],
  ],
  emotional: [
    ['#emotional', '#fyp', '#feels', '#relatable', '#nostalgia', '#crying'],
    ['#sad', '#fyp', '#deep', '#viral', '#memories', '#2am'],
  ],
  tech: [
    ['#ai', '#future', '#technology', '#fyp', '#2050', '#sora'],
    ['#artificialintelligence', '#tech', '#fyp', '#viral', '#aigenerated', '#scifi'],
  ],
  cartoon: [
    ['#cartoon', '#animation', '#fyp', '#funny', '#disney', '#anime'],
    ['#animated', '#toons', '#fyp', '#viral', '#looneytunes', '#spongebob'],
  ],
};

const WHY_IT_WORKS: Record<string, string[]> = {
  news: [
    'News format about relatable daily events creates instant curiosity and FOMO.',
    'Treating mundane activities as breaking news triggers absurdist humor engagement.',
    'Fake documentary style about common experiences gets massive comment engagement.',
  ],
  absurd: [
    'Everyday activities in surreal settings create shareable wtf moments.',
    'Relatable situations with impossible physics trigger viral pattern interruption.',
    'Common experiences made absurd force viewers to watch multiple times.',
  ],
  luxury: [
    'Luxury versions of mundane activities trigger aspirational fantasy engagement.',
    'Rich vs normal comparisons of daily tasks drive envy-based sharing.',
    'Billionaire POV of common struggles creates addictive contrast content.',
  ],
  emotional: [
    'Nostalgic take on everyday moments creates deep emotional connection.',
    'Romanticizing mundane activities resonates with viewers seeking meaning.',
    'Emotional framing of common experiences drives high comment engagement.',
  ],
  tech: [
    'AI visualization of everyday life creates fascinating future speculation.',
    'Futuristic take on common activities satisfies curiosity about tomorrow.',
    'Tech reimagining of daily routines drives shares and saves.',
  ],
  cartoon: [
    'Cartoon physics applied to real situations creates instant comedy.',
    'Animation style of daily struggles is universally relatable and shareable.',
    'Nostalgic cartoon aesthetic makes mundane content feel magical.',
  ],
};

function getOptimalPostTime(): { utc: string; est: string } {
  const peakHours = [9, 12, 15, 19, 21];
  const hour = peakHours[Math.floor(Math.random() * peakHours.length)];
  const minute = Math.floor(Math.random() * 4) * 15;

  return {
    est: `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')} EST`,
    utc: `${((hour + 5) % 24).toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')} UTC`,
  };
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickRandomUnique<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function generateTitle(category: string, event: string): string {
  const template = pickRandom(TITLE_TEMPLATES[category] || TITLE_TEMPLATES.absurd);
  return template.replace('{event}', event.charAt(0).toUpperCase() + event.slice(1));
}

function generateCaption(category: string, event: string): string {
  const template = pickRandom(CAPTION_TEMPLATES[category] || CAPTION_TEMPLATES.absurd);
  return template.replace(/{event}/g, event);
}

export function generateConcept(event: string, category: string, trend: TrendData): ViralConcept {
  const title = generateTitle(category, event);
  const script = generateScript(category, event);
  const hashtags = pickRandom(HASHTAG_SETS[category] || HASHTAG_SETS.absurd);

  return {
    id: uuidv4(),
    title,
    script,
    soraPrompt: generateSoraPrompt(title, script, category, event),
    veoPrompt: generateVeoPrompt(title, script, category, event),
    caption: generateCaption(category, event),
    hashtags,
    postTime: getOptimalPostTime(),
    whyItWorks: pickRandom(WHY_IT_WORKS[category] || WHY_IT_WORKS.absurd),
    trendSource: `${event} + ${trend.topic}`,
    category: category as ViralConcept['category'],
  };
}

export function generateConceptsForCategory(
  category: string,
  trends: TrendData[],
  count: number = 3
): ViralConcept[] {
  const events = pickRandomUnique(DAILY_EVENTS, count);
  const concepts: ViralConcept[] = [];

  events.forEach((event, index) => {
    const trend = trends[index % trends.length];
    concepts.push(generateConcept(event, category, trend));
  });

  return concepts;
}

export function generateAllConcepts(trends: TrendData[]): Record<string, ViralConcept[]> {
  const categories = ['news', 'absurd', 'luxury', 'emotional', 'tech', 'cartoon'];
  const result: Record<string, ViralConcept[]> = {};

  categories.forEach(category => {
    result[category] = generateConceptsForCategory(category, trends, 3);
  });

  return result;
}

// Legacy function for backward compatibility
export function generateFiveConcepts(trends: TrendData[]): ViralConcept[] {
  const allConcepts = generateAllConcepts(trends);
  return Object.values(allConcepts).flat();
}
