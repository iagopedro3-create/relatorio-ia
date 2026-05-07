import { useState, createContext, useContext, useEffect } from 'react';
import type { ReactNode } from 'react';

interface Settings {
  apiKey: string;
  aiProvider: 'gemini' | 'openai';
  aiModel: string;
}

interface SettingsContextType {
  settings: Settings;
  updateSettings: (newSettings: Partial<Settings>) => void;
}

const DEFAULT_SETTINGS: Settings = {
  apiKey: import.meta.env.VITE_AI_API_KEY || '',
  aiProvider: (import.meta.env.VITE_AI_PROVIDER as 'gemini' | 'openai') || 'gemini',
  aiModel: import.meta.env.VITE_AI_MODEL || 'gemini-1.5-flash',
};

const SETTINGS_KEY = 'vidadeaprendiz_settings';

export const SettingsContext = createContext<SettingsContextType | null>(null);

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) throw new Error('useSettings must be used within SettingsProvider');
  return context;
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);

  // Initialize from localStorage
  useEffect(() => {
    const savedSettings = localStorage.getItem(SETTINGS_KEY);
    if (savedSettings) {
      try {
        setSettings(JSON.parse(savedSettings));
      } catch (e) {
        console.error('Failed to parse saved settings', e);
      }
    }
  }, []);

  const updateSettings = (newSettings: Partial<Settings>) => {
    setSettings(prev => {
      const updated = { ...prev, ...newSettings };
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}
