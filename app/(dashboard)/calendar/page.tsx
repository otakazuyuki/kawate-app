"use client";

import {useState,useEffect,FormEvent} from "react";
import {Plus,X,Trash2} from "lucide-react";
import {supabase} from "@/supabase";

interface CalendarEvent{
    id:string;
    title:string;
    date:string;
    start_time:string;
    end_time:string;
    requires_form:boolean;
    requires_court:boolean;
    target_role:string;
    memo:string;
}

export default function CalendarPage(){
    const [currentYear, setCurrentYear] = useState(2026);
    const [currentMonth, setCurrentMonth] = useState(6);
    const [selectedDay, setSelectedDay] = useState<number | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<"add" | "edit" | "soshikiren-setting">("add");
    const [showSoshikiren, setShowSoshikiren] = useState(true);

    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [loading, setLoading] = useState(false);

    const [eventId, setEventId] = useState<string | null>(null);
    const [title, setTitle] = useState("");
    const [startTime, setStartTime] = useState("09:00");
    const [endTime, setEndTime] = useState("10:00");
    const [requiresForm, setRequiresForm] = useState(false);
    const [requiresCourt, setRequiresCourt] = useState(false);
    const [targetRole, setTargetRole] = useState("all");
    const [memo, setMemo] = useState("");


    const totalDays = new Date(currentYear, currentMonth, 0).getDate();
    const dayInMonth = Array.from({ length: totalDays }, (_, i) => i + 1); // 30固定からtotalDays修正！
    const weekDays = ["月", "火", "水", "木", "金", "土", "日"];
    const firstDayIndex = new Date(currentYear, currentMonth - 1, 1).getDay();
    const blankDaysCount = firstDayIndex === 0 ? 6 : firstDayIndex - 1;
    const blankDays = Array.from({ length: blankDaysCount });

    const fetchEvents = async () => {
        setLoading(true);
        const startDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;
        const endDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(totalDays).padStart(2, '0')}`;

        const { data, error } = await supabase
        .from("events")
        .select("*")
        .gte("date", startDate)
        .lte("date", endDate);

        if (error) {
            console.error("データ取得失敗:", error.message);
        } else {
            setEvents(data || []);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchEvents();
    }, [currentYear, currentMonth]);

    const resetForm = () => {
        setEventId(null);
        setTitle("");
        setStartTime("09:00");
        setEndTime("10:00");
        setRequiresForm(false);
        setRequiresCourt(false);
        setTargetRole("all");
        setMemo("");
    };


    const openModal = (mode: "add" | "edit" | "soshikiren-setting", event?: CalendarEvent) => {
        setModalMode(mode);
        if (mode === "edit" && event) {
            setEventId(event.id);
            setTitle(event.title);
            setStartTime(event.start_time.slice(0, 5));
            setEndTime(event.end_time.slice(0, 5));
            setRequiresForm(event.requires_form);
            setRequiresCourt(event.requires_court);
            setTargetRole(event.target_role);
            setMemo(event.memo || "");
        } else {
            resetForm();
        }
        setIsModalOpen(true);
    };

    const handleSaveEvent = async (e: FormEvent) => {
        e.preventDefault();
        if (!selectedDay) return;

        const formattedDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`;
    
        const eventData = {
            title,
            date: formattedDate,
            start_time: startTime,
            end_time: endTime,
            requires_form: requiresForm,
            requires_court: requiresCourt,
            target_role: targetRole,
            memo,
        };

        if (modalMode === "add") {
            const { error } = await supabase.from("events").insert([eventData]);
            if (error) alert(`追加失敗: ${error.message}`);
        } else if (modalMode === "edit" && eventId) {
            const { error } = await supabase.from("events").update(eventData).eq("id", eventId);
            if (error) alert(`更新失敗: ${error.message}`);
        }

        setIsModalOpen(false);
        resetForm();
        fetchEvents();
    };

    const handleDeleteEvent = async () => {
        if (!eventId) return;
        if (!confirm("この予定を削除してもよろしいですか？")) return;

        const { error } = await supabase.from("events").delete().eq("id", eventId);
        if (error) {
            alert(`削除失敗: ${error.message}`);
        } else {
            setIsModalOpen(false);
            setSelectedDay(null);
            resetForm();
            fetchEvents();
        }
    };

    const handlePrevMonth = () => {
        setSelectedDay(null);
        if (currentMonth === 1) {
            setCurrentMonth(12);
            setCurrentYear(currentYear - 1);
        } else {
            setCurrentMonth(currentMonth - 1);
        }
    };

    const handleNextMonth = () => {
        setSelectedDay(null);
        if (currentMonth === 12) {
            setCurrentYear(currentYear + 1);
            setCurrentMonth(1);
        } else {
            setCurrentMonth(currentMonth + 1);
        }
    };

    return (
        <div className="p-4 max-w-md mx-auto md:max-w-4xl bg-slate-950 min-h-screen text-slate-100">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                <button onClick={handlePrevMonth} className="p-2 text-slate-400 hover:text-white bg-slate-900 border border-slate-800 rounded-md transition-colors">◀</button>
                <h2 className="text-xl font-bold min-w-[120px] text-center">{currentYear}年 {currentMonth}月</h2>
                <button onClick={handleNextMonth} className="p-2 text-slate-400 hover:text-white bg-slate-900 border border-slate-800 rounded-md transition-colors">▶</button>
            </div>
        
            <div className="flex items-center gap-3">
                <div onClick={() => openModal("soshikiren-setting")} className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 px-3 py-1.5 rounded-full text-xs text-slate-300 transition-colors cursor-pointer group">
                    <span className="group-hover:text-emerald-400 transition-colors">組織練 ⚙️</span>
                    <button onClick={(e) => { e.stopPropagation(); setShowSoshikiren(!showSoshikiren); }} className={`w-8 h-4 rounded-full p-0.5 transition-colors duration-200 ${showSoshikiren ? "bg-emerald-500" : "bg-slate-700"}`}>
                        <div className={`w-3 h-3 bg-white rounded-full transition-transform duration-200 ${showSoshikiren ? "translate-x-4" : "translate-x-0"}`} />
                    </button>
                </div>
                <button onClick={() => { if(!selectedDay) { alert("日付を選択してから追加してください"); return; } openModal("add"); }} className="w-8 h-8 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full flex items-center justify-center transition-colors">
                    <Plus className="w-5 h-5" />
                </button>
            </div>
        </div>


        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl mb-4">
            <div className="grid grid-cols-7 border-b border-slate-800 bg-slate-900 text-center py-2">
                {weekDays.map((day) => (
                    <div key={day} className={`text-xs font-semibold ${day === "土" ? "text-blue-400" : day === "日" ? "text-red-400" : "text-slate-400"}`}>{day}</div>
                ))}
            </div>
        
            <div className="grid grid-cols-7 divide-x divide-y divide-slate-800 border-l border-t border-transparent">
                {blankDays.map((_, index) => (
                    <div key={`blank-${index}`} className="min-h-[90px] bg-slate-950/40 border-slate-800" />
                ))}
                {dayInMonth.map((day) => {
                    const formattedDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    const dayEvents = events.filter(e => e.date === formattedDate);
                    const isSelected = selectedDay === day;

                    return (
                        <button key={day} className={`min-h-[90px] p-1 flex flex-col justify-between items-start hover:bg-slate-800/50 transition-colors text-left group ${isSelected ? "bg-slate-800" : ""}`} onClick={() => setSelectedDay(day)}>
                            <span className={`text-xs font-medium px-1.5 py-0.5 rounded-md ${isSelected ? "bg-emerald-500 text-white font-bold" : "text-slate-400"}`}>{day}</span>
                
                            <div className="w-full space-y-1 mt-1 overflow-hidden flex-1">
                                {dayEvents.map(event => (
                                    <div key={event.id} className="text-[10px] bg-emerald-500/10 text-emerald-400 px-1 py-0.5 rounded truncate border-l-2 border-emerald-500 font-medium">
                                        {event.title}
                                    </div>
                                ))}
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>

        {selectedDay !== null && (
            <div className="w-full bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-2xl">
                <h2 className="text-base font-bold text-slate-100 border-b border-slate-800 pb-2 mb-3">{currentMonth}月{selectedDay}日の予定</h2>
                <div className="space-y-2">
                    {events.filter(e => e.date === `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`).length > 0 ? (
                        events.filter(e => e.date === `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`).map(event => (
                            <button key={event.id} onClick={() => openModal("edit", event)} className="w-full text-left border-l-4 border-emerald-500 pl-3 py-2 bg-slate-800/50 rounded-r-md hover:bg-slate-800 transition-colors block">
                                <div className="font-bold text-sm text-slate-200">{event.title}</div>
                                <div className="text-xs text-slate-400">{event.start_time.slice(0,5)} - {event.end_time.slice(0,5)}</div>
                                {event.memo && <div className="text-xs text-slate-500 mt-1 truncate">{event.memo}</div>}
                            </button>
                        ))
                    ) : (
                        <p className="text-xs text-slate-500 text-center py-4">予定はありません</p>
                    )}
                </div>
            </div>
        )}

        {isModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
                <form onSubmit={handleSaveEvent} className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-md p-6 shadow-2xl relative">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
                        <h3 className="text-base font-bold text-slate-100">
                            {modalMode === "add" && "予定を追加"}
                            {modalMode === "edit" && "予定を編集"}
                            {modalMode === "soshikiren-setting" && "組織練の設定"}
                        </h3>
              
                        {modalMode === "edit" && (
                            <button type="button" onClick={handleDeleteEvent} className="text-red-400 hover:text-red-300 transition-colors flex items-center gap-1 text-xs bg-red-500/10 px-2 py-1 rounded">
                                <Trash2 className="w-3 h-3" />
                                <span>削除</span>
                            </button>
                        )}
                    </div>

                    {modalMode === "soshikiren-setting" ? (
                        <div className="space-y-3 text-left">
                            <p className="text-xs text-slate-400 leading-relaxed">ここで設定した曜日と時間が、毎月のカレンダーに自動的に「組織練」として反映されます。（※現在フロント実装のみ）</p>
                            {["月", "水", "金"].map((dow) => (
                                <div key={dow} className="flex items-center justify-between bg-slate-950 border border-slate-800 rounded-md p-2">
                                    <div className="flex items-center gap-2">
                                        <input type="checkbox" defaultChecked className="w-4 h-4 accent-emerald-500 rounded" />
                                        <span className="text-xs font-medium text-slate-200">{dow}曜日</span>
                                    </div>
                                        <div className="flex items-center gap-2">
                                        <input type="time" defaultValue="13:00" className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-slate-100" />                                            <span className="text-xs text-slate-500">〜</span>
                                        <input type="time" defaultValue="15:00" className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-slate-100" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="space-y-3 text-left">
                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1">タイトル</label>
                                <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="予定のタイトルを入力" className="w-full bg-slate-950 border border-slate-800 rounded-md px-3 py-2 text-xs text-slate-100 focus:outline-none" required />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1">年月日</label>
                                <div className="w-full bg-slate-950 border border-slate-800 rounded-md px-3 py-2 text-xs text-slate-500">
                                    {currentYear}年{currentMonth}月{selectedDay}日
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-slate-400 mb-1">開始時間</label>
                                    <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-md px-3 py-2 text-xs text-slate-100 focus:outline-none" required />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-400 mb-1">終了時間</label>
                                    <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-md px-3 py-2 text-xs text-slate-100 focus:outline-none" required />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-slate-400 mb-1">行事実施届</label>
                                    <label className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-md px-3 py-2 cursor-pointer">
                                        <input type="checkbox" checked={requiresForm} onChange={(e) => setRequiresForm(e.target.checked)} className="w-4 h-4 accent-emerald-500 rounded" />
                                        <span className="text-xs text-slate-200">提出が必要</span>
                                    </label>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-400 mb-1">教室（コート）予約</label>
                                    <label className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-md px-3 py-2 cursor-pointer">
                                        <input type="checkbox" checked={requiresCourt} onChange={(e) => setRequiresCourt(e.target.checked)} className="w-4 h-4 accent-emerald-500 rounded" />
                                        <span className="text-xs text-slate-200">予約が必要</span>
                                    </label>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1">予定の対象（役職）</label>
                                <select value={targetRole} onChange={(e) => setTargetRole(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-md px-3 py-2 text-xs text-slate-100 focus:outline-none">
                                    <option value="all">全員</option>
                                    <option value="captain">キャプテン</option>
                                    <option value="vice-captain">副キャプテン</option>
                                    <option value="girls-captain">女子キャプテン</option>
                                    <option value="treasurer">会計</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1">メモ</label>
                            <   textarea rows={2} value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="持ち物や連絡事項など" className="w-full bg-slate-950 border border-slate-800 rounded-md px-3 py-2 text-xs text-slate-100 focus:outline-none resize-none" />
                            </div>
                        </div>
                    )}

                    <div className="flex gap-3 mt-5 border-t border-slate-800 pt-3">
                        <button type="button" onClick={() => { setIsModalOpen(false); resetForm(); }} className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs py-2 rounded-md transition-colors">キャンセル</button>
                        {modalMode !== "soshikiren-setting" && (
                            <button type="submit" className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-medium py-2 rounded-md transition-colors">
                                {modalMode === "add" ? "追加する" : "変更を保存"}
                            </button>
                        )}
                    </div>
                </form>
            </div>
        )}
    </div>
  );
}