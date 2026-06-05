"use client";

import {useState} from "react";
import {Plus,X} from "lucide-react";

export default function CalendarPage(){
    const [showSoshikiren,setShowSoshikiren]=useState(true);
    const [selectedDay,setSelectedDay]=useState<number|null>(null);
    const dayInMonth=Array.from({length:30},(_,i)=>i+1);
    const weekDays=["月","火","水","木","金","土","日"];
    return(
        <div className="p-4 max-w-md mx-auto md:max-w-4xl">
            <div className="flex items-center justify-between mb-4">
                <button className="text-xl font-bold flex items-center gap-1 text-slate-100">
                    2026年6月<span className="text-xs text-slate-400">▼</span>
                </button>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-full text-xs">
                        <span className="text-slate-300">組織練</span>
                        <button
                            onClick={() => setShowSoshikiren(!showSoshikiren)}
                            className={`w-8 h-4 rounded-full p-0.5 transition-colors duration-200 ${
                                showSoshikiren ? "bg-emerald-500" : "bg-slate-700"
                            }`}
                        >
                            <div className={`w-3 h-3 bg-white rounded-full transition-transform duration-200 ${
                                showSoshikiren ? "translate-x-4" : "translate-x-0"
                            }`} />
                        </button>
                    </div>
                    <button className="w-8 h-8 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full flex items-center justify-center transition-colors">
                        <Plus className="w-5 h-5" />
                    </button>
                </div>
            </div>
            
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
                <div className="grid grid-cols-7 border-b border-slate-800 bg-slate-900 text-center py-2">
                    {weekDays.map((day) => (
                        <div 
                            key={day} 
                            className={`text-xs font-semibold ${
                                day === "土" ? "text-blue-400" : day === "日" ? "text-red-400" : "text-slate-400"
                            }`}
                        >
                            {day}
                        </div>
                    ))}
                </div>
                    <div className="grid grid-cols-7 grid-rows-5 divide-x divide-y divide-slate-800 border-l border-t border-transparent">
                        {dayInMonth.map((day) =>  {
                            const hasEvent = day === 15;
                            return(
                                <button
                                    key={day}
                                    className="min-h-[80px] p-1 flex flex-col justify-between items-start hover:bg-slate-800/50 transition-colors text-left group"
                                    onClick={() => setSelectedDay(selectedDay === day ? null : day)}
                                >
                                    <span className={`text-xs font-medium px-1.5 py-0.5 rounded-md ${
                                        day === 15 ? "bg-emerald-500/20 text-emerald-400 font-bold" : "text-slate-400"
                                    }`}>
                                        {day}
                                    </span>

                                    <div className="w-full space-y-0.5 mt-1 overflow-hidden">
                                        {showSoshikiren && [1, 3, 5, 6, 8, 10, 12, 13, 15, 17, 19, 20].includes(day) && (
                                            <div className="text-[9px] bg-slate-800 text-slate-400 px-1 py-0.5 rounded truncate border-l-2 border-slate-500">
                                                組織練
                                            </div>
                                        )}

                                        {hasEvent && (
                                            <div className="text-[9px] bg-emerald-500/20 text-emerald-400 px-1 py-0.5 rounded truncate border-l-2 border-emerald-500 font-medium">
                                                BBQ準備
                                            </div>
                                        )}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
            </div>
            {selectedDay !== null && (
                <div className="w-full md:w-80 bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-2xl relative">
                    <h2 className="text-lg font-bold text-slate-100 border-b border-slate-800 pb-2 mb-4">
                        6月{selectedDay}日の予定
                    </h2>
            <div className="space-y-3">
              {selectedDay === 15 ? (
                <>
                  <div className="border-l-4 border-emerald-500 pl-3 py-1 bg-slate-800/50 rounded-r-md">
                    <div className="font-bold text-sm text-slate-200">組織練</div>
                    <div className="text-xs text-slate-400">13:00 - 15:00</div>
                  </div>
                  <div className="border-l-4 border-emerald-500 pl-3 py-1 bg-slate-800/50 rounded-r-md">
                    <div className="font-bold text-sm text-slate-200">BBQ準備</div>
                    <div className="text-xs text-slate-400">18:00 - 19:00</div>
                  </div>
                </>
              ) : (
                <p className="text-sm text-slate-500 text-center py-4">予定はありません</p>
              )}
            </div>

            <button 
              onClick={() => setSelectedDay(null)}
              className="mt-4 w-full bg-slate-800 text-slate-300 text-xs py-2 rounded-md hover:bg-slate-700 transition-colors"
            >
              閉じる
            </button>
          </div>
        )}
        </div>
    );
}