
import React from 'react';
import { Folder, FileText, ChevronRight, ChevronDown, FileCode } from 'lucide-react';
import { ProjectFile } from '../types';

interface FileExplorerProps {
  files: ProjectFile[];
  currentFile: ProjectFile | null;
  onFileSelect: (file: ProjectFile) => void;
}

interface TreeNode {
  name: string;
  path: string;
  isFile: boolean;
  file?: ProjectFile;
  children: Record<string, TreeNode>;
  isOpen: boolean;
}

export const FileExplorer: React.FC<FileExplorerProps> = ({ files, currentFile, onFileSelect }) => {
  const [tree, setTree] = React.useState<TreeNode | null>(null);

  // Build tree from flat file list on mount or files change
  React.useEffect(() => {
    const root: TreeNode = { name: 'root', path: '', isFile: false, children: {}, isOpen: true };
    
    files.forEach(file => {
      const parts = file.path.split('/');
      let current = root;
      
      parts.forEach((part, index) => {
        if (index === parts.length - 1) {
          // It's a file
          current.children[part] = {
            name: part,
            path: file.path,
            isFile: true,
            file: file,
            children: {},
            isOpen: false
          };
        } else {
          // It's a folder
          if (!current.children[part]) {
            current.children[part] = {
              name: part,
              path: current.path ? `${current.path}/${part}` : part,
              isFile: false,
              children: {},
              isOpen: true // Default open
            };
          }
          current = current.children[part];
        }
      });
    });

    setTree(root);
  }, [files]);

  const toggleFolder = (node: TreeNode) => {
    node.isOpen = !node.isOpen;
    setTree({ ...tree! }); // Force re-render
  };

  const renderNode = (node: TreeNode, depth: number) => {
    // Skip root rendering, just render children
    if (node.name === 'root') {
        return Object.values(node.children).map(child => renderNode(child, depth));
    }

    const isSelected = node.isFile && currentFile?.path === node.file?.path;

    return (
      <div key={node.path}>
        <div 
          className={`flex items-center gap-1.5 py-1 px-2 cursor-pointer text-xs select-none transition-colors
            ${isSelected ? 'bg-rust/10 text-rust font-medium' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5'}
          `}
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
          onClick={() => node.isFile ? onFileSelect(node.file!) : toggleFolder(node)}
        >
          {node.isFile ? (
            <FileCode className={`w-3.5 h-3.5 ${isSelected ? 'text-rust' : 'text-gray-400'}`} />
          ) : (
            <div className="flex items-center gap-1">
               {node.isOpen ? <ChevronDown className="w-3 h-3 text-gray-400" /> : <ChevronRight className="w-3 h-3 text-gray-400" />}
               <Folder className="w-3.5 h-3.5 text-blue-400" />
            </div>
          )}
          <span className="truncate">{node.name}</span>
        </div>
        {node.isOpen && !node.isFile && (
          <div>
            {Object.values(node.children)
               .sort((a, b) => (a.isFile === b.isFile ? 0 : a.isFile ? 1 : -1)) // Folders first
               .map(child => renderNode(child, depth + 1))
            }
          </div>
        )}
      </div>
    );
  };

  if (!tree) return null;

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-[#18181b] border-r border-gray-200 dark:border-gray-800">
      <div className="p-3 border-b border-gray-200 dark:border-gray-800 font-bold text-xs text-gray-500 uppercase tracking-wider flex items-center gap-2">
        <Folder className="w-4 h-4" /> Explorer
      </div>
      <div className="flex-1 overflow-y-auto py-2">
         {Object.values(tree.children).length === 0 ? (
           <div className="px-4 py-2 text-xs text-gray-500 italic">No files loaded</div>
         ) : (
           renderNode(tree, 0)
         )}
      </div>
    </div>
  );
};
