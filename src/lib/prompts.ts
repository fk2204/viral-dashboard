import { ScriptSegment } from '@/types';

export function generateSoraPrompt(
  title: string,
  script: ScriptSegment[],
  category: string,
  topic: string
): string {
  const styleByCategory: Record<string, string> = {
    news: 'cinematic documentary style, news broadcast aesthetic, dramatic lighting, CNN/BBC visual language, 2026 breaking news graphics',
    absurd: 'surrealist visuals, unexpected physics, dreamlike quality, reality-bending, backrooms aesthetic meets TikTok brainrot',
    luxury: 'quiet luxury aesthetic, golden hour lighting, slow motion elegance, old money visual language, stealth wealth 2026',
    emotional: 'intimate cinematography, warm color grading, nostalgic film grain, romanticize your life aesthetic, golden hour moments',
    tech: 'futuristic sci-fi aesthetic, neon accents, sleek minimalism, holographic elements, AGI-era visual language meets Apple',
    cartoon: 'Spider-Verse style animation, Studio Ghibli warmth, exaggerated physics, mixed media animation, 2026 animation trends',
    gaming: 'RGB neon gaming aesthetic, screen glow, competitive esports energy, streamer setup vibes, 2026 gaming culture',
    fitness: 'gym cinematography, golden hour sweat, transformation montage, motivational energy, athletic lighting',
    food: 'food photography lighting, macro lens detail, steam and sizzle, warm kitchen aesthetic, ASMR-ready',
    finance: 'clean corporate aesthetic, stock ticker overlays, wealth visualization, professional authority, success imagery',
    music: 'concert stage lighting, audio waveform visuals, studio session aesthetic, festival energy, vinyl and neon',
    relationships: 'warm intimate cinematography, couple aesthetic, soft lighting, genuine emotion, rom-com visual language',
  };

  const style = styleByCategory[category] || styleByCategory.absurd;

  const duration = script.reduce((acc, s) => {
    const [, end] = s.timeRange.split('-');
    return end;
  }, '0:00');

  return `Create a ${duration} vertical video (9:16 aspect ratio) optimized for TikTok and YouTube Shorts.

TITLE: ${title}

TRENDING TOPIC: ${topic}

STYLE: ${style}

VISUAL SEQUENCE:
${script.map((s) => `[${s.timeRange}] ${s.visual}${s.camera ? ` (${s.camera})` : ''}`).join('\n')}

CAMERA WORK:
${script.map(s => `- ${s.camera}`).filter((v, i, a) => a.indexOf(v) === i).join('\n')}

KEY REQUIREMENTS:
- Vertical 9:16 format optimized for mobile viewing on TikTok and YouTube Shorts
- First 0.5 seconds must be visually jarring to stop scrolling on both TikTok and YouTube Shorts
- High visual impact hook that creates pattern interrupt
- Smooth transitions between scenes
- Base concept around trending topic: ${topic}
${category === 'luxury' ? '- Transform the topic into impossibly luxurious and aspirational content' : ''}
${category === 'absurd' ? '- Break physics and reality while keeping the topic recognizable' : ''}
${category === 'emotional' ? '- Create nostalgic, bittersweet feeling around this trending moment' : ''}
${category === 'news' ? '- Treat this trending topic as breaking news with dramatic urgency' : ''}
${category === 'tech' ? '- Show futuristic/AI version of this trending topic' : ''}
${category === 'cartoon' ? '- Use 2D animation style with exaggerated cartoon physics, squash and stretch, impossible actions' : ''}
${category === 'gaming' ? '- Use RGB gaming aesthetic, screen glow effects, competitive energy' : ''}
${category === 'fitness' ? '- Show transformation energy, gym lighting, motivational montage feel' : ''}
${category === 'food' ? '- Extreme close-up food shots, steam, sizzle, cheese pull, ASMR-quality audio focus' : ''}
${category === 'finance' ? '- Clean professional aesthetic, show numbers/charts, authority and credibility' : ''}
${category === 'music' ? '- Concert/studio energy, audio visualization, beat-synced cuts' : ''}
${category === 'relationships' ? '- Intimate, genuine emotion, warm lighting, couple/dating aesthetic' : ''}

MOOD: ${category === 'emotional' ? 'Nostalgic, bittersweet' : category === 'cartoon' ? 'Playful, chaotic, comedic' : 'Engaging, captivating'}

PLATFORM OPTIMIZATION: Optimized for vertical short-form video (TikTok, YouTube Shorts) with scroll-stopping hook in first frame.

Generate this as a single continuous shot with seamless transitions.`;
}

export function generateVeoPrompt(
  title: string,
  script: ScriptSegment[],
  category: string,
  topic: string
): string {
  const cameraStyles: Record<string, string> = {
    news: 'documentary tracking shot, handheld urgency, news broadcast framing',
    absurd: 'impossible camera angles, physics-defying movement, Dutch angles, reality warping',
    luxury: 'smooth crane shots, dolly zoom, stabilized glide, cinematic elegance',
    emotional: 'intimate close-ups, shallow depth of field, gentle push-ins, handheld warmth',
    tech: 'drone shots, robotic precision, macro to wide transitions, holographic overlays',
    cartoon: 'Spider-Verse dynamic camera, snap zooms, whip pans, Ghibli flowing movement, mixed animation cinematography',
    gaming: 'screen capture zoom, POV gameplay, RGB ambient glow, streamer setup cam',
    fitness: 'low angle power shots, mirror gym shots, transformation split screen, sweat macro',
    food: 'overhead cooking cam, macro food lens, orbit around plate, ASMR detail shots',
    finance: 'clean over-shoulder, screen recording, lifestyle wide shots, authority framing',
    music: 'concert tracking shot, studio session close-ups, crowd wide shots, instrument detail',
    relationships: 'intimate close-ups, couple POV, phone screen capture, genuine reaction shots',
  };

  const camera = cameraStyles[category] || cameraStyles.absurd;

  const duration = script.reduce((acc, s) => {
    const [, end] = s.timeRange.split('-');
    return end;
  }, '0:00');

  return `[VEO 3 PROMPT]

VIDEO SPECS:
- Duration: ${duration}
- Aspect Ratio: 9:16 (TikTok and YouTube Shorts vertical)
- Resolution: 1080x1920
- Frame Rate: 60fps for smoothness

CONCEPT: ${title}
TRENDING TOPIC: ${topic}

CAMERA STYLE: ${camera}

SCENE BREAKDOWN:
${script.map((segment, index) => `
SCENE ${index + 1} [${segment.timeRange}]:
Visual: ${segment.visual}
Camera: ${segment.camera}
${segment.onScreenText ? `Text Overlay: "${segment.onScreenText}"` : 'No text overlay'}
`).join('')}

VISUAL STYLE:
${category === 'news' ? '- Breaking news urgency, high contrast, dramatic shadows, lower third graphics' : ''}
${category === 'absurd' ? '- Surreal color grading, unexpected scale shifts, reality-bending, dreamlike' : ''}
${category === 'luxury' ? '- Rich blacks, golden highlights, magazine-quality lighting, aspirational' : ''}
${category === 'emotional' ? '- Warm tones, soft focus moments, cinematic grain, intimate' : ''}
${category === 'tech' ? '- Cool blue accents, clean lines, holographic overlays, futuristic UI elements' : ''}
${category === 'cartoon' ? '- 2D animated style, bold outlines, saturated colors, squash and stretch, rubber hose limbs' : ''}
${category === 'gaming' ? '- RGB neon glow, screen-capture aesthetic, competitive energy, dark with accent lighting' : ''}
${category === 'fitness' ? '- Gym lighting, sweat glistening, power angles, transformation energy' : ''}
${category === 'food' ? '- Warm kitchen lighting, extreme food detail, steam and sizzle, appetizing color grade' : ''}
${category === 'finance' ? '- Clean professional look, charts and numbers, success imagery, authority' : ''}
${category === 'music' ? '- Concert stage lighting, neon accents, audio waveforms, beat-synced energy' : ''}
${category === 'relationships' ? '- Warm intimate lighting, soft focus, genuine emotion, couple aesthetic' : ''}

CORE CONCEPT: Take the trending topic "${topic}" and transform it through ${category} visual lens.

AUDIO SUGGESTION: ${
  category === 'emotional' ? 'Soft piano, ambient, nostalgic' :
  category === 'luxury' ? 'Deep bass, elegant, sophisticated' :
  category === 'absurd' ? 'Chaotic sound design, unexpected sfx' :
  category === 'news' ? 'Dramatic news score, tension building' :
  category === 'cartoon' ? 'Classic cartoon sound effects, whimsical music, boings and zaps' :
  category === 'gaming' ? 'Epic gaming soundtrack, RGB bass drops, victory fanfare' :
  category === 'fitness' ? 'Motivational beats, heavy bass workout music, transformation montage score' :
  category === 'food' ? 'ASMR cooking sounds, sizzle and crunch, warm acoustic background' :
  category === 'finance' ? 'Corporate confidence, clean electronic, success music' :
  category === 'music' ? 'The featured track itself, concert audio, studio session sounds' :
  category === 'relationships' ? 'Emotional piano, love song snippet, intimate acoustic' :
  'Electronic, futuristic, techy'
}

HOOK REQUIREMENT: First 0.5 seconds must be visually jarring to stop scrolling on both TikTok and YouTube Shorts. Create immediate pattern interrupt.

PLATFORM OPTIMIZATION: Optimized for vertical short-form video (TikTok, YouTube Shorts) with mobile-first framing and scroll-stopping hook.

TRANSITIONS: ${category === 'cartoon' ? 'Classic animation transitions, iris wipes, smear frames' : 'Seamless morphs between scenes, no hard cuts'}.`;
}

export function generateScript(category: string, topic: string): ScriptSegment[] {
  const scripts: Record<string, (topic: string) => ScriptSegment[]> = {
    news: (topic) => [
      {
        timeRange: '0:00-0:02',
        visual: `URGENT: Breaking graphic with "${topic}" headline flashing`,
        onScreenText: 'BREAKING',
        camera: 'Snap zoom into frame'
      },
      {
        timeRange: '0:02-0:07',
        visual: `Quick-cut montage revealing the untold story of ${topic}`,
        onScreenText: 'Here is what they are hiding',
        camera: 'Handheld, urgent tracking shots'
      },
      {
        timeRange: '0:07-0:12',
        visual: `The reveal — the part about ${topic} nobody expected`,
        onScreenText: null,
        camera: 'Dramatic slow push-in'
      },
      {
        timeRange: '0:12-0:15',
        visual: `Call to action — follow/subscribe for more on ${topic}`,
        onScreenText: 'Follow for Part 2',
        camera: 'Direct to camera'
      },
    ],

    absurd: (topic) => [
      {
        timeRange: '0:00-0:02',
        visual: `Record scratch — you are probably wondering how ${topic} ended up here`,
        onScreenText: 'Wait what',
        camera: 'Freeze frame, snap to life'
      },
      {
        timeRange: '0:02-0:07',
        visual: `Reality glitches — ${topic} starts defying physics, objects warp and float`,
        onScreenText: 'This is not normal',
        camera: 'Dutch angle, reality-bending camera shake'
      },
      {
        timeRange: '0:07-0:12',
        visual: `Full surreal chaos — ${topic} in impossible scenario across multiple dimensions`,
        onScreenText: null,
        camera: 'Impossible camera movement through warped space'
      },
      {
        timeRange: '0:12-0:15',
        visual: `Deadpan reaction as ${topic} casually breaks the universe`,
        onScreenText: 'Just another Tuesday',
        camera: 'Snap zoom to confused face'
      },
    ],

    luxury: (topic) => [
      {
        timeRange: '0:00-0:02',
        visual: `Extreme close-up of diamond-encrusted object related to ${topic}, light glinting`,
        onScreenText: 'POV: You made it',
        camera: 'Macro lens, golden hour glow'
      },
      {
        timeRange: '0:02-0:08',
        visual: `Slow reveal of impossibly luxurious version of ${topic} — marble, gold, private staff`,
        onScreenText: null,
        camera: 'Smooth crane shot revealing full scene'
      },
      {
        timeRange: '0:08-0:13',
        visual: `Casual flex during ${topic} — butler hands you something, yacht in background`,
        onScreenText: 'Quiet luxury',
        camera: 'Stabilized glide, old money elegance'
      },
      {
        timeRange: '0:13-0:15',
        visual: `Subtle wrist reveal (watch/bracelet) as you complete ${topic}`,
        onScreenText: null,
        camera: 'Slow zoom out, tasteful flex'
      },
    ],

    emotional: (topic) => [
      {
        timeRange: '0:00-0:02',
        visual: `Childhood home-video aesthetic — young you experiencing ${topic} for first time`,
        onScreenText: 'Remember this',
        camera: 'Handheld, nostalgic film grain'
      },
      {
        timeRange: '0:02-0:07',
        visual: `Time-lapse montage of ${topic} through different life stages — growing up, changing`,
        onScreenText: 'When did we grow up',
        camera: 'Gentle dissolves, warm color grade'
      },
      {
        timeRange: '0:07-0:12',
        visual: `Present day ${topic} — same action, different feeling, bittersweet realization`,
        onScreenText: null,
        camera: 'Intimate close-up, shallow depth of field'
      },
      {
        timeRange: '0:12-0:15',
        visual: `Finding beauty in the mundane — ${topic} as meditation, gratitude moment`,
        onScreenText: 'Cherish the little things',
        camera: 'Pull back into warm light, romanticize your life'
      },
    ],

    tech: (topic) => [
      {
        timeRange: '0:00-0:02',
        visual: `Glitch transition — AI interface booting up, scanning ${topic}`,
        onScreenText: 'Year 2030',
        camera: 'Digital zoom, holographic UI overlay'
      },
      {
        timeRange: '0:02-0:08',
        visual: `Futuristic version of ${topic} — robots, neural links, holographic displays`,
        onScreenText: 'AI can do this now',
        camera: 'Orbital camera move, smooth robotic precision'
      },
      {
        timeRange: '0:08-0:13',
        visual: `Mind-bending visualization — ${topic} transformed into data streams, particle effects`,
        onScreenText: null,
        camera: 'Matrix-style camera, macro to wide transition'
      },
      {
        timeRange: '0:13-0:15',
        visual: `Reveal the future of ${topic} — utopia or dystopia, leave them wondering`,
        onScreenText: 'This is just the beginning',
        camera: 'Epic pull back, neon glow'
      },
    ],

    cartoon: (topic) => [
      {
        timeRange: '0:00-0:02',
        visual: `ACME-style intro card — character about to attempt ${topic}, confident pose`,
        onScreenText: 'This will be easy',
        camera: 'Classic cartoon establishing shot, snap zoom'
      },
      {
        timeRange: '0:02-0:07',
        visual: `${topic} goes hilariously wrong — anvils drop, limbs stretch, physics broken`,
        onScreenText: 'Uh oh',
        camera: 'Whip pan, Dutch angles, smear frames'
      },
      {
        timeRange: '0:07-0:12',
        visual: `Looney Tunes chaos — character runs off cliff during ${topic}, pauses mid-air, looks at camera`,
        onScreenText: null,
        camera: 'Snap zoom to worried face, impossible angles'
      },
      {
        timeRange: '0:12-0:15',
        visual: `Cartoon resolution — character flattened like pancake after ${topic}, pops back to normal`,
        onScreenText: 'That is all folks',
        camera: 'Iris wipe close, classic animation outro'
      },
    ],

    gaming: (topic) => [
      {
        timeRange: '0:00-0:02',
        visual: `GAME OVER screen glitches into highlight reel of ${topic}`,
        onScreenText: 'WATCH THIS',
        camera: 'Screen capture snap zoom, RGB glow'
      },
      {
        timeRange: '0:02-0:07',
        visual: `Intense gameplay montage — ${topic} with impossible plays and clutch moments`,
        onScreenText: 'The play that broke ranked',
        camera: 'POV gameplay, rapid cuts, controller cam'
      },
      {
        timeRange: '0:07-0:12',
        visual: `The insane clutch — ${topic} final moment where everything comes together`,
        onScreenText: null,
        camera: 'Slow motion replay, crowd reaction overlay'
      },
      {
        timeRange: '0:12-0:15',
        visual: `Victory screen with stats — ${topic} domination complete`,
        onScreenText: 'GG. Follow for more',
        camera: 'Leaning back in chair, celebration'
      },
    ],

    fitness: (topic) => [
      {
        timeRange: '0:00-0:02',
        visual: `Split screen: Day 1 vs Day 90 transformation related to ${topic}`,
        onScreenText: 'WAIT FOR IT',
        camera: 'Before/after snap cut, gym lighting'
      },
      {
        timeRange: '0:02-0:07',
        visual: `Intense workout montage — ${topic} routine with perfect form and heavy weights`,
        onScreenText: 'The routine nobody talks about',
        camera: 'Low angle power shots, sweat detail'
      },
      {
        timeRange: '0:07-0:12',
        visual: `The results — mirror flexing after ${topic} program, visible transformation`,
        onScreenText: null,
        camera: 'Slow pan, golden gym lighting'
      },
      {
        timeRange: '0:12-0:15',
        visual: `Call to action — ${topic} workout plan pinned in comments`,
        onScreenText: 'Full routine in comments',
        camera: 'Direct to camera, confident nod'
      },
    ],

    food: (topic) => [
      {
        timeRange: '0:00-0:02',
        visual: `Extreme close-up of sizzling/melting/pouring — ${topic} in its most appetizing form`,
        onScreenText: 'YOU NEED THIS',
        camera: 'Macro lens, ASMR-ready audio'
      },
      {
        timeRange: '0:02-0:07',
        visual: `Overhead cooking montage — preparing ${topic} with satisfying cuts and sound`,
        onScreenText: 'The recipe that broke TikTok',
        camera: 'Overhead bird-eye, knife skills, pour shots'
      },
      {
        timeRange: '0:07-0:12',
        visual: `The money shot — finished ${topic} plated beautifully, steam rising, cheese pull`,
        onScreenText: null,
        camera: 'Slow orbit around plate, golden hour window light'
      },
      {
        timeRange: '0:12-0:15',
        visual: `First bite reaction — eyes close, chef's kiss for ${topic}`,
        onScreenText: 'Recipe in comments',
        camera: 'Close-up reaction shot'
      },
    ],

    finance: (topic) => [
      {
        timeRange: '0:00-0:02',
        visual: `Stack of cash / portfolio screenshot showing gains related to ${topic}`,
        onScreenText: 'READ THIS',
        camera: 'Snap zoom on numbers, money counting ASMR'
      },
      {
        timeRange: '0:02-0:07',
        visual: `Whiteboard/screen breakdown of ${topic} strategy — charts, arrows, simple visuals`,
        onScreenText: 'The hack they dont teach you',
        camera: 'Over-shoulder to screen, clean graphics'
      },
      {
        timeRange: '0:07-0:12',
        visual: `The proof — real results from ${topic} strategy, calculator showing compound growth`,
        onScreenText: null,
        camera: 'Screen recording, numbers ticking up'
      },
      {
        timeRange: '0:12-0:15',
        visual: `Lifestyle shot — what ${topic} income looks like in practice`,
        onScreenText: 'Follow for more money tips',
        camera: 'Wide shot, casual luxury setup'
      },
    ],

    music: (topic) => [
      {
        timeRange: '0:00-0:02',
        visual: `Audio waveform visualization explodes — first beat of ${topic} drops hard`,
        onScreenText: 'LISTEN',
        camera: 'Bass vibration effect, speaker close-up'
      },
      {
        timeRange: '0:02-0:07',
        visual: `Performance/production montage — ${topic} being created or performed live`,
        onScreenText: 'This sound is taking over',
        camera: 'Concert lighting, studio session, mixing board'
      },
      {
        timeRange: '0:07-0:12',
        visual: `The drop/chorus — ${topic} at its peak with crowd reaction or visual spectacle`,
        onScreenText: null,
        camera: 'Wide crowd shot or studio euphoria moment'
      },
      {
        timeRange: '0:12-0:15',
        visual: `Replay hook — just the best 2 seconds of ${topic} looped with text overlay`,
        onScreenText: 'Song ID in comments',
        camera: 'Aesthetic album art or artist silhouette'
      },
    ],

    relationships: (topic) => [
      {
        timeRange: '0:00-0:02',
        visual: `Text message screenshot or couple POV that hooks with ${topic} drama`,
        onScreenText: 'STORYTIME',
        camera: 'Phone screen recording, dramatic zoom'
      },
      {
        timeRange: '0:02-0:07',
        visual: `The story unfolds — ${topic} situation escalating with couple dynamics`,
        onScreenText: 'This is where it gets real',
        camera: 'Talking to camera, expressive, intimate framing'
      },
      {
        timeRange: '0:07-0:12',
        visual: `The twist/resolution — ${topic} reveals something unexpected about the relationship`,
        onScreenText: null,
        camera: 'Reaction shot, genuine emotion'
      },
      {
        timeRange: '0:12-0:15',
        visual: `CTA — ask audience about their ${topic} experience`,
        onScreenText: 'Red flag or green flag? Comment',
        camera: 'Direct to camera, inviting engagement'
      },
    ],
  };

  const scriptGenerator = scripts[category] || scripts.absurd;
  return scriptGenerator(topic);
}
