// components/tools/PresentationEngine.tsx
"use client";

import React, { useState, useEffect } from "react";
import {
  Presentation,
  Loader2,
  Download,
  AlertTriangle,
  ChevronRight,
  Sparkles,
  FileDown,
  LayoutTemplate,
} from "lucide-react";

interface Slide {
  title: string;
  layout_type?: string;
  bullets?: string[];
  items?: any[];
  metrics?: any[];
  timeline_steps?: any[];
  [key: string]: any; 
}

interface GenerateResult {
  status: string;
  file: string;
  deck_title: string;
  slide_count: number;
  slides: Slide[];
}

export default function PresentationEngine({ defaultPrompt }: { defaultPrompt?: string }) {
  const [prompt, setPrompt] = useState(defaultPrompt || "");
  const [slideCount, setSlideCount] = useState(5);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GenerateResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeSlide, setActiveSlide] = useState(0);

  useEffect(() => {
    if (defaultPrompt) {
      setPrompt(defaultPrompt);
    }
  }, [defaultPrompt]);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setActiveSlide(0);

    try {
      const res = await fetch("http://localhost:8000/api/presentation/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: prompt.trim(), slide_count: slideCount }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: `Server error ${res.status}` }));
        throw new Error(err.detail || `Server error ${res.status}`);
      }
      const data: GenerateResult = await res.json();
      
      // Inject title slide so deck indexes align with backend .pptx download
      if (data.slides && data.slides.length > 0) {
        const titleSlide: Slide = { 
          title: data.deck_title || "Presentation Title", 
          layout_type: "TITLE_SLIDE", 
          bullets: [prompt || "Generated Summary"] 
        };
        data.slides = [titleSlide, ...data.slides];
        data.slide_count = data.slides.length;
      }
      
      setResult(data);
    } catch (e: any) {
      setError(e.message || "Failed to connect to backend.");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    window.open("http://localhost:8000/api/presentation/download", "_blank");
  };

  const currentSlide = result?.slides?.[activeSlide];

  return (
    <div className="flex flex-col space-y-6">
      {/* Header card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <h2 className="text-2xl font-bold mb-1 flex items-center gap-3">
          <span className="p-2 bg-fuchsia-500/20 rounded-xl">
            <LayoutTemplate className="w-5 h-5 text-fuchsia-400" />
          </span>
          Presentation Engine
        </h2>
        <p className="text-slate-400 text-sm mb-6">
          Describe your topic and choose a slide count. Gemini structures the
          content; python-pptx renders the deck.
        </p>

        {error && (
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-4 rounded-xl mb-5 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {/* Prompt textarea */}
        <div className="mb-4">
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
            Presentation Topic / Brief
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g. Q3 product roadmap focusing on AI feature rollouts, competitor landscape, and revenue projections..."
            rows={4}
            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-fuchsia-500 transition-colors resize-none leading-relaxed"
          />
        </div>

        {/* Slide count selector + action button */}
        <div className="flex items-end gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Slide Volume
            </label>
            <div className="flex items-center gap-3 bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5">
              <button
                onClick={() => setSlideCount((v) => Math.max(1, v - 1))}
                disabled={slideCount <= 1}
                className="w-6 h-6 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold flex items-center justify-center transition-colors disabled:opacity-30"
              >
                −
              </button>
              <input
                type="number"
                min={1}
                max={15}
                value={slideCount}
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10);
                  if (!isNaN(v)) setSlideCount(Math.max(1, Math.min(15, v)));
                }}
                className="w-10 text-center bg-transparent text-white font-bold text-lg focus:outline-none"
              />
              <button
                onClick={() => setSlideCount((v) => Math.min(15, v + 1))}
                disabled={slideCount >= 15}
                className="w-6 h-6 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold flex items-center justify-center transition-colors disabled:opacity-30"
              >
                +
              </button>
              <span className="text-xs text-slate-500 ml-1">slides (max 15)</span>
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={loading || !prompt.trim()}
            className="flex-1 bg-gradient-to-r from-fuchsia-600 to-violet-600 hover:from-fuchsia-500 hover:to-violet-500 text-white px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-fuchsia-900/30"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Synthesizing…
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Synthesize Slide Deck
              </>
            )}
          </button>
        </div>
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-8 flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-fuchsia-500/10 flex items-center justify-center">
              <Presentation className="w-8 h-8 text-fuchsia-400 animate-pulse" />
            </div>
            <div className="absolute -inset-1 rounded-2xl border border-fuchsia-500/30 animate-ping" />
          </div>
          <p className="text-slate-400 text-sm font-medium">
            Gemini is structuring {slideCount} slides…
          </p>
          <div className="w-64 h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-fuchsia-600 to-violet-600 rounded-full animate-pulse w-3/4" />
          </div>
        </div>
      )}

      {/* Result panel */}
      {result && !loading && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          {/* Deck header */}
          <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-gradient-to-r from-fuchsia-950/40 to-violet-950/40">
            <div>
              <p className="text-xs font-bold text-fuchsia-400 uppercase tracking-wider mb-1">
                Deck Ready · {result.slide_count} Slides Total
              </p>
              <h3 className="text-lg font-bold text-white">{result.deck_title}</h3>
            </div>
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 bg-fuchsia-600 hover:bg-fuchsia-500 text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-lg shadow-fuchsia-900/30"
            >
              <FileDown className="w-4 h-4" />
              Download .pptx
            </button>
          </div>

          {/* Clean text block instead of slide navigator */}
          <div className="p-12 text-center flex flex-col items-center justify-center">
            <p className="text-slate-200 text-base font-semibold">
              Presentation made! Please download the file to view the presentation.
            </p>
          </div>

          {/* Download reminder footer */}
          <div className="px-5 py-3 bg-slate-950/60 border-t border-slate-800 flex items-center gap-2">
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-xs text-slate-500">
              The <span className="font-mono text-slate-400">presentation.pptx</span> file is saved in
              the project root and served via the download endpoint.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}