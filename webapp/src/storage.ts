import type { BuildingConfig } from './types';
import { createDefaultConfig } from './types';

const STORAGE_KEY = 'building-estimator-config';

/** Save config to localStorage */
export function saveConfig(config: BuildingConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {
    // Storage full or unavailable -- silently ignore
  }
}

/** Load config from localStorage, returns default if nothing saved */
export function loadConfig(): BuildingConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<BuildingConfig>;
      // Merge with defaults to handle any missing keys from older saves
      const defaults = createDefaultConfig();
      return {
        ...defaults,
        ...parsed,
        dimensions: { ...defaults.dimensions, ...parsed.dimensions },
        leanTos: {
          right: { ...defaults.leanTos.right, ...parsed.leanTos?.right },
          left: { ...defaults.leanTos.left, ...parsed.leanTos?.left },
          front: { ...defaults.leanTos.front, ...parsed.leanTos?.front },
          back: { ...defaults.leanTos.back, ...parsed.leanTos?.back },
        },
        insulation: { ...defaults.insulation, ...parsed.insulation },
        components: parsed.components ?? defaults.components,
        customerName: parsed.customerName ?? defaults.customerName,
        jobLocation: parsed.jobLocation ?? defaults.jobLocation,
      };
    }
  } catch {
    // Corrupt JSON -- fall through to default
  }
  return createDefaultConfig();
}

/** Clear saved config */
export function clearConfig(): void {
  localStorage.removeItem(STORAGE_KEY);
}
