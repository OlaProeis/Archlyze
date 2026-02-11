
import React, { useEffect, useRef } from 'react';
import { CodeComponent, CodeIssue } from '../types';

interface CodePanelProps {
  code: string;
  components: CodeComponent[];
  activeComponentId: string | null;
  onLineClick: (line: number) => void;
  isEditing: boolean;
  onCodeChange: (newCode: string) => void;
}

export const CodePanel: React.FC<CodePanelProps> = ({ 
  code, 
  components, 
  activeComponentId, 
  onLineClick,
  isEditing,
  onCodeChange
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll effect
  useEffect(() => {
    if (!activeComponentId || !components.length) return;

    const component = components.find(c => c.id === activeComponentId);
    if (component) {
      const lineElement = document.getElementById(`line-${component.startLine}`);
      if (lineElement) {
        lineElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [activeComponentId, components]);

  if (isEditing) {
    return (
      <div className="h-full w-full bg-gray-50 dark:bg-[#1E1F22] p-0">
        <textarea
          className="w-full h-full p-4 font-mono text-sm bg-gray-50 dark:bg-[#1E1F22] text-gray-900 dark:text-gray-100 resize-none focus:outline-none"
          value={code}
          onChange={(e) => onCodeChange(e.target.value)}
          spellCheck={false}
          placeholder="// Paste your code here..."
        />
      </div>
    );
  }

  const lines = code.split('\n');

  // Find the active component object once to check ranges
  const activeComponent = components.find(c => c.id === activeComponentId);

  return (
    <div ref={containerRef} className="h-full overflow-auto font-mono text-sm bg-gray-50 dark:bg-[#1E1F22] relative">
      <div className="min-w-fit">
        {lines.map((line, idx) => {
          const lineNum = idx + 1;
          
          // Fix: Check range directly instead of finding component at line
          const isLineActive = activeComponent 
            ? (lineNum >= activeComponent.startLine && lineNum <= activeComponent.endLine)
            : false;

          const hasIssue = activeComponent 
            ? activeComponent.issues.some(i => i.line === lineNum)
            : false;

          return (
            <div 
              key={idx} 
              id={`line-${lineNum}`}
              className={`flex group hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors cursor-pointer ${isLineActive ? 'bg-rust-light/10 dark:bg-rust-dark/20' : ''}`}
              onClick={() => onLineClick(lineNum)}
            >
              {/* Line Number */}
              <div className={`w-12 text-right pr-3 select-none border-r py-0.5 ${isLineActive ? 'text-rust font-bold bg-rust/5 border-rust/30' : 'text-gray-400 dark:text-gray-600 bg-gray-100 dark:bg-[#2B2D31] border-gray-300 dark:border-gray-700'}`}>
                {lineNum}
              </div>
              
              {/* Code Content */}
              <div className="flex-1 pl-4 py-0.5 whitespace-pre relative">
                <span className={hasIssue ? "underline decoration-wavy decoration-yellow-500" : ""}>
                   <SyntaxHighlight line={line} />
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Simple syntax highlighter for multiple languages
const SyntaxHighlight: React.FC<{ line: string }> = ({ line }) => {
  const keywords = [
    // Rust
    'fn', 'let', 'mut', 'struct', 'impl', 'pub', 'use', 'mod', 'crate', 'match', 'Some', 'None', 'Result', 'Option', 'Ok', 'Err', 'String', 'Vec', 'u8', 'u32', 'i32', 'usize', 
    // JS/TS
    'const', 'var', 'function', 'import', 'export', 'from', 'class', 'interface', 'type', 'async', 'await', 'console', 'require',
    // Python
    'def', 'import', 'class', 'from', 'if', 'elif', 'else', 'try', 'except', 'finally', 'for', 'while', 'in', 'return', 'lambda', 'None', 'True', 'False', 'self',
    // Vue/HTML
    'template', 'script', 'style', 'setup', 'div', 'span', 'p', 'a', 'button', 'input', 'form', 'label', 'v-if', 'v-for', 'v-else', 'v-model', '@click', ':class', 'ref', 'computed', 'watch',
    // Common
    'if', 'else', 'for', 'while', 'loop', 'break', 'continue', 'true', 'false', 'return', 'void', 'int', 'float', 'string', 'public', 'private', 'protected'
  ];
  
  const parts = line.split(/(\b\w+\b|[^\w\s])/g);

  return (
    <>
      {parts.map((part, i) => {
        if (keywords.includes(part)) {
          return <span key={i} className="text-rust dark:text-rust-light font-bold">{part}</span>;
        } else if (part.startsWith('"') || part.startsWith("'") || part.startsWith('`')) {
          return <span key={i} className="text-green-600 dark:text-green-400">{part}</span>;
        } else if (part.startsWith('//') || part.startsWith('#') || (part.startsWith('<!--'))) {
          return <span key={i} className="text-gray-400 italic">{part}</span>;
        } else if (part === '<' || part === '>' || part === '/') {
          return <span key={i} className="text-blue-500 font-bold">{part}</span>;
        } else {
          return <span key={i} className="text-gray-800 dark:text-gray-300">{part}</span>;
        }
      })}
    </>
  );
};
