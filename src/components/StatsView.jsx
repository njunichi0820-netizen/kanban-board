import { useMemo, useState } from 'react';
import { COLUMNS, POINT_RULES, LEVEL_TABLE } from '../constants';
import { Flame, TrendingUp, Zap, CheckCircle2, HelpCircle } from 'lucide-react';

export default function StatsView({ tasks = [], tags = [], points, getLevel, getDailyData, getWeeklyData }) {
  const [showRules, setShowRules] = useState(false);
  const safePoints = points || { total: 0, streak: 0, daily: {} };
  const level = getLevel ? getLevel() : { current: { name: 'ビギナー' }, next: null, progress: 0 };
  const dailyData = getDailyData ? getDailyData(14) : [];
  const weeklyData = getWeeklyData ? getWeeklyData(8) : [];
  const maxDaily = dailyData.length > 0 ? Math.max(...dailyData.map((d) => d.points || 0), 1) : 1;
  const maxWeekly = weeklyData.length > 0 ? Math.max(...weeklyData.map((w) => w.points || 0), 1) : 1;

  const columnStats = useMemo(() => {
    return COLUMNS.map((col) => ({
      ...col,
      count: tasks.filter((t) => t.column === col.id).length,
    }));
  }, [tasks]);

  const totalTasks = tasks.length;
  const doneTasks = tasks.filter((t) => t.column === 'done').length;

  const tagStats = useMemo(() => {
    const counts = {};
    tasks.forEach((t) => {
      (t.tags || []).forEach((tid) => {
        counts[tid] = (counts[tid] || 0) + 1;
      });
    });
    return (tags || [])
      .map((tag) => ({ ...tag, count: counts[tag.id] || 0 }))
      .filter((t) => t.count > 0)
      .sort((a, b) => b.count - a.count);
  }, [tasks, tags]);

  const maxTagCount = tagStats.length > 0 ? Math.max(...tagStats.map((t) => t.count), 1) : 1;

  const DAILY_BAR_H = 100;
  const WEEKLY_BAR_H = 80;

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50">
      <div className="max-w-3xl mx-auto p-4 md:p-6 space-y-5">

        {/* Hero card */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-500 to-purple-600 p-5 md:p-6 text-white shadow-lg">
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
          <div className="relative flex items-center justify-between gap-4">
            <div>
              <p className="text-indigo-200 text-xs font-semibold tracking-wider uppercase mb-1">Your Level</p>
              <h2 className="text-2xl md:text-3xl font-black tracking-tight">{level.current.name}</h2>
              <p className="text-indigo-200 text-sm mt-1">{safePoints.total} pt 獲得済み</p>
            </div>
            <div className="text-right">
              <div className="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur-sm rounded-xl px-3 py-2">
                <Flame size={16} className="text-orange-300" />
                <span className="text-lg font-bold">{safePoints.streak}</span>
                <span className="text-xs text-indigo-200">日連続</span>
              </div>
            </div>
          </div>
          {level.next && (
            <div className="relative mt-4">
              <div className="flex justify-between text-[10px] text-indigo-200 mb-1">
                <span>{level.current.name}</span>
                <span>{level.next.name}まで あと {level.next.min - safePoints.total} pt</span>
              </div>
              <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-white/80 to-white rounded-full transition-all duration-500"
                  style={{ width: `${Math.min((level.progress || 0) * 100, 100)}%` }}
                />
              </div>
            </div>
          )}
          {/* Help button */}
          <button
            onClick={() => setShowRules(v => !v)}
            className="absolute top-3 right-3 p-1.5 bg-white/15 backdrop-blur-sm rounded-lg text-white/70 hover:text-white hover:bg-white/25 transition-colors z-10"
            title="ポイントルール"
          >
            <HelpCircle size={16} />
          </button>
        </div>

        {/* Point rules */}
        {showRules && (
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <h3 className="text-sm font-bold text-gray-800 mb-3">ポイントルール</h3>
            <div className="space-y-2 mb-4">
              {POINT_RULES.map((rule, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium text-gray-700">{rule.action}</span>
                    <p className="text-[11px] text-gray-400">{rule.description}</p>
                  </div>
                  <span className="text-sm font-bold text-indigo-600 shrink-0 ml-3">{rule.points}</span>
                </div>
              ))}
            </div>
            <h4 className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">レベル一覧</h4>
            <div className="grid grid-cols-3 gap-1.5">
              {LEVEL_TABLE.map((lv, i) => (
                <div key={i} className="text-center bg-gray-50 rounded-lg py-1.5 px-2">
                  <p className="text-[11px] font-bold text-gray-700">{lv.name}</p>
                  <p className="text-[10px] text-gray-400">{lv.min} pt~</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Metric cards */}
        <div className="grid grid-cols-3 gap-3">
          <MetricCard icon={<Zap size={16} />} value={safePoints.total} unit="pt" label="総ポイント" gradient="from-violet-500 to-purple-600" />
          <MetricCard icon={<CheckCircle2 size={16} />} value={doneTasks} unit="" label="完了タスク" gradient="from-emerald-500 to-teal-600" />
          <MetricCard icon={<TrendingUp size={16} />} value={totalTasks} unit="" label="全タスク" gradient="from-blue-500 to-cyan-600" />
        </div>

        {/* Column breakdown — donut */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h3 className="text-sm font-bold text-gray-800 mb-4">ステータス別</h3>
          <div className="grid grid-cols-4 gap-2">
            {columnStats.map((col) => {
              const pct = totalTasks ? Math.round((col.count / totalTasks) * 100) : 0;
              const colorMap = { idea: '#eab308', todo: '#a855f7', doing: '#3b82f6', done: '#10b981' };
              return (
                <div key={col.id} className="text-center">
                  <div className="relative w-14 h-14 mx-auto mb-2">
                    <svg className="w-full h-full" viewBox="0 0 36 36" style={{ transform: 'rotate(-90deg)' }}>
                      <circle cx="18" cy="18" r="15" fill="none" stroke="#f1f5f9" strokeWidth="3" />
                      <circle
                        cx="18" cy="18" r="15" fill="none"
                        strokeWidth="3" strokeLinecap="round"
                        stroke={colorMap[col.id] || '#6b7280'}
                        strokeDasharray={`${pct * 0.942} 94.2`}
                      />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-gray-700">
                      {col.count}
                    </span>
                  </div>
                  <p className="text-[11px] font-semibold text-gray-500">{col.title}</p>
                  <p className="text-[10px] text-gray-400">{pct}%</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Tag distribution */}
        {tagStats.length > 0 && (
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <h3 className="text-sm font-bold text-gray-800 mb-4">タグ分布</h3>
            <div className="space-y-2.5">
              {tagStats.map((tag) => (
                <div key={tag.id} className="flex items-center gap-3">
                  <span
                    className="text-[11px] font-bold px-2 py-0.5 rounded-full shrink-0"
                    style={{ backgroundColor: (tag.color || '#6b7280') + '18', color: tag.color || '#6b7280' }}
                  >
                    {tag.label}
                  </span>
                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${(tag.count / maxTagCount) * 100}%`,
                        backgroundColor: tag.color || '#6b7280',
                      }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-gray-500 tabular-nums w-6 text-right">{tag.count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Daily activity */}
        {dailyData.length > 0 && (
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <h3 className="text-sm font-bold text-gray-800 mb-1">デイリーアクティビティ</h3>
            <p className="text-[11px] text-gray-400 mb-4">過去14日間のポイント推移</p>
            <div className="flex items-end gap-[3px]" style={{ height: DAILY_BAR_H + 24 }}>
              {dailyData.map((d, i) => {
                const pts = d.points || 0;
                const barH = pts > 0 ? Math.max(Math.round((pts / maxDaily) * DAILY_BAR_H), 4) : 2;
                const isToday = i === dailyData.length - 1;
                return (
                  <div key={d.date} className="flex-1 flex flex-col items-center justify-end group relative" style={{ height: '100%' }}>
                    <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[9px] px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                      {d.label}: {pts}pt
                    </div>
                    <div
                      className={`w-full rounded-sm transition-all duration-300 shrink-0 ${
                        isToday
                          ? 'bg-indigo-600'
                          : pts > 0
                          ? 'bg-indigo-300 group-hover:bg-indigo-400'
                          : 'bg-gray-100'
                      }`}
                      style={{ height: barH }}
                    />
                    <span className={`text-[8px] tabular-nums mt-1 shrink-0 ${isToday ? 'text-indigo-600 font-bold' : 'text-gray-400'}`}>
                      {(d.label || '').split('/')[1] || ''}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Weekly trend */}
        {weeklyData.length > 0 && (
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <h3 className="text-sm font-bold text-gray-800 mb-1">ウィークリートレンド</h3>
            <p className="text-[11px] text-gray-400 mb-4">週ごとの合計ポイント</p>
            <div className="flex items-end gap-2" style={{ height: WEEKLY_BAR_H + 36 }}>
              {weeklyData.map((w, i) => {
                const pts = w.points || 0;
                const barH = pts > 0 ? Math.max(Math.round((pts / maxWeekly) * WEEKLY_BAR_H), 4) : 2;
                const isLast = i === weeklyData.length - 1;
                return (
                  <div key={w.week || i} className="flex-1 flex flex-col items-center justify-end group relative" style={{ height: '100%' }}>
                    <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[9px] px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                      {w.week}: {pts}pt
                    </div>
                    {pts > 0 && (
                      <span className="text-[9px] font-semibold text-gray-400 tabular-nums mb-1 shrink-0">{pts}</span>
                    )}
                    <div
                      className={`w-full rounded-md transition-all duration-300 shrink-0 ${
                        isLast
                          ? 'bg-emerald-500'
                          : pts > 0
                          ? 'bg-emerald-300 group-hover:bg-emerald-400'
                          : 'bg-gray-100'
                      }`}
                      style={{ height: barH }}
                    />
                    <span className={`text-[9px] tabular-nums mt-1 shrink-0 ${isLast ? 'text-emerald-600 font-bold' : 'text-gray-400'}`}>
                      {(w.week || '').split('-')[1] || ''}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

function MetricCard({ icon, value, unit, label, gradient }) {
  return (
    <div className={`relative overflow-hidden rounded-xl bg-gradient-to-br ${gradient} p-3.5 text-white shadow-md`}>
      <div className="absolute top-0 right-0 w-16 h-16 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
      <div className="relative">
        <div className="opacity-80 mb-2">{icon}</div>
        <p className="text-xl md:text-2xl font-black leading-none">
          {value ?? 0}<span className="text-sm font-semibold opacity-70 ml-0.5">{unit}</span>
        </p>
        <p className="text-[10px] opacity-70 mt-1 font-medium">{label}</p>
      </div>
    </div>
  );
}
