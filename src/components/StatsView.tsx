import { useMemo, useState } from 'react';
import { TOTAL, getStats } from '../engine';
import { resetAll } from '../storage';
import { ProgressBar } from './ProgressBar';
import { QuestionStat } from '../types';

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className="text-xl font-bold text-gray-800">{value}</div>
    </div>
  );
}

function QuestionList({
  title,
  items,
}: {
  title: string;
  items: QuestionStat[];
}) {
  if (items.length === 0) return null;
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="font-bold text-gray-800 mb-3">{title}</div>
      <ol className="space-y-1.5 text-sm">
        {items.map((s, i) => (
          <li key={s.qid} className="flex justify-between gap-2">
            <span className="text-gray-700">
              {i + 1}. {s.year} {s.q_label}
            </span>
            <span className="text-gray-500 shrink-0">
              正解率 {s.rate.toFixed(0)}%（{s.count}回）
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function StatsView() {
  const [refresh, setRefresh] = useState(0);
  const stats = useMemo(() => getStats(), [refresh]);

  const handleReset = () => {
    if (
      window.confirm(
        '学習データ（成績・攻略率・復習キュー）をすべてリセットします。よろしいですか？'
      )
    ) {
      resetAll();
      setRefresh((n) => n + 1);
    }
  };

  if (stats.totalAnswers === 0) {
    return (
      <div className="text-center text-gray-500 py-16">
        まだ回答がありません。「出題」タブから学習を始めましょう！
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 攻略率 */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="font-bold text-gray-800 mb-1">
          🏆 攻略率 {stats.clearRate.toFixed(1)}%（{stats.clearedCount} /{' '}
          {TOTAL} 問）
        </div>
        <ProgressBar rate={stats.clearRate} />
        <div className="mt-2 text-sm text-gray-600">
          現在の称号: <b>{stats.title}</b>
        </div>
      </div>

      {/* サマリー */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="総回答数" value={`${stats.totalAnswers}回`} />
        <StatCard label="全体正解率" value={`${stats.overallRate.toFixed(1)}%`} />
        <StatCard
          label="直近30日 正解率"
          value={
            stats.last30Count > 0
              ? `${stats.last30Rate.toFixed(1)}%`
              : '－'
          }
        />
        <StatCard
          label="出題サイクル進捗"
          value={`${stats.cycleAnswered} / ${TOTAL}`}
        />
      </div>

      {/* ストリーク */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="🔥 連続学習日数" value={`${stats.learnStreak}日`} />
        <StatCard label="最長連続学習" value={`${stats.maxLearnStreak}日`} />
        <StatCard label="⚡ 連続正解中" value={`${stats.correctStreak}問`} />
        <StatCard label="最長連続正解" value={`${stats.maxCorrectStreak}問`} />
      </div>

      {/* 復習キュー */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 text-sm text-gray-700">
        🔁 復習キュー: <b>{stats.reviewTotalCount}問</b>
        （うち本日期日 <b>{stats.reviewDueCount}問</b>）
        <div className="text-xs text-gray-400 mt-1">
          間違えた問題は 翌日 → 3日後 → 7日後 に自動で再出題されます
        </div>
      </div>

      {/* 年度別 */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="font-bold text-gray-800 mb-3">📅 年度別正解率</div>
        <div className="space-y-2">
          {stats.yearRates.map((y) => (
            <div key={y.year} className="flex items-center gap-3 text-sm">
              <span className="w-20 shrink-0 text-gray-700">{y.year}</span>
              <div className="flex-1">
                <ProgressBar rate={y.rate} />
              </div>
              <span className="w-28 shrink-0 text-right text-gray-500">
                {y.rate.toFixed(0)}%（{y.count}回）
              </span>
            </div>
          ))}
        </div>
      </div>

      <QuestionList title="⚠️ 間違いワースト10" items={stats.worst10} />
      <QuestionList title="🌟 正解率トップ10" items={stats.best10} />

      <button
        onClick={handleReset}
        className="w-full py-3 rounded-xl text-sm text-rose-600 border border-rose-200 bg-rose-50 hover:bg-rose-100 transition"
      >
        学習データをリセット
      </button>
    </div>
  );
}
