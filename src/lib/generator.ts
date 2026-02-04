import { ViralConcept, TrendData } from '@/types';
import { generateSoraPrompt, generateVeoPrompt, generateScript } from './prompts';
import { v4 as uuidv4 } from 'uuid';

// Everyday happenings that people relate to - rich, specific, emotionally resonant moments
const DAILY_EVENTS = [
  // Morning rituals & wake-up struggles
  'that first sip of morning coffee when nobody else is awake',
  'lying in bed knowing the alarm is about to go off',
  'convincing yourself 5 more minutes wont hurt',
  'the walk from bed to bathroom at 6am in winter',
  'realizing you overslept on an important day',
  'making breakfast while still half asleep',

  // Work & productivity struggles
  'pretending to type when your boss walks by',
  'the zoom call where you forgot to unmute',
  'staring at an empty document for 30 minutes',
  'the meeting that could have been an email',
  'working from home in pajamas you havent washed',
  'refreshing your inbox waiting for that one email',
  'the 3pm energy crash at your desk',
  'alt-tabbing away from something when someone approaches',

  // Commute & travel chaos
  'missing the train by 2 seconds',
  'that moment the traffic finally clears',
  'finding perfect parallel parking on first try',
  'forgetting where you parked your car',
  'the walk of shame back for your forgotten keys',
  'sitting in traffic watching your ETA climb',

  // Social anxiety & human interaction
  'waving back at someone who wasnt waving at you',
  'the awkward hallway dance trying to pass someone',
  'forgetting someones name mid-conversation',
  'laughing at a joke you didnt hear',
  'saying you too when the waiter says enjoy your meal',
  'making eye contact with a stranger too long',
  'the panic of someone singing happy birthday to you',

  // Technology fails
  'watching the loading bar stuck at 99%',
  'phone dying at 1% during an important moment',
  'sending a text to the wrong person',
  'accidentally liking a 3 year old photo while stalking',
  'wifi cutting out during a crucial scene',
  'autocorrect changing your message to something unhinged',

  // Late night moments
  'scrolling your phone at 3am knowing you should sleep',
  'the fridge raid at midnight',
  'hearing a weird noise alone at night',
  'that moment you realize its already tomorrow',
  'lying awake replaying an embarrassing moment from 2014',

  // Everyday chaos
  'stepping on something wet while wearing socks',
  'the betrayal of biting your tongue while eating',
  'dropping your phone on your face in bed',
  'the ice cube that escapes and slides under the fridge',
  'untangling headphones for 10 minutes straight',
  'losing something thats in your hand',
  'the shopping cart with one broken wheel',

  // Relatable struggles
  'being hungry but nothing sounds good',
  'the post-lunch food coma hitting hard',
  'realizing you forgot your wallet at checkout',
  'the silence when someone asks who ate the last slice',
  'watching your package say delivered but its not there',
  'the existential crisis in the shower',
  'zoning out and missing your turn',
];

const TITLE_TEMPLATES: Record<string, string[]> = {
  news: [
    'BREAKING: The {event} Incident Has Been Classified',
    'Scientists Finally Explain Why {event} Feels Like That',
    'LEAKED: What Big Companies Dont Want You To Know About {event}',
    'INVESTIGATION: The Dark Side Of {event} Exposed',
    'Why {event} Has Doctors Concerned - Full Report',
    'The Government Has Been Hiding This About {event}',
    'URGENT: New Evidence About {event} Changes Everything',
    'Whistleblower Reveals The Truth About {event}',
  ],
  absurd: [
    'POV: {event} But The Simulation Started Glitching',
    'Me Experiencing {event} In The Wrong Timeline',
    '{event} But Every Second Gets More Unhinged',
    'What {event} Looks Like In The Backrooms',
    '{event} But Directed By David Lynch',
    'If {event} Had Eldritch Horror Energy',
    'POV: {event} In A Universe Where Physics Gave Up',
    '{event} But Reality Forgot How To Work',
    'The Alternate Timeline Where {event} Went Wrong',
  ],
  luxury: [
    'POV: {event} When Your Net Worth Is 9 Figures',
    'How Old Money Does {event} Differently',
    '{event} But Your Butler Handles The Details',
    'The Quiet Luxury Version Of {event}',
    'POV: {event} In Your Third Home',
    'Generational Wealth {event} vs Normal People {event}',
    '{event} But Its Giving Monaco Summer',
    'Trust Fund Kid {event} Hits Different',
    'When {event} Costs More Than Most Peoples Rent',
  ],
  emotional: [
    'When {event} Unlocks A Core Memory',
    '{event} And Suddenly Its 2am And Im Crying',
    'Why Does {event} Feel Like Grief Now',
    'The Last Time I Did {event} Before Everything Changed',
    '{event} Hits Different After You Lose Someone',
    'POV: {event} And You Remember Who You Used To Be',
    'When {event} Reminds You Time Is Passing',
    '{event} But Youre Processing Your Childhood',
    'That Specific Sadness Of {event} As An Adult',
  ],
  tech: [
    'AI Finally Shows What {event} Looks Like In 2077',
    'When Neural Implants Handle {event} For You',
    '{event} But Your Digital Twin Does It Instead',
    'The Metaverse Version Of {event} Is Unhinged',
    'POV: {event} After The Singularity',
    'What {event} Becomes When AI Takes Over',
    'Simulation Theory Proof: {event} Has Hidden Code',
    'Quantum Computing Changed {event} Forever',
    '{event} But With Black Mirror Technology',
  ],
  cartoon: [
    '{event} But With Looney Tunes Physics',
    'If Pixar Made A Short About {event}',
    '{event} As A Studio Ghibli Moment',
    'POV: {event} In The SpongeBob Universe',
    '{event} But Its Giving Early 2000s Cartoon Network',
    'The Anime Version Of {event} Goes Hard',
    '{event} But Animated By The Simpsons Team',
    'Cartoon Network At 3am {event} Energy',
    'If {event} Was A Disney Villain Song',
  ],
};

const CAPTION_TEMPLATES: Record<string, string[]> = {
  news: [
    'BREAKING: After months of investigation, we finally uncovered what really happens during {event}. What we found has left experts speechless. The implications are bigger than anyone expected.',
    'A classified document was leaked exposing the truth about {event}. They tried to hide this from us. Share before this gets taken down.',
    'Scientists have been studying {event} for decades. The results are finally in, and honestly? We should have been paying attention sooner. Full breakdown in comments.',
    'URGENT UPDATE: Everything you thought you knew about {event} is wrong. New evidence has emerged that changes the entire narrative. The truth is darker than fiction.',
  ],
  absurd: [
    'POV: {event} but you accidentally clipped through reality and now youre stuck in the wrong timeline. The NPCs are acting strange. I dont think this is supposed to happen.',
    'Started {event} like normal and then physics just... stopped working? Objects are floating. Time is moving backwards. I think I broke something fundamental.',
    'Me: casually doing {event}. The fabric of reality: literally tearing apart. Why does this always happen to me specifically.',
    'What if I told you {event} was the exact moment the simulation started corrupting. Every playthrough ends the same way. We never learn.',
  ],
  luxury: [
    'POV: {event} but your family has owned the same vineyard since 1847 and your "casual" watch costs more than most houses. Generational wealth really is a different game.',
    'The difference between how normal people experience {event} vs people who summer as a verb is genuinely wild. This is what quiet luxury actually looks like.',
    'Not the butler apologizing because {event} took 3 extra minutes today. Old money problems are a different universe. Manifesting this energy into existence.',
    'When {event} happens in a home where every item has been passed down for six generations. The aesthetic of inherited wealth cannot be replicated.',
  ],
  emotional: [
    'I was NOT prepared to process {event} at 2am and suddenly remember every person I used to be. Time is a thief and nostalgia is its accomplice.',
    'The specific melancholy of {event} as an adult hits different when you realize youll never experience things the same way again. We dont get these moments back.',
    'Its the way {event} unlocked a memory I didnt know I had. Suddenly Im 7 years old again and everything was simpler. Growing up is a scam.',
    'Nobody warned me that {event} would become a grief ritual. Missing the version of myself who did this without overthinking every single moment.',
  ],
  tech: [
    'Asked AI to show {event} in 2077 and Im not okay. Neural implants, holographic interfaces, and consciousness uploads. This is either utopia or a warning.',
    'The year is 2050. {event} no longer requires a physical body. Your digital twin handles everything while you exist as pure data. Is this progress?',
    'AI simulated {event} after the singularity and I have questions. Why do the robots look sad? Why is the sky that color? What happened to us?',
    'Ran {event} through quantum prediction algorithms. Every timeline converges on the same outcome. The future was never optional. Its already decided.',
  ],
  cartoon: [
    'If {event} was animated by the Looney Tunes team there would be anvils, TNT, and absolutely zero regard for the laws of physics. And honestly? More realistic than real life.',
    'POV: {event} but youre in a Pixar short and every inanimate object has trauma and a character arc. The lamp is watching. The lamp remembers everything.',
    'Studio Ghibli presents {event}: featuring inexplicably beautiful food, a mysterious creature only you can see, and the bittersweet passage of time. Tears guaranteed.',
    'The anime adaptation of {event} goes crazy. Dramatic pauses, speedlines, and internal monologue that lasts 3 episodes. Peak fiction honestly.',
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
    'Exploits the "information gap" theory - presenting mundane events as classified secrets creates irresistible curiosity. Viewers MUST know what they are missing. The authoritative news format bypasses skepticism and triggers immediate engagement.',
    'Combines "forbidden knowledge" psychology with everyday relatability. When ordinary activities are framed as cover-ups, it validates viewers suspicions that something deeper is happening. High share rate because people want to be the one who "exposed" this.',
    'News format hijacks our threat-detection instincts. Brain processes "BREAKING" before logic kicks in. Once hooked, the absurdity of the mundane topic creates cognitive dissonance that is resolved through humor and sharing.',
    'Parody of sensationalist media resonates with media-literate Gen Z. They recognize the format, appreciate the satire, and share it as cultural commentary while also finding it genuinely funny.',
  ],
  absurd: [
    'Triggers the "liminal space" effect - familiar situations made uncanny create both discomfort and fascination. Viewers experience the thrill of the unsettling without real danger. The "what if reality broke" concept is universally understood across cultures.',
    'Exploits "call of the void" psychology - showing reality glitching satisfies the intrusive thought of "what if none of this is real" that most people secretly have. Validating this unspoken thought creates intense emotional resonance.',
    'Pattern interruption is the core mechanic of viral content. Absurdist content takes something predictable and subverts expectations so dramatically that the brain HAS to process it multiple times, increasing watch time and saves.',
    'Taps into existential meme culture - Gen Z humor is fundamentally about processing existence through absurdity. This content speaks their native language and gets shared as "this is so me" without explanation needed.',
  ],
  luxury: [
    'Activates aspirational identity - viewers dont just see content, they mentally rehearse being wealthy. This psychological "trying on" of a wealthy identity releases dopamine and creates emotional attachment to the content.',
    'Contrast psychology is extremely powerful. Showing the delta between normal and ultra-wealthy versions of the same activity makes inequality tangible and shareable. Comments become a space for collective processing of class differences.',
    'Quiet luxury aesthetic signals sophistication to share. Unlike flashy wealth content, understated wealth videos let sharers feel they have "good taste" - sharing becomes identity performance.',
    'Parasocial wealth content satisfies curiosity about the 1% while being emotionally safe. Viewers can experience luxury vicariously without the guilt of actually wanting it. Saves are high because people bookmark it for "motivation."',
  ],
  emotional: [
    'Exploits "reminiscence bump" - the brain stores memories from ages 15-25 with extra vividness. Content that triggers these memories creates intense emotional reactions that feel personal, even when the experience is universal.',
    'Nostalgia is a response to present dissatisfaction. By romanticizing mundane past moments, this content offers emotional refuge. High comment engagement because viewers want to share their own version of the memory.',
    'Bittersweet content outperforms purely happy or sad content. The emotional complexity of "beautiful but gone" creates deeper engagement and repeat viewing as viewers process the feeling.',
    'Validates the unspoken grief of growing up. Framing adulthood sadness around specific mundane moments gives shape to diffuse feelings. Comments become group therapy - "I didnt know others felt this too."',
  ],
  tech: [
    'Future speculation content satisfies deep curiosity about mortality and legacy. "What will the world be like when Im gone?" is a universal question. Showing mundane activities transformed by future tech makes this speculation accessible.',
    'AI-generated futures tap into techno-anxiety. People share these videos to process their feelings about technological change - whether excited or terrified. The content becomes a conversation starter about values and humanity.',
    'Cyberpunk aesthetic has become visual shorthand for "late-stage capitalism concerns." The style carries meaning beyond the content itself, making it feel relevant and commentary-worthy.',
    'Speculation about AI doing human activities triggers identity reflection: "What makes us human if robots do everything?" This existential hook drives engagement because viewers need to resolve the question for themselves.',
  ],
  cartoon: [
    'Cartoon physics represent pure wish fulfillment - the fantasy of consequence-free chaos. Viewers experience vicarious release watching physics and logic abandoned while knowing the character will be fine next scene.',
    'Animation triggers childhood emotional safety while addressing adult struggles. This combination creates uniquely powerful content - the comfort of cartoons processing the reality of adult life.',
    'Nostalgia for specific cartoon eras (90s Nickelodeon, 2000s Cartoon Network) creates instant community. Viewers share to find "their people" - those who watched the same shows and share the same references.',
    'Cartoon format gives permission to exaggerate. Things that would feel too dramatic in live-action feel appropriate animated. This lets content address real frustrations in an emotionally safe, shareable way.',
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
