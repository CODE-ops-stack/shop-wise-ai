import { APP_CONFIG } from '../../../config/app';
import type { QueryAnalysis } from '../../types/preferences';

/**
 * Decide whether to spend a Gemini call after the local fast path.
 * Skip when local analysis is already strong and complete.
 */
export function shouldEnhanceWithGemini(analysis: QueryAnalysis): boolean {
  const isConfident =
    analysis.confidence >= APP_CONFIG.geminiEnhanceConfidenceThreshold;
  const hasSubcategory = Boolean(analysis.subcategory);
  const hasMissingRequired = analysis.missingSlots.length > 0;

  if (!hasSubcategory) return true;
  if (hasMissingRequired) return true;
  if (!isConfident) return true;

  return false;
}