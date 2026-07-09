import { ResultEntry, ReviewItem } from './types';

const KEYS = {
  results: 'mb_results_v1',
  history: 'mb_history_v1',
  review: 'mb_review_v1',
  milestones: 'mb_milestones_v1',
} as const;

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function save(key: string, value: unknown): void {
  localStorage.setItem(key, JSON.stringify(value));
}

export const loadResults = (): ResultEntry[] => load(KEYS.results, []);
export const saveResults = (v: ResultEntry[]) => save(KEYS.results, v);

// 出題一巡管理: 現サイクルで回答済みの問題ID
export const loadHistory = (): string[] => load(KEYS.history, []);
export const saveHistory = (v: string[]) => save(KEYS.history, v);

export const loadReviewQueue = (): ReviewItem[] => load(KEYS.review, []);
export const saveReviewQueue = (v: ReviewItem[]) => save(KEYS.review, v);

export const loadMilestones = (): number[] => load(KEYS.milestones, []);
export const saveMilestones = (v: number[]) => save(KEYS.milestones, v);

export function resetAll(): void {
  Object.values(KEYS).forEach((k) => localStorage.removeItem(k));
}
