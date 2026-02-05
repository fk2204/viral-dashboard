import { ViralConcept, TrendData } from '@/types';
import { generateSoraPrompt, generateVeoPrompt, generateScript } from './prompts';
import { v4 as uuidv4 } from 'uuid';
import { getHooksForCategory, getTrendingVocab } from './knowledge';
import { scorePlatformVirality } from './virality';
import { estimateMonetization } from './monetization';
import { getEvolvedTemplates } from './learning/template-evolver';
import { getBestHookLive } from './learning/effectiveness-scorer';
import { generateVariants } from './learning/ab-variants';

// ============================================================
// RELATABLE ANGLES (Optional flavor text for titles/captions)
// ============================================================
const RELATABLE_ANGLES = [
  'morning routine vibes',
  'late night thoughts',
  'weekend energy',
  'monday mood',
  'working from home',
  '3am spiral',
  'commute reality',
  'midnight snack energy',
  'nobody asked but',
  'shower thoughts',
  'waiting in line',
  'scrolling at 2am',
  'coffee run necessity',
  'group chat chaos',
  'pretending to work',
  'gym motivation fail',
  'delivery tracking obsession',
  'budget planning denial',
  'adulting struggles',
  'existential crisis hour',
];

// ============================================================
// TITLE TEMPLATES (15+ per category) - TikTok + YouTube Shorts
// Use {topic} placeholder for actual trending topic
// ============================================================
const TITLE_TEMPLATES: Record<string, string[]> = {
  news: [
    '{topic} — Here Is What Nobody Is Saying',
    'The Truth About {topic} Just Dropped',
    '{topic} Explained In 60 Seconds',
    'BREAKING: {topic} Takes Shocking Turn',
    'Scientists Discover Why {topic} Matters',
    'New Study Shows {topic} Truth',
    '{topic} Is Actually Dangerous',
    'What Really Happens With {topic}',
    'The Hidden Truth About {topic}',
    'EXPOSED: What They Dont Tell You About {topic}',
    'Investigation Reveals {topic} Secrets',
    'Why {topic} Is Making Headlines',
    '{topic}: The Full Story They Tried To Hide',
    'REPORT: {topic} Linked To Major Changes',
    'The {topic} Crisis Nobody Is Talking About',
    'How {topic} Is Secretly Changing Everything',
    'Leaked Documents Reveal {topic} Truth',
    'LIVE: {topic} Situation Escalates',
    'Experts Sound Alarm On {topic}',
    '{topic} Goes Viral After Shocking Discovery',
    'The Untold Story Behind {topic}',
    'Why Millions Are Rethinking {topic}',
    'Alert: {topic} May Never Be The Same',
    'Breaking Down The {topic} Phenomenon',
    '{topic}: What The Media Wont Show You',
  ],
  absurd: [
    'POV: {topic} But The Simulation Broke',
    'Nobody Expected {topic} To Go This Hard',
    'When {topic} Goes Completely Wrong',
    '{topic} But Physics Broke',
    'If {topic} Was A Horror Movie',
    '{topic} In 4th Dimension',
    'What {topic} Feels Like Inside',
    '{topic} But The Simulation Glitched',
    'POV: {topic} On Hard Mode',
    '{topic} In Multiverse Of Madness',
    'If {topic} Was A Boss Fight',
    '{topic} But Everything Is Cake',
    'When You Unlock God Mode During {topic}',
    '{topic} Except Gravity Reversed',
    'POV: {topic} In The Backrooms',
    '{topic} But Its A Fever Dream',
    'What If {topic} Had A Final Boss',
    '{topic} At 3AM Challenge Gone Wrong',
    '{topic} But The NPC Glitched',
    'Speedrunning {topic} Any Percent',
    '{topic} But With Cartoon Sound Effects',
    'When {topic} Breaks The Matrix',
    '{topic} In Every Universe',
    'POV: You Failed {topic} Tutorial',
    '{topic} But Its Increasingly Verbose',
  ],
  luxury: [
    'Billionaire Reacts To {topic}',
    '{topic} But Make It Luxury',
    '{topic} But You Are Rich',
    'When {topic} Costs $1 Million',
    '{topic} In Your Private Island',
    'POV: Rich People During {topic}',
    'How The 1% Does {topic}',
    '{topic} In Your Dubai Penthouse',
    'Old Money vs New Money {topic}',
    '{topic} With Unlimited Budget',
    'POV: Trust Fund Kid During {topic}',
    '{topic} But Its Black Card Only',
    'Quiet Luxury Version Of {topic}',
    'When Your Butler Handles {topic}',
    '{topic} On A Superyacht',
    'POV: {topic} After You Made It',
    '{topic} But Everything Is Gold',
    'The Monaco Version Of {topic}',
    'CEO Morning: {topic} Edition',
    '{topic} In First Class',
    'When {topic} Is Tax Deductible',
    'Old Money {topic} Aesthetic',
    '{topic} But You Own The Building',
    'POV: Generational Wealth During {topic}',
    '{topic} That Costs More Than Your House',
  ],
  emotional: [
    'When {topic} Hits Different At 3AM',
    '{topic} Made Me Rethink Everything',
    'When {topic} Hits Different',
    '{topic} And You Start Crying',
    'Why {topic} Makes Me Feel',
    'The Last Time I Experienced {topic}',
    '{topic} Brought Back Memories',
    'Missing The Simple Days Of {topic}',
    'POV: {topic} For The Last Time',
    '{topic} But Youre Growing Up',
    'When You Realize {topic} Was The Best Part',
    '{topic} Through The Years',
    'The Beauty In {topic}',
    '{topic} Hits Different At 25',
    'Romanticizing {topic} Because Life Is Short',
    'When {topic} Reminds You Of Home',
    '{topic} But Its Bittersweet',
    'Finding Peace In {topic}',
    'POV: You Miss When {topic} Was Simple',
    '{topic} One Last Time',
    'Why I Cry During {topic} Now',
    'The Way {topic} Used To Feel',
    '{topic} And The Passage Of Time',
    'When {topic} Becomes A Core Memory',
    'Gentle Reminder About {topic}',
    'The Quiet Beauty Of {topic}',
  ],
  tech: [
    'AI Just Solved {topic}',
    '{topic} In 2050 Looks Insane',
    'AI Recreates What {topic} Looks Like',
    'If Robots Did {topic}',
    '{topic} But Its Cyberpunk',
    'AI Shows The Future Of {topic}',
    'What AI Thinks {topic} Is',
    'When AGI Takes Over {topic}',
    '{topic} But With Neural Interface',
    'GPT-7 Tries To Explain {topic}',
    '{topic} In The Metaverse',
    'Quantum Computing Solves {topic}',
    '{topic} But Your Robot Does It',
    'Apple Vision Pro During {topic}',
    'If Tesla Made {topic}',
    '{topic} According To AI',
    'When Technology Replaces {topic}',
    '{topic} But Its Holographic',
    'AI Generated {topic} Is Terrifying',
    '{topic} With Neuralink',
    'The Algorithm Changed {topic} Forever',
    'POV: AI Optimized Your {topic}',
    '{topic} But In A Smart Home',
    'When {topic} Gets An Update',
    'Silicon Valley Disrupts {topic}',
    '{topic} Powered By AI In 2026',
  ],
  cartoon: [
    'If {topic} Was A Pixar Short',
    '{topic} In Every Animation Style',
    '{topic} But Its Looney Tunes',
    'Cartoon Physics During {topic}',
    'If Disney Made {topic}',
    '{topic} As Anime Episode',
    'SpongeBob Version Of {topic}',
    'Rick And Morty {topic} Episode',
    '{topic} In Studio Ghibli Style',
    'If Pixar Made {topic}',
    '{topic} But Its Dragon Ball Z',
    'Family Guy Cutaway: {topic}',
    '{topic} As A 90s Cartoon',
    'Anime Main Character During {topic}',
    'If {topic} Was A Shonen Battle',
    '{topic} In Spider-Verse Style',
    'Adventure Time Version Of {topic}',
    '{topic} But Its Gravity Falls',
    'When {topic} Gets The Anime Treatment',
    'Cartoon Network Presents: {topic}',
    '{topic} As A Miyazaki Film',
    'If One Piece Did {topic}',
    '{topic} In The Simpsons Universe',
    'Bluey Episode About {topic}',
    '{topic} But Its Jujutsu Kaisen',
    'The Animated Short Of {topic}',
  ],
  gaming: [
    '{topic} But Its A Speedrun',
    'POV: {topic} In Competitive Ranked',
    'The {topic} Play That Broke The Internet',
    '{topic} But Every Second Gets Harder',
    'Pro Gamer Reacts To {topic}',
    'If {topic} Was A Video Game Boss',
    '{topic} World Record Just Got Destroyed',
    'The {topic} Glitch Nobody Knew About',
    'POV: {topic} In Your First Online Match',
    '{topic} But The Lobby Goes Insane',
    'When {topic} Gets A Battle Royale Mode',
    '{topic} Speedrun Any% World Record',
    'How {topic} Changed Gaming Forever',
    'The {topic} Clutch That Made History',
    '{topic} But The RNG Is Cursed',
    'If Dark Souls Did {topic}',
  ],
  fitness: [
    '{topic} But Its A 30 Day Challenge',
    'The {topic} Transformation That Broke TikTok',
    'POV: {topic} At The Gym At 5AM',
    '{topic} Workout That Actually Works',
    'Before and After {topic} Is Insane',
    'Why {topic} Is The Best Exercise Nobody Does',
    'The Truth About {topic} And Gains',
    '{topic} But Make It A PR Day',
    'How {topic} Changed My Physique In 90 Days',
    'POV: Gym Bro Discovers {topic}',
    '{topic} Form Check Gone Wrong',
    'The {topic} Routine Pros Dont Share',
    'When {topic} Finally Clicks',
    '{topic} But Its Progressive Overload',
    'The Science Behind {topic} And Muscle Growth',
  ],
  food: [
    '{topic} But A Michelin Chef Made It',
    'POV: {topic} At 3AM Hits Different',
    'The {topic} Recipe That Broke The Internet',
    'Rating {topic} From 1 to 10',
    '{topic} But Make It Gourmet',
    'Street Food {topic} vs Restaurant {topic}',
    'When {topic} Is Made By A Professional',
    'The {topic} Hack Nobody Knows About',
    'Trying {topic} For The First Time',
    'If Gordon Ramsay Saw This {topic}',
    '{topic} ASMR Cooking Edition',
    'The Secret Ingredient In {topic}',
    '{topic} But Every Bite Gets Better',
    'POV: {topic} In Every Country',
    'Why {topic} Is The Perfect Comfort Food',
  ],
  finance: [
    'How {topic} Can Make You Rich In 2026',
    '{topic} Money Hack Nobody Talks About',
    'The Truth About {topic} And Your Wallet',
    'POV: {topic} With A Six Figure Income',
    'Why Rich People Love {topic}',
    '{topic} Investment Strategy Just Leaked',
    'How I Used {topic} To Build Passive Income',
    'The {topic} Side Hustle Paying $10K/Month',
    '{topic} Tax Strategy The Wealthy Use',
    'Dave Ramsey vs {topic} — Who Wins',
    'POV: {topic} During A Market Crash',
    'The {topic} Bubble Nobody Sees Coming',
    '{topic} Explained Like Youre 5',
    'How {topic} Will Change The Economy',
    'The {topic} Financial Mistake Everyone Makes',
  ],
  music: [
    'When {topic} Drops The Beat Of The Year',
    '{topic} But Its A Fire Remix',
    'The {topic} Song That Lives Rent Free',
    'POV: Hearing {topic} For The First Time',
    '{topic} But Every Genre',
    'Why {topic} Is The Sound Of 2026',
    'Producer Reacts To {topic}',
    '{topic} Vocals Are Actually Insane',
    'The Story Behind {topic} Nobody Knows',
    '{topic} But Its An EDM Banger',
    'When {topic} Gets The Orchestra Treatment',
    'POV: {topic} At A Festival At Sunset',
    '{topic} Slowed And Reverb Hits Different',
    'The {topic} Cover That Went Viral',
    'If {topic} Was A Movie Soundtrack',
  ],
  relationships: [
    'When {topic} Tests Your Relationship',
    'POV: {topic} With Your Person',
    'The {topic} Red Flag Nobody Talks About',
    '{topic} But Its Couples Edition',
    'How {topic} Changed My Love Life',
    'The Truth About {topic} In Relationships',
    '{topic} Story Time — You Wont Believe This',
    'POV: {topic} On A First Date',
    'When {topic} Brings You Closer Together',
    '{topic} Love Language Decoded',
    'The {topic} Conversation Every Couple Needs',
    'Dating In 2026: {topic} Edition',
    '{topic} But Its Your Toxic Ex',
    'When {topic} Makes You Rethink Everything',
    'The {topic} Relationship Advice That Changed My Life',
  ],
};

// ============================================================
// CAPTION TEMPLATES (10+ per category) - TikTok + Shorts native
// Use {topic} placeholder
// ============================================================
const CAPTION_TEMPLATES: Record<string, string[]> = {
  news: [
    'This changes everything about {topic}. No cap.',
    '{topic} and nobody is talking about it.',
    'Wait for the end. {topic} hits different.',
    'BREAKING: We investigated {topic} and what we found will shock you.',
    'New research reveals the TRUTH about {topic}. This changes everything.',
    'WARNING: {topic} is more dangerous than you think. Watch till end.',
    'Just leaked: {topic} footage. They did NOT want this going public.',
    'The conspiracy behind {topic} goes deeper than anyone imagined.',
    'Experts are calling {topic} the biggest story of 2026.',
    'We need to talk about {topic}. What they are hiding is terrifying.',
    'Subscribe for more {topic} updates',
    'Drop a comment if {topic} shocked you',
  ],
  absurd: [
    'the way {topic} just broke the internet fr',
    'My brain broke watching {topic}. This shouldnt be possible.',
    'POV: {topic} but the simulation is glitching. I cant unsee this.',
    'When {topic} goes wrong in the multiverse. Reality is broken fr fr.',
    'Why does {topic} look like a deleted scene from Inception.',
    '{topic} just broke physics and honestly I am not even surprised.',
    'The way {topic} goes off the rails is genuinely unhinged.',
    'POV: the devs forgot to patch {topic} and now chaos ensues.',
    'I showed AI what {topic} looks like and it had a meltdown.',
    '{topic} but every second it gets more cursed. Watch till the end.',
    'Tell me why {topic} looks like THAT.',
    'Subscribe if {topic} broke your brain too',
  ],
  luxury: [
    'POV: {topic} when money is unlimited. This is how the 1% lives.',
    'Normal people: meanwhile {topic}... Manifest this energy.',
    '{topic} but you are in your Dubai penthouse. Luxury hits different.',
    'The difference between regular and rich {topic} is criminal.',
    'Woke up in my villa and decided to experience {topic} the expensive way.',
    'When your {topic} costs more than most peoples rent. Quiet luxury.',
    'Old money vs new money approach to {topic}. The difference is insane.',
    'POV: you never have to worry about {topic} again. Generational wealth.',
    'This is what {topic} looks like when price is never a factor.',
    'The way rich people handle {topic} should be illegal.',
    'CEO routine: {topic} edition. Spoiler: it involves a private chef.',
    'Subscribe for more luxury {topic} content',
  ],
  emotional: [
    'Not me getting emotional over {topic}. Why does this hit so hard.',
    '{topic} used to be so simple. Now Im crying thinking about it.',
    'The way {topic} brings back so many memories. This generation understands.',
    'POV: {topic} but youre not a kid anymore and everything hits different.',
    'I romanticize {topic} because life is too short not to find beauty.',
    'When {topic} suddenly reminds you of someone you lost. Unexpected tears.',
    'The last time I experienced {topic} without worrying. I miss that peace.',
    'Finding beauty in {topic} is how I survive this chaotic world.',
    '{topic} at golden hour hits different when youre healing.',
    'This is my love letter to {topic}. The little things matter most.',
    'POV: you realize {topic} was the best part all along.',
    'Drop a heart if {topic} made you emotional',
  ],
  tech: [
    'Asked AI to show what {topic} will look like in 2050. We are NOT ready.',
    'AI generated {topic} and now I cant sleep. The future is terrifying.',
    '{topic} reimagined with AI. This is what robots think happens.',
    'Used Sora to generate {topic} in the future and the results are insane.',
    'When AGI finally understands {topic} we are cooked. Look at this.',
    'The neural interface version of {topic} just dropped and its mind-bending.',
    'POV: your AI assistant optimizes {topic} and now its scarily efficient.',
    'What {topic} looks like in a world run by AI. Beautiful and terrifying.',
    'I asked GPT-7 to redesign {topic} and honestly... it has a point.',
    'The metaverse version of {topic} hits different. Welcome to 2050.',
    '{topic} but your smart home does everything. Living or just existing.',
    'Subscribe for more AI {topic} content',
  ],
  cartoon: [
    'If {topic} was a cartoon episode. The physics dont make sense.',
    '{topic} but drawn by Disney animators. This is canon now.',
    'Cartoon version of {topic} is TOO accurate. More real than reality.',
    '{topic} in Studio Ghibli style and now Im emotionally devastated.',
    'The anime version of {topic} goes unbelievably hard.',
    'If Pixar made a short about {topic} I would ugly cry in the theater.',
    '{topic} as a SpongeBob episode is the content I needed today.',
    'The Spider-Verse edit of {topic} has no business going this hard.',
    'POV: {topic} but the animation budget is unlimited.',
    '{topic} in every cartoon art style and each tells a different story.',
    'Looney Tunes physics during {topic} is peak comedy. ACME energy.',
    'Subscribe for more animated {topic}',
  ],
  gaming: [
    'the way {topic} just ended that whole lobby fr',
    '{topic} gameplay hits different at 3am',
    'if you know about {topic} you know. gamers understand.',
    'this {topic} play is actually illegal. someone ban them.',
    'POV: {topic} and your teammates are useless',
    '{topic} clutch moment had me screaming',
    'subscribe for more {topic} gaming content',
    'drop your rank if {topic} tilted you',
    'the way {topic} changed competitive forever',
    '{topic} is the most slept on thing in gaming rn',
  ],
  fitness: [
    '{topic} transformation day 1 vs day 90. insane.',
    'POV: {topic} at 5am when nobody is watching',
    'if you skip {topic} you are not serious about gains',
    'the {topic} routine that changed my body forever',
    '{topic} form check — am I doing this right',
    'subscribe for daily {topic} workouts',
    '{topic} burn out is real. respect the rest day.',
    'when {topic} finally clicks and you feel the pump',
    'drop a comment if {topic} is in your split',
    '{topic} before and after had my jaw on the floor',
  ],
  food: [
    'the way {topic} just melted in my mouth. no words.',
    '{topic} at 3am hits completely different and you know it',
    'this {topic} recipe changed my whole meal prep game',
    'if you havent tried {topic} like this you are missing out',
    'rating this {topic} a solid 11 out of 10',
    'subscribe for more {topic} recipes',
    'POV: {topic} made by someone who actually cooks',
    'the secret to {topic} is something nobody tells you',
    '{topic} ASMR cooking and now im hungry again',
    'drop your {topic} hot take in the comments',
  ],
  finance: [
    '{topic} is literally free money and nobody is paying attention',
    'the {topic} strategy that turned $100 into passive income',
    'POV: {topic} during a bull market. different breed.',
    'if you understood {topic} you would never work a 9 to 5 again',
    'the {topic} hack wealthy people dont want you to know',
    'subscribe for daily {topic} money tips',
    'your bank account after discovering {topic}',
    '{topic} explained so simply even a 5 year old gets it',
    'drop a comment if {topic} made you rethink your finances',
    'the {topic} investment that pays for itself',
  ],
  music: [
    'the way {topic} just gave me chills. masterpiece.',
    '{topic} on repeat for the next 6 months minimum',
    'POV: hearing {topic} live for the first time and crying',
    'if {topic} doesnt make your playlist you have no taste',
    'the vocals on {topic} are genuinely otherworldly',
    'subscribe for more {topic} music content',
    '{topic} slowed reverb at 2am is a whole vibe',
    'the way {topic} just ended every other song this year',
    'drop your {topic} hot take. wrong answers only.',
    'the story behind {topic} is actually heartbreaking',
  ],
  relationships: [
    'when {topic} hits and you realize its real. no turning back.',
    '{topic} in relationships is either a green flag or a red flag. no in between.',
    'POV: {topic} with your person and everything just makes sense',
    'the {topic} conversation that every couple avoids but needs',
    'if {topic} doesnt scare you a little you are not doing it right',
    'subscribe for more {topic} relationship advice',
    '{topic} story time that had me SHOOK',
    'the way {topic} changed how I see love forever',
    'drop a heart if {topic} reminded you of someone',
    '{topic} red flag or green flag. lets debate.',
  ],
};

// ============================================================
// HASHTAG SETS (10 per category) - TikTok + YouTube Shorts
// Mix of #fyp #viral AND #shorts #youtubeshorts
// ============================================================
const HASHTAG_SETS: Record<string, string[][]> = {
  news: [
    ['#breaking', '#news', '#viral', '#fyp', '#shorts', '#youtubeshorts', '#exposed', '#truth'],
    ['#breakingnews', '#fyp', '#viral', '#shorts', '#shocking', '#mustwatch', '#facts'],
    ['#investigation', '#exposed', '#viral', '#fyp', '#shorts', '#truth', '#trending'],
    ['#news', '#report', '#fyp', '#viral', '#shorts', '#youtubeshorts', '#2026'],
    ['#leaked', '#exclusive', '#fyp', '#viral', '#shorts', '#breaking', '#truth'],
    ['#developing', '#alert', '#fyp', '#viral', '#shorts', '#newsflash', '#trending'],
    ['#factcheck', '#fyp', '#viral', '#shorts', '#news', '#exposed', '#realstory'],
    ['#urgent', '#breaking', '#fyp', '#viral', '#shorts', '#trending', '#mustknow'],
    ['#coverup', '#truth', '#fyp', '#viral', '#shorts', '#investigation', '#deepdive'],
    ['#headlines', '#news', '#fyp', '#viral', '#shorts', '#youtubeshorts', '#2026'],
  ],
  absurd: [
    ['#wtf', '#fyp', '#viral', '#shorts', '#funny', '#absurd', '#multiverse'],
    ['#brainrot', '#fyp', '#unhinged', '#viral', '#shorts', '#simulation', '#glitch'],
    ['#cursed', '#fyp', '#viral', '#shorts', '#whatdidijustwatch', '#paralleluniverse'],
    ['#simulation', '#glitchinthematrix', '#fyp', '#viral', '#shorts', '#unreal'],
    ['#multiverse', '#madness', '#fyp', '#viral', '#shorts', '#4thdimension', '#absurd'],
    ['#npc', '#glitch', '#fyp', '#viral', '#shorts', '#gaming', '#reallife'],
    ['#backrooms', '#fyp', '#viral', '#shorts', '#creepy', '#surreal', '#liminalspace'],
    ['#physicsbroke', '#fyp', '#viral', '#shorts', '#funny', '#chaos', '#simulation'],
    ['#hardmode', '#fyp', '#viral', '#shorts', '#challenge', '#impossible', '#brainrot'],
    ['#speedrun', '#fyp', '#viral', '#shorts', '#anypercent', '#gaming', '#unhinged'],
  ],
  luxury: [
    ['#luxury', '#rich', '#billionaire', '#fyp', '#shorts', '#lifestyle', '#goals'],
    ['#luxurylife', '#wealthy', '#fyp', '#viral', '#shorts', '#manifest', '#richlife'],
    ['#oldmoney', '#quietluxury', '#fyp', '#viral', '#shorts', '#aesthetic', '#wealthy'],
    ['#billionaire', '#lifestyle', '#fyp', '#viral', '#shorts', '#motivation', '#success'],
    ['#dubai', '#luxury', '#fyp', '#viral', '#shorts', '#penthouse', '#richkids'],
    ['#superyacht', '#wealth', '#fyp', '#viral', '#shorts', '#luxury', '#goals'],
    ['#firstclass', '#travel', '#fyp', '#viral', '#shorts', '#luxury', '#lifestyle'],
    ['#generationalwealth', '#fyp', '#viral', '#shorts', '#rich', '#mindset', '#luxury'],
    ['#ceolife', '#hustle', '#fyp', '#viral', '#shorts', '#luxury', '#morning'],
    ['#oldmoneyaesthetic', '#quietluxury', '#fyp', '#viral', '#shorts', '#elegant'],
  ],
  emotional: [
    ['#emotional', '#fyp', '#feels', '#shorts', '#relatable', '#nostalgia', '#crying'],
    ['#sad', '#fyp', '#deep', '#viral', '#shorts', '#memories', '#2am'],
    ['#nostalgia', '#growingup', '#fyp', '#viral', '#shorts', '#memories', '#hitsdifferent'],
    ['#corememory', '#fyp', '#viral', '#shorts', '#emotional', '#relatable', '#life'],
    ['#bittersweet', '#fyp', '#viral', '#shorts', '#time', '#nostalgia', '#feels'],
    ['#healing', '#fyp', '#viral', '#shorts', '#emotional', '#selflove', '#growth'],
    ['#maincharacter', '#fyp', '#viral', '#shorts', '#aesthetic', '#emotional', '#moment'],
    ['#romanticize', '#life', '#fyp', '#viral', '#shorts', '#beauty', '#mundane'],
    ['#lasttime', '#fyp', '#viral', '#shorts', '#emotional', '#memories', '#growingup'],
    ['#goldenhour', '#fyp', '#viral', '#shorts', '#aesthetic', '#peaceful', '#emotional'],
  ],
  tech: [
    ['#ai', '#future', '#technology', '#fyp', '#shorts', '#2050', '#sora'],
    ['#artificialintelligence', '#tech', '#fyp', '#viral', '#shorts', '#aigenerated'],
    ['#agi', '#singularity', '#fyp', '#viral', '#shorts', '#future', '#technology'],
    ['#metaverse', '#vr', '#fyp', '#viral', '#shorts', '#future', '#tech'],
    ['#neuralink', '#brain', '#fyp', '#viral', '#shorts', '#tech', '#future'],
    ['#robotics', '#automation', '#fyp', '#viral', '#shorts', '#ai', '#2050'],
    ['#smarthome', '#iot', '#fyp', '#viral', '#shorts', '#tech', '#future'],
    ['#gpt', '#chatgpt', '#fyp', '#viral', '#shorts', '#ai', '#tech'],
    ['#cyberpunk', '#aesthetic', '#fyp', '#viral', '#shorts', '#tech', '#future'],
    ['#quantumcomputing', '#science', '#fyp', '#viral', '#shorts', '#tech', '#mindblowing'],
  ],
  cartoon: [
    ['#cartoon', '#animation', '#fyp', '#shorts', '#funny', '#disney', '#anime'],
    ['#animated', '#toons', '#fyp', '#viral', '#shorts', '#looneytunes', '#spongebob'],
    ['#studioghibli', '#miyazaki', '#fyp', '#viral', '#shorts', '#anime', '#beautiful'],
    ['#pixar', '#disney', '#fyp', '#viral', '#shorts', '#animation', '#crying'],
    ['#spiderverse', '#fyp', '#viral', '#shorts', '#animation', '#art', '#edit'],
    ['#anime', '#manga', '#fyp', '#viral', '#shorts', '#otaku', '#edit'],
    ['#cartoonnetwork', '#90s', '#fyp', '#viral', '#shorts', '#nostalgia', '#cartoon'],
    ['#animeart', '#artstyle', '#fyp', '#viral', '#shorts', '#animation', '#drawing'],
    ['#jujutsukaisen', '#anime', '#fyp', '#viral', '#shorts', '#edit', '#manga'],
    ['#onepiece', '#anime', '#fyp', '#viral', '#shorts', '#edit', '#goat'],
  ],
  gaming: [
    ['#gaming', '#gamer', '#fyp', '#shorts', '#viral', '#esports', '#youtubeshorts'],
    ['#twitch', '#streamer', '#fyp', '#viral', '#shorts', '#gaming', '#clutch'],
    ['#speedrun', '#worldrecord', '#fyp', '#viral', '#shorts', '#gaming', '#wr'],
    ['#competitive', '#ranked', '#fyp', '#viral', '#shorts', '#esports', '#gaming'],
    ['#pro', '#progamer', '#fyp', '#viral', '#shorts', '#gaming', '#esports'],
    ['#battleroyale', '#br', '#fyp', '#viral', '#shorts', '#gaming', '#clutch'],
    ['#firstperson', '#fps', '#fyp', '#viral', '#shorts', '#gaming', '#shooter'],
    ['#moba', '#mmorpg', '#fyp', '#viral', '#shorts', '#gaming', '#online'],
    ['#pcgaming', '#console', '#fyp', '#viral', '#shorts', '#gamer', '#setup'],
    ['#gamingclips', '#highlight', '#fyp', '#viral', '#shorts', '#youtubeshorts', '#epic'],
  ],
  fitness: [
    ['#fitness', '#gym', '#fyp', '#shorts', '#viral', '#workout', '#youtubeshorts'],
    ['#transformation', '#beforeandafter', '#fyp', '#viral', '#shorts', '#fitness', '#gains'],
    ['#gymmotivation', '#fit', '#fyp', '#viral', '#shorts', '#workout', '#fitfam'],
    ['#bodybuilding', '#muscle', '#fyp', '#viral', '#shorts', '#gains', '#fitness'],
    ['#lifting', '#weightlifting', '#fyp', '#viral', '#shorts', '#gym', '#pr'],
    ['#fitnessmotivation', '#health', '#fyp', '#viral', '#shorts', '#wellness', '#fit'],
    ['#formcheck', '#technique', '#fyp', '#viral', '#shorts', '#fitness', '#gym'],
    ['#gymtok', '#fittok', '#fyp', '#viral', '#shorts', '#workout', '#fitlife'],
    ['#gains', '#bulking', '#fyp', '#viral', '#shorts', '#gym', '#muscle'],
    ['#fitnessjourney', '#progress', '#fyp', '#viral', '#shorts', '#youtubeshorts', '#transformation'],
  ],
  food: [
    ['#food', '#foodie', '#fyp', '#shorts', '#viral', '#cooking', '#youtubeshorts'],
    ['#recipe', '#cooking', '#fyp', '#viral', '#shorts', '#food', '#homemade'],
    ['#foodtok', '#foodporn', '#fyp', '#viral', '#shorts', '#delicious', '#yum'],
    ['#asmr', '#foodasmr', '#fyp', '#viral', '#shorts', '#satisfying', '#cooking'],
    ['#chef', '#gourmet', '#fyp', '#viral', '#shorts', '#food', '#culinary'],
    ['#streetfood', '#foodie', '#fyp', '#viral', '#shorts', '#authentic', '#tasty'],
    ['#mealprep', '#healthy', '#fyp', '#viral', '#shorts', '#food', '#cooking'],
    ['#baking', '#dessert', '#fyp', '#viral', '#shorts', '#sweet', '#homemade'],
    ['#foodhack', '#cookinghack', '#fyp', '#viral', '#shorts', '#lifehack', '#kitchen'],
    ['#tasty', '#delicious', '#fyp', '#viral', '#shorts', '#youtubeshorts', '#foodlover'],
  ],
  finance: [
    ['#finance', '#money', '#fyp', '#shorts', '#viral', '#investing', '#youtubeshorts'],
    ['#sidehustle', '#passiveincome', '#fyp', '#viral', '#shorts', '#money', '#entrepreneur'],
    ['#investing', '#stocks', '#fyp', '#viral', '#shorts', '#finance', '#wealth'],
    ['#financialfreedom', '#wealthy', '#fyp', '#viral', '#shorts', '#money', '#rich'],
    ['#moneytok', '#financetok', '#fyp', '#viral', '#shorts', '#investing', '#tips'],
    ['#crypto', '#bitcoin', '#fyp', '#viral', '#shorts', '#finance', '#investing'],
    ['#realestate', '#property', '#fyp', '#viral', '#shorts', '#investing', '#wealth'],
    ['#entrepreneur', '#business', '#fyp', '#viral', '#shorts', '#money', '#success'],
    ['#moneytips', '#financetips', '#fyp', '#viral', '#shorts', '#youtubeshorts', '#wealth'],
    ['#wealthbuilding', '#millionaire', '#fyp', '#viral', '#shorts', '#finance', '#success'],
  ],
  music: [
    ['#music', '#newmusic', '#fyp', '#shorts', '#viral', '#song', '#youtubeshorts'],
    ['#producer', '#beatmaker', '#fyp', '#viral', '#shorts', '#music', '#beats'],
    ['#remix', '#edit', '#fyp', '#viral', '#shorts', '#music', '#audio'],
    ['#vocals', '#singer', '#fyp', '#viral', '#shorts', '#music', '#singing'],
    ['#festival', '#concert', '#fyp', '#viral', '#shorts', '#music', '#live'],
    ['#edm', '#electronic', '#fyp', '#viral', '#shorts', '#music', '#dance'],
    ['#hiphop', '#rap', '#fyp', '#viral', '#shorts', '#music', '#beats'],
    ['#slowedandreverb', '#slowed', '#fyp', '#viral', '#shorts', '#music', '#vibe'],
    ['#musicproduction', '#studiolife', '#fyp', '#viral', '#shorts', '#producer', '#music'],
    ['#soundtrack', '#musicvideo', '#fyp', '#viral', '#shorts', '#youtubeshorts', '#audio'],
  ],
  relationships: [
    ['#relationships', '#dating', '#fyp', '#shorts', '#viral', '#love', '#youtubeshorts'],
    ['#couple', '#couplegoals', '#fyp', '#viral', '#shorts', '#love', '#relationship'],
    ['#datingadvice', '#dating', '#fyp', '#viral', '#shorts', '#relationships', '#tips'],
    ['#redflag', '#greenflag', '#fyp', '#viral', '#shorts', '#dating', '#toxic'],
    ['#lovestory', '#storytime', '#fyp', '#viral', '#shorts', '#relationships', '#drama'],
    ['#relationshipadvice', '#love', '#fyp', '#viral', '#shorts', '#dating', '#help'],
    ['#toxic', '#ex', '#fyp', '#viral', '#shorts', '#relationships', '#storytime'],
    ['#lovelanguage', '#attachment', '#fyp', '#viral', '#shorts', '#relationships', '#psychology'],
    ['#firstdate', '#dating', '#fyp', '#viral', '#shorts', '#love', '#awkward'],
    ['#relationshipgoals', '#couplegoals', '#fyp', '#viral', '#shorts', '#youtubeshorts', '#love'],
  ],
};

// ============================================================
// WHY IT WORKS (6+ per category) - TikTok + Shorts focused
// ============================================================
const WHY_IT_WORKS: Record<string, string[]> = {
  news: [
    'Breaking news format on trending topics creates instant FOMO and curiosity for TikTok and Shorts viewers.',
    'Investigation framing makes viewers feel like insiders discovering secrets about trending topics.',
    'Urgency language on real trends triggers immediate engagement and shares across both platforms.',
    'Conspiracy angle taps into cultural obsession with hidden truths about what everyone is talking about.',
    'Documentary style credibility combined with trending topics drives massive comment debates.',
    'Leaked/exposed framing on actual trends creates viral pattern interruption on short-form video.',
  ],
  absurd: [
    'Trending topics in surreal settings create shareable wtf moments that dominate For You pages.',
    'Absurd takes on real trends force viewers to watch multiple times and share with friends.',
    'Simulation/glitch aesthetic applied to trending topics resonates with gen-z humor on both platforms.',
    'Multiverse framing of actual trends creates endless remix potential and duet opportunities.',
    'Gaming language applied to real-world trending topics engages massive gaming audience on Shorts.',
    'Fever dream interpretation of trending news creates viral pattern interruption.',
  ],
  luxury: [
    'Luxury versions of trending topics trigger aspirational fantasy engagement and saves.',
    'Rich vs normal comparisons of what everyone is talking about drive envy-based sharing.',
    'Billionaire POV of trending events creates addictive contrast content for both platforms.',
    'Quiet luxury aesthetic applied to current trends taps into 2026 old money trend.',
    'Wealth fantasy around actual trending topics drives massive comment engagement.',
    'Absurd cost comparison on real trends creates instant debate and sharing on TikTok and Shorts.',
  ],
  emotional: [
    'Emotional take on trending topics creates deep connection and high save rates.',
    'Romanticizing trending news resonates with viewers seeking meaning in current events.',
    'Core memory format applied to real trends transcends demographics on both platforms.',
    'Golden hour aesthetic on trending topics triggers the romanticize-your-life trend.',
    'Growing up realization content about what everyone is experiencing creates universal resonance.',
    'Nostalgic lens on current trends drives emotional sharing and duets.',
  ],
  tech: [
    'AI visualization of trending topics satisfies curiosity about future implications.',
    'Futuristic take on current trends drives shares and saves on tech-savvy Shorts audience.',
    'Tech reimagining of trending news feeds fascination with AI and automation.',
    'AI anxiety meets real trends creates both humor and genuine concern engagement.',
    'Metaverse/2050 framing of current events sparks debate and speculation in comments.',
    'Human vs AI angle on trending topics drives massive engagement on both platforms.',
  ],
  cartoon: [
    'Cartoon physics applied to trending topics creates instant comedy and shareability.',
    'Animation style of real news makes serious topics accessible and entertaining.',
    'Nostalgic cartoon aesthetic makes trending content feel magical and shareable.',
    'Studio Ghibli style on current events triggers emotional sharing from anime fans.',
    'Spider-Verse edit style on trending topics is peak 2026 aesthetic for Shorts.',
    'Multi-style animation of single trending topic creates binge-worthy series potential.',
  ],
  gaming: [
    'Gaming culture on TikTok and Shorts drives massive engagement from competitive players.',
    'Speedrun and clutch content creates rewatchable moments gamers love to share.',
    'Esports language applied to trending topics taps into huge gaming audience on both platforms.',
    'Pro player reactions and gameplay commentary drive algorithm-friendly watch time.',
    'Ranked and competitive framing of trends resonates with achievement-focused gen-z gamers.',
    'Gaming glitch and RNG humor translates perfectly to short-form viral moments.',
  ],
  fitness: [
    'Transformation content on trending fitness topics creates aspirational saves and shares.',
    'Before and after format drives engagement from fitness community on both platforms.',
    'Early morning gym content resonates with motivated audience seeking inspiration.',
    'Form check and technique videos create educational value that algorithm rewards.',
    'Progressive overload and PR content taps into fitness achievement culture on TikTok.',
    '30 day challenge format on trending exercises creates series potential and accountability.',
  ],
  food: [
    'Food ASMR and recipe content on trending dishes dominates both TikTok and Shorts.',
    'Michelin chef vs home cook comparisons create engaging contrast content.',
    '3AM food content taps into relatable late night craving culture across platforms.',
    'Rating and review format on trending foods drives comment debate and shares.',
    'Street food vs restaurant comparisons create affordable luxury fantasy engagement.',
    'Professional cooking techniques on trending recipes provide educational value algorithm loves.',
  ],
  finance: [
    'Money hack content on trending financial topics creates high-save rate advice videos.',
    'Side hustle and passive income framing taps into entrepreneurial gen-z on both platforms.',
    'Wealthy vs normal comparisons of trending finance topics drive aspirational engagement.',
    'Simplified explanations of complex financial trends make content accessible and shareable.',
    'Bull market and investment strategy content resonates with crypto-native young audience.',
    'Tax strategy and wealth building on trending topics provides actionable value users save.',
  ],
  music: [
    'New music reactions and producer breakdowns drive engagement from music lovers.',
    'Slowed and reverb edits of trending songs create mood-based viral moments on TikTok.',
    'Live performance and festival content captures emotional peak moments users share.',
    'Genre remix and cover versions of trending tracks create series and duet potential.',
    'Behind the story content on viral songs satisfies curiosity and drives shares.',
    'Vocal analysis and production breakdown educates while entertaining music community.',
  ],
  relationships: [
    'Relationship advice on trending dating topics creates high-engagement debate in comments.',
    'Red flag vs green flag content drives polarizing discussion perfect for algorithm.',
    'Story time format on relationship experiences creates relatable emotional connection.',
    'Couples content and relationship tests tap into aspirational partnership culture.',
    'First date and dating in 2026 content resonates with single gen-z navigating apps.',
    'Love language and attachment psychology applied to trends provides educational value.',
  ],
};

// ============================================================
// DAY-AWARE POST TIMING
// ============================================================
interface PostTimeSlot {
  hour: number;
  minute: number;
  reason: string;
}

const DAY_SCHEDULES: Record<number, PostTimeSlot[]> = {
  0: [ // Sunday
    { hour: 10, minute: 0, reason: 'Sunday morning scroll session' },
    { hour: 13, minute: 0, reason: 'Sunday afternoon relaxation peak' },
    { hour: 19, minute: 0, reason: 'Sunday scaries - high emotional engagement' },
    { hour: 21, minute: 30, reason: 'Pre-bed Sunday wind down' },
  ],
  1: [ // Monday
    { hour: 7, minute: 30, reason: 'Monday morning commute scroll' },
    { hour: 12, minute: 0, reason: 'Monday lunch break escape' },
    { hour: 17, minute: 30, reason: 'Monday end of work relief' },
    { hour: 21, minute: 0, reason: 'Monday evening decompression' },
  ],
  2: [ // Tuesday
    { hour: 8, minute: 0, reason: 'Tuesday morning routine scroll' },
    { hour: 12, minute: 30, reason: 'Tuesday midday break' },
    { hour: 18, minute: 0, reason: 'Tuesday evening wind down' },
    { hour: 21, minute: 0, reason: 'Tuesday night engagement peak' },
  ],
  3: [ // Wednesday
    { hour: 8, minute: 0, reason: 'Wednesday morning - midweek energy' },
    { hour: 12, minute: 0, reason: 'Hump day lunch break' },
    { hour: 17, minute: 0, reason: 'Wednesday afternoon pick-me-up' },
    { hour: 20, minute: 30, reason: 'Wednesday evening - highest midweek engagement' },
  ],
  4: [ // Thursday
    { hour: 8, minute: 0, reason: 'Thursday morning momentum' },
    { hour: 12, minute: 0, reason: 'Thursday lunch scroll' },
    { hour: 17, minute: 30, reason: 'Thursday pre-weekend energy building' },
    { hour: 21, minute: 0, reason: 'Thursday night - weekend anticipation peak' },
  ],
  5: [ // Friday
    { hour: 9, minute: 0, reason: 'Friday morning - weekend mood kicks in' },
    { hour: 12, minute: 30, reason: 'Friday lunch - checked out energy' },
    { hour: 16, minute: 0, reason: 'Friday afternoon - early weekend mode' },
    { hour: 20, minute: 0, reason: 'Friday night scroll before going out' },
  ],
  6: [ // Saturday
    { hour: 10, minute: 30, reason: 'Saturday late morning lazy scroll' },
    { hour: 14, minute: 0, reason: 'Saturday afternoon peak leisure' },
    { hour: 18, minute: 0, reason: 'Saturday evening pre-plans' },
    { hour: 22, minute: 0, reason: 'Saturday late night engagement spike' },
  ],
};

function getOptimalPostTime(): { utc: string; est: string; reason?: string } {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const schedule = DAY_SCHEDULES[dayOfWeek];
  const slot = schedule[Math.floor(Math.random() * schedule.length)];

  return {
    est: `${slot.hour.toString().padStart(2, '0')}:${slot.minute.toString().padStart(2, '0')} EST`,
    utc: `${((slot.hour + 5) % 24).toString().padStart(2, '0')}:${slot.minute.toString().padStart(2, '0')} UTC`,
    reason: slot.reason,
  };
}

// ============================================================
// UTILITY FUNCTIONS
// ============================================================
function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickRandomUnique<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

// ============================================================
// GENERATION FUNCTIONS - Trend-driven
// ============================================================
function generateTitle(category: string, topic: string): string {
  // Try evolved templates first (from genetic algorithm)
  let template: string;
  try {
    const evolved = getEvolvedTemplates(category, 'title', 3);
    if (evolved.length > 0 && Math.random() > 0.5) {
      // 50% chance to use an evolved template
      template = pickRandom(evolved);
    } else {
      template = pickRandom(TITLE_TEMPLATES[category] || TITLE_TEMPLATES.absurd);
    }
  } catch {
    template = pickRandom(TITLE_TEMPLATES[category] || TITLE_TEMPLATES.absurd);
  }
  return template.replace(/\{topic\}/g, topic);
}

function generateCaption(category: string, topic: string): string {
  // Try evolved caption templates first
  let template: string;
  try {
    const evolved = getEvolvedTemplates(category, 'caption', 3);
    if (evolved.length > 0 && Math.random() > 0.6) {
      // 40% chance to use evolved caption
      template = pickRandom(evolved);
    } else {
      template = pickRandom(CAPTION_TEMPLATES[category] || CAPTION_TEMPLATES.absurd);
    }
  } catch {
    template = pickRandom(CAPTION_TEMPLATES[category] || CAPTION_TEMPLATES.absurd);
  }
  return template.replace(/\{topic\}/g, topic);
}

// ============================================================
// MAIN CONCEPT GENERATION - trend.topic IS the content
// ============================================================
export function generateConcept(trend: TrendData): ViralConcept {
  const category = trend.category;
  const topic = trend.topic;
  const title = generateTitle(category, topic);
  const script = generateScript(category, topic);
  const hashtags = pickRandom(HASHTAG_SETS[category] || HASHTAG_SETS.absurd);

  // Knowledge base integration — use live-scored hooks and trending vocab
  let enhancedTitle = title;
  try {
    // Use live effectiveness scorer for hook selection (v2 engine)
    let liveHooks: { formula: string; blendedScore: number }[] = [];
    try {
      liveHooks = getBestHookLive(category, 3);
    } catch {
      // Fall back to static knowledge base hooks
    }

    const hooks = liveHooks.length > 0
      ? liveHooks.map(h => ({ formula: h.formula, effectiveness: h.blendedScore }))
      : getHooksForCategory(category, 3).map(h => ({ formula: h.formula, effectiveness: h.effectiveness }));

    const vocab = getTrendingVocab(5);

    // Use a hook formula when available — weighted by effectiveness
    if (hooks.length > 0 && Math.random() > 0.5) {
      // Weighted selection: higher effectiveness = higher chance
      const totalWeight = hooks.reduce((sum, h) => sum + h.effectiveness, 0);
      let rand = Math.random() * totalWeight;
      let selected = hooks[0];
      for (const hook of hooks) {
        rand -= hook.effectiveness;
        if (rand <= 0) {
          selected = hook;
          break;
        }
      }
      enhancedTitle = selected.formula.replace(/\{topic\}/g, topic);
    }

    // Sprinkle trending vocab into caption
    if (vocab.length > 0) {
      const vocabTerm = vocab[Math.floor(Math.random() * vocab.length)];
      // Vocab influences caption generation below
    }
  } catch {
    // Knowledge base not available — continue with template title
  }

  // Platform virality scoring
  const conceptForScoring = {
    id: uuidv4(),
    title: enhancedTitle,
    script,
    soraPrompt: '',
    veoPrompt: '',
    caption: '',
    hashtags,
    postTime: getOptimalPostTime(),
    whyItWorks: '',
    trendSource: '',
    category: category as ViralConcept['category'],
  };
  const platformVirality = scorePlatformVirality(conceptForScoring, trend);
  const avgVirality = (platformVirality.tiktok.score + platformVirality.youtubeShorts.score) / 2;
  const monetization = estimateMonetization(category, avgVirality);

  // Generate A/B/C variants for title/caption testing
  let variants;
  try {
    variants = generateVariants(
      category,
      topic,
      TITLE_TEMPLATES[category] || TITLE_TEMPLATES.absurd,
      CAPTION_TEMPLATES[category] || CAPTION_TEMPLATES.absurd
    );
  } catch {
    // A/B system not available
  }

  return {
    id: uuidv4(),
    title: enhancedTitle,
    script,
    soraPrompt: generateSoraPrompt(title, script, category, topic),
    veoPrompt: generateVeoPrompt(title, script, category, topic),
    caption: generateCaption(category, topic),
    hashtags,
    postTime: getOptimalPostTime(),
    whyItWorks: pickRandom(WHY_IT_WORKS[category] || WHY_IT_WORKS.absurd),
    trendSource: `${trend.source}: ${trend.topic}`,
    category: category as ViralConcept['category'],
    platformVirality,
    monetization,
    variants,
  };
}

// Generate concepts from trend array — one concept per trend
export function generateConceptsFromTrends(trends: TrendData[], maxPerCategory: number = 3): ViralConcept[] {
  const categoryCount: Record<string, number> = {};
  const concepts: ViralConcept[] = [];

  // Sort by score descending
  const sorted = [...trends].sort((a, b) => b.score - a.score);

  for (const trend of sorted) {
    const cat = trend.category;
    if ((categoryCount[cat] || 0) >= maxPerCategory) continue;
    concepts.push(generateConcept(trend));
    categoryCount[cat] = (categoryCount[cat] || 0) + 1;
  }

  return concepts;
}

// Group concepts by category
export function generateAllConcepts(trends: TrendData[]): Record<string, ViralConcept[]> {
  const concepts = generateConceptsFromTrends(trends, 3);
  const result: Record<string, ViralConcept[]> = {};

  concepts.forEach(concept => {
    if (!result[concept.category]) result[concept.category] = [];
    result[concept.category].push(concept);
  });

  return result;
}

// Backward compat
export function generateFiveConcepts(trends: TrendData[]): ViralConcept[] {
  return generateConceptsFromTrends(trends);
}

// Legacy compat — still works if called with old signature
export function generateConceptsForCategory(
  category: string,
  trends: TrendData[],
  count: number = 3
): ViralConcept[] {
  const categoryTrends = trends.filter(t => t.category === category);
  return generateConceptsFromTrends(categoryTrends, count);
}
