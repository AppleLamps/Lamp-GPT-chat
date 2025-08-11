import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { useToast } from "@/hooks/use-toast";

// Context default values
interface SettingsContextType {
  apiKey: string;
  getimgApiKey: string;
  modelTemperature: number;
  maxTokens: number;
  currentModel: string;
  settingsOpen: boolean;
  setSettingsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  
  // Setters
  setApiKey: React.Dispatch<React.SetStateAction<string>>;
  setGetimgApiKey: React.Dispatch<React.SetStateAction<string>>;
  setModelTemperature: React.Dispatch<React.SetStateAction<number>>;
  setMaxTokens: React.Dispatch<React.SetStateAction<number>>;
  setCurrentModel: React.Dispatch<React.SetStateAction<string>>;
  
  // Functions
  handleSaveSettings: (key: string, temp: number, tokens: number, model?: string) => void;
}

// Create context with default values
const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

// Provider component
export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // State for settings
  const [apiKey, setApiKey] = useState("");
  const [getimgApiKey, setGetimgApiKey] = useState("");
  const [modelTemperature, setModelTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(4000);
  const [currentModel, setCurrentModel] = useState<string>('x-ai/grok-4');
  const [settingsOpen, setSettingsOpen] = useState(false);
  
  const { toast } = useToast();
  
  useEffect(() => {
    // Prefer server-stored settings; fallback to defaults
    fetch(`/api/api-keys?userId=me&provider=openrouter`).then(async r => {
        if (r.ok) { const d = await r.json(); setApiKey(d.secret || ''); } else { setSettingsOpen(true); }
      }).catch(() => setSettingsOpen(true));

    // load numeric/text settings
    fetch(`/api/user-settings?userId=me`).then(async r => {
      if (!r.ok) return;
      const d = await r.json();
      if (d.model_temperature != null) setModelTemperature(d.model_temperature);
      if (d.max_tokens != null) setMaxTokens(d.max_tokens);
      if (d.current_model) setCurrentModel(d.current_model);
    }).catch(() => {});
  }, []);
  
  const handleSaveSettings = (key: string, temp: number, tokens: number, model?: string) => {
    setApiKey(key);
    setModelTemperature(temp);
    setMaxTokens(tokens);
    if (model) {
      setCurrentModel(model);
    }
    
    // Persist to backend if we have a user
    if (key) {
      fetch('/api/api-keys', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: 'me', provider: 'openrouter', secret: key }) });
    }
    fetch('/api/user-settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: 'me', model_temperature: temp, max_tokens: tokens, current_model: model || currentModel }) });
    
    // Close settings after saving
    setSettingsOpen(false);
    
    toast({
      title: "Settings Saved",
      description: "Your settings have been saved successfully.",
    });
  };
  
  const value = {
    apiKey,
    getimgApiKey,
    modelTemperature,
    maxTokens,
    currentModel,
    settingsOpen,
    setSettingsOpen,
    
    setApiKey,
    setGetimgApiKey,
    setModelTemperature,
    setMaxTokens,
    setCurrentModel,
    
    handleSaveSettings,
  };
  
  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};

// Custom hook for using the settings context
export const useSettings = (): SettingsContextType => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}; 