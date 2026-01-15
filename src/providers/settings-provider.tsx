"use client";

import {
  createContext,
  PropsWithChildren,
  use,
  useCallback,
  useMemo,
} from "react";

import { Settings, settingsSchema } from "@/client-data/settings";
import { useLocalStorage } from "@/hooks/use-local-storage";

const defaultSettings = settingsSchema.parse({});

function deserializeSettings(raw: string): Settings {
  try {
    const parsedJson = JSON.parse(raw);
    const parsed = settingsSchema.safeParse(parsedJson);
    return parsed.success ? parsed.data : defaultSettings;
  } catch {
    return defaultSettings;
  }
}

export interface SettingsContextValue {
  settings: Settings;
  changeSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
}

export const SettingsContext = createContext<SettingsContextValue>({
  settings: defaultSettings,
  changeSetting: () => {},
});

export function SettingsProvider({ children }: PropsWithChildren) {
  const [storedSettings, setStoredSettings] = useLocalStorage<Settings>(
    "mnemos:settings",
    defaultSettings,
    {
      deserialize: deserializeSettings,
    },
  );

  const changeSetting = useCallback(
    <K extends keyof Settings>(key: K, value: Settings[K]) => {
      setStoredSettings((prev) => {
        const candidate: Settings = { ...prev, [key]: value };
        const candidateParsed = settingsSchema.safeParse(candidate);
        if (candidateParsed.success) return candidateParsed.data;

        const repaired: Settings = { ...prev, [key]: defaultSettings[key] };
        const repairedParsed = settingsSchema.safeParse(repaired);
        return repairedParsed.success ? repairedParsed.data : defaultSettings;
      });
    },
    [setStoredSettings],
  );

  const contextValue = useMemo(
    () => ({ settings: storedSettings, changeSetting }),
    [changeSetting, storedSettings],
  );

  return (
    <SettingsContext.Provider value={contextValue}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return use(SettingsContext);
}
