import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { AppSettings } from '@/types';

type SettingsContextType = {
  settings: AppSettings | null;
  isLoading: boolean;
  refresh: () => Promise<void>;
};

const SettingsContext = createContext<SettingsContextType>({
  settings: null,
  isLoading: true,
  refresh: async () => {},
});

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSettings = async () => {
    setIsLoading(true);
    const { data } = await supabase.rpc('get_settings');
    setSettings(data as AppSettings);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, isLoading, refresh: fetchSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => useContext(SettingsContext); 