
import React from 'react';
import { AppSettings } from '../types';
import { X, Save, Key, Cpu, FileText, ExternalLink, Zap, Brain, Sparkles, ChevronDown } from 'lucide-react';

// ── Model Registry ──────────────────────────────────────────────────────────
interface ModelOption {
  id: string;
  name: string;
  description: string;
  tier: 'free' | 'paid';
  badge?: string;
}

const AVAILABLE_MODELS: ModelOption[] = [
  // Free-tier models (available to all API keys)
  { id: 'gemini-2.5-flash',      name: 'Gemini 2.5 Flash',      description: 'Fast & efficient. Best for general use.',            tier: 'free', badge: 'Recommended' },
  { id: 'gemini-2.5-pro',        name: 'Gemini 2.5 Pro',        description: 'Advanced reasoning. Best for complex analysis.',     tier: 'free' },
  { id: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash-Lite', description: 'Ultra-fast. Best for simple, high-frequency tasks.', tier: 'free' },
  // Paid / preview models (require paid API tier or have limited free calls)
  { id: 'gemini-2.5-pro-preview-05-06', name: 'Gemini 2.5 Pro Preview', description: 'Latest Pro preview. ~25 free req/day.',     tier: 'paid' },
  { id: 'gemini-3-flash-preview',       name: 'Gemini 3 Flash',         description: 'Next-gen speed. Requires paid API tier.',    tier: 'paid' },
  { id: 'gemini-3-pro-preview',         name: 'Gemini 3 Pro',           description: 'Next-gen reasoning. Requires paid API tier.', tier: 'paid' },
];

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSave: (newSettings: AppSettings) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, settings, onSave }) => {
  const [localSettings, setLocalSettings] = React.useState<AppSettings>(settings);
  const [useCustomModel, setUseCustomModel] = React.useState(false);
  const [customModelId, setCustomModelId] = React.useState('');

  // Sync when opening
  React.useEffect(() => {
    if (isOpen) {
      setLocalSettings(settings);
      // Check if current model is a known model or custom
      const isKnown = AVAILABLE_MODELS.some(m => m.id === settings.model);
      setUseCustomModel(!isKnown && settings.model !== '');
      if (!isKnown && settings.model !== '') {
        setCustomModelId(settings.model);
      }
    }
  }, [isOpen, settings]);

  if (!isOpen) return null;

  const handleSelectModel = (modelId: string) => {
    setUseCustomModel(false);
    setCustomModelId('');
    setLocalSettings({ ...localSettings, model: modelId });
  };

  const handleToggleCustom = () => {
    if (useCustomModel) {
      // Switching back to list — pick the default
      setUseCustomModel(false);
      setCustomModelId('');
      setLocalSettings({ ...localSettings, model: 'gemini-2.5-flash' });
    } else {
      setUseCustomModel(true);
    }
  };

  const handleSave = () => {
    const finalSettings = { ...localSettings };
    if (useCustomModel && customModelId.trim()) {
      finalSettings.model = customModelId.trim();
    }
    onSave(finalSettings);
    onClose();
  };

  const freeModels = AVAILABLE_MODELS.filter(m => m.tier === 'free');
  const paidModels = AVAILABLE_MODELS.filter(m => m.tier === 'paid');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-[#1E1F22] rounded-xl shadow-2xl w-full max-w-lg border border-gray-200 dark:border-gray-700 flex flex-col max-h-[90vh]">
        
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Configuration</h2>
          <button onClick={onClose} className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto">
          
          {/* API Key Section */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-2">
              <Key className="w-4 h-4" /> Gemini API Key
            </label>
            <input 
              type="password" 
              value={localSettings.apiKey}
              onChange={(e) => setLocalSettings({...localSettings, apiKey: e.target.value})}
              placeholder="Paste your API key here..."
              className="w-full bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-rust focus:border-transparent outline-none transition-all"
            />
            <div className="flex justify-between items-start gap-2">
              <p className="text-xs text-gray-500 dark:text-gray-400 flex-1">
                Your key is stored locally in your browser. It is never sent to our servers, only directly to Google's API.
              </p>
              <a 
                href="https://aistudio.google.com/app/apikey" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-xs text-rust hover:underline whitespace-nowrap flex items-center gap-1 font-medium"
              >
                Get Key <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          {/* Model Selection */}
          <div className="space-y-3">
            <label className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-2">
              <Cpu className="w-4 h-4" /> AI Model
            </label>

            {!useCustomModel && (
              <div className="space-y-3">
                {/* Free Tier */}
                <div className="space-y-1.5">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-green-600 dark:text-green-400 flex items-center gap-1.5">
                    <Zap className="w-3 h-3" /> Free Tier
                  </div>
                  {freeModels.map(model => (
                    <ModelButton
                      key={model.id}
                      model={model}
                      isSelected={localSettings.model === model.id}
                      onSelect={() => handleSelectModel(model.id)}
                    />
                  ))}
                </div>

                {/* Paid / Preview */}
                <div className="space-y-1.5">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-purple-600 dark:text-purple-400 flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3" /> Preview / Paid
                  </div>
                  {paidModels.map(model => (
                    <ModelButton
                      key={model.id}
                      model={model}
                      isSelected={localSettings.model === model.id}
                      onSelect={() => handleSelectModel(model.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Custom Model Toggle */}
            <div className="pt-1">
              <button
                onClick={handleToggleCustom}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg border text-left text-sm transition-all ${
                  useCustomModel
                    ? 'border-rust bg-rust/5 dark:bg-rust/10'
                    : 'border-dashed border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 text-gray-500'
                }`}
              >
                <span className="flex items-center gap-2">
                  <Brain className="w-4 h-4" />
                  {useCustomModel ? 'Using custom model' : 'Use a custom model ID...'}
                </span>
                <ChevronDown className={`w-4 h-4 transition-transform ${useCustomModel ? 'rotate-180' : ''}`} />
              </button>

              {useCustomModel && (
                <div className="mt-2 space-y-2">
                  <input
                    type="text"
                    value={customModelId}
                    onChange={(e) => setCustomModelId(e.target.value)}
                    placeholder="e.g. gemini-3-flash-preview"
                    className="w-full bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-rust focus:border-transparent outline-none transition-all"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Enter any Gemini model ID. Useful for paid API tiers with access to newer models (e.g. Gemini 3.0).
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Line Limit */}
          <div className="space-y-2">
             <label className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-2">
              <FileText className="w-4 h-4" /> Max Lines Analysis
            </label>
            <div className="flex items-center gap-4">
              <input 
                type="range" 
                min="500" 
                max="20000" 
                step="500" 
                value={localSettings.maxLines}
                onChange={(e) => setLocalSettings({...localSettings, maxLines: parseInt(e.target.value)})}
                className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-rust"
              />
              <input 
                type="number" 
                min="500" 
                max="20000" 
                step="500"
                value={localSettings.maxLines}
                onChange={(e) => {
                  let val = parseInt(e.target.value);
                  if (isNaN(val)) val = 500;
                  if (val > 20000) val = 20000;
                  setLocalSettings({...localSettings, maxLines: val});
                }}
                className="w-20 px-2 py-1 text-sm bg-gray-100 dark:bg-zinc-800 border border-gray-200 dark:border-gray-700 rounded-md text-center focus:border-rust outline-none"
              />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Limit code analysis size. Higher limits allow analyzing larger files but may increase processing time.
            </p>
          </div>

        </div>

        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-zinc-800/50 rounded-b-xl flex justify-end">
           <button 
             onClick={handleSave}
             className="bg-rust hover:bg-rust-dark text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors shadow-sm"
           >
             <Save className="w-4 h-4" /> Save Settings
           </button>
        </div>
      </div>
    </div>
  );
};

// ── Model Button Sub-component ──────────────────────────────────────────────
const ModelButton: React.FC<{ model: ModelOption; isSelected: boolean; onSelect: () => void }> = ({ model, isSelected, onSelect }) => {
  return (
    <button
      onClick={onSelect}
      className={`w-full flex items-start gap-3 p-2.5 rounded-lg border text-left transition-all ${
        isSelected
          ? 'border-rust bg-rust/5 dark:bg-rust/10'
          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
      }`}
    >
      <div className={`mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${isSelected ? 'border-rust' : 'border-gray-300 dark:border-gray-600'}`}>
        {isSelected && <div className="w-2 h-2 bg-rust rounded-full" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm text-gray-900 dark:text-gray-100">{model.name}</span>
          {model.badge && (
            <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-rust/10 text-rust dark:bg-rust/20 dark:text-rust-light">
              {model.badge}
            </span>
          )}
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400">{model.description}</div>
      </div>
      <span className="text-[10px] font-mono text-gray-400 dark:text-gray-500 shrink-0 mt-1">{model.id}</span>
    </button>
  );
};
