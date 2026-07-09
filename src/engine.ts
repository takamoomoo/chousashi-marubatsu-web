import rawQuestions from './data/questions.json';
import {
  AnswerFeedback,
  Mark,
  Question,
  QuestionStat,
  ResultEntry,
  Stats,
} from './types';
import {
  loadHistory,
  loadMilestones,
  loadResults,
  loadReviewQueue,
  saveHistory,
  saveMilestones,
  saveResults,
  saveReviewQueue,
} from './storage';

export const QUESTIONS = rawQuestions as Question[];
export const TOTAL = QUESTIONS.length;

const byId = new Map<string, Question>(QUESTIONS.map((q) => [q.id, q]));

// 復習間隔（忘却曲線）: 翌日 → 3日後 → 7日後 → 卒業
const REVIEW_INTERVALS = [1, 3, 7];

// 称号（攻略率に応じて昇格）
const TITLES: [number, string][] = [
  [100, '筆界の達人'],
  [90, 'ベテラン調査士'],
  [75, '調査士'],
  [50, '測量士'],
  [25, '測量士補'],
  [10, '補助者'],
  [0, '見習い'],
];

const MILESTONES = [10, 25, 50, 75, 90, 100];

export function titleFor(rate: number): string {
  for (const [threshold, name] of TITLES) {
    if (rate >= threshold) return name;
  }
  return '見習い';
}

// ---- 日付ユーティリティ（端末ローカル時刻＝JST想定） ----

function dateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function todayStr(): string {
  return dateStr(new Date());
}

function addDays(base: string, n: number): string {
  const d = new Date(`${base}T00:00:00`);
  d.setDate(d.getDate() + n);
  return dateStr(d);
}

// ---- 年度の並び順（平成→令和） ----

function yearOrder(year: string): number {
  const m = year.match(/(平成|令和)(元|\d+)年/);
  if (!m) return 9999;
  const n = m[2] === '元' ? 1 : parseInt(m[2], 10);
  return (m[1] === '平成' ? 0 : 100) + n;
}

export function getAvailableYears(): string[] {
  const years = Array.from(new Set(QUESTIONS.map((q) => q.year)));
  return years.sort((a, b) => yearOrder(a) - yearOrder(b));
}

// ---- 出題 ----

export interface NextQuestion {
  question: Question;
  isReview: boolean;
}

export function pickNextQuestion(
  yearFilter: string,
  excludeQid?: string
): NextQuestion | null {
  const today = todayStr();

  // 1) 復習期日が来ている問題を優先（🔁復習問題）
  const due = loadReviewQueue().filter(
    (r) =>
      r.due <= today &&
      byId.has(r.qid) &&
      (yearFilter === 'すべて' || byId.get(r.qid)!.year === yearFilter) &&
      r.qid !== excludeQid
  );
  if (due.length > 0) {
    const item = due[Math.floor(Math.random() * due.length)];
    return { question: byId.get(item.qid)!, isReview: true };
  }

  // 2) 通常のランダム出題（一巡するまで同じ問題を出さない）
  let history = loadHistory();
  if (history.length >= TOTAL) {
    history = [];
    saveHistory(history);
  }
  const answered = new Set(history);
  const pool = QUESTIONS.filter(
    (q) => yearFilter === 'すべて' || q.year === yearFilter
  );
  if (pool.length === 0) return null;

  let candidates = pool.filter((q) => !answered.has(q.id) && q.id !== excludeQid);
  if (candidates.length === 0) {
    // フィルター内をすべて回答済み → フィルター内で再出題を許可
    candidates = pool.filter((q) => q.id !== excludeQid);
    if (candidates.length === 0) candidates = pool;
  }
  const q = candidates[Math.floor(Math.random() * candidates.length)];
  return { question: q, isReview: false };
}

// ---- ストリーク計算 ----

function calcLearnStreaks(results: ResultEntry[]): {
  current: number;
  max: number;
} {
  if (results.length === 0) return { current: 0, max: 0 };
  const days = Array.from(
    new Set(results.map((r) => dateStr(new Date(r.ts))))
  ).sort();

  let max = 1;
  let run = 1;
  for (let i = 1; i < days.length; i++) {
    if (addDays(days[i - 1], 1) === days[i]) {
      run++;
    } else {
      run = 1;
    }
    if (run > max) max = run;
  }

  // 現在の連続日数: 今日(または昨日まで)から遡って数える
  const today = todayStr();
  const last = days[days.length - 1];
  if (last !== today && last !== addDays(today, -1)) {
    return { current: 0, max };
  }
  let current = 1;
  for (let i = days.length - 1; i > 0; i--) {
    if (addDays(days[i - 1], 1) === days[i]) current++;
    else break;
  }
  return { current, max };
}

function calcCorrectStreaks(results: ResultEntry[]): {
  current: number;
  max: number;
} {
  let max = 0;
  let run = 0;
  for (const r of results) {
    run = r.correct ? run + 1 : 0;
    if (run > max) max = run;
  }
  let current = 0;
  for (let i = results.length - 1; i >= 0; i--) {
    if (results[i].correct) current++;
    else break;
  }
  return { current, max };
}

// ---- 回答処理 ----

export function submitAnswer(
  question: Question,
  chosen: Mark,
  isReview: boolean
): AnswerFeedback {
  const correct = chosen === question.answer;
  const today = todayStr();

  // 攻略済み判定（記録前の状態で「初攻略」を判定する）
  const results = loadResults();
  const clearedBefore = new Set(
    results.filter((r) => r.correct).map((r) => r.qid)
  );
  const isNewClear = correct && !clearedBefore.has(question.id);

  // 成績記録
  results.push({
    ts: new Date().toISOString(),
    qid: question.id,
    chosen,
    correct,
  });
  saveResults(results);

  // 一巡履歴
  const history = loadHistory();
  if (!history.includes(question.id)) {
    history.push(question.id);
    saveHistory(history);
  }

  // 復習キュー更新
  let reviewGraduated = false;
  let reviewScheduled: string | null = null;
  const queue = loadReviewQueue();
  const idx = queue.findIndex((r) => r.qid === question.id);
  if (idx >= 0) {
    if (correct && isReview) {
      const nextStage = queue[idx].stage + 1;
      if (nextStage >= REVIEW_INTERVALS.length) {
        queue.splice(idx, 1); // 卒業
        reviewGraduated = true;
      } else {
        queue[idx].stage = nextStage;
        queue[idx].due = addDays(today, REVIEW_INTERVALS[nextStage]);
        reviewScheduled = queue[idx].due;
      }
    } else if (!correct) {
      queue[idx].stage = 0;
      queue[idx].due = addDays(today, REVIEW_INTERVALS[0]);
      reviewScheduled = queue[idx].due;
    }
    // 復習枠以外で正解した場合はキューを進めない（期日どおり復習させる）
  } else if (!correct) {
    const dueDate = addDays(today, REVIEW_INTERVALS[0]);
    queue.push({ qid: question.id, due: dueDate, stage: 0 });
    reviewScheduled = dueDate;
  }
  saveReviewQueue(queue);

  // 攻略率・称号・マイルストーン
  const clearedCount = clearedBefore.size + (isNewClear ? 1 : 0);
  const clearRate = (clearedCount / TOTAL) * 100;
  const title = titleFor(clearRate);

  let milestone: number | null = null;
  const reached = loadMilestones();
  for (const m of MILESTONES) {
    if (clearRate >= m && !reached.includes(m)) {
      reached.push(m);
      milestone = m; // 複数同時到達時は最大のものが残る
    }
  }
  saveMilestones(reached);

  const learn = calcLearnStreaks(results);
  const correctStreaks = calcCorrectStreaks(results);

  return {
    correct,
    correctAnswer: question.answer,
    chosen,
    explanation: question.explanation,
    clearedCount,
    clearRate,
    isNewClear,
    title,
    milestone,
    learnStreak: learn.current,
    correctStreak: correctStreaks.current,
    reviewGraduated,
    reviewScheduled,
  };
}

// ---- 統計 ----

export function getStats(): Stats {
  const results = loadResults();
  const totalAnswers = results.length;
  const correctTotal = results.filter((r) => r.correct).length;
  const overallRate = totalAnswers > 0 ? (correctTotal / totalAnswers) * 100 : 0;

  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const recent = results.filter((r) => new Date(r.ts).getTime() >= cutoff);
  const last30Count = recent.length;
  const last30Rate =
    last30Count > 0
      ? (recent.filter((r) => r.correct).length / last30Count) * 100
      : 0;

  // 年度別
  const yearAgg = new Map<string, { count: number; correct: number }>();
  for (const r of results) {
    const q = byId.get(r.qid);
    if (!q) continue;
    const agg = yearAgg.get(q.year) ?? { count: 0, correct: 0 };
    agg.count++;
    if (r.correct) agg.correct++;
    yearAgg.set(q.year, agg);
  }
  const yearRates = getAvailableYears()
    .filter((y) => yearAgg.has(y))
    .map((y) => {
      const agg = yearAgg.get(y)!;
      return { year: y, count: agg.count, rate: (agg.correct / agg.count) * 100 };
    });

  // 問題別（worst10 / best10）
  const qAgg = new Map<string, { count: number; correct: number }>();
  for (const r of results) {
    const agg = qAgg.get(r.qid) ?? { count: 0, correct: 0 };
    agg.count++;
    if (r.correct) agg.correct++;
    qAgg.set(r.qid, agg);
  }
  const qStats: QuestionStat[] = Array.from(qAgg.entries())
    .filter(([qid]) => byId.has(qid))
    .map(([qid, agg]) => {
      const q = byId.get(qid)!;
      return {
        qid,
        year: q.year,
        q_label: q.q_label,
        count: agg.count,
        correctCount: agg.correct,
        rate: (agg.correct / agg.count) * 100,
      };
    });
  const worst10 = [...qStats]
    .sort((a, b) => a.rate - b.rate || b.count - a.count)
    .slice(0, 10);
  const best10 = [...qStats]
    .sort((a, b) => b.rate - a.rate || b.count - a.count)
    .slice(0, 10);

  const clearedCount = new Set(
    results.filter((r) => r.correct).map((r) => r.qid)
  ).size;
  const clearRate = (clearedCount / TOTAL) * 100;

  const learn = calcLearnStreaks(results);
  const correctStreaks = calcCorrectStreaks(results);

  const queue = loadReviewQueue();
  const today = todayStr();

  return {
    totalAnswers,
    overallRate,
    last30Rate,
    last30Count,
    yearRates,
    worst10,
    best10,
    clearedCount,
    clearRate,
    title: titleFor(clearRate),
    learnStreak: learn.current,
    maxLearnStreak: learn.max,
    correctStreak: correctStreaks.current,
    maxCorrectStreak: correctStreaks.max,
    reviewDueCount: queue.filter((r) => r.due <= today).length,
    reviewTotalCount: queue.length,
    cycleAnswered: loadHistory().length,
  };
}
