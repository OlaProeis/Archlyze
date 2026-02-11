import React, { useState } from 'react';
import { AnalysisResult, DiagramType } from '../types';
import { RefreshCw, Download, Image as ImageIcon, AlertTriangle, Info } from 'lucide-react';

interface VisualPanelProps {
  diagramUrl: string | null;
  analysis: AnalysisResult | null;
  isGenerating: boolean;
  error?: string | null;
  onGenerate: (type: DiagramType) => void;
}

export const VisualPanel: React.FC<VisualPanelProps> = ({ diagramUrl, analysis, isGenerating, error, onGenerate }) => {
  const [activeType, setActiveType] = useState<DiagramType>(DiagramType.FLOWCHART);

  const handleGenerate = () => {
    onGenerate(activeType);
  };

  if (!analysis) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-gray-500 p-8 text-center">
        <ImageIcon className="w-16 h-16 mb-4 opacity-20" />
        <p>Analyze code first to generate architecture diagrams.</p>
      </div>
    );
  }

  const isQuotaError = error && (error.includes('quota') || error.includes('429') || error.includes('RESOURCE_EXHAUSTED') || error.includes('quota exceeded'));

  return (
    <div className="h-full flex flex-col bg-gray-100 dark:bg-[#121212]">
      {/* Toolbar */}
      <div className="p-3 bg-white dark:bg-[#1E1F22] border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
        <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
          {Object.values(DiagramType).map((type) => (
            <button
              key={type}
              onClick={() => setActiveType(type)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md capitalize transition-all ${
                activeType === type 
                  ? 'bg-white dark:bg-zinc-700 shadow text-rust dark:text-rust-light' 
                  : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              {type.replace('_', ' ')}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          {error && !isQuotaError && (
            <div className="hidden sm:flex items-center gap-1 text-red-500 text-xs">
              <AlertTriangle className="w-3 h-3" />
              <span className="truncate max-w-[150px]" title={error}>{error}</span>
            </div>
          )}

          <div className="flex gap-2">
            <button 
              onClick={handleGenerate}
              disabled={isGenerating}
              className="flex items-center gap-2 px-3 py-1.5 bg-rust hover:bg-rust-dark text-white rounded text-xs font-medium transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
              {diagramUrl ? 'Regenerate' : 'Generate'}
            </button>
            
            {diagramUrl && (
              <a 
                href={diagramUrl} 
                download={`archlyze-architecture-${activeType}.png`}
                className="flex items-center gap-2 px-3 py-1.5 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 rounded text-xs font-medium transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Quota / Rate Limit Warning Banner */}
      <div className="px-4 py-2 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800 flex items-start gap-2">
        <Info className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
        <p className="text-xs text-amber-700 dark:text-amber-300">
          Diagrams use the <strong>gemini-2.5-flash-image</strong> model. Image generation has a <em>separate</em> quota from the text models shown in “Rate limits by model” (e.g. Gemini 2.5 Flash RPD). If you see &quot;limit: 0&quot; or quota errors, image gen may not be on your plan — check <a href="https://aistudio.google.com" target="_blank" rel="noopener noreferrer" className="underline">AI Studio</a> and consider enabling billing for image generation.
        </p>
      </div>

      {/* Canvas */}
      <div className="flex-1 overflow-auto flex items-center justify-center p-8 relative">
        {isGenerating ? (
          <div className="text-center">
             <div className="w-12 h-12 border-4 border-rust/30 border-t-rust rounded-full animate-spin mx-auto mb-4"></div>
             <p className="text-sm text-gray-500 animate-pulse">Designing architecture diagram with Gemini...</p>
          </div>
        ) : diagramUrl ? (
          <img 
            src={diagramUrl} 
            alt="Architecture Diagram" 
            className="max-w-full max-h-full rounded shadow-lg border border-gray-200 dark:border-gray-700" 
          />
        ) : (
          <div className="text-center max-w-sm">
            <div className="w-16 h-16 bg-gray-200 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
               <ImageIcon className="w-8 h-8" />
            </div>
            {(error || isQuotaError) ? (
               <div className="mb-4">
                 <h3 className="text-sm font-bold mb-2 text-red-500">Generation Failed</h3>
                 <p className="text-xs text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">{error}</p>
               </div>
            ) : (
              <>
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">Ready to Visualize</h3>
                <p className="text-sm text-gray-500 mb-6">
                  Generate a high-fidelity architecture diagram from your code analysis.
                </p>
              </>
            )}
            <button 
              onClick={handleGenerate}
              className="px-4 py-2 bg-rust text-white rounded-md text-sm font-medium hover:bg-rust-dark transition-colors"
            >
              Generate {activeType.replace('_', ' ')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
