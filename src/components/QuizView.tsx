import { useEffect, useState } from 'react';
import { Mark, AnswerFeedback } from '../types';
import {
  NextQuestion,
  TOTAL,
  getAvailableYears,
  pickNextQuestion,
  submitAnswer,
} from '../engine';
import { ProgressBar } from './ProgressBar';

const MILESTONE_MESSAGES: Record<number, string> = {
  10: '補助者に昇格！',
  25: '測量士補に昇格！',
  50: '測量士に昇格！折り返し地点です！',
  75: '調査士に昇格！あと少し！',
  90: 'ベテラン調査士に昇格！',
  100: '筆界の達人！全問攻略おめでとうございます！',
};

export function QuizView() {
  const [yearFilter, setYearFilter] = useState('すべて');
  const [current, setCurrent] = useState<NextQuestion | null>(null);
  const [feedback, setFeedback] = useState<AnswerFeedback | null>(null);
  const years = getAvailableYears();

  const loadNext = (filter: string, excludeQid?: string) => {
    setFeedback(null);
    setCurrent(pickNextQuestion(filter, excludeQid));
  };

  useEffect(() => {
    loadNext(yearFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [yearFilter]);

  const handleAnswer = (mark: Mark) => {
    if (!current || feedback) return;
    setFeedback(submitAnswer(current.question, mark, current.isReview));
  };

  if (!current) {
    return (
      <div className="text-center text-gray-500 py-16">
        出題できる問題がありません
      </div>
    );
  }

  const q = current.question;

  return (
    <div className="space-y-4">
      {/* 年度フィルター */}
      <div className="flex items-center gap-2">
        <label className="text-sm text-gray-600 shrink-0">年度:</label>
        <select
          value={yearFilter}
          onChange={(e) => setYearFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm bg-white"
        >
          <option value="すべて">すべて（{TOTAL}問）</option>
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>

      {/* 問題カード */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          {current.isReview && (
            <span className="bg-amber-100 text-amber-800 text-xs font-bold px-2.5 py-1 rounded-full">
              🔁 復習問題
            </span>
          )}
          <span className="bg-blue-100 text-blue-800 text-sm font-bold px-3 py-1 rounded-full">
            📚 {q.year} {q.q_label}
          </span>
          <span className="text-xs text-gray-400">○×問題</span>
        </div>

        <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">
          {q.text}
        </p>

        {/* 回答ボタン */}
        {!feedback && (
          <div className="grid grid-cols-2 gap-4 mt-6">
            <button
              onClick={() => handleAnswer('○')}
              className="py-5 rounded-xl text-4xl font-bold bg-red-50 text-red-600 border-2 border-red-200 hover:bg-red-100 active:scale-95 transition"
            >
              ○
            </button>
            <button
              onClick={() => handleAnswer('×')}
              className="py-5 rounded-xl text-4xl font-bold bg-blue-50 text-blue-600 border-2 border-blue-200 hover:bg-blue-100 active:scale-95 transition"
            >
              ×
            </button>
          </div>
        )}
      </div>

      {/* 判定・解説 */}
      {feedback && (
        <div className="space-y-4">
          {/* 判定 */}
          <div
            className={`rounded-xl p-5 border-2 ${
              feedback.correct
                ? 'bg-emerald-50 border-emerald-300'
                : 'bg-rose-50 border-rose-300'
            }`}
          >
            <div className="text-2xl font-bold mb-2">
              {feedback.correct ? '✅ 正解！' : '❌ 不正解…'}
            </div>
            <div className="text-sm text-gray-700 mb-3">
              あなたの回答: <b>{feedback.chosen}</b>　正解:{' '}
              <b>{feedback.correctAnswer}</b>
            </div>

            {/* 攻略率 */}
            <div className="text-sm font-bold text-gray-800 mb-1">
              🏆 攻略率 {feedback.clearRate.toFixed(1)}%（
              {feedback.clearedCount} / {TOTAL} 問）
              {feedback.isNewClear && (
                <span className="ml-2 text-emerald-600">
                  🆕 新規攻略！ +1問
                </span>
              )}
            </div>
            <ProgressBar rate={feedback.clearRate} />

            {/* ストリーク */}
            <div className="flex gap-4 mt-3 text-sm text-gray-700 flex-wrap">
              {feedback.learnStreak >= 2 && (
                <span>🔥 {feedback.learnStreak}日連続学習中！</span>
              )}
              {feedback.correctStreak >= 2 && (
                <span>⚡ {feedback.correctStreak}問連続正解！</span>
              )}
              {feedback.reviewGraduated && (
                <span>🎓 復習卒業！この問題はマスターしました</span>
              )}
              {feedback.reviewScheduled && (
                <span>🔁 次回復習日: {feedback.reviewScheduled}</span>
              )}
            </div>

            <div className="mt-2 text-xs text-gray-500">
              称号: {feedback.title}
            </div>
          </div>

          {/* マイルストーン祝福 */}
          {feedback.milestone !== null && (
            <div className="rounded-xl p-5 bg-gradient-to-r from-amber-100 to-yellow-50 border-2 border-amber-300 text-center">
              <div className="text-2xl font-bold mb-1">
                🎉 攻略率{feedback.milestone}%達成！
              </div>
              <div className="text-amber-800">
                {MILESTONE_MESSAGES[feedback.milestone]}
              </div>
            </div>
          )}

          {/* 解説 */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <div className="font-bold text-gray-800 mb-2">📖 解説</div>
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
              {feedback.explanation}
            </p>
          </div>

          {/* 次の問題へ */}
          <button
            onClick={() => loadNext(yearFilter, q.id)}
            className="w-full py-4 rounded-xl text-lg font-bold bg-blue-600 text-white hover:bg-blue-700 active:scale-[0.98] transition"
          >
            次の問題へ →
          </button>
        </div>
      )}
    </div>
  );
}
