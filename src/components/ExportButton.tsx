'use client';

import { useState } from 'react';
import { Download, FileText, FileJson, ChevronDown } from 'lucide-react';
import { Generation, ViralConcept } from '@/types';
import { exportGenerationAsJson, exportAllConceptsAsTxt } from '@/lib/export';

interface ExportButtonProps {
  generation: Generation | null;
}

export default function ExportButton({ generation }: ExportButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (!generation) return null;

  const handleExportJson = () => {
    exportGenerationAsJson(generation);
    setIsOpen(false);
  };

  const handleExportTxt = () => {
    exportAllConceptsAsTxt(generation.concepts);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-xl bg-zinc-800 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-700 transition-colors"
      >
        <Download className="h-4 w-4" />
        Export All
        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-48 rounded-xl border border-zinc-800 bg-zinc-900 shadow-xl z-20 overflow-hidden">
            <button
              onClick={handleExportJson}
              className="flex items-center gap-3 w-full px-4 py-3 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors"
            >
              <FileJson className="h-4 w-4 text-cyan-400" />
              Export as JSON
            </button>
            <button
              onClick={handleExportTxt}
              className="flex items-center gap-3 w-full px-4 py-3 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors"
            >
              <FileText className="h-4 w-4 text-amber-400" />
              Export as TXT
            </button>
          </div>
        </>
      )}
    </div>
  );
}
