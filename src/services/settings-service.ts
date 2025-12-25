import { Settings, settingsSchema } from "@/client-data/settings";

export class SettingsService {
  private readonly defaultSettings: Settings = settingsSchema.parse({});
  private cachedSettings: Settings | null = null;
  private cachedSettingsJson: string | null = null;

  constructor(private localStorage: Storage) {}

  get settings(): Settings {
    const settingsJson = this.localStorage.getItem("settings");

    if (
      settingsJson !== null &&
      this.cachedSettingsJson === settingsJson &&
      this.cachedSettings !== null
    ) {
      return this.cachedSettings;
    }

    let validatedSettings: Settings;

    if (settingsJson) {
      try {
        const parsed = JSON.parse(settingsJson);
        validatedSettings = settingsSchema.parse(parsed);
      } catch {
        validatedSettings = this.defaultSettings;
      }
    } else {
      validatedSettings = this.defaultSettings;
    }

    this.cachedSettings = validatedSettings;
    this.cachedSettingsJson = JSON.stringify(validatedSettings);

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

    const validatedSettings = settingsSchema.parse(updatedSettings);
    const newSettingsJson = JSON.stringify(validatedSettings);

    this.cachedSettings = validatedSettings;
    this.cachedSettingsJson = newSettingsJson;
    this.localStorage.setItem("settings", newSettingsJson);
  }
}
