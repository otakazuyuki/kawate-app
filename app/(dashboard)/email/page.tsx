"use client";

import { useState, useEffect } from "react";
import { Mail, FileText, Send, Check, AlertCircle, Plus, Trash2, Edit3, Search } from "lucide-react";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface DraftEmail {
  id?: number;
  title: string;
  body: string;
  generation: number;
  genre: string;
  role: string;
}

export default function MailPage() {
  const [currentGeneration, setCurrentGeneration] = useState<number>(21);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // --- 1. フォーム用ステート ---
  const [selectedGenre, setSelectedGenre] = useState("前期総会教室予約");
  const [roles, setRoles] = useState<string[]>([]); // contactsから取得する役職リスト
  const [selectedRole, setSelectedRole] = useState("");
  
  // ユーザー情報
  const [userRole, setUserRole] = useState("キャプテン");
  const [userName, setUserName] = useState("");

  // イベント・連絡先情報
  const [eventDate, setEventDate] = useState("");
  const [eventDay, setEventDay] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [location, setLocation] = useState("");
  const [subDate, setSubDate] = useState("");
  const [subDay, setSubDay] = useState("");
  
  const [advisorName, setAdvisorName] = useState("");
  const [advisorAffiliation, setAdvisorAffiliation] = useState("");
  const [advisorPhone, setAdvisorPhone] = useState("");
  const [directorName, setDirectorName] = useState("");

  // 最終出力（編集可能な大きいテキストボックス用）
  const [mailTitle, setMailTitle] = useState("");
  const [mailBody, setMailBody] = useState("");
  const [currentDraftId, setCurrentDraftId] = useState<number | null>(null); // 編集中の下書きID

  // --- 2. 下書き・過去メールリスト用ステート ---
  const [drafts, setDrafts] = useState<DraftEmail[]>([]);
  
  // 右側検索用ステート
  const [searchGen, setSearchGen] = useState("");
  const [searchGenre, setSearchGenre] = useState("");
  const [searchRole, setSearchRole] = useState("");

  // トーストメッセージ表示
  const showToast = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  // 🔔 起動時処理
  useEffect(() => {
    const savedGen = localStorage.getItem("current_generation");
    let targetGen = 21;
    if (savedGen) {
      targetGen = parseInt(savedGen, 10);
      setCurrentGeneration(targetGen);
    }
    fetchRolesFromContacts();
    fetchDrafts();
    // 🌟 ログイン中の人（設定期の役員）の情報を引き抜く
    fetchLoggedInUserInfo(targetGen);
  }, []);

  // 🌟 1. 設定期の役員(最初に見つかった主将など)を自分として自動セット
  const fetchLoggedInUserInfo = async (gen: number) => {
    try {
      const { data, error } = await supabase
        .from("officers")
        .select("*")
        .eq("generation", gen);
      
      if (error) throw error;
      if (data && data.length > 0) {
        // 主将、キャプテンなどの主要な役職があればそれを初期値に（なければ1件目）
        const primaryOfficer = data.find(o => o.role.includes("主将") || o.role.includes("キャプテン")) || data[0];
        setUserRole(primaryOfficer.role || "キャプテン");
        setUserName(primaryOfficer.name || "");
      }
    } catch (err: any) {
      console.error("ログインユーザー情報取得失敗:", err.message);
    }
  };

  // 📞 contactsテーブルから役職（role）の一覧をユニークに取得
  const fetchRolesFromContacts = async () => {
    try {
      const { data, error } = await supabase.from("contacts").select("role");
      if (error) throw error;
      if (data) {
        const uniqueRoles = Array.from(new Set(data.map(d => d.role).filter(Boolean))) as string[];
        setRoles(uniqueRoles);
        if (uniqueRoles.length > 0) setSelectedRole(uniqueRoles[0]);
      }
    } catch (err: any) {
      console.error("役職リスト取得失敗:", err.message);
    }
  };

  // 🌟 2. 宛先の役職（selectedRole）が選ばれたら、contactsテーブルから自動で情報を引き抜く
  useEffect(() => {
    if (!selectedRole) return;

    const fetchContactDetails = async () => {
      try {
        const { data, error } = await supabase
          .from("contacts")
          .select("*")
          .eq("role", selectedRole);

        if (error) throw error;
        
        if (data && data.length > 0) {
          const target = data[0]; // 同一役職の1件目を割り当て
          
          // ジャンルや役職名に応じて柔軟にセット
          if (selectedRole.includes("顧問")) {
            setAdvisorName(target.name || "");
            setAdvisorAffiliation(target.affiliation || "");
            setAdvisorPhone(target.phone_number || "");
          } else if (selectedRole.includes("監督")) {
            setDirectorName(target.name || "");
          } else {
            // それ以外の一般的な役職の場合は、汎用として顧問欄などに流し込んでおく
            setAdvisorName(target.name || "");
            setAdvisorAffiliation(target.affiliation || "外部関係者");
            setAdvisorPhone(target.phone_number || "");
          }
        }
      } catch (err: any) {
        console.error("宛先情報引き抜き失敗:", err.message);
      }
    };

    fetchContactDetails();
  }, [selectedRole]);

  // 🌟 追加機能: 監督情報がcontactsにあればついでに自動で裏から持ってきてあげる
  useEffect(() => {
    const autoFetchDirector = async () => {
      const { data } = await supabase.from("contacts").select("name").like("role", "%監督%").limit(1);
      if (data && data.length > 0) {
        setDirectorName(data[0].name || "");
      }
    };
    autoFetchDirector();
  }, []);

  // 💾 emailsテーブルから下書き一覧を取得
  const fetchDrafts = async () => {
    try {
      const { data, error } = await supabase
        .from("emails")
        .select("*")
        .order("id", { ascending: false });
      if (error) throw error;
      if (data) setDrafts(data);
    } catch (err: any) {
      console.error("下書き取得失敗:", err.message);
    }
  };

  // 🔄 テンプレート生成ロジック
  const generateTemplate = () => {
    if (selectedGenre === "前期総会教室予約") {
      const title = "前期総会の教室予約について(川内テニスクラブ)";
      const body = `${advisorName} 先生

お世話になっております。
川内テニスクラブ 第${currentGeneration}期 ${userRole} の ${userName} です。

前期総会の教室予約につきましてご連絡いたしました。

前期総会について
日程：${eventDate}(${eventDay}) ${startTime}~${endTime}
場所：${location}
※予備日は ${subDate}(${subDay}) となります。

本年度も、監督の ${directorName} さんには当日ご同席いただき、安全管理等の注意喚起をいただく予定です。

上記のイベントの会場予約にあたり、学務情報システムの申請フォームへ顧問である ${advisorName} 先生の情報を以下の通り記載したく、内容のご確認をお願い申し上げます。

1. 顧問教員氏名 ${advisorName}
2. 顧問教員の所属 ${advisorAffiliation}
3. 顧問教員の電話番号(原則として研究室の電話番号) ${advisorPhone}

また、上記の情報を実際にGoogleフォームに記載した下書きの画像を以下に記載しておりますので、合わせてご確認のほどよろしくお願いいたします。

お忙しいところ恐縮ですが、何卒よろしくお願い申し上げます。

第${currentGeneration}期 ${userRole} ${userName}`;

      setMailTitle(title);
      setMailBody(body);
      showToast("success", "テンプレートを生成しました！下のテキストボックスで微調整できます。");
    }
  };

  // 💾 下書き保存
  const saveDraft = async () => {
    if (!mailTitle.trim() || !mailBody.trim()) {
      showToast("error", "件名と本文が空の時は下書き保存できません。");
      return;
    }
    setIsLoading(true);

    const draftData = {
      title: mailTitle,
      body: mailBody,
      generation: currentGeneration,
      genre: selectedGenre,
      role: [selectedRole],
    };

    try {
      if (currentDraftId) {
        const { error } = await supabase
          .from("emails")
          .update(draftData)
          .eq("id", currentDraftId);
        if (error) throw error;
        showToast("success", "下書きを上書き更新しました！");
      } else {
        const { data, error } = await supabase
          .from("emails")
          .insert([draftData])
          .select();
        if (error) throw error;
        if (data && data[0]) {
          setCurrentDraftId(data[0].id);
        }
        showToast("success", "下書きを新しく保存しました！");
      }
      fetchDrafts();
    } catch (err: any) {
      showToast("error", `下書き保存に失敗しました: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // 📝 下書きを読み込む
  const loadDraft = (draft: DraftEmail) => {
    setMailTitle(draft.title);
    setMailBody(draft.body);
    setCurrentDraftId(draft.id || null);
    setSelectedGenre(draft.genre);
    if (Array.isArray(draft.role)) {
        setSelectedRole(draft.role[0] || "");
    } else {
        setSelectedRole(draft.role || "");
    }
    showToast("success", "下書きを編集エリアに読み込みました。");
  };

  // 🗑️ 下書き削除
  const deleteDraft = async (id: number) => {
    if (!confirm("この下書きを削除してもよろしいですか？")) return;
    try {
      const { error } = await supabase.from("emails").delete().eq("id", id);
      if (error) throw error;
      showToast("success", "下書きを削除しました。");
      if (currentDraftId === id) {
        setCurrentDraftId(null);
        setMailTitle("");
        setMailBody("");
      }
      fetchDrafts();
    } catch (err: any) {
      showToast("error", `削除失敗: ${err.message}`);
    }
  };

  const handleSendMail = () => {
    if (!mailTitle || !mailBody) {
      showToast("error", "送信する内容がありません。");
      return;
    }
    alert("🚀 送信済みとして記録します！\n\n（※今後ここにGoogle Drive APIを接続し、自動で書類やログとして保存する処理を組み込みます）");
    setMailTitle("");
    setMailBody("");
    setCurrentDraftId(null);
  };

  return (
    <div className="p-4 max-w-md mx-auto md:max-w-7xl bg-slate-950 min-h-screen text-slate-100 pt-20">
      
      {message && (
        <div className={`fixed top-24 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-bold shadow-2xl ${
          message.type === "success" ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : "bg-red-500/20 text-red-400 border-red-500/30"
        }`}>
          {message.type === "success" ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span>{message.text}</span>
        </div>
      )}

      <div className="flex items-center gap-2 mb-6 border-b border-slate-800 pb-3">
        <Mail className="w-6 h-6 text-purple-400" />
        <div>
          <h1 className="text-xl font-bold">メール作成・管理</h1>
          <p className="text-xs text-slate-500">
            ベース稼働期: <span className="text-purple-400 font-mono font-bold">第 {currentGeneration} 期</span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        <div className="lg:col-span-2 space-y-6">
          
          {/* STEP 1: 変数入力フォーム */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-slate-800">
              <FileText className="w-3.5 h-3.5 text-purple-400" /> 1. テンプレート変数入力
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">メールジャンル</label>
                <select value={selectedGenre} onChange={(e) => setSelectedGenre(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-purple-500">
                  <option value="前期総会教室予約">前期総会教室予約</option>
                  <option value="通常練習連絡 (未実装)">通常練習連絡 (テンプレ未追加)</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">宛先 (自動でマスターからデータが引き抜かれます)</label>
                <select value={selectedRole} onChange={(e) => setSelectedRole(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-purple-400 font-bold border-purple-500/30 focus:outline-none focus:border-purple-500">
                  {roles.length === 0 ? (
                    <option value="">設定タブで外部連絡先を登録してください</option>
                  ) : (
                    roles.map((r, i) => <option key={i} value={r}>{r}</option>)
                  )}
                </select>
              </div>
            </div>

            {/* あなたの情報 */}
            <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800/80 grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-purple-400 mb-1">あなたの役職（自動反映）</label>
                <input type="text" value={userRole} onChange={(e) => setUserRole(e.target.value)} placeholder="例: キャプテン" className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-purple-400 mb-1">あなたの名前（自動反映）</label>
                <input type="text" value={userName} onChange={(e) => setUserName(e.target.value)} placeholder="例: 山田太郎" className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs" />
              </div>
            </div>

            {/* 日時・場所の情報 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">日程 (日付)</label>
                <input type="text" value={eventDate} onChange={(e) => setEventDate(e.target.value)} placeholder="7月10日" className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs" />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">曜日</label>
                <input type="text" value={eventDay} onChange={(e) => setEventDay(e.target.value)} placeholder="金" className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs" />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">開始時間</label>
                <input type="text" value={startTime} onChange={(e) => setStartTime(e.target.value)} placeholder="13:00" className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs" />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">終了時間</label>
                <input type="text" value={endTime} onChange={(e) => setEndTime(e.target.value)} placeholder="15:00" className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-1">
                <label className="block text-[11px] text-slate-400 mb-1">場所</label>
                <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="川内サブレク室" className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs" />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">予備日 (日付)</label>
                <input type="text" value={subDate} onChange={(e) => setSubDate(e.target.value)} placeholder="7月17日" className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs" />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">予備日 曜日</label>
                <input type="text" value={subDay} onChange={(e) => setSubDay(e.target.value)} placeholder="金" className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs" />
              </div>
            </div>

            {/* 顧問・監督の情報 (自動入力) */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t border-slate-800/50">
              <div>
                <label className="block text-[11px] text-indigo-400 font-bold mb-1">宛先の氏名</label>
                <input type="text" value={advisorName} onChange={(e) => setAdvisorName(e.target.value)} placeholder="自動抽出されます" className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200" />
              </div>
              <div>
                <label className="block text-[11px] text-indigo-400 font-bold mb-1">宛先の所属</label>
                <input type="text" value={advisorAffiliation} onChange={(e) => setAdvisorAffiliation(e.target.value)} placeholder="自動抽出されます" className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200" />
              </div>
              <div>
                <label className="block text-[11px] text-indigo-400 font-bold mb-1">宛先の電話番号</label>
                <input type="text" value={advisorPhone} onChange={(e) => setAdvisorPhone(e.target.value)} placeholder="自動抽出されます" className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200" />
              </div>
              <div>
                <label className="block text-[11px] text-indigo-400 font-bold mb-1">監督の氏名</label>
                <input type="text" value={directorName} onChange={(e) => setDirectorName(e.target.value)} placeholder="自動抽出されます" className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200" />
              </div>
            </div>

            <div className="text-right pt-2">
              <button type="button" onClick={generateTemplate} className="bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold px-4 py-2 rounded-lg cursor-pointer transition-all">
                ✨ テンプレートから本文を自動生成
              </button>
            </div>
          </div>

          {/* STEP 2: テキストエディタ＆下書き操作 */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-800">
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-indigo-400" /> 2. メール内容の編集・保存
              </h2>
              {currentDraftId && (
                <span className="bg-purple-500/20 text-purple-400 text-[10px] font-bold px-2 py-0.5 rounded border border-purple-500/30">
                  編集中の下書きID: {currentDraftId}
                </span>
              )}
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 mb-1">件名 (Title)</label>
              <input type="text" value={mailTitle} onChange={(e) => setMailTitle(e.target.value)} placeholder="ここに件名が入ります" className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500" />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 mb-1">本文 (Body)</label>
              <textarea rows={12} value={mailBody} onChange={(e) => setMailBody(e.target.value)} placeholder="ここに自動生成された文章が入ります。自由に手動編集可能です。" className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 leading-relaxed font-mono" />
            </div>

            <div className="flex justify-between items-center pt-2">
              <button type="button" onClick={() => { setCurrentDraftId(null); setMailTitle(""); setMailBody(""); }} className="text-xs text-slate-400 hover:text-slate-200 font-bold">
                クリア
              </button>
              <div className="flex gap-2">
                <button type="button" onClick={saveDraft} disabled={isLoading} className="bg-slate-950 border border-slate-800 hover:bg-slate-800 text-slate-200 font-bold px-4 py-2 text-xs rounded-lg cursor-pointer">
                  {currentDraftId ? "下書きを上書き保存" : "下書きとして新規保存"}
                </button>
                <button type="button" onClick={handleSendMail} className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold px-5 py-2 rounded-lg flex items-center gap-1.5 cursor-pointer shadow-lg shadow-purple-500/10">
                  <Send className="w-3 h-3" /> 送信済みボタン (確定)
                </button>
              </div>
            </div>

            {/* 下書き一覧 */}
            <div className="mt-6 pt-4 border-t border-slate-800/60 space-y-2">
              <h3 className="text-[11px] font-bold text-slate-400">📁 保存中の下書き一覧 ({drafts.length}件)</h3>
              {drafts.length === 0 ? (
                <p className="text-[11px] text-slate-600 italic">保存された下書きはありません。</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                  {drafts.map((d) => (
                    <div key={d.id} className="bg-slate-950 border border-slate-800 p-2 rounded flex items-center justify-between gap-2 text-xs">
                      <div className="truncate pr-2">
                        <p className="font-bold text-slate-300 truncate text-[11px]">{d.title}</p>
                        <p className="text-[10px] text-slate-500">{d.genre} / {d.role}</p>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <button onClick={() => loadDraft(d)} className="p-1 text-indigo-400 hover:bg-slate-900 rounded cursor-pointer" title="下書きを読み込んで編集"><Edit3 className="w-3.5 h-3.5" /></button>
                        <button onClick={() => deleteDraft(d.id!)} className="p-1 text-red-400 hover:bg-slate-900 rounded cursor-pointer" title="削除"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

        </div>

        {/* 過去メールの検索 */}
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl space-y-4">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-slate-800">
              <Search className="w-3.5 h-3.5 text-purple-400" /> 🔍 過去メールの検索
            </h2>
            
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] text-slate-500 mb-1">期で検索</label>
                <input type="number" value={searchGen} onChange={(e) => setSearchGen(e.target.value)} placeholder="例: 21" className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-xs focus:outline-none" />
              </div>
              <div>
                <label className="block text-[11px] text-slate-500 mb-1">ジャンルで検索</label>
                <select value={searchGenre} onChange={(e) => setSearchGenre(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-xs focus:outline-none">
                  <option value="">すべて</option>
                  <option value="前期総会教室予約">前期総会教室予約</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] text-slate-500 mb-1">役職で検索</label>
                <select value={searchRole} onChange={(e) => setSearchRole(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-xs focus:outline-none">
                  <option value="">すべて</option>
                  {roles.map((r, i) => <option key={i} value={r}>{r}</option>)}
                </select>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-800/60">
              <h3 className="text-[11px] font-bold text-slate-400 mb-2">該当する過去メール一覧</h3>
              
              <div className="bg-slate-950/40 border border-slate-800/60 p-4 rounded-lg text-center">
                <p className="text-xs text-slate-500 leading-relaxed">
                  送信済みメールをGoogle Drive等へ集約・連携させた後、ここに過去の確定メールが（期、ジャンルごとに）一覧表示され、いつでも閲覧できるようになります！
                </p>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}