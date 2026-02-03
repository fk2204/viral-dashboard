import { ViralConcept, Generation } from '@/types';

export function copyToClipboard(text: string): Promise<void> {
  return navigator.clipboard.writeText(text);
}

export function exportConceptAsTxt(concept: ViralConcept): void {
  const content = `
=====================================
VIRAL CONCEPT: ${concept.title}
Category: ${concept.category.toUpperCase()}
=====================================

SCRIPT:
${concept.script.map(s => `[${s.timeRange}] ${s.visual}
  Camera: ${s.camera}
  ${s.onScreenText ? `Text: "${s.onScreenText}"` : ''}`).join('\n\n')}

=====================================
SORA PROMPT:
=====================================
${concept.soraPrompt}

=====================================
VEO 3 PROMPT:
=====================================
${concept.veoPrompt}

=====================================
POSTING DETAILS:
=====================================
Caption: ${concept.caption}
Hashtags: ${concept.hashtags.join(' ')}
Best Time to Post: ${concept.postTime.est} (${concept.postTime.utc})

=====================================
WHY IT WORKS:
=====================================
${concept.whyItWorks}

Trend Source: ${concept.trendSource}
`.trim();

  downloadFile(content, `viral-concept-${concept.id.slice(0, 8)}.txt`, 'text/plain');
}

export function exportGenerationAsJson(generation: Generation): void {
  const content = JSON.stringify(generation, null, 2);
  downloadFile(content, `viral-generation-${generation.id.slice(0, 8)}.json`, 'application/json');
}

export function exportAllConceptsAsTxt(concepts: ViralConcept[]): void {
  const content = concepts.map((concept, index) => `
${'='.repeat(50)}
CONCEPT ${index + 1}: ${concept.title}
Category: ${concept.category.toUpperCase()}
${'='.repeat(50)}

SCRIPT:
${concept.script.map(s => `[${s.timeRange}] ${s.visual}
  Camera: ${s.camera}
  ${s.onScreenText ? `Text: "${s.onScreenText}"` : ''}`).join('\n\n')}

SORA PROMPT:
${'-'.repeat(30)}
${concept.soraPrompt}

VEO 3 PROMPT:
${'-'.repeat(30)}
${concept.veoPrompt}

POSTING DETAILS:
Caption: ${concept.caption}
Hashtags: ${concept.hashtags.join(' ')}
Best Time: ${concept.postTime.est}

WHY IT WORKS: ${concept.whyItWorks}
Trend: ${concept.trendSource}
`).join('\n\n');

  downloadFile(content, `viral-concepts-batch-${Date.now()}.txt`, 'text/plain');
}

function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function formatPromptForCopy(prompt: string): string {
  return prompt.trim();
}
