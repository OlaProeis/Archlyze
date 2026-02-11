
import React, { useState, useEffect } from 'react';
import { Loader2, CheckCircle2, Terminal } from 'lucide-react';

interface LoadingOverlayProps {
  isVisible: boolean;
}

const STEPS = [
  "Initializing analysis engine...",
  "Model is reasoning about your code...",
  "Detecting programming language...",
  "Parsing structure & components...",
  "Tracing dependencies...",
  "Detecting anti-patterns & bugs...",
  "Generating structured results...",
  "Finalizing summary..."
];

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ isVisible }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (isVisible) {
      setCurrentStep(0);
      setElapsed(0);
      // Step progression — spaced out for up to ~180s total timeout
      const stepInterval = setInterval(() => {
        setCurrentStep((prev) => (prev < STEPS.length - 1 ? prev + 1 : prev));
      }, 3000);
      // Elapsed timer
      const timerInterval = setInterval(() => {
        setElapsed(prev => prev + 1);
      }, 1000);
      return () => { clearInterval(stepInterval); clearInterval(timerInterval); };
    }
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <div className="absolute inset-0 z-50 bg-white/90 dark:bg-[#1E1F22]/90 backdrop-blur-sm flex flex-col items-center justify-center font-mono">
      <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl p-8 max-w-md w-full">
        <div className="flex items-center gap-3 mb-6 border-b border-gray-200 dark:border-gray-800 pb-4">
          <div className="p-2 bg-rust/10 rounded-lg text-rust">
            <Terminal className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Running Analysis</h3>
            <p className="text-xs text-gray-500">Powered by Google Gemini</p>
          </div>
        </div>

        <div className="space-y-4">
          {STEPS.map((step, index) => {
            const isCompleted = index < currentStep;
            const isCurrent = index === currentStep;

            return (
              <div 
                key={index} 
                className={`flex items-center gap-3 text-sm transition-all duration-300 ${
                  isCompleted || isCurrent ? 'opacity-100' : 'opacity-30'
                }`}
              >
                <div className="w-5 flex justify-center">
                  {isCompleted ? (
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                  ) : isCurrent ? (
                    <Loader2 className="w-5 h-5 text-rust animate-spin" />
                  ) : (
                    <div className="w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-700" />
                  )}
                </div>
                <span className={`${isCurrent ? 'text-gray-900 dark:text-gray-100 font-bold' : 'text-gray-600 dark:text-gray-400'}`}>
                  {step}
                </span>
              </div>
            );
          })}
        </div>

        <div className="mt-8 pt-4 border-t border-gray-200 dark:border-gray-800 flex items-center justify-between">
          <p className="text-xs text-gray-400 animate-pulse">
            {currentStep === STEPS.length - 1 ? "Finishing up... almost there!" : "Thinking models need time to reason..."}
          </p>
          <span className="text-xs font-mono text-gray-500">{elapsed}s</span>
        </div>
      </div>
    </div>
  );
};
