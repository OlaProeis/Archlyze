
import React, { useState, useEffect, useMemo } from 'react';
import { X, FolderOpen, Filter, FileText, CheckCircle2 } from 'lucide-react';
// @ts-ignore
import ignore from 'ignore';

interface FolderImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  files: File[];
  onImport: (filteredFiles: File[]) => void;
}

export const FolderImportModal: React.FC<FolderImportModalProps> = ({ isOpen, onClose, files, onImport }) => {
  const [respectGitIgnore, setRespectGitIgnore] = useState(true);
  const [selectedExtensions, setSelectedExtensions] = useState<Set<string>>(new Set());
  const [gitIgnoreContent, setGitIgnoreContent] = useState<string | null>(null);

  // 1. Load .gitignore content once when modal opens
  useEffect(() => {
    if (!isOpen || files.length === 0) return;
    const gitIgnoreFile = files.find(f => f.name === '.gitignore');
    if (gitIgnoreFile) {
      const reader = new FileReader();
      reader.onload = (e) => setGitIgnoreContent(e.target?.result as string);
      reader.readAsText(gitIgnoreFile);
    } else {
      setGitIgnoreContent(null);
    }
  }, [files, isOpen]);

  // 2. Create the ignore filter instance
  const ignoreFilter = useMemo(() => {
    const ig = ignore().add([
      '.git', 'node_modules', 'target', 'dist', 'build', 'coverage', 
      '.DS_Store', '*.log', '*.lock', 'package-lock.json', 'yarn.lock'
    ]);
    if (gitIgnoreContent) {
      ig.add(gitIgnoreContent);
    }
    return ig;
  }, [gitIgnoreContent]);

  // 3. Compute "Allowed Files" (Pre-extension filter)
  // This determines which files are valid candidates based on GitIgnore settings
  const allowedFiles = useMemo(() => {
    if (!respectGitIgnore) return files;

    return files.filter(file => {
      const pathParts = file.webkitRelativePath.split('/');
      // Remove top folder name for relative path matching
      const relativePath = pathParts.slice(1).join('/');
      return relativePath && !ignoreFilter.ignores(relativePath);
    });
  }, [files, respectGitIgnore, ignoreFilter]);

  // 4. Compute Available Extensions based on Allowed Files
  const availableExtensions = useMemo(() => {
    const counts: Record<string, number> = {};
    allowedFiles.forEach(f => {
      const ext = f.name.includes('.') ? '.' + f.name.split('.').pop() : 'no-ext';
      counts[ext] = (counts[ext] || 0) + 1;
    });
    return counts;
  }, [allowedFiles]);

  // 5. Initialize default selection when available extensions change (e.g. on first load)
  useEffect(() => {
    if (!isOpen) return;
    
    const commonCodeExts = ['.rs', '.js', '.ts', '.jsx', '.tsx', '.py', '.go', '.java', '.c', '.cpp', '.h', '.css', '.html', '.vue', '.svelte', '.json', '.toml', '.md'];
    const newSelection = new Set<string>();

    Object.keys(availableExtensions).forEach(ext => {
      if (commonCodeExts.includes(ext) || ext === '.toml' || ext === '.json') {
        newSelection.add(ext);
      }
    });
    
    // Only set if we haven't set it yet or if the allowed files changed drastically
    // For smoother UX, we just update the set to include valid ones from the new list
    setSelectedExtensions(newSelection);
  }, [availableExtensions, isOpen]);

  // 6. Final Filtered List for Import
  const finalFilesToImport = useMemo(() => {
    return allowedFiles.filter(file => {
      const ext = file.name.includes('.') ? '.' + file.name.split('.').pop() : 'no-ext';
      return selectedExtensions.has(ext);
    });
  }, [allowedFiles, selectedExtensions]);

  const handleToggleExt = (ext: string) => {
    const next = new Set(selectedExtensions);
    if (next.has(ext)) next.delete(ext);
    else next.add(ext);
    setSelectedExtensions(next);
  };

  const handleImport = () => {
    onImport(finalFilesToImport);
    onClose();
  };

  const totalIgnored = files.length - allowedFiles.length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-[#1E1F22] rounded-xl shadow-2xl w-full max-w-2xl border border-gray-200 dark:border-gray-700 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-rust" /> Import Project
          </h2>
          <button onClick={onClose} className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Stats Bar */}
          <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 dark:bg-zinc-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
             <div className="text-center border-r border-gray-200 dark:border-gray-700">
                <div className="text-xs text-gray-500 uppercase font-bold">Total Found</div>
                <div className="text-2xl font-mono text-gray-700 dark:text-gray-300">{files.length}</div>
             </div>
             <div className="text-center border-r border-gray-200 dark:border-gray-700">
                <div className="text-xs text-gray-500 uppercase font-bold">Ignored</div>
                <div className="text-2xl font-mono text-gray-500">{respectGitIgnore ? totalIgnored : 0}</div>
             </div>
             <div className="text-center">
                <div className="text-xs text-rust uppercase font-bold">To Import</div>
                <div className="text-2xl font-mono text-rust">{finalFilesToImport.length}</div>
             </div>
          </div>

          {/* GitIgnore Toggle */}
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-3 cursor-pointer group">
              <div className={`w-10 h-6 rounded-full p-1 transition-colors ${respectGitIgnore ? 'bg-rust' : 'bg-gray-300 dark:bg-gray-600'}`}>
                <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform ${respectGitIgnore ? 'translate-x-4' : 'translate-x-0'}`} />
              </div>
              <div>
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Respect .gitignore</span>
                <p className="text-xs text-gray-500">
                  {gitIgnoreContent ? "Found and applied rules from .gitignore" : "Using default ignore rules (node_modules, target, etc.)"}
                </p>
              </div>
              <input type="checkbox" className="hidden" checked={respectGitIgnore} onChange={(e) => setRespectGitIgnore(e.target.checked)} />
            </label>
            {gitIgnoreContent && (
              <div title=".gitignore found">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
              </div>
            )}
          </div>

          <div className="h-px bg-gray-200 dark:bg-gray-700" />

          {/* Extension Filters */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-bold text-gray-700 dark:text-gray-300">Filter by File Type</span>
              </div>
              <div className="flex gap-2">
                 <button 
                   onClick={() => setSelectedExtensions(new Set(Object.keys(availableExtensions)))}
                   className="text-[10px] text-rust hover:underline"
                 >
                   Select All
                 </button>
                 <button 
                   onClick={() => setSelectedExtensions(new Set())}
                   className="text-[10px] text-gray-500 hover:underline"
                 >
                   Clear
                 </button>
              </div>
            </div>
            
            {Object.keys(availableExtensions).length === 0 ? (
               <div className="text-center py-8 text-gray-500 text-sm italic">
                 No files matching current ignore rules.
               </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {Object.entries(availableExtensions)
                  .sort((a, b) => (b[1] as number) - (a[1] as number))
                  .map(([ext, count]) => (
                  <button
                    key={ext}
                    onClick={() => handleToggleExt(ext)}
                    className={`flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium border transition-all ${
                      selectedExtensions.has(ext)
                        ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300'
                        : 'bg-gray-50 dark:bg-zinc-800 border-gray-200 dark:border-gray-700 text-gray-500 hover:border-gray-300'
                    }`}
                  >
                    <span className="font-mono">{ext}</span>
                    <span className="bg-white dark:bg-black/20 px-1.5 rounded-full text-[10px] opacity-70">{count}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3 bg-gray-50 dark:bg-zinc-800/50 rounded-b-xl">
           <button 
             onClick={onClose}
             className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-zinc-700 rounded-lg text-sm font-medium transition-colors"
           >
             Cancel
           </button>
           <button 
             onClick={handleImport}
             disabled={finalFilesToImport.length === 0}
             className="bg-rust hover:bg-rust-dark text-white px-5 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
           >
             <FileText className="w-4 h-4" /> 
             Import {finalFilesToImport.length} Files
           </button>
        </div>
      </div>
    </div>
  );
};
