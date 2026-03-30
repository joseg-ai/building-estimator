import { createContext, useContext, useEffect, useReducer, type ReactNode } from 'react';
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
import { saveConfig, loadConfig } from './storage';

// ---- Actions ----

type Action =
  | { type: 'SET_PROJECT_NAME'; payload: string }
  | { type: 'SET_CUSTOMER_NAME'; payload: string }
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
  | { type: 'RESET' }
  | { type: 'LOAD'; payload: BuildingConfig };

function reducer(state: BuildingConfig, action: Action): BuildingConfig {
  switch (action.type) {
    case 'SET_PROJECT_NAME':
      return { ...state, projectName: action.payload };
    case 'SET_CUSTOMER_NAME':
      return { ...state, customerName: action.payload };
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
    case 'RESET':
      return createDefaultConfig();
    case 'LOAD':
      return action.payload;
    default:
      return state;
  }
}

// ---- Context ----

interface BuildingContextValue {
  config: BuildingConfig;
  dispatch: React.Dispatch<Action>;
}

const BuildingContext = createContext<BuildingContextValue | null>(null);

export function BuildingProvider({ children }: { children: ReactNode }) {
  const [config, dispatch] = useReducer(reducer, undefined, loadConfig);

  // Auto-save to localStorage on every state change
  useEffect(() => {
    saveConfig(config);
  }, [config]);

  return (
    <BuildingContext.Provider value={{ config, dispatch }}>
      {children}
    </BuildingContext.Provider>
  );
}

export function useBuildingConfig() {
  const ctx = useContext(BuildingContext);
  if (!ctx) throw new Error('useBuildingConfig must be used inside BuildingProvider');
  return ctx;
}
