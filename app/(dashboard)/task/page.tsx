"use client";

import { useState, useEffect } from "react";
import { CheckSquare, Shuffle, Plus, Trash2, Loader2, User } from "lucide-react";
import { supabase } from "@/supabase";

// 日付計算用の関数
const getFormattedDateStr = (daysOffset: number) => {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

// 過去1週間（-7日）と 先2週間（+14日）の日付文字列
const START_DATE_STR = getFormattedDateStr(-7);
const END_DATE_STR = getFormattedDateStr(14);

interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  start_time: string;
  end_time: string;
  target_role: any;
}

const ROLES = [
  { id: "captain", label: "キャプテン", badge: "border-emerald-500 bg-emerald-500/10 text-emerald-400" },
  { id: "vice-captain", label: "副キャプテン", badge: "border-blue-500 bg-blue-500/10 text-blue-400" },
  { id: "girls-captain", label: "女子キャプテン", badge: "border-pink-500 bg-pink-500/10 text-pink-400" },
  { id: "treasurer", label: "会計", badge: "border-amber-500 bg-amber-500/10 text-amber-400" },
];

export default function TaskPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);

  const [candidates, setCandidates] = useState<string[]>([
    "キャプテン",
    "副キャプテン",
    "女子キャプテン",
    "会計",
  ]);
  const [newCandidate, setNewCandidate] = useState("");
  const [isRolling, setIsRolling] = useState(false);
  const [rollingIndex, setRollingIndex] = useState<number | null>(null);
  const [winner, setWinner] = useState<string | null>(null);

  const fetchUpcomingEvents = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("events")
      .select("id, title, date, start_time, end_time, target_role")
      .gte("date", START_DATE_STR)
      .lte("date", END_DATE_STR)
      .order("date", { ascending: true });

    if (error) {
      console.error("タスク用イベント取得失敗:", error.message);
    } else {
      setEvents(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchUpcomingEvents();
  }, []);

  const startRoulette = () => {
    if (candidates.length === 0) return;
    setIsRolling(true);
    setWinner(null);

    let counter = 0;
    const maxTicks = 20;
    
    const interval = setInterval(() => {
      setRollingIndex(Math.floor(Math.random() * candidates.length));
      counter++;

      if (counter >= maxTicks) {
        clearInterval(interval);
        const finalIndex = Math.floor(Math.random() * candidates.length);
        setWinner(candidates[finalIndex]);
        setRollingIndex(null);
        setIsRolling(false);
      }
    }, 100);
  };

  const addCandidate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCandidate.trim()) return;
    setCandidates([...candidates, newCandidate.trim()]);
    setNewCandidate("");
  };

  const removeCandidate = (index: number) => {
    setCandidates(candidates.filter((_, i) => i !== index));
    if (winner && !candidates.filter((_, i) => i !== index).includes(winner)) {
      setWinner(null);
    }
  };

  // 💡 文字列内の不要な記号を完璧にお掃除して仕分けるロジック
  const getEventsForRole = (roleId: string) => {
    return events.filter((event) => {
      let rawStr = "";

      if (typeof event.target_role === "string") {
        rawStr = event.target_role;
      } else if (Array.isArray(event.target_role)) {
        rawStr = JSON.stringify(event.target_role);
      } else if (event.target_role) {
        rawStr = String(event.target_role);
      }

      if (!rawStr) return false;

      // 💡 [ ] や { } や " や ' をすべて消し去り、純粋なカンマ区切りの英単語リストにする
      // 例: '["officers","captain"]'  =>  "officers,captain"
      const cleanStr = rawStr.replace(/[\[\]\{\}"']/g, "");
      const roles = cleanStr.split(",").map(r => r.trim());

      // 1. 閲覧対象の先頭(添字0)が "all" の場合は全体用なので非表示
      if (roles[0] === "all") return false;

      // 2. 「役員全員がやる仕事」を弾く（すべての役職名が配列に含まれている場合は共通雑務とみなす）
      const hasAllRoles = ROLES.every(r => roles.includes(r.id));
      if (hasAllRoles) return false;

      // 3. 添字1以降に指定の役職IDがピンポイントで含まれているか判定
      return roles.includes(roleId);
    });
  };

  return (
    <div className="p-4 max-w-md mx-auto md:max-w-5xl bg-slate-950 min-h-screen text-slate-100 pt-20">
      <div className="flex items-center gap-2 mb-6 border-b border-slate-800 pb-3">
        <CheckSquare className="w-6 h-6 text-emerald-400" />
        <h1 className="text-xl font-bold">タスク・役員管理</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        <div className="md:col-span-2 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-4 border-b border-slate-800/60 pb-3">
              <div>
                <h2 className="text-sm font-bold text-slate-300">📅 役職別の個別タスク</h2>
                <p className="text-xs text-slate-500">
                  各役職が個別で担当する仕事のみを表示しています（全体や役員共通の予定を除く）
                </p>
              </div>
              <div className="text-[10px] bg-slate-950 border border-slate-800 text-slate-400 px-2 py-1 rounded-md self-start sm:self-center font-mono">
                期間: {START_DATE_STR.slice(5)} 〜 {END_DATE_STR.slice(5)}
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-8 text-slate-500 text-xs gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                データを読み込み中...
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {ROLES.map((role) => {
                  const roleEvents = getEventsForRole(role.id);
                  return (
                    <div key={role.id} className="bg-slate-950 border border-slate-800 rounded-lg p-3 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 mb-2">
                          <span className="text-xs font-bold text-slate-200">{role.label}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full border ${role.badge} font-semibold`}>
                            個別: {roleEvents.length}件
                          </span>
                        </div>

                        <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                          {roleEvents.length > 0 ? (
                            roleEvents.map((event) => (
                              <div key={event.id} className="text-[11px] bg-slate-900 border border-slate-800/60 rounded p-1.5 hover:border-slate-700 transition-colors">
                                <div className="font-medium text-slate-300 truncate">{event.title}</div>
                                <div className="text-[10px] text-slate-500 flex justify-between mt-0.5">
                                  <span>{event.date.slice(5)}</span>
                                  <span>{event.start_time.slice(0, 5)}~</span>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="text-[10px] text-slate-600 text-center py-4">該当する個別タスクはありません</div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ルーレット部分 */}
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl flex flex-col justify-between h-full">
            <div>
              <h2 className="text-sm font-bold text-slate-300 mb-1">🎯 役員ルーレット</h2>
              <p className="text-xs text-slate-500 mb-4">雑務や担当者をランダムに1人選出します</p>

              <div className="bg-slate-950 border border-slate-800 rounded-lg p-6 text-center mb-4 min-h-[100px] flex flex-col items-center justify-center relative overflow-hidden group">
                {isRolling ? (
                  <div className="text-xl font-black text-emerald-400 animate-pulse tracking-wider">
                    {candidates[rollingIndex ?? 0]}
                  </div>
                ) : winner ? (
                  <div className="animate-in zoom-in-95 duration-200 text-center">
                    <div className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest mb-1">🎉 当選者 🎉</div>
                    <div className="text-lg font-black text-white bg-emerald-500/20 px-4 py-1.5 rounded-md border border-emerald-500/30">
                      {winner}
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-slate-500 flex flex-col items-center gap-1">
                    <Shuffle className="w-5 h-5 text-slate-600" />
                    <span>ボタンを押してスタート</span>
                  </div>
                ) }
              </div>

              <button 
                onClick={startRoulette} 
                disabled={isRolling || candidates.length === 0}
                className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-800 text-white disabled:text-slate-600 font-bold text-xs py-2.5 rounded-md transition-colors shadow-lg shadow-emerald-500/10 flex items-center justify-center gap-1.5 cursor-pointer disabled:cursor-not-allowed mb-4"
              >
                <Shuffle className="w-3.5 h-3.5" />
                <span>ルーレットを回す</span>
              </button>

              <form onSubmit={addCandidate} className="flex gap-2 mb-3">
                <input 
                  type="text" 
                  value={newCandidate}
                  onChange={(e) => setNewCandidate(e.target.value)}
                  placeholder="名前または役職を追加" 
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-md px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none"
                  disabled={isRolling}
                />
                <button 
                  type="submit" 
                  disabled={isRolling}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 p-1.5 rounded-md border border-slate-700 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </form>

              <div className="border-t border-slate-800/60 pt-3">
                <div className="text-[11px] font-bold text-slate-400 mb-1.5 flex justify-between px-1">
                  <span>現在の抽選対象 ({candidates.length}人)</span>
                </div>
                <div className="space-y-1 max-h-44 overflow-y-auto pr-1">
                  {candidates.map((name, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-slate-950/60 border border-slate-800/40 rounded px-2.5 py-1 text-xs text-slate-300">
                      <div className="flex items-center gap-1.5">
                        <User className="w-3 h-3 text-slate-500" />
                        <span className="text-[11px]">{name}</span>
                      </div>
                      <button 
                        type="button" 
                        onClick={() => removeCandidate(idx)}
                        disabled={isRolling}
                        className="text-slate-600 hover:text-red-400 p-1 rounded transition-colors disabled:opacity-30 cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  {candidates.length === 0 && (
                    <div className="text-[10px] text-slate-600 text-center py-4">対象者がいません</div>
                  )}
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}