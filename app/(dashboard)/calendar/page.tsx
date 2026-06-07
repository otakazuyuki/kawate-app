"use client";

import {useState} from "react";
import {Plus,X} from "lucide-react";

export default function CalendarPage(){
    const [showSoshikiren,setShowSoshikiren]=useState(true);
    const [selectedDay,setSelectedDay]=useState<number|null>(null);
    const [isModalOpen,setIsModalOpen]=useState(false);
    const [currentYear,setCurrentYear]=useState(2026);
    const [currentMonth,setCurrentMonth]=useState(6);
    const handlePrevMonth=()=>{
        if(currentMonth===1){
            setCurrentMonth(12);
            setCurrentYear(currentYear-1);
        }else{
            setCurrentMonth(currentMonth-1);
        }
    };
    const handleNextMonth=()=>{
        if(currentMonth===12){
            setCurrentYear(currentYear+1);
            setCurrentMonth(1);
        }else{
            setCurrentMonth(currentMonth+1);
        }
    };
    const [modalMode,setModalMode]=useState<"add" |"edit"| "soshikiren-setting">("add");
    const totalDays=new Date(currentYear,currentMonth,0).getDate();
    const dayInMonth=Array.from({length:30},(_,i)=>i+1);
    const weekDays=["月","火","水","木","金","土","日"];
    const firstDayIndex=new Date(currentYear,currentMonth-1,1).getDay();
    const blankDaysCount=firstDayIndex===0 ? 6 : firstDayIndex-1;
    const blankDays=Array.from({length:blankDaysCount})
    return(
        <div className="p-4 max-w-md mx-auto md:max-w-4xl">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={handlePrevMonth}
                        className="p-1 text-slate-400 hover:text-white bg-slate-900 border border-slate-800 rounded-md transition-colors"
                    >
                        ◀
                    </button>

                    <h2 className="text-xl font-bold text-slate-100 min-w-[120px] text-center">
                        {currentYear}年 {currentMonth}月
                    </h2>

                    <button 
                        onClick={handleNextMonth}
                        className="p-1 text-slate-400 hover:text-white bg-slate-900 border border-slate-800 rounded-md transition-colors"
                    >
                    ▶
                    </button>
                </div>
                <div className="flex items-center gap-3">
                    <div 
                        onClick={() => {
                            setModalMode("soshikiren-setting");
                            setIsModalOpen(true);
                        }}
                        className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 px-3 py-1.5 rounded-full text-xs text-slate-300 transition-colors cursor-pointer group"
                    >
                        <span className="group-hover:text-emerald-400 transition-colors">組織練 ⚙️</span>
  
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowSoshikiren(!showSoshikiren);
                            }}
                            className={`w-8 h-4 rounded-full p-0.5 transition-colors duration-200 ${
                                showSoshikiren ? "bg-emerald-500" : "bg-slate-700"
                            }`}
                        >
                            <div className={`w-3 h-3 bg-white rounded-full transition-transform duration-200 ${
                                showSoshikiren ? "translate-x-4" : "translate-x-0"
                            }`} />
                        </button>
                    </div>
                    <button 
                        onClick={() => {
                            setIsModalOpen(true);
                            setModalMode("add");
                        }}
                        className="w-8 h-8 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full flex items-center justify-center transition-colors"
                    >
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
                    {blankDays.map((_,index)=>(
                        <div key={`blank-${index}`} className="min-h-[80px] bg-slate-950/40 border-slate-800" />
                    ))}
                    {dayInMonth.map((day) => {
                        const hasEvent = day === 15 && currentMonth === 6; // 15日のイベントはとりあえず6月だけに限定
                        return (
                            <button
                                key={day}
                                className="min-h-[80px] p-1 flex flex-col justify-between items-start hover:bg-slate-800/50 transition-colors text-left group"
                                onClick={() => setSelectedDay(selectedDay === day ? null : day)}
                            >
                                <span className={`text-xs font-medium px-1.5 py-0.5 rounded-md ${
                                    day === 15 && currentMonth === 6 ? "bg-emerald-500/20 text-emerald-400 font-bold" : "text-slate-400"
                                }`}>
                                    {day}
                                </span>

                                <div className="w-full space-y-0.5 mt-1 overflow-hidden">
                                    {showSoshikiren && 
                                        (([15, 1, 8, 22, 29].includes(day) && firstDayIndex === 1) || // 月曜始まりの月
                                        ([1, 3, 5, 6, 8, 10, 12, 13, 15, 17, 19, 20].includes(day) && currentMonth === 6)) && ( // 6月
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
                  <button
                    onClick={() => {
                      setIsModalOpen(true);
                      setModalMode("edit");
                    }}
                    className="w-full text-left border-l-4 border-emerald-500 pl-3 py-1 bg-slate-800/50 rounded-r-md hover:bg-slate-800 transition-colors block"
                  >
                    <div className="font-bold text-sm text-slate-200">組織練</div>
                    <div className="text-xs text-slate-400">13:00 - 15:00</div>
                  </button>
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

        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
            
            <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-md p-6 shadow-2xl relative">
              
              <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-5">
                <h3 className="text-lg font-bold text-slate-100">
                  {modalMode==="add" && "予定を追加"}
                  {modalMode==="edit" && "予定を編集"}
                  {modalMode==="soshikiren-setting" && "組織練の設定"}
                </h3>
                
                {modalMode === "add" ? (
                  <button 
                    onClick={() => setIsModalOpen(false)}
                    className="text-slate-400 hover:text-white transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                ) : (
                  <button 
                    onClick={() => {
                      alert("削除処理（バックエンドでいう DELETE 処理）を実行します");
                      setIsModalOpen(false);
                    }}
                    className="text-red-400 hover:text-red-300 transition-colors flex items-center gap-1 text-xs bg-red-500/10 px-2 py-1 rounded"
                  >
                    <span>ゴミ箱</span>
                  </button>
                )}
              </div>

                {modalMode === "soshikiren-setting" ? (
                    <div className="space-y-4 text-left">
                        <p className="text-xs text-slate-400 leading-relaxed">
                            ここで設定した曜日と時間が、毎月のカレンダーに自動的に「組織練」として反映されます。
                        </p>

                        {["月", "水", "金"].map((dow) => (
                            <div key={dow} className="flex items-center justify-between bg-slate-950 border border-slate-800 rounded-md p-3">
                                <div className="flex items-center gap-2">
                                    <input type="checkbox" defaultChecked className="w-4 h-4 accent-emerald-500 rounded" />
                                    <span className="text-sm font-medium text-slate-200">{dow}曜日</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <input type="time" defaultValue="13:00" className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-slate-100" />
                                    <span className="text-xs text-slate-500">〜</span>
                                    <input type="time" defaultValue="15:00" className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-slate-100" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                        <div className="space-y-4 text-left">
                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1">タイトル</label>
                                <input 
                                    type="text" 
                                    defaultValue={modalMode === "edit" ? "組織練" : ""} 
                                    placeholder="予定のタイトルを入力"
                                    className="w-full bg-slate-950 border border-slate-800 rounded-md px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1">年月日</label>
                                <div className="w-full bg-slate-950 border border-slate-800 rounded-md px-3 py-2 text-sm text-slate-400">
                                    2026年6月{selectedDay || "???"}日
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-slate-400 mb-1">開始時間</label>
                                    <input 
                                        type="time" 
                                        defaultValue={modalMode === "edit" ? "13:00" : "09:00"}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-md px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-400 mb-1">終了時間</label>
                                    <input 
                                        type="time" 
                                        defaultValue={modalMode === "edit" ? "15:00" : "10:00"}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-md px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-slate-400 mb-1">行事実施届</label>
                                    <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-md px-3 py-2">
                                        <input type="checkbox" className="w-4 h-4 accent-emerald-500 rounded" />
                                        <span className="text-sm text-slate-200">提出が必要</span>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-400 mb-1">教室（コート）予約</label>
                                    <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-md px-3 py-2">
                                        <input type="checkbox" className="w-4 h-4 accent-emerald-500 rounded" />
                                        <span className="text-sm text-slate-200">予約が必要</span>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1">予定の対象（役職）</label>
                                <select className="w-full bg-slate-950 border border-slate-800 rounded-md px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500">
                                    <option value="all">全員</option>
                                    <option value="captain">キャプテン</option>
                                    <option value="vice-captain">副キャプテン</option>
                                    <option value="girls-captain">女子キャプテン</option>
                                    <option value="treasurer">会計</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1">メモ</label>
                                <textarea 
                                    rows={3}
                                    placeholder="持ち物や連絡事項など"
                                    className="w-full bg-slate-950 border border-slate-800 rounded-md px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none"
                                />
                            </div>
                        </div>
                )}
              <div className="flex gap-3 mt-6 border-t border-slate-800 pt-4">
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm py-2 rounded-md transition-colors"
                >
                  キャンセル
                </button>
                <button 
                  onClick={() => {
                    if (modalMode === "add") {
                      alert("新規登録（バックエンドの POST 処理）を実行します！");
                    } else {
                      alert("内容更新（バックエンドの PUT / PATCH 処理）を実行します！");
                    }
                    setIsModalOpen(false);
                  }}
                  className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium py-2 rounded-md transition-colors"
                >
                  {modalMode === "add" ? "追加する" : "変更を保存"}
                </button>
              </div>
            </div>
          </div>
        )}
        </div>
    );
}