import { ScriptSegment } from '@/types';

export function generateSoraPrompt(
  title: string,
  script: ScriptSegment[],
  category: string,
  event: string
): string {
  const styleByCategory: Record<string, string> = {
    news: 'cinematic documentary style, news broadcast aesthetic, dramatic lighting, CNN/BBC visual language',
    absurd: 'surrealist visuals, unexpected physics, dreamlike quality, reality-bending, Salvador Dali meets TikTok',
    luxury: 'luxury advertisement aesthetic, golden hour lighting, slow motion elegance, magazine quality',
    emotional: 'intimate cinematography, warm color grading, nostalgic film grain, indie film aesthetic',
    tech: 'futuristic sci-fi aesthetic, neon accents, sleek minimalism, holographic elements, Blade Runner meets Apple',
    cartoon: '2D animation style, exaggerated physics, rubber hose animation, bright saturated colors, Looney Tunes energy',
  };

  const style = styleByCategory[category] || styleByCategory.absurd;

  return `Create a ${script.reduce((acc, s) => {
    const [, end] = s.timeRange.split('-');
    return end;
  }, '0:00')} vertical video (9:16 aspect ratio) for TikTok.

TITLE: ${title}

DAILY SITUATION: ${event}

STYLE: ${style}

VISUAL SEQUENCE:
${script.map((s) => `[${s.timeRange}] ${s.visual}${s.camera ? ` (${s.camera})` : ''}`).join('\n')}

CAMERA WORK:
${script.map(s => `- ${s.camera}`).filter((v, i, a) => a.indexOf(v) === i).join('\n')}

KEY REQUIREMENTS:
- Vertical 9:16 format optimized for mobile viewing
- High visual impact in first 0.5 seconds (hook)
- Smooth transitions between scenes
- Base the entire concept around "${event}" as the relatable daily moment
${category === 'luxury' ? '- Make the mundane activity feel impossibly luxurious and aspirational' : ''}
${category === 'absurd' ? '- Break physics and reality while keeping the daily situation recognizable' : ''}
${category === 'emotional' ? '- Create nostalgic, bittersweet feeling around this common moment' : ''}
${category === 'news' ? '- Treat this everyday activity as breaking news with dramatic urgency' : ''}
${category === 'tech' ? '- Show futuristic/AI version of this common activity' : ''}
${category === 'cartoon' ? '- Use 2D animation style with exaggerated cartoon physics, squash and stretch, impossible actions' : ''}

MOOD: ${category === 'emotional' ? 'Nostalgic, bittersweet' : category === 'cartoon' ? 'Playful, chaotic, comedic' : 'Engaging, captivating'}

Generate this as a single continuous shot with seamless transitions.`;
}

export function generateVeoPrompt(
  title: string,
  script: ScriptSegment[],
  category: string,
  event: string
): string {
  const cameraStyles: Record<string, string> = {
    news: 'documentary tracking shot, handheld urgency, news broadcast framing',
    absurd: 'impossible camera angles, physics-defying movement, Dutch angles, reality warping',
    luxury: 'smooth crane shots, dolly zoom, stabilized glide, cinematic elegance',
    emotional: 'intimate close-ups, shallow depth of field, gentle push-ins, handheld warmth',
    tech: 'drone shots, robotic precision, macro to wide transitions, holographic overlays',
    cartoon: 'dynamic cartoon camera, snap zooms, whip pans, classic animation cinematography',
  };

  const camera = cameraStyles[category] || cameraStyles.absurd;

  return `[VEO 3 PROMPT]

VIDEO SPECS:
- Duration: ${script.reduce((acc, s) => {
    const [, end] = s.timeRange.split('-');
    return end;
  }, '0:00')}
- Aspect Ratio: 9:16 (TikTok vertical)
- Resolution: 1080x1920
- Frame Rate: 60fps for smoothness

CONCEPT: ${title}
DAILY SITUATION: ${event}

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

CORE CONCEPT: Take the everyday moment of "${event}" and transform it through ${category} visual lens.

AUDIO SUGGESTION: ${
  category === 'emotional' ? 'Soft piano, ambient, nostalgic' :
  category === 'luxury' ? 'Deep bass, elegant, sophisticated' :
  category === 'absurd' ? 'Chaotic sound design, unexpected sfx' :
  category === 'news' ? 'Dramatic news score, tension building' :
  category === 'cartoon' ? 'Classic cartoon sound effects, whimsical music, boings and zaps' :
  'Electronic, futuristic, techy'
}

HOOK REQUIREMENT: First frame must be visually striking enough to stop scrolling.

TRANSITIONS: ${category === 'cartoon' ? 'Classic animation transitions, iris wipes, smear frames' : 'Seamless morphs between scenes, no hard cuts'}.`;
}

export function generateScript(category: string, event: string): ScriptSegment[] {
  const scripts: Record<string, ScriptSegment[]> = {
    news: [
      { timeRange: '0:00-0:03', visual: `Breaking news alert graphic with urgent text about ${event}`, onScreenText: 'BREAKING NEWS', camera: 'Static to rapid zoom' },
      { timeRange: '0:03-0:08', visual: `Dramatic documentary footage of someone doing ${event} like its a crisis`, onScreenText: null, camera: 'Handheld urgent tracking' },
      { timeRange: '0:08-0:12', visual: `Expert interview setup explaining the dangers of ${event}`, onScreenText: 'EXPERT ANALYSIS', camera: 'Push in close-up' },
      { timeRange: '0:12-0:15', visual: `Shocking reveal or twist about ${event} with dramatic sting`, onScreenText: 'More at 11', camera: 'Slow dramatic zoom' },
    ],
    absurd: [
      { timeRange: '0:00-0:02', visual: `Normal POV starting ${event} like any regular day`, onScreenText: null, camera: 'First person POV' },
      { timeRange: '0:02-0:06', visual: `Reality glitches - ${event} starts defying physics, objects float`, onScreenText: 'Wait what', camera: 'Dutch angle, reality warping' },
      { timeRange: '0:06-0:11', visual: `Full surreal chaos - ${event} in impossible scenario, multiple dimensions`, onScreenText: null, camera: 'Impossible camera movement' },
      { timeRange: '0:11-0:15', visual: `Absurd climax where ${event} breaks the universe, deadpan reaction`, onScreenText: '???', camera: 'Snap zoom to face' },
    ],
    luxury: [
      { timeRange: '0:00-0:03', visual: `Establishing shot of billionaire mansion/yacht, butler preparing for ${event}`, onScreenText: 'POV: You made it', camera: 'Elegant crane shot' },
      { timeRange: '0:03-0:08', visual: `Luxurious version of ${event} with gold/diamond/premium everything`, onScreenText: null, camera: 'Smooth tracking shot' },
      { timeRange: '0:08-0:12', visual: `Casual flex during ${event} - staff, expensive items, casual wealth`, onScreenText: null, camera: 'Golden hour glamour' },
      { timeRange: '0:12-0:15', visual: `Final luxury shot of ${event} completion with subtle flex`, onScreenText: 'Just a normal day', camera: 'Slow zoom out reveal' },
    ],
    emotional: [
      { timeRange: '0:00-0:03', visual: `Nostalgic memory of ${event} from childhood or simpler times`, onScreenText: null, camera: 'Soft focus, warm tones' },
      { timeRange: '0:03-0:08', visual: `Montage of ${event} through different life stages, showing passage of time`, onScreenText: 'Remember when...', camera: 'Gentle dissolves' },
      { timeRange: '0:08-0:12', visual: `Present day ${event} with bittersweet realization of what changed`, onScreenText: null, camera: 'Intimate close-up' },
      { timeRange: '0:12-0:15', visual: `Emotional resolution - finding beauty in mundane ${event}`, onScreenText: 'It hits different now', camera: 'Pull back, warm light' },
    ],
    tech: [
      { timeRange: '0:00-0:03', visual: `Year 2050 interface booting up, AI assistant initiating ${event}`, onScreenText: 'Year 2050', camera: 'Futuristic UI zoom' },
      { timeRange: '0:03-0:08', visual: `Robots/AI performing ${event} with advanced technology, holographic displays`, onScreenText: null, camera: 'Orbital camera move' },
      { timeRange: '0:08-0:12', visual: `Mind-bending tech visualization of ${event} - data streams, neural links`, onScreenText: null, camera: 'Matrix-style camera' },
      { timeRange: '0:12-0:15', visual: `Reveal of how different ${event} will be - awe or horror`, onScreenText: 'The future is here', camera: 'Epic pull back' },
    ],
    cartoon: [
      { timeRange: '0:00-0:02', visual: `Classic cartoon intro - character waking up for ${event}, exaggerated yawn`, onScreenText: null, camera: 'Cartoon establishing shot' },
      { timeRange: '0:02-0:06', visual: `${event} goes wrong with cartoon physics - anvils, stretched limbs, explosions`, onScreenText: 'Uh oh', camera: 'Snap zoom, whip pan' },
      { timeRange: '0:06-0:11', visual: `Looney Tunes chaos during ${event} - character runs off cliff, pauses, falls`, onScreenText: null, camera: 'Classic animation angles' },
      { timeRange: '0:11-0:15', visual: `Cartoon resolution with character flattened/stretched, iris out ending`, onScreenText: 'Thats all folks', camera: 'Iris wipe close' },
    ],
  };

  return scripts[category] || scripts.absurd;
}
