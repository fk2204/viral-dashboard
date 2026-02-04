import { ScriptSegment } from '@/types';

export function generateSoraPrompt(
  title: string,
  script: ScriptSegment[],
  category: string,
  event: string
): string {
  const styleByCategory: Record<string, string> = {
    news: 'hyper-realistic news broadcast aesthetic with cinematic tension. Think BBC documentary meets thriller film. High contrast lighting, shallow depth of field on subjects, lens flares on graphics. Color grade: desaturated with punchy reds for alerts. Film grain subtle but present. Every frame should feel like evidence.',
    absurd: 'liminal space surrealism meets TikTok energy. David Lynch directing a fever dream. Reality bends with purpose - physics breaks should feel intentional and unsettling. Color palette shifts from normal to increasingly wrong. Chromatic aberration on glitches. Mix of hyperreal and impossible. The mundane made cosmic horror lite.',
    luxury: 'quiet luxury cinematography - think Succession meets architectural digest. Golden hour perpetually. Shallow depth of field isolating expensive details. Color grade: warm shadows, creamy highlights, desaturated midtones. Movement should feel effortless - steadicam glides, subtle crane moves. Every frame could be a magazine spread. Texture is everything: cashmere, marble, old money patina.',
    emotional: 'nostalgic Super 8 aesthetic evolving to clean digital present. Film grain heavy in memories, pristine in present. Color grade: amber-heavy past, cooler present with moments of warmth breaking through. Soft focus on memory, sharp focus on emotion. Lens choices should feel personal - slight vignetting, imperfect but intentional. Every frame should ache.',
    tech: 'cyberpunk-clinical fusion. Blade Runner 2049 meets Apple keynote. Holographic UI elements with depth and parallax. Color grade: teal shadows, orange highlights, with pops of interface blue. Clean lines but lived-in future. Mix of sterile perfection and human imperfection beneath. Volumetric lighting through digital elements. The future is beautiful and slightly wrong.',
    cartoon: 'golden age animation meets modern fluidity. Tex Avery timing with Studio Ghibli polish. Squash and stretch pushed to extremes. Smear frames on fast motion. Color palette: saturated but harmonious, classic cartoon primaries. Line weight varies with motion. Every movement should have anticipation, action, follow-through. Physics are suggestions. Comedy is timing.',
  };

  const style = styleByCategory[category] || styleByCategory.absurd;

  const moodByCategory: Record<string, string> = {
    news: 'Urgent, paranoid, compellingly unsettling. The viewer should feel like theyve stumbled onto something they werent supposed to see.',
    absurd: 'Unnerving calm that builds to surreal acceptance. The humor comes from deadpan reaction to impossible situations. Existential but entertaining.',
    luxury: 'Serene aspiration with undercurrent of obscene wealth. Viewer should feel both desire and slight discomfort at the casual excess.',
    emotional: 'Bittersweet longing that builds to quiet acceptance. The sadness should feel earned, the resolution should feel hopeful without being cheap.',
    tech: 'Awe mixed with existential unease. Progress is beautiful and slightly threatening. The viewer should question what humanity means.',
    cartoon: 'Chaotic joy with perfectly timed beats. Slapstick that respects the audience. The humor should work on multiple viewings.',
  };

  const technicalByCategory: Record<string, string> = {
    news: 'Mixed media approach: security cam footage (lower quality, timestamps), handheld documentary (slight shake), polished studio shots (crisp, lit). Transitions should feel like evidence compilation.',
    absurd: 'Start grounded in reality, progressively destabilize. Camera should react to impossible physics - shake when reality breaks, struggle to maintain frame. Practical effect aesthetic even for impossible things.',
    luxury: 'Every shot could be a photograph. Motivated lighting only - windows, lamps, natural sources. Movement is always smooth, never rushed. Let wealth speak quietly through details, never overt.',
    emotional: 'Match cuts connecting past and present. Light should tell emotional story - golden past, cooler present. Close-ups on hands, objects, details that carry memory. Wide shots for isolation.',
    tech: 'AR/UI elements should have depth and react to environment. Mix first-person POV through interface with third-person observational. Technology should feel integrated, not overlaid.',
    cartoon: 'Traditional animation principles: anticipation before every action, exaggerated poses, held frames for comedy. Camera should participate in gags - shake on impacts, whip with character movement.',
  };

  return `[SORA VIDEO GENERATION PROMPT]

Create a ${script.reduce((acc, s) => {
    const [, end] = s.timeRange.split('-');
    return end;
  }, '0:00')} vertical video (9:16 aspect ratio, 1080x1920) optimized for TikTok virality.

═══════════════════════════════════════
CONCEPT
═══════════════════════════════════════
TITLE: "${title}"
CORE MOMENT: ${event}
CATEGORY: ${category.toUpperCase()}

The entire video transforms the mundane moment of "${event}" through a ${category} lens, making the universal specific and the ordinary extraordinary.

═══════════════════════════════════════
VISUAL STYLE & CINEMATOGRAPHY
═══════════════════════════════════════
${style}

TECHNICAL APPROACH:
${technicalByCategory[category] || technicalByCategory.absurd}

═══════════════════════════════════════
SCENE-BY-SCENE BREAKDOWN
═══════════════════════════════════════
${script.map((s, i) => `
SCENE ${i + 1} [${s.timeRange}]
Visual: ${s.visual}
Camera: ${s.camera}
${s.onScreenText ? `On-Screen Text: "${s.onScreenText}" - integrate naturally into scene` : 'No text overlay - pure visual storytelling'}
Transition to next: ${i < script.length - 1 ? 'seamless morph maintaining momentum' : 'final frame should linger'}
`).join('')}

═══════════════════════════════════════
MOOD & EMOTIONAL JOURNEY
═══════════════════════════════════════
${moodByCategory[category] || moodByCategory.absurd}

Emotional arc: Hook (curiosity/confusion) → Build (investment) → Peak (satisfaction/revelation) → Resolve (desire to share/rewatch)

═══════════════════════════════════════
CRITICAL REQUIREMENTS
═══════════════════════════════════════
1. HOOK (0:00-0:03): First frame must stop the scroll. High contrast, unexpected image, or movement that demands attention. Viewer decides to watch or skip in 0.3 seconds.

2. FORMAT: Vertical 9:16 optimized for mobile. Key action in center-safe zone. No critical elements in top/bottom 10% (UI overlap areas).

3. PACING: TikTok native rhythm. Cuts or significant visual changes every 2-3 seconds maximum. Stillness only when intentional for effect.

4. RELATABILITY: "${event}" must remain recognizable throughout transformation. The more extreme the style, the more grounded the core moment should feel.

5. REWATCHABILITY: Include details that reward second viewing. Easter eggs, subtle changes, or moments that gain meaning on rewatch.

6. SHAREABILITY: Create at least one frame that works as a screenshot/meme. One moment that captures the entire concept.

Generate as continuous video with seamless internal transitions. No hard cuts unless stylistically motivated.`;
}

export function generateVeoPrompt(
  title: string,
  script: ScriptSegment[],
  category: string,
  event: string
): string {
  const cameraStyles: Record<string, string> = {
    news: 'Mixed coverage approach: surveillance footage aesthetic (fixed, slightly degraded), breaking news steadicam (controlled urgency), interview setups (shallow DOF, dramatic key light). Motivated camera movement only - camera reacts to events, never arbitrary.',
    absurd: 'Camera as unreliable narrator. Starts stable, increasingly unhinged. Dutch angles that progressively tilt. Impossible tracking shots through solid objects. Camera shake that syncs with reality breaks. POV shifts without warning. The camera itself is affected by the surreal events.',
    luxury: 'Architectural photography in motion. Steadicam glides at walking pace. Crane moves that reveal scale. Macro details of textures transitioning to wide establishing shots. Movement is always motivated by beauty, never by urgency. Camera discovers luxury, never hunts for it.',
    emotional: 'Memory-motivated movement. Handheld intimacy for emotional peaks. Locked-off stillness for contemplation. Push-ins during realization moments. Match cuts that rhyme across time periods. Camera becomes closer as emotions deepen. Wide shots only for isolation beats.',
    tech: 'First-person POV through augmented interface. Camera exists in both physical and digital space simultaneously. Drone-like omniscience for data visualization. Robotic precision for tech shots, human imperfection bleeding through. Parallax on UI elements. Camera can access impossible viewpoints because technology allows it.',
    cartoon: 'Camera participates in comedy. Shake on impacts. Whip pans following character movement. Snap zooms for emphasis. Camera can squash and stretch with action. Iris transitions, wipes, classic devices. Camera timing is part of the joke - holds for reactions, cuts for punchlines.',
  };

  const colorGrading: Record<string, string> = {
    news: 'Broadcast color science with cinematic drama. Slightly desaturated midtones, punchy contrast. Red channel boosted for alert graphics. Blue shadows for surveillance footage. Skin tones preserved for interviews. News lower-thirds in brand-appropriate colors.',
    absurd: 'Progressive color corruption. Opens with naturalistic grading, shifts to increasingly wrong palette. Complementary colors that shouldnt work together. Chromatic aberration on glitches. Color banding in liminal spaces. The color grade tells you reality is wrong before the visuals do.',
    luxury: 'Old money color science. Warm shadows, never muddy. Highlights creamy, never blown. Skin tones with subtle golden undertone. Rich blacks in fabrics. Golden hour simulation even in interiors. Colors that feel expensive - nothing garish, nothing cheap. Desaturated enough to feel editorial.',
    emotional: 'Temporal color storytelling. Past sequences: heavy amber/sepia push, lifted blacks, soft contrast. Present sequences: cooler, cleaner, with warmth breaking through in emotional moments. Color temperature shift tells the story of time passing.',
    tech: 'Cyberpunk-clinical hybrid. Teal in shadows, orange in highlights, but restrained. Interface elements in consistent accent color (blue recommended). Clean whites for sterile environments. Subtle color shifts when switching between digital and physical reality.',
    cartoon: 'Saturated but harmonious. Classic cartoon primaries: clean reds, yellows, blues. Shadows in complementary colors, never black. Consistent palette throughout. Colors should feel hand-picked, not generated. Slight texture overlay to avoid flat digital look.',
  };

  const audioDesign: Record<string, string> = {
    news: 'Tension underscore building throughout. News stinger on BREAKING moments. Whoosh transitions between footage types. Subtle static/interference on surveillance clips. Expert interview: room tone, slight reverb. Final reveal: dramatic hit, then silence.',
    absurd: 'Sound design tells the surreal story. Normal ambient opens, increasingly wrong sounds creep in. Reversed audio, pitch-shifted familiar sounds. Bass drop when reality breaks. Silence in impossible moments. Sound should be slightly ahead of or behind visuals to enhance unease.',
    luxury: 'ASMR-adjacent sound design. Texture sounds: fabric, marble, liquid. Everything recorded close, intimate. No harsh frequencies. Deep, subtle bass presence. Music: ambient, minimal, expensive-sounding. Silence is comfortable, not tense.',
    emotional: 'Music-driven emotional journey. Nostalgic sequences: warm analog instruments, vinyl texture. Present sequences: cleaner production, same melodic themes. Sound design minimal - let music carry emotion. Key moment: music drops for raw ambient, emotional impact.',
    tech: 'Procedural sound design. UI interactions have consistent audio language. Data visualization: synthesized, rhythmic, almost musical. Physical world: slightly muted compared to digital. Glitch sounds when old memories surface. Future should sound clean but slightly cold.',
    cartoon: 'Classic cartoon foley. Every action has exaggerated sound: boings, zaps, slide whistles. Music follows action - mickey-mousing encouraged. Silence before big impacts. Sound effects slightly ahead of visuals for comedy timing. Orchestral stings for emphasis.',
  };

  return `[VEO 3 VIDEO GENERATION PROMPT]

═══════════════════════════════════════════════════════════════
TECHNICAL SPECIFICATIONS
═══════════════════════════════════════════════════════════════
Duration: ${script.reduce((acc, s) => {
    const [, end] = s.timeRange.split('-');
    return end;
  }, '0:00')}
Aspect Ratio: 9:16 (vertical, TikTok-native)
Resolution: 1080x1920 (full HD vertical)
Frame Rate: 60fps (smooth motion, platform-optimized)
Codec: H.265 preferred for quality/size ratio

═══════════════════════════════════════════════════════════════
CREATIVE BRIEF
═══════════════════════════════════════════════════════════════
TITLE: "${title}"
CONCEPT: Transform the universal moment of "${event}" through ${category} visual storytelling
GOAL: Create scroll-stopping content that demands rewatching and sharing

This video takes something everyone experiences - ${event} - and elevates it through ${category} treatment, creating content that feels both deeply personal and infinitely shareable.

═══════════════════════════════════════════════════════════════
CINEMATOGRAPHY APPROACH
═══════════════════════════════════════════════════════════════
${cameraStyles[category] || cameraStyles.absurd}

═══════════════════════════════════════════════════════════════
COLOR GRADING DIRECTION
═══════════════════════════════════════════════════════════════
${colorGrading[category] || colorGrading.absurd}

═══════════════════════════════════════════════════════════════
DETAILED SCENE BREAKDOWN
═══════════════════════════════════════════════════════════════
${script.map((segment, index) => `
┌─────────────────────────────────────────────────────────────
│ SCENE ${index + 1} [${segment.timeRange}]
├─────────────────────────────────────────────────────────────
│ VISUAL DESCRIPTION:
│ ${segment.visual}
│
│ CAMERA DIRECTION:
│ ${segment.camera}
│
│ TEXT OVERLAY:
│ ${segment.onScreenText ? `"${segment.onScreenText}" - typography should match ${category} aesthetic, appear organically` : 'None - visual storytelling only'}
│
│ TRANSITION OUT:
│ ${index < script.length - 1 ? 'Seamless morph to next scene, maintaining visual momentum' : 'Hold final frame, allow beat for emotional landing'}
└─────────────────────────────────────────────────────────────`).join('\n')}

═══════════════════════════════════════════════════════════════
AUDIO DESIGN DIRECTION
═══════════════════════════════════════════════════════════════
${audioDesign[category] || audioDesign.absurd}

═══════════════════════════════════════════════════════════════
VIRALITY OPTIMIZATION
═══════════════════════════════════════════════════════════════
HOOK FRAME (0:00): The first frame must work as a still image. High contrast, unexpected composition, or mid-action freeze that demands context. This single frame determines if viewers watch or scroll.

PATTERN INTERRUPT: Include at least one moment that subverts expectation. The brain notices novelty - give it something to notice.

LOOP POTENTIAL: Final frame should create desire to rewatch. Either callback to opening, revelation that recontextualizes beginning, or cliffhanger energy.

SCREENSHOT MOMENT: One frame should capture the entire concept. This is the frame that gets shared as a still, driving traffic back to the video.

COMMENT BAIT: Include detail that invites discussion. Something viewers will want to point out, debate, or ask about.

═══════════════════════════════════════════════════════════════
FINAL NOTES
═══════════════════════════════════════════════════════════════
- Generate as single continuous video with internal seamless transitions
- Maintain ${category} aesthetic consistency throughout
- "${event}" should remain recognizable despite stylistic transformation
- Every creative choice should serve the core concept
- When in doubt, choose the more visually interesting option`;
}

export function generateScript(category: string, event: string): ScriptSegment[] {
  const scripts: Record<string, ScriptSegment[]> = {
    news: [
      { timeRange: '0:00-0:02', visual: `Emergency broadcast screen flicker. Red alert graphics materialize. "CLASSIFIED" stamp appears then gets redacted. Text: "THE ${event.toUpperCase()} INCIDENT" burns onto screen with lens flare.`, onScreenText: 'BREAKING', camera: 'Static glitch to aggressive zoom punch-in' },
      { timeRange: '0:02-0:05', visual: `Grainy leaked footage aesthetic. Subject performing ${event} filmed from multiple surveillance angles. Each angle more dramatic than the last. Timestamp in corner glitching.`, onScreenText: 'LEAKED FOOTAGE', camera: 'Security cam cuts, shaky handheld intercepts' },
      { timeRange: '0:05-0:09', visual: `Split screen: "Expert" in dramatic silhouette on left, data visualizations scrolling on right. Charts showing alarming trends about ${event}. Red zones pulsing.`, onScreenText: 'EXPERTS WARN', camera: 'Documentary push-in, dramatic rack focus' },
      { timeRange: '0:09-0:12', visual: `Montage of regular people doing ${event}, treated like crime scene evidence. Each clip gets freeze-framed and circled in red. Conspiracy board aesthetic emerges.`, onScreenText: null, camera: 'Evidence compilation rhythm cuts' },
      { timeRange: '0:12-0:15', visual: `Final reveal: shocking "classified document" fills screen. Key phrases about ${event} highlighted. Screen glitches to black. Text appears: "MORE AT 11... IF WERE STILL HERE"`, onScreenText: 'DEVELOPING...', camera: 'Slow ominous zoom, hard cut to black' },
    ],
    absurd: [
      { timeRange: '0:00-0:02', visual: `Mundane first-person POV beginning ${event}. Everything hyper-normal. Suspiciously normal. The lighting is slightly off. Something feels wrong but nothing is wrong yet.`, onScreenText: null, camera: 'Steady first-person, subtle dutch tilt creeping in' },
      { timeRange: '0:02-0:05', visual: `First glitch: gravity hesitates. Objects from ${event} float for a half-second too long. Colors shift imperceptibly. A door in the background leads somewhere it shouldnt.`, onScreenText: 'wait', camera: 'Reality wobble, perspective shift' },
      { timeRange: '0:05-0:08', visual: `Full corruption: ${event} is now happening in multiple dimensions simultaneously. Past and future versions visible. Objects duplicate. The floor becomes optional.`, onScreenText: null, camera: 'Impossible geometry tracking shot' },
      { timeRange: '0:08-0:12', visual: `Peak absurdity: ${event} has become recursive. Youre watching yourself watch yourself. The boundaries between inside and outside dissolve. Familiar objects from ${event} behave with alien logic.`, onScreenText: 'this isnt right', camera: 'Escher-style impossible movement' },
      { timeRange: '0:12-0:15', visual: `Snap back to normal. ${event} completes as if nothing happened. But one detail is wrong. Deeply wrong. Viewer realizes they cant unsee it. Deadpan look to camera.`, onScreenText: '...', camera: 'Jarring cut to static normalcy, slow zoom on face' },
    ],
    luxury: [
      { timeRange: '0:00-0:03', visual: `Dawn light through floor-to-ceiling windows of minimalist penthouse. Camera drifts past fresh flowers (obviously replaced daily) toward where ${event} will occur. Everything is curated silence.`, onScreenText: 'somewhere in Monaco', camera: 'Ethereal floating glide, crane descent' },
      { timeRange: '0:03-0:06', visual: `The ${event} begins but every element is elevated. Materials that shouldnt be possible for this activity appear. Cashmere where cotton should be. Gold where plastic would suffice. Staff anticipate needs silently.`, onScreenText: null, camera: 'Slow deliberate tracking, magazine-quality framing' },
      { timeRange: '0:06-0:10', visual: `Mid-activity detail shots: hands that have never known labor performing ${event}. Inherited heirloom tools passed down generations. A casual mention of "the other house" visible in reflection.`, onScreenText: null, camera: 'Intimate macro to wide reveal, shallow focus luxury' },
      { timeRange: '0:10-0:13', visual: `${event} concludes with impossible nonchalance. A helicopter visible through window. Art worth more than houses in background, unfocused, unremarked upon.`, onScreenText: 'just a tuesday', camera: 'Pull back revealing scale of wealth' },
      { timeRange: '0:13-0:15', visual: `Final frame: subject moves to next activity as staff silently reset everything. The ${event} space returns to museum-quality stillness. Nothing indicates this moment mattered at all.`, onScreenText: null, camera: 'Slow fade as next ritual begins' },
    ],
    emotional: [
      { timeRange: '0:00-0:03', visual: `Super 8 film grain. Childhood memory of ${event}. The colors are warmer than reality ever was. Sunlight catches dust motes. A parent or friend, face just out of frame, is present.`, onScreenText: null, camera: 'Handheld memory wobble, soft focus dreaming' },
      { timeRange: '0:03-0:07', visual: `Time dissolves. Same ${event}, different eras. Teenage version, slightly more self-conscious. Young adult version, distracted. Each iteration loses something intangible. The framing gets lonelier.`, onScreenText: 'we were so young', camera: 'Match cuts through time, widening shots' },
      { timeRange: '0:07-0:11', visual: `Present day ${event}. Clinical efficiency has replaced ritual. The magic leaked out somewhere along the way. A pause mid-action as the weight of time hits. Brief flash of every previous version superimposed.`, onScreenText: null, camera: 'Still, observational, almost documentary' },
      { timeRange: '0:11-0:14', visual: `Quiet moment of grace. Finding beauty in the mundane present ${event}. Light shifts. For one second, all the versions of this moment exist together. Its okay that things changed.`, onScreenText: 'but were still here', camera: 'Gentle push in, warm color return' },
      { timeRange: '0:14-0:15', visual: `${event} completes. A small smile. The present is enough. Cut to warm gradient. Space to breathe. Space to feel.`, onScreenText: null, camera: 'Hold on face, slow fade to color' },
    ],
    tech: [
      { timeRange: '0:00-0:03', visual: `Boot sequence. Neural interface loading. Date stamp: 2077. Holographic UI unfolds in first-person. ${event} appears as selectable routine in daily optimization queue. "INITIATING PROTOCOL."`, onScreenText: 'YEAR 2077', camera: 'POV through AR display, UI parallax' },
      { timeRange: '0:03-0:06', visual: `The ${event} begins but its unrecognizable. Nanobots handle physical elements. Consciousness streams the experience while body operates autonomously. Is this still ${event}? Is this still you?`, onScreenText: 'ROUTINE OPTIMIZED', camera: 'Split consciousness view, body and mind separate' },
      { timeRange: '0:06-0:10', visual: `Data visualization: every ${event} ever performed by humanity rendered as flowing light streams. Your current instance joins the collective archive. Privacy is historical concept. Connection is mandatory.`, onScreenText: null, camera: 'Macro to cosmic zoom out, matrix aesthetic' },
      { timeRange: '0:10-0:13', visual: `Glitch. For a moment, the old way of doing ${event} flashes. Analog. Inefficient. Beautiful. The system flags it as "nostalgia bug" and patches it out. Progress continues.`, onScreenText: 'ANOMALY DETECTED', camera: 'Corruption flicker, clean sterile return' },
      { timeRange: '0:13-0:15', visual: `${event} complete. Efficiency rating displayed. Compared to global average. Suggestions for improvement. In the reflection of the interface: eyes that might be sad, might be nothing at all anymore.`, onScreenText: 'OPTIMIZATION COMPLETE', camera: 'Push through interface to human eyes beneath' },
    ],
    cartoon: [
      { timeRange: '0:00-0:02', visual: `Classic cartoon title card: "A ${event.toUpperCase()} CATASTROPHE" in wobbly letters. Cheerful orchestral sting. Iris-in on character stretching awake, bones literally extending like rubber bands.`, onScreenText: null, camera: 'Static title card, iris-in transition' },
      { timeRange: '0:02-0:05', visual: `${event} attempt #1. Character is overly confident. Gravity has suggestions, not rules. First thing goes wrong in spectacular Tex Avery fashion. Smoke cloud. Stars circling head.`, onScreenText: 'BONK', camera: 'Whip pan follow action, snap zoom on impact' },
      { timeRange: '0:05-0:09', visual: `Escalating chaos: ${event} becomes Rube Goldberg nightmare. Each fix causes bigger problem. Character runs off cliff, hangs in air, looks at camera, holds "HELP" sign, plummets.`, onScreenText: 'UH OH', camera: 'Classic animation impossible angles, take after take' },
      { timeRange: '0:09-0:13', visual: `Final attempt at ${event} somehow succeeds through pure chaos. Character accordion-compressed, eyes popped, still triumphant. Victory pose while literally on fire. This is fine.`, onScreenText: null, camera: 'Hero shot with destruction background' },
      { timeRange: '0:13-0:15', visual: `Iris-out on character's satisfied face. At last second, one more disaster begins but THATS ALL FOLKS appears before we see it. Perfect comedic timing preserved forever.`, onScreenText: "THAT'S ALL FOLKS!", camera: 'Classic iris-out, timing is everything' },
    ],
  };

  return scripts[category] || scripts.absurd;
}
