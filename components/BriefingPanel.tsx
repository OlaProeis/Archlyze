import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  X, ChevronLeft, ChevronRight, Download, FileDown, Edit2, Check,
  RefreshCw, Loader2, AlertTriangle, Presentation, FileText,
} from 'lucide-react';
import {
  parseSlides, renderSlideHtml, downloadBriefingMarkdown, exportToPptx, escapeHtml,
} from '../utils/briefing';

// Mermaid is initialized once per session to avoid re-init conflicts
let mermaidReady: Promise<typeof import('mermaid')['default']> | null = null;
let mermaidIdCounter = 0;

function getMermaid(): Promise<typeof import('mermaid')['default']> {
  if (!mermaidReady) {
    mermaidReady = import('mermaid').then(m => {
      m.default.initialize({
        startOnLoad: false,
        theme: 'neutral',
        fontFamily: 'ui-sans-serif, system-ui, sans-serif',
        flowchart: { curve: 'basis', padding: 16 },
        securityLevel: 'loose',
      });
      return m.default;
    }).catch(() => {
      mermaidReady = null;
      throw new Error('Failed to load mermaid');
    });
  }
  return mermaidReady;
}

interface BriefingPanelProps {
  isOpen: boolean;
  onClose: () => void;
  markdown: string;
  isLoading: boolean;
  error: string | null;
  filename: string;
  onUpdateMarkdown: (md: string) => void;
  onRegenerate: () => void;
}

export const BriefingPanel: React.FC<BriefingPanelProps> = ({
  isOpen, onClose, markdown, isLoading, error, filename,
  onUpdateMarkdown, onRegenerate,
}) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [editBuffer, setEditBuffer] = useState('');
  const [isPptxExporting, setIsPptxExporting] = useState(false);
  const slideRef = useRef<HTMLDivElement>(null);

  const slides = parseSlides(markdown);
  const totalSlides = slides.length;

  useEffect(() => {
    setCurrentSlide(0);
  }, [markdown]);

  // Mermaid rendering — delayed to ensure DOM is ready, single init, unique IDs
  useEffect(() => {
    if (!slideRef.current || isLoading || isEditing) return;

    let cancelled = false;

    const timer = setTimeout(async () => {
      const containers = slideRef.current?.querySelectorAll('.mermaid-block[data-mermaid]');
      if (!containers || containers.length === 0) return;

      let mermaid: Awaited<ReturnType<typeof getMermaid>> | null = null;
      try {
        mermaid = await getMermaid();
      } catch {
        // mermaid unavailable — show code fallback
      }

      for (let i = 0; i < containers.length; i++) {
        if (cancelled) return;
        const el = containers[i] as HTMLElement;
        const code = el.getAttribute('data-mermaid');
        if (!code) continue;

        if (mermaid) {
          try {
            const id = `mm-${++mermaidIdCounter}`;
            const { svg } = await mermaid.render(id, code);
            if (!cancelled) {
              el.innerHTML = svg;
              const svgEl = el.querySelector('svg');
              if (svgEl) {
                svgEl.style.maxWidth = '100%';
                svgEl.style.height = 'auto';
              }
            }
          } catch {
            if (!cancelled) {
              el.innerHTML = `<div class="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center"><div class="text-gray-400 text-xs mb-2 italic">Diagram could not be rendered automatically</div><pre class="bg-gray-100 p-3 rounded text-xs font-mono overflow-x-auto text-left text-gray-600 whitespace-pre-wrap">${escapeHtml(code)}</pre></div>`;
            }
          }
        } else {
          el.innerHTML = `<pre class="bg-gray-100 p-4 rounded text-xs font-mono overflow-x-auto text-gray-600 whitespace-pre-wrap">${escapeHtml(code)}</pre>`;
        }
      }
    }, 150);

    return () => { cancelled = true; clearTimeout(timer); };
  }, [currentSlide, markdown, isLoading, isEditing]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isOpen || isEditing) return;
    if (e.key === 'ArrowRight' || e.key === ' ') {
      e.preventDefault();
      setCurrentSlide(s => Math.min(s + 1, totalSlides - 1));
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      setCurrentSlide(s => Math.max(s - 1, 0));
    } else if (e.key === 'Escape') {
      onClose();
    }
  }, [isOpen, isEditing, totalSlides, onClose]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const startEditing = () => {
    setEditBuffer(markdown);
    setIsEditing(true);
  };

  const saveEdit = () => {
    onUpdateMarkdown(editBuffer);
    setIsEditing(false);
  };

  const cancelEdit = () => {
    setIsEditing(false);
  };

  const handlePptxExport = async () => {
    setIsPptxExporting(true);
    try {
      await exportToPptx(markdown, filename);
    } catch (err: any) {
      console.error('[Briefing] PPTX export error:', err);
      alert('Failed to export PPTX: ' + (err.message || 'Unknown error'));
    } finally {
      setIsPptxExporting(false);
    }
  };

  const handlePdfExport = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) { alert('Popup blocked. Allow popups for PDF export.'); return; }

    let allSlidesHtml = '';
    for (let i = 0; i < slides.length; i++) {
      const isLast = i === slides.length - 1;
      allSlidesHtml += `
        <div style="page-break-after: ${isLast ? 'auto' : 'always'}; padding: 48px 64px; min-height: 100vh; box-sizing: border-box;">
          ${renderSlideHtml(slides[i])}
        </div>`;
    }

    printWindow.document.write(`<!DOCTYPE html><html><head>
      <title>${filename} - Executive Briefing</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; color: #333; }
        h1 { color: #CE422B; font-size: 28px; } h2 { color: #2A2C31; font-size: 22px; }
        h3 { color: #555; font-size: 16px; } p, li, td { font-size: 13px; line-height: 1.6; }
        table { border-collapse: collapse; width: 100%; } th, td { padding: 8px 12px; border: 1px solid #ddd; text-align: left; }
        th { background: #CE422B; color: white; } pre { background: #f5f5f5; padding: 12px; border-radius: 6px; }
        code { background: #f0f0f0; padding: 2px 6px; border-radius: 3px; font-size: 12px; }
        ul { padding-left: 20px; } @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
      </style></head><body>${allSlidesHtml}</body></html>`);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 300);
  };

  if (!isOpen) return null;

  const progress = totalSlides > 0 ? ((currentSlide + 1) / totalSlides) * 100 : 0;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gray-900/95 backdrop-blur-sm">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-2 bg-black/40 border-b border-gray-700/50 shrink-0">
        <div className="flex items-center gap-3">
          <Presentation className="w-5 h-5 text-rust" />
          <h2 className="text-white font-semibold text-sm">Executive Briefing</h2>
          <span className="text-gray-400 text-xs hidden sm:inline">— {filename}</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Slide counter + nav */}
          {!isLoading && totalSlides > 0 && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentSlide(s => Math.max(s - 1, 0))}
                disabled={currentSlide === 0}
                className="p-1 text-gray-400 hover:text-white disabled:opacity-30 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-gray-400 text-xs font-mono w-14 text-center">
                {currentSlide + 1} / {totalSlides}
              </span>
              <button
                onClick={() => setCurrentSlide(s => Math.min(s + 1, totalSlides - 1))}
                disabled={currentSlide === totalSlides - 1}
                className="p-1 text-gray-400 hover:text-white disabled:opacity-30 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {!isLoading && markdown && (
            <div className="w-px h-5 bg-gray-700 mx-1" />
          )}

          {/* Edit toggle */}
          {!isLoading && markdown && (
            isEditing ? (
              <div className="flex gap-1">
                <button onClick={saveEdit} className="flex items-center gap-1 px-2 py-1.5 rounded text-xs bg-green-600 text-white hover:bg-green-500 transition-colors">
                  <Check className="w-3 h-3" /> Save
                </button>
                <button onClick={cancelEdit} className="flex items-center gap-1 px-2 py-1.5 rounded text-xs bg-gray-700 text-gray-300 hover:bg-gray-600 transition-colors">
                  Cancel
                </button>
              </div>
            ) : (
              <button onClick={startEditing} className="flex items-center gap-1 px-2 py-1.5 rounded text-xs bg-gray-700 text-gray-300 hover:bg-gray-600 transition-colors" title="Edit slide Markdown">
                <Edit2 className="w-3 h-3" /> Edit
              </button>
            )
          )}

          {/* Regenerate */}
          {!isLoading && markdown && !isEditing && (
            <button onClick={onRegenerate} className="flex items-center gap-1 px-2 py-1.5 rounded text-xs bg-gray-700 text-gray-300 hover:bg-gray-600 transition-colors" title="Regenerate briefing">
              <RefreshCw className="w-3 h-3" />
            </button>
          )}

          {/* Export buttons */}
          {!isLoading && markdown && !isEditing && (
            <>
              <div className="w-px h-5 bg-gray-700 mx-1" />
              <button onClick={() => downloadBriefingMarkdown(markdown, filename)} className="flex items-center gap-1 px-2 py-1.5 rounded text-xs bg-gray-700 text-gray-300 hover:bg-gray-600 transition-colors" title="Download Markdown">
                <FileText className="w-3 h-3" /> <span className="hidden sm:inline">MD</span>
              </button>
              <button onClick={handlePptxExport} disabled={isPptxExporting} className="flex items-center gap-1 px-2 py-1.5 rounded text-xs bg-gray-700 text-gray-300 hover:bg-gray-600 transition-colors disabled:opacity-50" title="Export PowerPoint">
                {isPptxExporting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                <span className="hidden sm:inline">PPTX</span>
              </button>
              <button onClick={handlePdfExport} className="flex items-center gap-1 px-2 py-1.5 rounded text-xs bg-gray-700 text-gray-300 hover:bg-gray-600 transition-colors" title="Print / Save as PDF">
                <FileDown className="w-3 h-3" /> <span className="hidden sm:inline">PDF</span>
              </button>
            </>
          )}

          <div className="w-px h-5 bg-gray-700 mx-1" />
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-white transition-colors" title="Close (Esc)">
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Progress bar */}
      {!isLoading && totalSlides > 1 && (
        <div className="h-0.5 bg-gray-800 shrink-0">
          <div
            className="h-full bg-rust transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Main content — uses all available space */}
      <div className="flex-1 overflow-hidden flex items-start justify-center relative">
        {/* Loading state */}
        {isLoading && (
          <div className="flex flex-col items-center gap-4 text-center mt-32">
            <div className="w-10 h-10 border-2 border-rust border-t-transparent rounded-full animate-spin" />
            <div className="text-white font-medium">Generating Executive Briefing…</div>
            <div className="text-gray-400 text-sm max-w-md">
              Translating your code into management-ready content. This may take a minute for large files.
            </div>
          </div>
        )}

        {/* Error state */}
        {!isLoading && error && (
          <div className="flex flex-col items-center gap-4 text-center mt-32 max-w-md">
            <AlertTriangle className="w-10 h-10 text-red-400" />
            <div className="text-white font-medium">Briefing Generation Failed</div>
            <div className="text-red-300 text-sm">{error}</div>
            <button onClick={onRegenerate} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-rust text-white text-sm hover:bg-rust-dark transition-colors">
              <RefreshCw className="w-4 h-4" /> Try Again
            </button>
          </div>
        )}

        {/* Editing mode */}
        {!isLoading && !error && isEditing && (
          <div className="w-full h-full p-4 flex flex-col">
            <div className="text-gray-400 text-xs mb-2">
              Edit the Markdown source below. Slides are separated by <code className="bg-gray-800 px-1 rounded">---</code>
            </div>
            <textarea
              value={editBuffer}
              onChange={e => setEditBuffer(e.target.value)}
              className="flex-1 w-full bg-gray-800 text-gray-100 font-mono text-sm p-4 rounded-lg border border-gray-700 focus:border-rust outline-none resize-none"
              spellCheck={false}
            />
          </div>
        )}

        {/* Presentation view — content uses full space */}
        {!isLoading && !error && !isEditing && totalSlides > 0 && (
          <>
            {/* Side navigation — large clickable areas */}
            <button
              onClick={() => setCurrentSlide(s => Math.max(s - 1, 0))}
              disabled={currentSlide === 0}
              className="absolute left-0 top-0 bottom-0 w-16 z-10 flex items-center justify-center text-white/0 hover:text-white/60 hover:bg-gradient-to-r hover:from-black/20 hover:to-transparent disabled:pointer-events-none transition-all"
            >
              <ChevronLeft className="w-8 h-8" />
            </button>

            {/* Content card — fills the viewport */}
            {(() => {
              const slide = slides[currentSlide] || '';
              const isWalkthrough = slide.startsWith(':::walkthrough ');
              return (
                <div
                  ref={slideRef}
                  className={`w-full h-full bg-white ${isWalkthrough ? 'overflow-hidden' : 'overflow-y-auto'}`}
                  style={{ padding: isWalkthrough ? 'clamp(16px, 2vw, 32px) clamp(20px, 3vw, 48px)' : 'clamp(24px, 4vw, 64px) clamp(32px, 6vw, 96px)' }}
                  dangerouslySetInnerHTML={{ __html: renderSlideHtml(slide) }}
                />
              );
            })()}

            <button
              onClick={() => setCurrentSlide(s => Math.min(s + 1, totalSlides - 1))}
              disabled={currentSlide === totalSlides - 1}
              className="absolute right-0 top-0 bottom-0 w-16 z-10 flex items-center justify-center text-white/0 hover:text-white/60 hover:bg-gradient-to-l hover:from-black/20 hover:to-transparent disabled:pointer-events-none transition-all"
            >
              <ChevronRight className="w-8 h-8" />
            </button>
          </>
        )}

        {/* Empty state */}
        {!isLoading && !error && !isEditing && totalSlides === 0 && !markdown && (
          <div className="text-gray-500 text-sm italic mt-32">No briefing generated yet.</div>
        )}
      </div>
    </div>
  );
};
