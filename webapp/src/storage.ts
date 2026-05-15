import type { BuildingConfig } from './types';
import { createDefaultConfig } from './types';
import type { StairConfig } from './stairEngine';

const STORAGE_KEY = 'building-estimator-config';
const STAIR_STORAGE_KEY = 'building-estimator-stair-config';

/** Default stair config — mirrors the workbook canonical reference building
 *  (3 levels / 12.5 ft FtF / 5 ft wide / 11" run / treads [10,9,9] /
 *  mid-landing 10.5×4.667 / floor-landing 10.5×6 / right guard + both hand rails).
 *  Matches the engine's golden test case so first-load values reproduce workbook totals.
 */
export function createDefaultStairConfig(): StairConfig {
  return {
    levels: 3,
    width: 5,
    floorToFloorHeight: 12.5,
    treadsPerFlight: [10, 9, 9],
    treadRunInches: 11,
    hasMidLanding: true,
    midLanding: {
      width: 10.5,
      length: 4.666666666666667,
      guardRailA: true,
      guardRailB: true,
      guardRailC: true,
    },
    floorLanding: {
      width: 10.5,
      length: 6,
      guardRailA: true,
      guardRailB: true,
      guardRailC: true,
    },
    rails: {
      rightGuardRail: true,
      leftGuardRail: false,
      rightHandRail: true,
      leftHandRail: true,
    },
  };
}

export function saveStairConfig(cfg: StairConfig): void {
  try {
    localStorage.setItem(STAIR_STORAGE_KEY, JSON.stringify(cfg));
  } catch {
    // ignore
  }
}

export function loadStairConfig(): StairConfig {
  try {
    const raw = localStorage.getItem(STAIR_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<StairConfig>;
      const defaults = createDefaultStairConfig();
      return {
        ...defaults,
        ...parsed,
        treadsPerFlight: parsed.treadsPerFlight ?? defaults.treadsPerFlight,
        midLanding: { ...defaults.midLanding!, ...(parsed.midLanding ?? {}) },
        floorLanding: { ...defaults.floorLanding, ...(parsed.floorLanding ?? {}) },
        rails: { ...defaults.rails, ...(parsed.rails ?? {}) },
      };
    }
  } catch {
    // fall through to defaults
  }
  return createDefaultStairConfig();
}

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
