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
        options: { ...defaults.options, ...parsed.options },
        overhangs: { ...defaults.overhangs, ...parsed.overhangs },
        leanTos: {
          right: { ...defaults.leanTos.right, ...parsed.leanTos?.right },
          left: { ...defaults.leanTos.left, ...parsed.leanTos?.left },
          front: { ...defaults.leanTos.front, ...parsed.leanTos?.front },
          back: { ...defaults.leanTos.back, ...parsed.leanTos?.back },
        },
        sheeting: { ...defaults.sheeting, ...parsed.sheeting },
        doorsWindows: { ...defaults.doorsWindows, ...parsed.doorsWindows },
        accessories: { ...defaults.accessories, ...parsed.accessories },
        insulation: { ...defaults.insulation, ...parsed.insulation },
        components: parsed.components ?? defaults.components,
        customerName: parsed.customerName ?? defaults.customerName,
        jobLocation: parsed.jobLocation ?? defaults.jobLocation,
        overheads: { ...defaults.overheads, ...parsed.overheads },
        additionalStructures: parsed.additionalStructures
          ? { ...defaults.additionalStructures, ...parsed.additionalStructures }
          : defaults.additionalStructures,
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

// ---- Cached active price-list / catalog versions (offline fallback) ----

const PRICE_LIST_CACHE_KEY = 'cached-price-list-version';
const CATALOG_CACHE_KEY = 'cached-catalog-version';

export interface CachedVersion<T> {
  cachedAt: string;
  data: T;
}

export function saveCachedPriceList<T>(data: T): void {
  try {
    const payload: CachedVersion<T> = { cachedAt: new Date().toISOString(), data };
    localStorage.setItem(PRICE_LIST_CACHE_KEY, JSON.stringify(payload));
  } catch {
    // ignore
  }
}

export function loadCachedPriceList<T>(): CachedVersion<T> | null {
  try {
    const raw = localStorage.getItem(PRICE_LIST_CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CachedVersion<T>;
  } catch {
    return null;
  }
}

export function saveCachedCatalog<T>(data: T): void {
  try {
    const payload: CachedVersion<T> = { cachedAt: new Date().toISOString(), data };
    localStorage.setItem(CATALOG_CACHE_KEY, JSON.stringify(payload));
  } catch {
    // ignore
  }
}

export function loadCachedCatalog<T>(): CachedVersion<T> | null {
  try {
    const raw = localStorage.getItem(CATALOG_CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CachedVersion<T>;
  } catch {
    return null;
  }
}

// ---- Customers list cache (offline fallback for picker) ----

const CUSTOMERS_CACHE_KEY = 'cached-customers-list';

export function saveCachedCustomers<T>(data: T): void {
  try {
    const payload: CachedVersion<T> = { cachedAt: new Date().toISOString(), data };
    localStorage.setItem(CUSTOMERS_CACHE_KEY, JSON.stringify(payload));
  } catch {
    // ignore
  }
}

export function loadCachedCustomers<T>(): CachedVersion<T> | null {
  try {
    const raw = localStorage.getItem(CUSTOMERS_CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CachedVersion<T>;
  } catch {
    return null;
  }
}
