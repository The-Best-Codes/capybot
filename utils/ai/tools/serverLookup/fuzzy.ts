import fuzzysort, { type Key } from "fuzzysort";

export interface FuzzySearchOptions<T> {
  items: T[];
  keys: (keyof T | string)[];
  query: string;
  limit: number;
}

export interface FuzzyResult<T> {
  item: T;
  score: number;
}

export function fuzzySearch<T>({
  items,
  keys,
  query,
  limit,
}: FuzzySearchOptions<T>): FuzzyResult<T>[] {
  if (!query.trim()) {
    return items.slice(0, limit).map((item) => ({
      item,
      score: 1,
    }));
  }

  const results = fuzzysort.go<T>(query, items, {
    keys: keys as Key<T>[],
    limit,
    threshold: 0,
  });

  return results.map((r) => ({
    item: r.obj,
    score: r.score,
  }));
}

export function filterByQuery<T>(
  items: T[],
  query: string,
  getter: (item: T) => string,
  limit: number,
): FuzzyResult<T>[] {
  const lowerQuery = query.toLowerCase().trim();

  if (!lowerQuery) {
    return items.slice(0, limit).map((item) => ({ item, score: 1 }));
  }

  const filtered = items.filter((item) => getter(item).toLowerCase().includes(lowerQuery));

  return filtered.slice(0, limit).map((item) => ({ item, score: 1 }));
}
