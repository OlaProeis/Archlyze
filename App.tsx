
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Upload, Play, Moon, Sun, Share2, FileCode, AlertTriangle, Edit2, Check, Settings, GripVertical, FolderOpen, PanelLeft, History, X, Clock, ChevronRight } from 'lucide-react';
import { AppState, AnalysisStatus, DiagramType, AppSettings, CodeIssue, CodeComponent, ProjectFile } from './types';
import { EXAMPLE_RUST_CLI, EXAMPLE_PYTHON_DATA, EXAMPLE_JS_EXPRESS } from './constants';
import { analyzeRustCode, generateArchitectureDiagram, generateFix, generateUnitTests } from './utils/gemini';
import { CodePanel } from './components/CodePanel';
import { AnalysisPanel } from './components/AnalysisPanel';
import { VisualPanel } from './components/VisualPanel';
import { SettingsModal } from './components/SettingsModal';
import { LoadingOverlay } from './components/LoadingOverlay';
import { CodeResultModal } from './components/CodeResultModal';
import { FileExplorer } from './components/FileExplorer';
import { FolderImportModal } from './components/FolderImportModal';

const INITIAL_CODE = `// Select an example, upload a file, or open a folder to begin
fn main() {
    println!("Hello, Archlyze!");
}`;

const DEFAULT_SETTINGS: AppSettings = {
  apiKey: '',
  model: 'gemini-2.5-flash',
  maxLines: 10000,
};

// Helper to read file content as promise
const readFileContent = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = (e) => reject(e);
    reader.readAsText(file);
  });
};

export default function App() {
  const [state, setState] = useState<AppState>({
    files: [],
    currentFile: null,
    status: AnalysisStatus.IDLE,
    error: null,
    activePanel: 'code',
    selectedComponentId: null,
    isDarkMode: true,
    isEditing: false,
    showSettings: false,
    showHistory: false,
    settings: DEFAULT_SETTINGS,
    sidebarWidth: 50,
    modalContent: {
      isOpen: false,
      title: '',
      code: '',
      type: null
    }
  });

  // Ensure we have a default file if empty
  useEffect(() => {
    if (state.files.length === 0 && !state.currentFile) {
       const initialFile: ProjectFile = { 
         name: 'main.rs', 
         path: 'main.rs', 
         content: INITIAL_CODE, 
         language: '.rs' 
       };
       setState(s => ({ ...s, files: [initialFile], currentFile: initialFile }));
    }
  }, [state.files.length]);

  const [isResizing, setIsResizing] = useState(false);
  const [showExplorer, setShowExplorer] = useState(true);
  
  // Folder Upload State
  const [pendingUploadFiles, setPendingUploadFiles] = useState<File[]>([]);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Derived state for history list
  const analyzedFiles = useMemo(() => {
    return state.files.filter(f => f.analysis).sort((a, b) => (b.analysis?.timestamp || 0) - (a.analysis?.timestamp || 0));
  }, [state.files]);

  // Load settings from local storage
  useEffect(() => {
    const savedSettings = localStorage.getItem('rustflow_settings');
    const savedTheme = localStorage.getItem('rustflow_theme');
    
    let loadedSettings = { ...DEFAULT_SETTINGS };

    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        loadedSettings = { ...DEFAULT_SETTINGS, ...parsed };
      } catch (e) { console.error("Failed to load settings", e); }
    }

    if (savedTheme) {
       setState(s => ({ ...s, isDarkMode: savedTheme === 'dark' }));
    }

    let hasEnvKey = false;
    try {
      hasEnvKey = !!(typeof process !== 'undefined' && process.env?.API_KEY);
    } catch { /* process not available outside Vite */ }
    const hasUserKey = !!loadedSettings.apiKey;

    setState(s => {
      const shouldOpenSettings = !hasEnvKey && !hasUserKey;
      return { 
        ...s, 
        settings: loadedSettings,
        showSettings: shouldOpenSettings
      };
    });
  }, []);

  // Resizing Logic
  const startResizing = useCallback(() => setIsResizing(true), []);
  const stopResizing = useCallback(() => setIsResizing(false), []);
  const resize = useCallback((e: MouseEvent) => {
    if (isResizing) {
      const newWidth = (e.clientX / window.innerWidth) * 100;
      if (newWidth > 20 && newWidth < 80) {
        setState(s => ({ ...s, sidebarWidth: newWidth }));
      }
    }
  }, [isResizing]);

  useEffect(() => {
    window.addEventListener('mousemove', resize);
    window.addEventListener('mouseup', stopResizing);
    return () => {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [resize, stopResizing]);

  const updateSettings = (newSettings: AppSettings) => {
    setState(s => ({ ...s, settings: newSettings }));
    localStorage.setItem('rustflow_settings', JSON.stringify(newSettings));
  };

  useEffect(() => {
    if (state.isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('rustflow_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('rustflow_theme', 'light');
    }
  }, [state.isDarkMode]);

  // Single File Upload
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    readFile(file);
  };

  // 1. Initial Folder Selection (Opens Modal)
  const handleFolderSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = event.target.files;
    if (!fileList || fileList.length === 0) return;
    
    setPendingUploadFiles(Array.from(fileList));
    setIsImportModalOpen(true);
    event.target.value = '';
  };

  // 2. Finalize Import (After Modal confirmation)
  const handleImportConfirm = async (filteredFiles: File[]) => {
    const newFiles: ProjectFile[] = [];
    
    for (const file of filteredFiles) {
       try {
         const content = await readFileContent(file);
         const ext = '.' + file.name.split('.').pop();
         newFiles.push({
            name: file.name,
            path: file.webkitRelativePath || file.name,
            content: content,
            language: ext,
            analysis: null,
            diagramUrl: null
         });
       } catch (e) {
         console.error(`Failed to read ${file.name}`, e);
       }
    }

    if (newFiles.length > 0) {
      newFiles.sort((a, b) => a.path.localeCompare(b.path));
      setState(s => ({
        ...s,
        files: newFiles,
        currentFile: newFiles[0],
        status: AnalysisStatus.IDLE,
        error: null
      }));
      setShowExplorer(true);
    }
  };

  const readFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const newFile: ProjectFile = { 
        name: file.name, 
        path: file.name, 
        content, 
        language: '.'+file.name.split('.').pop() || '',
        analysis: null,
        diagramUrl: null
      };
      
      setState(s => ({ 
        ...s, 
        files: [newFile], 
        currentFile: newFile,
        error: null, 
        status: AnalysisStatus.IDLE,
        isEditing: false
      }));
    };
    reader.readAsText(file);
  };

  const handleFileSelect = (file: ProjectFile) => {
     setState(s => ({
        ...s,
        currentFile: file,
        // If the file already has analysis, show it, otherwise reset visual state
        status: AnalysisStatus.IDLE,
        error: null,
        selectedComponentId: null,
        activePanel: file.analysis ? 'analysis' : 'code'
     }));
  };

  const loadExample = (code: string, filename: string, language: string) => {
    const exampleFile: ProjectFile = {
      name: filename,
      path: filename,
      content: code,
      language: language
    };
    setState(s => ({ 
      ...s, 
      files: [exampleFile],
      currentFile: exampleFile,
      status: AnalysisStatus.IDLE,
      error: null,
      isEditing: false
    }));
  };

  const runAnalysis = async () => {
    if (!state.currentFile) return;

    try {
      setState(s => ({ ...s, status: AnalysisStatus.ANALYZING, error: null, isEditing: false }));
      
      const result = await analyzeRustCode(state.currentFile.content, state.settings);
      
      // Add timestamp
      result.timestamp = Date.now();

      // Update the current file with the analysis result
      const updatedFile = { ...state.currentFile, analysis: result };
      
      setState(s => ({ 
        ...s, 
        status: AnalysisStatus.COMPLETE, 
        currentFile: updatedFile,
        files: s.files.map(f => f.path === updatedFile.path ? updatedFile : f),
        activePanel: 'analysis' 
      }));

    } catch (e: any) {
      setState(s => ({ ...s, status: AnalysisStatus.ERROR, error: e.message || "Analysis failed" }));
      if (e.message?.includes("API Key")) {
        setState(s => ({ ...s, showSettings: true }));
      }
    }
  };

  const runDiagramGeneration = async (type: DiagramType) => {
    if (!state.currentFile?.analysis) return;
    try {
      setState(s => ({ ...s, status: AnalysisStatus.GENERATING_IMAGE, error: null }));
      const url = await generateArchitectureDiagram(state.currentFile.content, state.currentFile.analysis.summary, type, state.settings);
      
      // Update file with diagram
      const updatedFile = { ...state.currentFile, diagramUrl: url };

      setState(s => ({ 
        ...s, 
        status: AnalysisStatus.COMPLETE, 
        currentFile: updatedFile,
        files: s.files.map(f => f.path === updatedFile.path ? updatedFile : f)
      }));
    } catch (e: any) {
      let msg = e.message || "Diagram generation failed";
      setState(s => ({ ...s, status: AnalysisStatus.ERROR, error: msg }));
    }
  };

  const handleFixIssue = async (issue: CodeIssue) => {
    if (!state.currentFile) return;
    try {
      setState(s => ({ ...s, status: AnalysisStatus.FIXING, error: null }));
      const fix = await generateFix(state.currentFile.content, issue, state.settings);
      setState(s => ({
        ...s,
        status: AnalysisStatus.COMPLETE,
        modalContent: {
          isOpen: true,
          title: `Proposed Fix for Issue at Line ${issue.line}`,
          code: fix,
          type: 'fix'
        }
      }));
    } catch (e: any) {
      setState(s => ({ ...s, status: AnalysisStatus.ERROR, error: "Failed to generate fix: " + e.message }));
    }
  };

  const handleGenerateTests = async (component: CodeComponent) => {
    if (!state.currentFile) return;
    try {
      setState(s => ({ ...s, status: AnalysisStatus.GENERATING_TESTS, error: null }));
      const tests = await generateUnitTests(state.currentFile.content, component, state.settings);
      setState(s => ({
        ...s,
        status: AnalysisStatus.COMPLETE,
        modalContent: {
          isOpen: true,
          title: `Unit Tests for ${component.name}`,
          code: tests,
          type: 'test'
        }
      }));
    } catch (e: any) {
      setState(s => ({ ...s, status: AnalysisStatus.ERROR, error: "Failed to generate tests: " + e.message }));
    }
  };

  const handleShare = () => {
    if (!state.currentFile?.analysis) {
      alert('Run analysis first to share results.');
      return;
    }
    // Build a shareable text summary from the current analysis
    const a = state.currentFile.analysis;
    const issueCount = (a.overallIssues?.length || 0) + a.components.reduce((sum, c) => sum + (c.issues?.length || 0), 0);
    const summary = [
      `Archlyze Analysis: ${state.currentFile.name}`,
      `Language: ${a.language}`,
      `Components: ${a.components.length} | Issues: ${issueCount} | Dependencies: ${a.dependencies.length}`,
      ``,
      `Summary: ${a.summary}`,
    ].join('\n');

    navigator.clipboard.writeText(summary).then(() => {
      alert('Analysis summary copied to clipboard!');
    }).catch(() => {
      alert('Failed to copy to clipboard.');
    });
  };

  const updateCurrentCode = (newCode: string) => {
    if (!state.currentFile) return;
    const updatedFile = { ...state.currentFile, content: newCode };
    setState(s => ({
       ...s,
       currentFile: updatedFile,
       files: s.files.map(f => f.path === updatedFile.path ? updatedFile : f)
    }));
  };

  return (
    <div className={`h-screen flex flex-col ${state.isDarkMode ? 'dark' : ''} relative select-none md:select-auto`}>
      <LoadingOverlay isVisible={state.status === AnalysisStatus.ANALYZING} />
      
      {(state.status === AnalysisStatus.FIXING || state.status === AnalysisStatus.GENERATING_TESTS) && (
         <div className="absolute inset-0 z-50 bg-black/20 backdrop-blur-sm flex items-center justify-center">
            <div className="bg-white dark:bg-zinc-800 p-4 rounded-lg shadow-xl flex items-center gap-3">
               <div className="w-5 h-5 border-2 border-rust border-t-transparent rounded-full animate-spin" />
               <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                 {state.status === AnalysisStatus.FIXING ? 'Generating Fix...' : 'Writing Unit Tests...'}
               </span>
            </div>
         </div>
      )}

      {/* Modals */}
      <FolderImportModal 
        isOpen={isImportModalOpen} 
        onClose={() => setIsImportModalOpen(false)}
        files={pendingUploadFiles}
        onImport={handleImportConfirm}
      />

      <SettingsModal 
        isOpen={state.showSettings} 
        onClose={() => setState(s => ({...s, showSettings: false}))}
        settings={state.settings}
        onSave={updateSettings}
      />

      <CodeResultModal 
        isOpen={state.modalContent.isOpen}
        onClose={() => setState(s => ({ ...s, modalContent: { ...s.modalContent, isOpen: false } }))}
        title={state.modalContent.title}
        code={state.modalContent.code}
      />

      {/* Header */}
      <header className="bg-white dark:bg-[#1E1F22] border-b border-gray-200 dark:border-gray-800 px-4 py-3 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-3">
           <div className="w-8 h-8 bg-rust rounded flex items-center justify-center text-white font-bold">A</div>
           <h1 className="text-lg font-bold text-gray-800 dark:text-gray-100 hidden sm:block">Archlyze</h1>
        </div>
        
        <div className="flex items-center gap-3">
           {/* Sidebar Toggle */}
           {state.files.length > 0 && (
             <button 
                onClick={() => setShowExplorer(!showExplorer)}
                className={`p-1.5 rounded transition-colors ${showExplorer ? 'bg-gray-100 dark:bg-gray-700 text-rust' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
                title="Toggle File Explorer"
             >
                <PanelLeft className="w-4 h-4" />
             </button>
           )}

           <select 
             className="hidden md:block bg-gray-100 dark:bg-zinc-800 text-xs py-1.5 px-2 rounded border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300"
             onChange={(e) => {
               if(e.target.value === 'rust') loadExample(EXAMPLE_RUST_CLI, 'example.rs', '.rs');
               if(e.target.value === 'python') loadExample(EXAMPLE_PYTHON_DATA, 'example.py', '.py');
               if(e.target.value === 'js') loadExample(EXAMPLE_JS_EXPRESS, 'example.js', '.js');
             }}
             defaultValue=""
           >
             <option value="" disabled>Load Example...</option>
             <option value="rust">Rust (CLI Tool)</option>
             <option value="python">Python (Data Analysis)</option>
             <option value="js">Node.js (Express Server)</option>
           </select>

           <div className="flex bg-gray-100 dark:bg-zinc-800 rounded-md p-0.5 border border-gray-200 dark:border-gray-700">
             <label className="cursor-pointer hover:bg-white dark:hover:bg-zinc-700 px-2 py-1.5 rounded text-xs font-medium flex items-center gap-2 transition-colors text-gray-600 dark:text-gray-300" title="Upload File">
                <Upload className="w-3.5 h-3.5" />
                <span className="hidden lg:inline">File</span>
                <input type="file" className="hidden" onChange={handleFileUpload} />
             </label>
             <div className="w-px bg-gray-300 dark:bg-gray-600 my-1"></div>
             <label className="cursor-pointer hover:bg-white dark:hover:bg-zinc-700 px-2 py-1.5 rounded text-xs font-medium flex items-center gap-2 transition-colors text-gray-600 dark:text-gray-300" title="Upload Folder">
                <FolderOpen className="w-3.5 h-3.5" />
                <span className="hidden lg:inline">Folder</span>
                <input 
                  type="file" 
                  className="hidden" 
                  onChange={handleFolderSelect}
                  {...({webkitdirectory: "", directory: ""} as any)} 
                  multiple 
                />
             </label>
           </div>

           <button 
             onClick={runAnalysis} 
             disabled={state.status === AnalysisStatus.ANALYZING || !state.currentFile}
             className="bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-3 py-1.5 rounded text-xs font-medium flex items-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
           >
              <Play className="w-3.5 h-3.5" />
              {state.status === AnalysisStatus.ANALYZING ? 'Analyzing...' : 'Analyze File'}
           </button>

           <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1"></div>

           <button onClick={handleShare} className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors">
             <Share2 className="w-4 h-4" />
           </button>
           
           <button 
             onClick={() => setState(s => ({ ...s, showSettings: true }))}
             className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
           >
             <Settings className="w-4 h-4" />
           </button>

           <button 
             onClick={() => setState(s => ({ ...s, isDarkMode: !s.isDarkMode }))} 
             className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
           >
             {state.isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
           </button>
        </div>
      </header>

      {/* Main Content Grid */}
      <main className="flex-1 overflow-hidden flex flex-col md:flex-row relative">
        
        {/* Left Section (Explorer + Code) */}
        <section 
          className={`flex min-w-0 ${state.activePanel !== 'code' ? 'hidden md:flex' : 'flex'}`}
          style={{ width: window.innerWidth >= 768 ? `${state.sidebarWidth}%` : '100%' }}
        >
          {/* File Explorer (Conditional) */}
          {state.files.length > 0 && showExplorer && (
            <div className="w-48 lg:w-64 shrink-0 border-r border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#1E1F22] h-full overflow-hidden">
               <FileExplorer 
                 files={state.files} 
                 currentFile={state.currentFile}
                 onFileSelect={handleFileSelect}
               />
            </div>
          )}

          {/* Code Editor */}
          <div className="flex-1 flex flex-col min-w-0">
            <div className="bg-gray-50 dark:bg-[#1E1F22] border-b border-gray-200 dark:border-gray-800 px-4 py-2 text-xs font-bold text-gray-500 uppercase tracking-wider flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2 truncate">
                <span>{state.currentFile ? state.currentFile.name : 'Source Code'}</span>
                <span className="text-gray-400 font-normal normal-case">
                   ({state.currentFile?.content.split('\n').length || 0} lines)
                </span>
                {state.currentFile?.analysis && <Check className="w-3.5 h-3.5 text-green-500" title="Analysis Cached" />}
              </div>
              
              <button 
                onClick={() => setState(s => ({ ...s, isEditing: !s.isEditing }))}
                className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-colors shrink-0 ${
                  state.isEditing 
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                    : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {state.isEditing ? <><Check className="w-3 h-3" /> Done</> : <><Edit2 className="w-3 h-3" /> Edit Code</>}
              </button>
            </div>
            
            <CodePanel 
              code={state.currentFile?.content || ''} 
              components={state.currentFile?.analysis?.components || []} 
              activeComponentId={state.selectedComponentId}
              isEditing={state.isEditing}
              onCodeChange={updateCurrentCode}
              onLineClick={(line) => {
                 const comp = state.currentFile?.analysis?.components?.find(c => line >= c.startLine && line <= c.endLine);
                 if (comp) setState(s => ({ ...s, selectedComponentId: comp.id, activePanel: 'analysis' }));
              }}
            />
          </div>
        </section>

        {/* Resizable Handle (Desktop Only) */}
        <div
          className="hidden md:flex w-1 bg-gray-200 dark:bg-gray-800 hover:bg-rust dark:hover:bg-rust cursor-col-resize items-center justify-center group transition-colors z-10"
          onMouseDown={startResizing}
        >
          <GripVertical className="w-3 h-3 text-gray-400 group-hover:text-white" />
        </div>

        {/* Right Section (Analysis + Visual) */}
        <section 
          className={`flex-col min-w-0 relative ${state.activePanel === 'code' ? 'hidden md:flex' : 'flex'}`}
          style={{ width: window.innerWidth >= 768 ? `${100 - state.sidebarWidth}%` : '100%' }}
        >
          
          {/* Analysis (Top Right) */}
          <div className={`flex-1 flex flex-col border-b border-gray-200 dark:border-gray-800 min-h-0 ${state.activePanel === 'visual' ? 'hidden md:flex' : 'flex'}`}>
             <div className="bg-white dark:bg-[#1E1F22] border-b border-gray-200 dark:border-gray-800 px-4 py-2 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-2">
                   <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Static Analysis</span>
                   {state.currentFile && !state.currentFile.analysis && state.status !== AnalysisStatus.ANALYZING && (
                     <span className="text-xs text-gray-400 italic font-normal">- Not analyzed yet</span>
                   )}
                </div>
                <div className="flex items-center gap-3">
                  {state.error && (
                    <div className="flex items-center gap-1 text-red-500 text-xs">
                      <AlertTriangle className="w-3 h-3" />
                      <span className="truncate max-w-[150px]" title={state.error}>{state.error}</span>
                    </div>
                  )}
                  {/* History Toggle */}
                  <button 
                    onClick={() => setState(s => ({ ...s, showHistory: !s.showHistory }))}
                    className={`p-1 rounded hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors relative ${state.showHistory ? 'text-rust' : 'text-gray-500'}`}
                    title="History: Switch between recent analyses"
                  >
                    <History className="w-4 h-4" />
                    {analyzedFiles.length > 0 && <span className="absolute top-0 right-0 w-2 h-2 bg-rust rounded-full" />}
                  </button>
                </div>
             </div>
             <AnalysisPanel 
                result={state.currentFile?.analysis || null} 
                selectedComponentId={state.selectedComponentId}
                onComponentSelect={(id) => setState(s => ({ ...s, selectedComponentId: id }))}
                onFixIssue={handleFixIssue}
                onGenerateTests={handleGenerateTests}
             />
          </div>

          {/* Visual (Bottom Right) */}
          <div className={`flex-1 flex flex-col min-h-0 ${state.activePanel === 'analysis' ? 'hidden md:flex' : 'flex'}`}>
             <div className="bg-white dark:bg-[#1E1F22] border-b border-gray-200 dark:border-gray-800 px-4 py-2 text-xs font-bold text-gray-500 uppercase tracking-wider shrink-0">
               Visual Architecture
             </div>
             <VisualPanel 
                diagramUrl={state.currentFile?.diagramUrl || null} 
                analysis={state.currentFile?.analysis || null}
                isGenerating={state.status === AnalysisStatus.GENERATING_IMAGE}
                onGenerate={runDiagramGeneration}
                error={state.error}
             />
          </div>

          {/* History Sidebar Popover */}
          {state.showHistory && (
            <div className="absolute top-0 right-0 h-full w-64 bg-white dark:bg-[#1E1F22] border-l border-gray-200 dark:border-gray-700 shadow-2xl z-30 flex flex-col transition-transform animate-in slide-in-from-right">
               <div className="p-3 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200 flex items-center gap-2">
                    <Clock className="w-4 h-4" /> Recent Analyses
                  </h3>
                  <button onClick={() => setState(s => ({ ...s, showHistory: false }))} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                    <X className="w-4 h-4" />
                  </button>
               </div>
               <div className="flex-1 overflow-y-auto p-2 space-y-1">
                 {analyzedFiles.length === 0 ? (
                    <div className="text-center p-4 text-xs text-gray-500 italic">
                      No files analyzed yet. Run analysis on a file to see it here.
                    </div>
                 ) : (
                    analyzedFiles.map(file => (
                      <button
                        key={file.path}
                        onClick={() => handleFileSelect(file)}
                        className={`w-full text-left p-2 rounded-md text-xs flex items-center justify-between group ${
                          state.currentFile?.path === file.path 
                            ? 'bg-rust/10 text-rust border border-rust/20' 
                            : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-zinc-800'
                        }`}
                      >
                         <div className="truncate flex-1">
                           <div className="font-medium truncate" title={file.path}>{file.name}</div>
                           <div className="text-[10px] text-gray-400">{new Date(file.analysis?.timestamp || 0).toLocaleTimeString()}</div>
                         </div>
                         {state.currentFile?.path !== file.path && (
                           <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 text-gray-400" />
                         )}
                      </button>
                    ))
                 )}
               </div>
            </div>
          )}

        </section>

      </main>

      {/* Mobile Nav Tabs */}
      <nav className="md:hidden border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1E1F22] flex shrink-0">
        <button 
          onClick={() => setState(s => ({...s, activePanel: 'code'}))}
          className={`flex-1 py-3 text-xs font-medium flex flex-col items-center gap-1 ${state.activePanel === 'code' ? 'text-rust' : 'text-gray-500'}`}
        >
          <FileCode className="w-5 h-5" /> Code
        </button>
        <button 
          onClick={() => setState(s => ({...s, activePanel: 'analysis'}))}
          className={`flex-1 py-3 text-xs font-medium flex flex-col items-center gap-1 ${state.activePanel === 'analysis' ? 'text-rust' : 'text-gray-500'}`}
        >
          <AlertTriangle className="w-5 h-5" /> Analysis
        </button>
        <button 
          onClick={() => setState(s => ({...s, activePanel: 'visual'}))}
          className={`flex-1 py-3 text-xs font-medium flex flex-col items-center gap-1 ${state.activePanel === 'visual' ? 'text-rust' : 'text-gray-500'}`}
        >
          <Share2 className="w-5 h-5" /> Visual
        </button>
      </nav>
    </div>
  );
}
