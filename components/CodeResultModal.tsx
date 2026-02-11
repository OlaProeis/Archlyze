
import React from 'react';
import { X, Copy, Check } from 'lucide-react';

interface CodeResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  code: string;
}

export const CodeResultModal: React.FC<CodeResultModalProps> = ({ isOpen, onClose, title, code }) => {
  const [copied, setCopied] = React.useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-[#1E1F22] rounded-xl shadow-2xl w-full max-w-2xl border border-gray-200 dark:border-gray-700 flex flex-col max-h-[80vh]">
        
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            {title}
          </h2>
          <button onClick={onClose} className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-0 bg-gray-50 dark:bg-[#121212] relative group">
           <button 
             onClick={handleCopy}
             className="absolute top-4 right-4 z-10 p-2 bg-white dark:bg-zinc-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 text-gray-500 hover:text-rust dark:text-gray-400 dark:hover:text-rust-light transition-colors"
             title="Copy to clipboard"
           >
             {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
           </button>
           <pre className="p-4 text-sm font-mono text-gray-800 dark:text-gray-200 whitespace-pre-wrap break-all">
             {code}
           </pre>
        </div>

        <div className="p-4 border-t border-gray-200 dark:border-gray-800 flex justify-end">
           <button 
             onClick={onClose}
             className="px-4 py-2 bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition-colors"
           >
             Close
           </button>
        </div>
      </div>
    </div>
  );
};
