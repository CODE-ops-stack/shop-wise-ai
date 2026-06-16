export type FieldType = 'checkbox' | 'range' | 'radio';

export interface FieldOption {
  value: string;
  label: string;
}

export interface BudgetPreset {
  label: string;
  min: number;
  max: number;
}

export interface FilterFieldConfig {
  type: FieldType;
  label: string;
  options?: FieldOption[] | string[];
  multi?: boolean;
  min?: number;
  max?: number;
  step?: number;
  currency?: string;
  presets?: BudgetPreset[];
}

export interface ConditionalRule {
  when: Record<string, string[]>;
  fields: string[];
}

export interface CategoryConfig {
  id: string;
  label: string;
  keywords: string[];
  subcategories?: Record<string, string[]>;
  required: string[];
  conditional: ConditionalRule[];
  optional: string[];
  optionalImpact?: Record<string, number>;
  maxQuestions: number;
  fields: Record<string, FilterFieldConfig>;
}

export interface BudgetRange {
  min?: number;
  max?: number;
}

export type SlotValue = string | string[] | BudgetRange;

export type FilledSlots = Record<string, SlotValue>;

export type FieldReason = 'required' | 'conditional' | 'optional';

export interface PreferencePanelField {
  id: string;
  config: FilterFieldConfig;
  reason: FieldReason;
}

export interface PreferencePanel {
  title: string;
  subtitle?: string;
  categoryId: string;
  subcategory?: string;
  fields: PreferencePanelField[];
  prefilled: FilledSlots;
  searchIntent: string;
}

/** Raw structured output from Gemini analyze step. */
export interface GeminiAnalyzeResult {
  category: string;
  subcategory?: string;
  confidence: number;
  filledSlots: FilledSlots;
  missingSlots: string[];
  suggestedPanel: {
    title: string;
    subtitle?: string;
    fields: string[];
  };
  searchIntent: string;
}

export interface QueryAnalysis {
  categoryId: string;
  subcategory?: string;
  confidence: number;
  filledSlots: FilledSlots;
  missingSlots: string[];
  panel: PreferencePanel | null;
  searchIntent: string;
}

export interface ResolvedPreferences {
  categoryId: string;
  subcategory?: string;
  searchIntent: string;
  slots: FilledSlots;
}