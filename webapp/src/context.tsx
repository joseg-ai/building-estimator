import { createContext, useCallback, useContext, useEffect, useReducer, useRef, useState, type ReactNode } from 'react';
import {
  type BuildingConfig,
  type LeanToDirection,
  type LeanTo,
  type InsulationConfig,
  type BuildingDimensions,
  type RoofType,
  type ComponentItem,
  type ProjectOverheads,
  type BuildingOptions,
  type Overhangs,
  type SheetingConfig,
  type DoorsWindowsConfig,
  type AccessoriesConfig,
  createDefaultConfig,
} from './types';
import {
  saveConfig,
  loadConfig,
  saveCachedPriceList,
  loadCachedPriceList,
  saveCachedCatalog,
  loadCachedCatalog,
  saveCachedCustomers,
  loadCachedCustomers,
} from './storage';
import {
  apiGetActivePriceList,
  apiCreatePriceListVersion,
  apiListPriceListVersions,
  apiUpdatePriceListItem,
  apiActivatePriceListVersion,
  apiGetPriceListVersion,
  apiGetActiveCatalog,
  apiCreateCatalogVersion,
  apiActivateCatalogVersion,
  apiListCustomers,
  isLoggedIn,
  type Customer,
  type PriceListVersionMeta,
  type PriceListServerItem,
  type PriceListVersionFull,
  type CatalogVersionFull,
} from './api';
import { defaultPriceList } from './priceList';
import { allCatalogs } from './catalog';

// ---- Actions ----

type Action =
  | { type: 'SET_PROJECT_NAME'; payload: string }
  | { type: 'SET_CUSTOMER_NAME'; payload: string }
  | { type: 'SET_CUSTOMER_ID'; payload: number | null }
  | { type: 'SET_JOB_LOCATION'; payload: string }
  | { type: 'SET_ROOF_TYPE'; payload: RoofType }
  | { type: 'SET_DIMENSIONS'; payload: Partial<BuildingDimensions> }
  | { type: 'SET_OPTIONS'; payload: Partial<BuildingOptions> }
  | { type: 'SET_OVERHANGS_DESIGN'; payload: Partial<Overhangs> }
  | { type: 'SET_LEANTO'; payload: { direction: LeanToDirection; data: Partial<LeanTo> } }
  | { type: 'SET_SHEETING'; payload: Partial<SheetingConfig> }
  | { type: 'SET_DOORS_WINDOWS'; payload: Partial<DoorsWindowsConfig> }
  | { type: 'SET_ACCESSORIES'; payload: Partial<AccessoriesConfig> }
  | { type: 'SET_INSULATION'; payload: Partial<InsulationConfig> }
  | { type: 'SET_COMPONENTS'; payload: ComponentItem[] }
  | { type: 'UPDATE_COMPONENT'; payload: { id: string; data: Partial<ComponentItem> } }
  | { type: 'ADD_COMPONENT'; payload: ComponentItem }
  | { type: 'REMOVE_COMPONENT'; payload: string }
  | { type: 'SET_OVERHEADS'; payload: Partial<ProjectOverheads> }
  | { type: 'SET_SALES_TAX'; payload: { rate?: number; included?: boolean } }
  | { type: 'RESET' }
  | { type: 'LOAD'; payload: BuildingConfig };

function reducer(state: BuildingConfig, action: Action): BuildingConfig {
  switch (action.type) {
    case 'SET_PROJECT_NAME':
      return { ...state, projectName: action.payload };
    case 'SET_CUSTOMER_NAME':
      return { ...state, customerName: action.payload };
    case 'SET_CUSTOMER_ID':
      return { ...state, customerId: action.payload };
    case 'SET_JOB_LOCATION':
      return { ...state, jobLocation: action.payload };
    case 'SET_ROOF_TYPE':
      return { ...state, roofType: action.payload };
    case 'SET_DIMENSIONS':
      return { ...state, dimensions: { ...state.dimensions, ...action.payload } };
    case 'SET_OPTIONS':
      return { ...state, options: { ...state.options, ...action.payload } };
    case 'SET_OVERHANGS_DESIGN':
      return { ...state, overhangs: { ...state.overhangs, ...action.payload } };
    case 'SET_LEANTO': {
      const { direction, data } = action.payload;
      return {
        ...state,
        leanTos: {
          ...state.leanTos,
          [direction]: { ...state.leanTos[direction], ...data },
        },
      };
    }
    case 'SET_INSULATION':
      return { ...state, insulation: { ...state.insulation, ...action.payload } };
    case 'SET_SHEETING':
      return { ...state, sheeting: { ...state.sheeting, ...action.payload } };
    case 'SET_DOORS_WINDOWS':
      return { ...state, doorsWindows: { ...state.doorsWindows, ...action.payload } };
    case 'SET_ACCESSORIES':
      return { ...state, accessories: { ...state.accessories, ...action.payload } };
    case 'SET_COMPONENTS':
      return { ...state, components: action.payload };
    case 'ADD_COMPONENT':
      return { ...state, components: [...state.components, action.payload] };
    case 'UPDATE_COMPONENT':
      return {
        ...state,
        components: state.components.map((c) =>
          c.id === action.payload.id ? { ...c, ...action.payload.data } : c
        ),
      };
    case 'REMOVE_COMPONENT':
      return { ...state, components: state.components.filter((c) => c.id !== action.payload) };
    case 'SET_OVERHEADS':
      return { ...state, overheads: { ...state.overheads, ...action.payload } };
    case 'SET_SALES_TAX':
      return {
        ...state,
        ...(action.payload.rate !== undefined ? { salesTaxRate: action.payload.rate } : {}),
        ...(action.payload.included !== undefined ? { salesTaxIncluded: action.payload.included } : {}),
      };
    case 'RESET':
      return createDefaultConfig();
    case 'LOAD':
      return action.payload;
    default:
      return state;
  }
}

// ---- Context ----

interface SyncState {
  loading: boolean;
  error: string | null;
}

export interface PriceListState {
  activeVersionId: number | null;
  activeVersionMeta: Omit<PriceListVersionMeta, 'item_count'> | null;
  items: PriceListServerItem[];
  versions: PriceListVersionMeta[];
  loaded: boolean;
  cachedAt: string | null;
  offline: boolean;
  sync: SyncState;
}

export interface CatalogState {
  activeVersionId: number | null;
  loaded: boolean;
  cachedAt: string | null;
  offline: boolean;
  sync: SyncState;
}

export interface CustomersState {
  /** Last search result list */
  list: Customer[];
  loading: boolean;
  error: string | null;
}

interface BuildingContextValue {
  config: BuildingConfig;
  dispatch: React.Dispatch<Action>;

  priceList: PriceListState;
  /** Optimistic in-memory edit + background PUT. Returns when server resolves (or rejects). */
  updatePriceListItem: (
    itemKey: string,
    patch: { unit_price?: number; description?: string; unit?: string; category?: string }
  ) => Promise<void>;
  /** Save current items as a new server version. Does NOT activate. */
  savePriceListAsNewVersion: (input: { name: string; supplier?: string; notes?: string }) => Promise<PriceListVersionMeta>;
  /** Mark a version active and load its items. */
  activatePriceListVersion: (id: number) => Promise<void>;
  /** Switch the in-memory view to a different version (read-only browse). */
  loadPriceListVersion: (id: number) => Promise<void>;
  /** Refresh versions list. */
  refreshPriceListVersions: () => Promise<void>;

  catalog: CatalogState;

  customers: CustomersState;
  /** Search customers (lazy-load, debounce in caller). Populates customers.list. */
  searchCustomers: (query?: string) => Promise<Customer[]>;
}

const BuildingContext = createContext<BuildingContextValue | null>(null);

/** Map bundled defaults to the server's snake_case shape. Uses item_code as item_key. */
function bundledPriceListItemsForPost() {
  return defaultPriceList.map((p) => ({
    item_key: p.itemCode,
    description: p.description,
    unit: p.unit,
    unit_price: p.unitPrice,
    category: '',
  }));
}

/** Flatten allCatalogs into the server's payload shape. */
function bundledCatalogItemsForPost() {
  const out: Array<{ category: string; item_key: string; payload: unknown }> = [];
  for (const [category, group] of Object.entries(allCatalogs)) {
    for (const item of group.items) {
      out.push({ category, item_key: item.id, payload: item });
    }
  }
  return out;
}

const emptyPriceList: PriceListState = {
  activeVersionId: null,
  activeVersionMeta: null,
  items: [],
  versions: [],
  loaded: false,
  cachedAt: null,
  offline: false,
  sync: { loading: false, error: null },
};

const emptyCatalog: CatalogState = {
  activeVersionId: null,
  loaded: false,
  cachedAt: null,
  offline: false,
  sync: { loading: false, error: null },
};

const emptyCustomers: CustomersState = { list: [], loading: false, error: null };

export function BuildingProvider({ children }: { children: ReactNode }) {
  const [config, dispatch] = useReducer(reducer, undefined, loadConfig);
  const [priceList, setPriceList] = useState<PriceListState>(emptyPriceList);
  const [catalog, setCatalog] = useState<CatalogState>(emptyCatalog);
  const [customers, setCustomers] = useState<CustomersState>(emptyCustomers);
  const initRanRef = useRef(false);

  // Auto-save to localStorage on every state change
  useEffect(() => {
    saveConfig(config);
  }, [config]);

  // First-load: seed from localStorage cache (works offline / unauthenticated)
  useEffect(() => {
    const cachedPL = loadCachedPriceList<PriceListVersionFull>();
    if (cachedPL) {
      setPriceList((s) => ({
        ...s,
        activeVersionId: cachedPL.data.version.id,
        activeVersionMeta: cachedPL.data.version,
        items: cachedPL.data.items,
        loaded: true,
        cachedAt: cachedPL.cachedAt,
        offline: true,
      }));
    }
    const cachedCat = loadCachedCatalog<CatalogVersionFull>();
    if (cachedCat) {
      setCatalog((s) => ({
        ...s,
        activeVersionId: cachedCat.data.version.id,
        loaded: true,
        cachedAt: cachedCat.cachedAt,
        offline: true,
      }));
    }
    const cachedCust = loadCachedCustomers<Customer[]>();
    if (cachedCust) {
      setCustomers((s) => ({ ...s, list: cachedCust.data }));
    }
  }, []);

  // Server sync: fetch active price list + catalog. If 404, POST bundled defaults and activate.
  useEffect(() => {
    if (initRanRef.current) return;
    if (!isLoggedIn()) return;
    initRanRef.current = true;
    void initPriceListFromServer();
    void initCatalogFromServer();
  }, []);

  async function initPriceListFromServer() {
    setPriceList((s) => ({ ...s, sync: { loading: true, error: null } }));
    try {
      let active: PriceListVersionFull;
      try {
        active = await apiGetActivePriceList();
      } catch (e) {
        const err = e as Error & { status?: number };
        if (err.status === 404) {
          // Server is empty — POST bundled defaults and activate.
          const created = await apiCreatePriceListVersion({
            name: 'Bundled defaults — Central States — 2026-05',
            supplier: 'Central States',
            notes: 'Initial seed from bundled webapp defaults.',
            items: bundledPriceListItemsForPost(),
          });
          await apiActivatePriceListVersion(created.id);
          active = await apiGetActivePriceList();
        } else {
          throw err;
        }
      }
      const versions = await apiListPriceListVersions().catch(() => [] as PriceListVersionMeta[]);
      saveCachedPriceList(active);
      setPriceList({
        activeVersionId: active.version.id,
        activeVersionMeta: active.version,
        items: active.items,
        versions,
        loaded: true,
        cachedAt: new Date().toISOString(),
        offline: false,
        sync: { loading: false, error: null },
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load price list';
      setPriceList((s) => ({ ...s, loaded: s.loaded, offline: true, sync: { loading: false, error: msg } }));
    }
  }

  async function initCatalogFromServer() {
    setCatalog((s) => ({ ...s, sync: { loading: true, error: null } }));
    try {
      let active: CatalogVersionFull;
      try {
        active = await apiGetActiveCatalog();
      } catch (e) {
        const err = e as Error & { status?: number };
        if (err.status === 404) {
          const created = await apiCreateCatalogVersion({
            name: 'Bundled defaults — Building Estimator — 2026-05',
            notes: 'Initial seed from bundled webapp catalog.',
            items: bundledCatalogItemsForPost(),
          });
          await apiActivateCatalogVersion(created.id);
          active = await apiGetActiveCatalog();
        } else {
          throw err;
        }
      }
      saveCachedCatalog(active);
      setCatalog({
        activeVersionId: active.version.id,
        loaded: true,
        cachedAt: new Date().toISOString(),
        offline: false,
        sync: { loading: false, error: null },
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load catalog';
      setCatalog((s) => ({ ...s, offline: true, sync: { loading: false, error: msg } }));
    }
  }

  const updatePriceListItem = useCallback<BuildingContextValue['updatePriceListItem']>(
    async (itemKey, patch) => {
      // Snapshot for rollback.
      let prevItems: PriceListServerItem[] = [];
      setPriceList((s) => {
        prevItems = s.items;
        return {
          ...s,
          items: s.items.map((it) =>
            it.item_key === itemKey ? { ...it, ...patch } as PriceListServerItem : it
          ),
        };
      });
      const versionId = priceList.activeVersionId;
      if (versionId == null) return; // offline-only edit, no server sync
      if (typeof patch.unit_price !== 'number') {
        // Server requires unit_price on every PUT; resolve current item's price.
        const current = prevItems.find((it) => it.item_key === itemKey);
        if (!current) return;
        patch = { ...patch, unit_price: current.unit_price };
      }
      try {
        const updated = await apiUpdatePriceListItem(versionId, itemKey, {
          unit_price: patch.unit_price as number,
          ...(patch.description !== undefined ? { description: patch.description } : {}),
          ...(patch.unit !== undefined ? { unit: patch.unit } : {}),
          ...(patch.category !== undefined ? { category: patch.category } : {}),
        });
        setPriceList((s) => {
          const next = {
            ...s,
            items: s.items.map((it) => (it.item_key === itemKey ? updated : it)),
            sync: { loading: false, error: null },
          };
          if (s.activeVersionMeta) {
            saveCachedPriceList({ version: s.activeVersionMeta, items: next.items });
          }
          return next;
        });
      } catch (e) {
        // Roll back optimistic edit.
        const msg = e instanceof Error ? e.message : 'Failed to sync price';
        setPriceList((s) => ({ ...s, items: prevItems, sync: { loading: false, error: msg } }));
        throw e;
      }
    },
    [priceList.activeVersionId]
  );

  const savePriceListAsNewVersion = useCallback<BuildingContextValue['savePriceListAsNewVersion']>(
    async ({ name, supplier, notes }) => {
      setPriceList((s) => ({ ...s, sync: { loading: true, error: null } }));
      try {
        const items = priceList.items.map((it) => ({
          item_key: it.item_key,
          description: it.description,
          unit: it.unit,
          unit_price: it.unit_price,
          category: it.category,
        }));
        const created = await apiCreatePriceListVersion({ name, supplier, notes, items });
        const versions = await apiListPriceListVersions().catch(() => priceList.versions);
        setPriceList((s) => ({ ...s, versions, sync: { loading: false, error: null } }));
        return created;
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Failed to save version';
        setPriceList((s) => ({ ...s, sync: { loading: false, error: msg } }));
        throw e;
      }
    },
    [priceList.items, priceList.versions]
  );

  const activatePriceListVersion = useCallback<BuildingContextValue['activatePriceListVersion']>(
    async (id) => {
      setPriceList((s) => ({ ...s, sync: { loading: true, error: null } }));
      try {
        await apiActivatePriceListVersion(id);
        const active = await apiGetActivePriceList();
        const versions = await apiListPriceListVersions().catch(() => [] as PriceListVersionMeta[]);
        saveCachedPriceList(active);
        setPriceList({
          activeVersionId: active.version.id,
          activeVersionMeta: active.version,
          items: active.items,
          versions,
          loaded: true,
          cachedAt: new Date().toISOString(),
          offline: false,
          sync: { loading: false, error: null },
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Failed to activate version';
        setPriceList((s) => ({ ...s, sync: { loading: false, error: msg } }));
        throw e;
      }
    },
    []
  );

  const loadPriceListVersion = useCallback<BuildingContextValue['loadPriceListVersion']>(
    async (id) => {
      setPriceList((s) => ({ ...s, sync: { loading: true, error: null } }));
      try {
        const full = await apiGetPriceListVersion(id);
        setPriceList((s) => ({
          ...s,
          activeVersionId: full.version.id,
          activeVersionMeta: full.version,
          items: full.items,
          loaded: true,
          sync: { loading: false, error: null },
        }));
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Failed to load version';
        setPriceList((s) => ({ ...s, sync: { loading: false, error: msg } }));
        throw e;
      }
    },
    []
  );

  const refreshPriceListVersions = useCallback<BuildingContextValue['refreshPriceListVersions']>(
    async () => {
      try {
        const versions = await apiListPriceListVersions();
        setPriceList((s) => ({ ...s, versions }));
      } catch {
        // ignore
      }
    },
    []
  );

  const searchCustomers = useCallback<BuildingContextValue['searchCustomers']>(
    async (query) => {
      setCustomers((s) => ({ ...s, loading: true, error: null }));
      try {
        const list = await apiListCustomers(query);
        saveCachedCustomers(list);
        setCustomers({ list, loading: false, error: null });
        return list;
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Failed to search customers';
        setCustomers((s) => ({ ...s, loading: false, error: msg }));
        return customers.list; // return cached list on error
      }
    },
    [customers.list]
  );

  return (
    <BuildingContext.Provider
      value={{
        config,
        dispatch,
        priceList,
        updatePriceListItem,
        savePriceListAsNewVersion,
        activatePriceListVersion,
        loadPriceListVersion,
        refreshPriceListVersions,
        catalog,
        customers,
        searchCustomers,
      }}
    >
      {children}
    </BuildingContext.Provider>
  );
}

export function useBuildingConfig() {
  const ctx = useContext(BuildingContext);
  if (!ctx) throw new Error('useBuildingConfig must be used inside BuildingProvider');
  return ctx;
}
