import type { PreferencePanel, ResolvedPreferences } from './preferences';
import type { ProductResultsPayload } from './products';

export type ChatMessage =
  | {
      id: string;
      role: 'user';
      type: 'text';
      content: string;
      timestamp: number;
    }
  | {
      id: string;
      role: 'assistant';
      type: 'text';
      content: string;
      timestamp: number;
    }
  | {
      id: string;
      role: 'assistant';
      type: 'preference_panel';
      panel: PreferencePanel;
      status: 'pending' | 'submitted';
      submittedPreferences?: ResolvedPreferences;
      timestamp: number;
    }
  | {
      id: string;
      role: 'assistant';
      type: 'product_results';
      results: ProductResultsPayload;
      preferences: ResolvedPreferences;
      timestamp: number;
    };

export function createMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}