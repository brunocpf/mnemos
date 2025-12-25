import { Settings, settingsSchema } from "@/client-data/settings";

export class SettingsService {
  static readonly STORAGE_KEY = "mnemos:settings";
  private readonly defaultSettings: Settings = settingsSchema.parse({});
  private cachedSettings: Settings | null = null;
  private staleCache = true;

  constructor(private localStorage: Storage) {}

  get settings(): Settings {
    if (!this.staleCache && this.cachedSettings !== null) {
      return this.cachedSettings;
    }

    let validatedSettings = this.defaultSettings;
    const settingsJson = this.localStorage.getItem(SettingsService.STORAGE_KEY);

    if (settingsJson) {
      try {
        const parsed = JSON.parse(settingsJson);
        validatedSettings = settingsSchema.parse(parsed);
        this.cachedSettings = validatedSettings;
      } catch {
        validatedSettings = this.defaultSettings;
        this.cachedSettings = this.defaultSettings;
      }
    } else {
      this.cachedSettings = this.defaultSettings;
    }

    this.staleCache = false;
    return validatedSettings;
  }

  getSetting<K extends keyof Settings>(key: K): Settings[K] {
    return this.settings[key];
  }

  setSetting<K extends keyof Settings>(key: K, value: Settings[K]) {
    const currentSettings = this.settings;
    const updatedSettings: Settings = {
      ...currentSettings,
      [key]: value,
    };

    const parsedSettings = settingsSchema.safeParse(updatedSettings);

    const validatedSettings: Settings = parsedSettings.success
      ? parsedSettings.data
      : this.defaultSettings;

    this.cachedSettings = validatedSettings;
    this.staleCache = false;
    this.localStorage.setItem(
      SettingsService.STORAGE_KEY,
      JSON.stringify(validatedSettings),
    );
  }
}
