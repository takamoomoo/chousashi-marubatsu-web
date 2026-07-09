export type Mark = '○' | '×';

export interface Question {
  id: string;
  year: string;
  q_label: string;
  text: string;
  answer: Mark;
  source: string;
  explanation: string;
}

export interface ResultEntry {
  ts: string; // ISO datetime
  qid: string;
  chosen: Mark;
  correct: boolean;
}

export interface ReviewItem {
  qid: string;
  due: string; // yyyy-mm-dd
  stage: number; // 0 -> 翌日, 1 -> 3日後, 2 -> 7日後, 3以上で卒業
}

export interface AnswerFeedback {
  correct: boolean;
  correctAnswer: Mark;
  chosen: Mark;
  explanation: string;
  clearedCount: number;
  clearRate: number; // 0-100
  isNewClear: boolean;
  title: string;
  milestone: number | null; // 新たに到達したマイルストーン(%)
  learnStreak: number;
  correctStreak: number;
  reviewGraduated: boolean;
  reviewScheduled: string | null; // 次回復習日 yyyy-mm-dd
}

export interface QuestionStat {
  qid: string;
  year: string;
  q_label: string;
  count: number;
  correctCount: number;
  rate: number; // 0-100
}

export interface Stats {
  totalAnswers: number;
  overallRate: number;
  last30Rate: number;
  last30Count: number;
  yearRates: { year: string; count: number; rate: number }[];
  worst10: QuestionStat[];
  best10: QuestionStat[];
  clearedCount: number;
  clearRate: number;
  title: string;
  learnStreak: number;
  maxLearnStreak: number;
  correctStreak: number;
  maxCorrectStreak: number;
  reviewDueCount: number;
  reviewTotalCount: number;
  cycleAnswered: number;
}
