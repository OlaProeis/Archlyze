
import React from 'react';
import { AnalysisResult, CodeComponent, IssueSeverity, CodeIssue, Dependency } from '../types';
import { AlertTriangle, Info, XCircle, Box, Code, Layers, FileDown, Package, Wand2, TestTube, Activity, Key, Plug } from 'lucide-react';
import { downloadMarkdownReport } from '../utils/export';

interface AnalysisPanelProps {
  result: AnalysisResult | null;
  onComponentSelect: (id: string) => void;
  selectedComponentId: string | null;
  onFixIssue: (issue: CodeIssue) => void;
  onGenerateTests: (component: CodeComponent) => void;
}

export const AnalysisPanel: React.FC<AnalysisPanelProps> = ({ 
  result, 
  onComponentSelect, 
  selectedComponentId,
  onFixIssue,
  onGenerateTests
}) => {
  if (!result) return <div className="p-6 text-gray-500 text-center italic">Run analysis to see details here.</div>;

  const overallIssues = result.overallIssues || [];
  const components = result.components || [];
  const dependencies = result.dependencies || [];

  return (
    <div className="h-full overflow-y-auto bg-white dark:bg-[#1E1F22] flex flex-col">
       {/* Toolbar Row */}
       <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-800 flex justify-end items-center gap-3">
          <div className="mr-auto text-xs font-mono text-gray-400">
            Detected: <span className="font-bold text-rust">{result.language}</span>
          </div>
          <button 
            onClick={() => downloadMarkdownReport(result)}
            className="text-xs flex items-center gap-1.5 text-gray-500 hover:text-rust dark:text-gray-400 dark:hover:text-rust-light transition-colors"
            title="Export Report as Markdown"
          >
            <FileDown className="w-4 h-4" />
            Export Report
          </button>
       </div>

      <div className="p-4 space-y-6">
        {/* Summary Section */}
        <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold mb-2 text-rust dark:text-rust-light flex items-center gap-2">
            <Layers className="w-5 h-5" /> Executive Summary
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
            {result.summary || "No summary provided."}
          </p>
        </div>

        {/* Dependency Explorer */}
        {dependencies.length > 0 && (
           <div className="space-y-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-2">
                <Package className="w-4 h-4" /> Dependency Explorer
              </h3>
              <div className="grid grid-cols-1 gap-2">
                {dependencies.map((dep, idx) => (
                  <div key={idx} className="bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/20 rounded-md p-3">
                    <div className="font-mono font-bold text-sm text-blue-700 dark:text-blue-300 mb-1">
                      {dep.name} {dep.version && <span className="text-xs opacity-70">v{dep.version}</span>}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">{dep.description}</div>
                  </div>
                ))}
              </div>
           </div>
        )}

        {/* Overall Issues */}
        {overallIssues.length > 0 && (
          <div className="space-y-3">
             <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Global Issues</h3>
             {overallIssues.map((issue, idx) => (
               <IssueCard key={idx} issue={issue} onFix={() => onFixIssue(issue)} />
             ))}
          </div>
        )}

        {/* Components */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Code Components</h3>
          {components.length === 0 ? (
            <p className="text-sm text-gray-500 italic">No components detected.</p>
          ) : (
            components.map((comp) => (
              <ComponentCard 
                key={comp.id || Math.random().toString()} 
                component={comp} 
                isSelected={comp.id === selectedComponentId}
                onClick={() => comp.id && onComponentSelect(comp.id)}
                onFix={onFixIssue}
                onTest={() => onGenerateTests(comp)}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
};

const ComponentCard: React.FC<{ 
  component: CodeComponent; 
  isSelected: boolean; 
  onClick: () => void;
  onFix: (issue: CodeIssue) => void;
  onTest: () => void;
}> = ({ component, isSelected, onClick, onFix, onTest }) => {
  const iconMap: Record<string, React.ElementType> = {
    Function: Code,
    Method: Code,
    Struct: Box,
    Class: Box,
    Trait: Layers,
    Interface: Layers,
    Impl: Layers,
    Module: Layers,
    Macro: Code,
    Component: Layers,
    Prop: Key,
    State: Activity,
    Hook: Plug,
    EventHandler: Activity
  };
  const Icon = iconMap[component.type] || Box;
  
  const issues = component.issues || [];
  const dependencies = component.dependencies || [];

  return (
    <div 
      className={`border rounded-lg transition-all duration-200 overflow-hidden cursor-pointer group
        ${isSelected 
          ? 'border-rust ring-1 ring-rust dark:border-rust-light bg-rust-light/5' 
          : 'border-gray-200 dark:border-gray-700 hover:border-rust/50 dark:hover:border-rust/50 bg-white dark:bg-zinc-900'}
      `}
      onClick={onClick}
    >
      <div className="p-3 flex items-start gap-3">
        <div className={`mt-1 p-1.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400`}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2 overflow-hidden">
               <h4 className="font-mono font-bold text-sm text-gray-900 dark:text-gray-100 truncate">{component.name || 'Unnamed Component'}</h4>
               <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500">{component.type}</span>
            </div>
            
            {/* Generate Test Button */}
            <button 
              onClick={(e) => { e.stopPropagation(); onTest(); }}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 text-xs bg-gray-100 hover:bg-rust hover:text-white dark:bg-gray-800 dark:hover:bg-rust-light dark:hover:text-white rounded text-gray-600 dark:text-gray-400 flex items-center gap-1"
              title="Generate Unit Tests"
            >
               <TestTube className="w-3.5 h-3.5" />
               <span className="hidden sm:inline">Gen Test</span>
            </button>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{component.description || 'No description available.'}</p>
          
          {/* Component Stats */}
          <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
            <span>Lines {component.startLine || '?'}-{component.endLine || '?'}</span>
            {dependencies.length > 0 && (
               <span>{dependencies.length} deps</span>
            )}
          </div>
        </div>
      </div>

      {/* Issues within component */}
      {issues.length > 0 && (
        <div className="bg-red-50 dark:bg-red-900/10 border-t border-red-100 dark:border-red-900/20 p-3 space-y-2">
           {issues.map((issue, i) => (
             <IssueCard key={i} issue={issue} onFix={() => onFix(issue)} compact />
           ))}
        </div>
      )}
    </div>
  );
};

const IssueCard: React.FC<{ issue: any, compact?: boolean, onFix?: () => void }> = ({ issue, compact, onFix }) => {
  const severityColors = {
    INFO: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
    WARNING: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800',
    ERROR: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
  };

  const severity = issue.severity || 'INFO';
  const Icon = severity === 'ERROR' ? XCircle : severity === 'WARNING' ? AlertTriangle : Info;

  return (
    <div className={`rounded border p-2 ${severityColors[severity as IssueSeverity]} flex gap-2 items-start text-xs group/issue`}>
      <Icon className="w-4 h-4 shrink-0 mt-0.5" />
      <div className="flex-1">
        <div className="font-semibold mb-0.5 flex justify-between items-start">
           <span>Line {issue.line}: {issue.message}</span>
           {onFix && (issue.severity === 'WARNING' || issue.severity === 'ERROR') && (
             <button 
               onClick={(e) => { e.stopPropagation(); onFix(); }}
               className="ml-2 p-1 bg-white/50 dark:bg-black/20 hover:bg-rust hover:text-white rounded transition-colors"
               title="Auto-fix this issue"
             >
               <Wand2 className="w-3 h-3" />
             </button>
           )}
        </div>
        {!compact && <div className="opacity-90">{issue.suggestion}</div>}
      </div>
    </div>
  );
};
