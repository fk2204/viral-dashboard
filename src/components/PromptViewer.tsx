'use client';

import { useState } from 'react';
import { Copy, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { copyToClipboard } from '@/lib/export';

interface PromptViewerProps {
  title: string;
  prompt: string;
  gradient: string;
}

export default function PromptViewer({ title, prompt, gradient }: PromptViewerProps) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const handleCopy = async () => {
    await copyToClipboard(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const previewLines = prompt.split('\n').slice(0, 4).join('\n');
  const hasMore = prompt.split('\n').length > 4;

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
      <div className={`px-4 py-2 flex items-center justify-between ${gradient}`}>
        <span className="text-sm font-semibold text-white">{title}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 rounded-lg bg-white/20 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/30 transition-colors"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              Copy
            </>
          )}
        </button>
      </div>
      <div className="p-4">
        <pre className="text-xs text-zinc-300 whitespace-pre-wrap font-mono leading-relaxed">
          {expanded ? prompt : previewLines}
          {!expanded && hasMore && '...'}
        </pre>
        {hasMore && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="mt-3 flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            {expanded ? (
              <>
                <ChevronUp className="h-3.5 w-3.5" />
                Show less
              </>
            ) : (
              <>
                <ChevronDown className="h-3.5 w-3.5" />
                Show full prompt
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
