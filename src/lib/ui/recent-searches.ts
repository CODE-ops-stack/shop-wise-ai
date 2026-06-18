const STORAGE_KEY = 'shopwise-recent-searches';
const MAX_ITEMS = 5;

export function getRecentSearches(): string[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === 'string').slice(0, MAX_ITEMS);
  } catch {
    return [];
  }
}

export function saveRecentSearch(query: string): void {
  if (typeof localStorage === 'undefined') return;
  const trimmed = query.trim();
  if (!trimmed) return;

  const existing = getRecentSearches().filter(
    (item) => item.toLowerCase() !== trimmed.toLowerCase(),
  );
  const next = [trimmed, ...existing].slice(0, MAX_ITEMS);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}