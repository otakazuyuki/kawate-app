"use client";

import { useState, useEffect } from "react";
import { 
  Settings, Users, ShieldAlert, Contact, RefreshCw, 
  Plus, Trash2, Check, AlertCircle, Save 
} from "lucide-react";
// ※ プロジェクトのインポートパスに合わせて適宜調整してください
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function SettingPage() {
  const [activeTab, setActiveTab] = useState<"member" | "officer" | "contact" | "generation">("member");
  const [currentGeneration, setCurrentGeneration] = useState(21); // デフォルト
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // --- 1. 部員名簿用ステート ---
  const memberHeaders = ["学籍番号", "名前", "フリガナ", "性別", "メールアドレス", "電話番号", "学部学科", "学年", "テニス経験"];
  const [memberGrid, setMemberGrid] = useState<string[][]>(Array(5).fill(null).map(() => Array(9).fill("")));

  // --- 2. 役員名簿用ステート ---
  const [officerTargetGen, setOfficerTargetGen] = useState(21);
  const [officerRoles, setOfficerRoles] = useState<string[]>(["キャプテン", "副キャプテン", "女子キャプテン", "会計帳簿","会計補佐","ボール係","コート係","記録係","保健係","パンフレット係"]);
  const [newRoleInput, setNewRoleInput] = useState("");
  const [officerGrid, setOfficerGrid] = useState<string[][]>(
    ["キャプテン", "副キャプテン", "女子キャプテン", "会計"].map(role => [role, "", "", ""])
  );

  // --- 3. 外部連絡先用ステート ---
  const contactHeaders = ["役職(顧問など)", "名前", "所属", "メールアドレス", "電話番号", "期(OBの代など)"];
  const [contactGrid, setContactGrid] = useState<string[][]>(Array(5).fill(null).map(() => ["", "", "", "", "", ""]));

  // 📥 🌟【新しく追加】部員データをSupabaseから全件取得してグリッドにセットする関数
  const fetchAllMembers = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("student_number", { ascending: true });

    if (error) {
      console.error("部員データ取得失敗:", error);
      return;
    }

    if (data && data.length > 0) {
      setMemberGrid(data.map(d => [
        d.student_number || "",
        d.name || "",
        d.name_kana || "",
        d.gender || "",
        d.email || "",
        d.phone_number || "",
        d.department || "",
        d.grade ? String(d.grade) : "",
        d.experience || ""
      ]));
    } else {
      // データがない場合は空の5行を表示
      setMemberGrid(Array(5).fill(null).map(() => Array(9).fill("")));
    }
  };

  // 👑 役員データをSupabaseから取得する関数
  const fetchOfficersForGen = async (gen: number) => {
    const { data, error } = await supabase
      .from("officers")
      .select("*")
      .eq("generation", gen);

    if (error) {
      console.error("役員データ取得失敗:", error);
      return;
    }

    if (data && data.length > 0) {
      const roles = data.map(d => d.role);
      setOfficerRoles(roles);
      setOfficerGrid(data.map(d => [d.role, d.name || "", d.email || "", d.phone_number || ""]));
    } else {
      const defaultRoles = ["主将", "副主将", "女子キャプテン", "会計帳簿","会計補佐","ボール係","コート係","記録係","保健係","パンフレット係"];
      setOfficerRoles(defaultRoles);
      setOfficerGrid(defaultRoles.map(role => [role, "", "", ""]));
    }
  };

  // 🔔 画面起動時の初期データ読込（マウント時に1回だけ実行）
  useEffect(() => {
    // 1. localStorageから保存された期を読み出す
    const savedGen = localStorage.getItem("current_generation");
    let targetGen = 21; // デフォルト値

    if (savedGen) {
      const genNum = parseInt(savedGen, 10);
      targetGen = genNum;
      setCurrentGeneration(genNum);
      setOfficerTargetGen(genNum);
    }

    // 2. 登録されている部員データを自動で引っ張ってくる！
    fetchAllMembers();

    // 3. 役員名簿を呼び出す
    fetchOfficersForGen(targetGen);

    // 4. 連絡先の読込
    fetchAllContacts();
  }, []);

  // 🔔 ユーザーが手動で編集対象の「期」を切り替えた時に自動で読込
  useEffect(() => {
    fetchOfficersForGen(officerTargetGen);
  }, [officerTargetGen]);

  // トーストメッセージ表示
  const showToast = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  // Excel風ペースト処理
  const handleGridPaste = (
    e: React.ClipboardEvent, 
    grid: string[][], 
    setGrid: React.Dispatch<React.SetStateAction<string[][]>>, 
    colCount: number,
    isOfficer = false
  ) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData("text");
    if (!pasteData) return;

    const lines = pasteData.split("\n").filter(line => line.trim() !== "");
    const pastedRows = lines.map(line => line.split("\t").map(cell => cell.trim()));

    const updated = [...grid];
    pastedRows.forEach((pRow, rIdx) => {
      if (rIdx >= updated.length) {
        if (!isOfficer) updated.push(Array(colCount).fill(""));
        else return;
      }
      pRow.forEach((cell, cIdx) => {
        if (isOfficer) {
          if (cIdx + 1 < 4) updated[rIdx][cIdx + 1] = cell;
        } else {
          if (cIdx < colCount) updated[rIdx][cIdx] = cell;
        }
      });
    });
    setGrid(updated);
  };

  // ==========================================
  // 📥 1. 部員名簿の一括登録 (profiles)
  // ==========================================
  const saveMembers = async () => {
    setIsLoading(true);
    const validRows = memberGrid.filter(row => row[0].trim() !== "" && row[4].trim() !== "");
    
    if (validRows.length === 0) {
      showToast("error", "学籍番号とメールアドレスが入力されている行がありません。");
      setIsLoading(false);
      return;
    }

    try {
      const { error: deleteError } = await supabase
        .from("profiles")
        .delete()
        .neq("student_number", "");

      if (deleteError) throw deleteError;

      const insertData = validRows.map(row => ({
        student_number: row[0],
        name: row[1],
        name_kana: row[2],
        gender: row[3],
        email: row[4],
        phone_number: row[5],
        department: row[6],
        grade: row[7] ? parseInt(row[7], 10) : null,
        experience: row[8],
      }));

      const { error: insertError } = await supabase.from("profiles").insert(insertData);
      if (insertError) throw insertError;

      showToast("success", `既存の名簿を全削除し、新しく ${insertData.length} 名の部員データを登録しました！`);
      // 🌟 再度Supabaseから取得し直して画面を最新状態にする
      fetchAllMembers();
    } catch (error: any) {
      showToast("error", `処理に失敗しました: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // ==========================================
  // 👑 2. 役員名簿の上書き保存 (officers)
  // ==========================================
  const saveOfficers = async () => {
    setIsLoading(true);
    const validRows = officerGrid.filter(row => row[1].trim() !== "");

    try {
      const { error: deleteError } = await supabase
        .from("officers")
        .delete()
        .eq("generation", officerTargetGen);

      if (deleteError) throw deleteError;

      if (validRows.length > 0) {
        const insertData = validRows.map(row => ({
          generation: officerTargetGen,
          role: row[0],
          name: row[1],
          email: row[2] || null,
          phone_number: row[3] || null
        }));

        const { error: insertError } = await supabase.from("officers").insert(insertData);
        if (insertError) throw insertError;
      }

      showToast("success", `第 ${officerTargetGen} 期の役員データを更新しました！`);
      fetchOfficersForGen(officerTargetGen);
    } catch (error: any) {
      showToast("error", `保存失敗: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // ==========================================
  // 📞 3. 外部連絡先の全件取得と一括上書き保存 (contacts)
  // ==========================================
  const fetchAllContacts = async () => {
    const { data, error } = await supabase
      .from("contacts")
      .select("*")
      .order("id", { ascending: true });

    if (error) {
      console.error("連絡先データ取得失敗:", error);
      return;
    }

    if (data && data.length > 0) {
      setContactGrid(data.map(d => [
        d.role || "", 
        d.name || "", 
        d.affiliation || "", 
        d.email || "", 
        d.phone_number || "", 
        d.generation ? String(d.generation) : ""
      ]));
    } else {
      setContactGrid(Array(5).fill(null).map(() => ["", "", "", "", "", ""]));
    }
  };

  const saveContacts = async () => {
    setIsLoading(true);
    const validRows = contactGrid.filter(row => row[1].trim() !== "");

    try {
      const { error: deleteError } = await supabase
        .from("contacts")
        .delete()
        .neq("name", "");

      if (deleteError) throw deleteError;

      if (validRows.length > 0) {
        const insertData = validRows.map(row => ({
          role: row[0] || null,
          name: row[1],
          affiliation: row[2] || null,
          email: row[3] || null,
          phone_number: row[4] || null,
          generation: row[5] ? parseInt(row[5], 10) : null
        }));

        const { error: insertError } = await supabase.from("contacts").insert(insertData);
        if (insertError) throw insertError;
      }

      showToast("success", "外部連絡先の名簿を一括更新しました！");
      fetchAllContacts();
    } catch (error: any) {
      showToast("error", `保存失敗: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // ==========================================
  // 🔄 4. 代替わり処理
  // ==========================================
  const updateGenerationSetting = (nextGen: number) => {
    setCurrentGeneration(nextGen);
    localStorage.setItem("current_generation", String(nextGen));
    setOfficerTargetGen(nextGen);
    showToast("success", `設定期を 第 ${nextGen} 期 に変更し、ブラウザに共有しました！`);
  };

  const addOfficerRole = () => {
    if (!newRoleInput.trim()) return;
    if (officerRoles.includes(newRoleInput.trim())) return;
    setOfficerRoles([...officerRoles, newRoleInput.trim()]);
    setOfficerGrid([...officerGrid, [newRoleInput.trim(), "", "", ""]]);
    setNewRoleInput("");
  };

  const removeOfficerRole = (roleToRemove: string) => {
    if (!confirm(`役職「${roleToRemove}」をリストから削除しますか？\n（保存ボタンを押すまでSupabaseには反映されません）`)) return;
    
    // 1. 役職のバッジ一覧から除外
    setOfficerRoles(officerRoles.filter(role => role !== roleToRemove));
    // 2. 入力グリッド（表）の行からも除外
    setOfficerGrid(officerGrid.filter(row => row[0] !== roleToRemove));
  };

  return (
    <div className="p-4 max-w-md mx-auto md:max-w-6xl bg-slate-950 min-h-screen text-slate-100 pt-20">
      
      {/* 通知トースト */}
      {message && (
        <div className={`fixed top-24 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-bold shadow-2xl ${
          message.type === "success" ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : "bg-red-500/20 text-red-400 border-red-500/30"
        }`}>
          {message.type === "success" ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span>{message.text}</span>
        </div>
      )}

      {/* ヘッダー */}
      <div className="flex items-center gap-2 mb-6 border-b border-slate-800 pb-3">
        <Settings className="w-6 h-6 text-purple-400" />
        <div>
          <h1 className="text-xl font-bold">システム管理設定</h1>
          <p className="text-xs text-slate-500">現在の稼働フェーズ: <span className="text-purple-400 font-mono font-bold">第 {currentGeneration} 期</span></p>
        </div>
      </div>

      {/* タブメニュー */}
      <div className="flex flex-wrap gap-2 mb-6 bg-slate-900/60 p-1.5 rounded-xl border border-slate-800/60">
        <button onClick={() => setActiveTab("member")} className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${activeTab === "member" ? "bg-purple-500 text-white shadow" : "text-slate-400 hover:text-slate-200"}`}>
          <Users className="w-3.5 h-3.5" /> 1. 部員名簿の一括入替
        </button>
        <button onClick={() => setActiveTab("officer")} className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${activeTab === "officer" ? "bg-purple-500 text-white shadow" : "text-slate-400 hover:text-slate-200"}`}>
          <ShieldAlert className="w-3.5 h-3.5" /> 2. 役員名簿の期別管理
        </button>
        <button onClick={() => setActiveTab("contact")} className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${activeTab === "contact" ? "bg-purple-500 text-white shadow" : "text-slate-400 hover:text-slate-200"}`}>
          <Contact className="w-3.5 h-3.5" /> 3. 外部連絡先の一覧管理
        </button>
        <button onClick={() => setActiveTab("generation")} className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${activeTab === "generation" ? "bg-purple-500 text-white shadow" : "text-slate-400 hover:text-slate-200"}`}>
          <RefreshCw className="w-3.5 h-3.5" /> 4. 代替わり設定
        </button>
      </div>

      {/* コンテンツエリア */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-2xl">
        
        {/* TAB 1: 部員名簿登録 */}
        {activeTab === "member" && (
          <div className="space-y-4">
            <div className="bg-red-500/5 border border-red-500/20 p-3 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
              <div className="text-xs text-slate-400">
                <span className="text-red-400 font-bold">⚠️ 仕様注意:</span> 保存ボタンを押すと、現在登録されている部員データ（`profiles`）は**すべて上書き消去**され、新しく入力したリストのみに完全に入れ替わります。退部した部員のログイン権限を自動剥奪するための仕様です。
              </div>
            </div>

            <div onPaste={(e) => handleGridPaste(e, memberGrid, setMemberGrid, 9)} className="bg-slate-950 border border-slate-800 rounded-lg overflow-auto max-h-[300px]">
              <table className="w-full text-left border-collapse text-xs table-fixed">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/50 text-slate-400 sticky top-0">
                    {memberHeaders.map((h, i) => (
                      <th key={i} className="p-2 w-32 bg-slate-900 font-medium border-r border-slate-800/40">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900/60">
                  {memberGrid.map((row, rIdx) => (
                    <tr key={rIdx} className="hover:bg-slate-900/20">
                      {row.map((cell, cIdx) => (
                        <td key={cIdx} className="p-1 border-r border-slate-900/40">
                          <input type="text" value={cell} 
                            onChange={(e) => {
                              const updated = [...memberGrid];
                              updated[rIdx][cIdx] = e.target.value;
                              setMemberGrid(updated);
                            }}
                            className="w-full bg-transparent px-1 py-1 rounded focus:bg-slate-800 focus:outline-none text-[11px] font-mono" 
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-between items-center pt-2">
              <button onClick={() => setMemberGrid([...memberGrid, Array(9).fill("")])} className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 bg-slate-950 border border-slate-800 px-2 py-1 rounded cursor-pointer">
                <Plus className="w-3 h-3" /> 行を追加
              </button>
              <button onClick={saveMembers} disabled={isLoading} className="bg-red-600 hover:bg-red-500 disabled:bg-slate-800 text-white px-4 py-2 text-xs font-bold rounded-lg flex items-center gap-1.5 cursor-pointer">
                <Save className="w-3.5 h-3.5" /> <span>{isLoading ? "処理中..." : "データを全入替で一括登録"}</span>
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: 役員名簿登録 */}
        {activeTab === "officer" && (
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800/60 pb-3">
              <div>
                <h2 className="text-sm font-bold text-slate-200">👑 役員名簿の期別管理</h2>
                <p className="text-xs text-slate-500 mt-1">期を切り替えると、自動的に該当する代の役員情報をSupabaseから読み込みます。</p>
              </div>
              <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
                <span className="text-xs text-slate-400 font-bold">編集対象の期:</span>
                <input type="number" value={officerTargetGen} onChange={(e) => setOfficerTargetGen(parseInt(e.target.value, 10) || 0)} className="w-14 bg-transparent text-center text-xs text-purple-400 font-bold font-mono focus:outline-none" />
                <span className="text-xs text-slate-400">期</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 items-center bg-slate-950 p-2 rounded-lg border border-slate-800">
              <span className="text-[11px] text-slate-500 font-bold px-1">現在の役職枠:</span>
              {officerRoles.map((role, idx) => (
  <span key={idx} className="bg-slate-900 border border-slate-800 pl-2 pr-1 py-1 rounded text-[11px] text-slate-300 flex items-center gap-1">
    <span>{role}</span>
    {/* ❌ 削除ボタン */}
    <button 
      onClick={() => removeOfficerRole(role)} 
      className="text-slate-500 hover:text-red-400 p-0.5 rounded transition-colors cursor-pointer"
      title={`${role}を削除`}
    >
      <Trash2 className="w-3 h-3" />
    </button>
  </span>
))}
              <div className="flex items-center gap-1 ml-auto">
                <input type="text" value={newRoleInput} onChange={(e) => setNewRoleInput(e.target.value)} placeholder="新しい役職" className="bg-slate-900 border border-slate-800 rounded px-2 py-0.5 text-[11px] focus:outline-none w-24 text-slate-200" />
                <button onClick={addOfficerRole} className="p-1 bg-purple-600 hover:bg-purple-500 rounded text-white cursor-pointer"><Plus className="w-3 h-3" /></button>
              </div>
            </div>

            <div onPaste={(e) => handleGridPaste(e, officerGrid, setOfficerGrid, 4, true)} className="bg-slate-950 border border-slate-800 rounded-lg overflow-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/50 text-slate-400">
                    <th className="p-2 w-36 bg-slate-900 font-medium">役職（固定）</th>
                    <th className="p-2 bg-slate-900 font-medium">氏名</th>
                    <th className="p-2 bg-slate-900 font-medium">メールアドレス</th>
                    <th className="p-2 bg-slate-900 font-medium">電話番号</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900/60">
                  {officerGrid.map((row, rIdx) => (
                    <tr key={rIdx} className="hover:bg-slate-900/20">
                      <td className="p-2 font-bold text-purple-300 bg-purple-500/5 border-r border-slate-900/40 text-[11px]">{row[0]}</td>
                      {Array.from({ length: 3 }).map((_, cIdx) => (
                        <td key={cIdx} className="p-1 border-r border-slate-900/40">
                          <input type="text" value={row[cIdx + 1] || ""} 
                            onChange={(e) => {
                              const updated = [...officerGrid];
                              updated[rIdx][cIdx + 1] = e.target.value;
                              setOfficerGrid(updated);
                            }}
                            className="w-full bg-transparent px-1 py-1 rounded focus:bg-slate-800 focus:outline-none text-[11px]" 
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="text-right">
              <button onClick={saveOfficers} disabled={isLoading} className="bg-purple-500 hover:bg-purple-600 disabled:bg-slate-800 text-white px-4 py-2 text-xs font-bold rounded-lg flex items-center gap-1.5 inline-flex cursor-pointer">
                <Save className="w-3.5 h-3.5" /> <span>{isLoading ? "保存中..." : `第 ${officerTargetGen} 期の情報を上書き保存`}</span>
              </button>
            </div>
          </div>
        )}

        {/* TAB 3: 外部連絡先登録 */}
        {activeTab === "contact" && (
          <div className="space-y-4">
            <div>
              <h2 className="text-sm font-bold text-slate-200">📞 外部連絡先（顧問・監督・OBなど）のマスター管理</h2>
              <p className="text-xs text-slate-500 mt-1">
                全ての外部連絡先を一覧で管理します。一番右の「期」カラムに、その方が「サークルの何期生（OB・OG）か」を自由に入力してください。
              </p>
            </div>

            <div onPaste={(e) => handleGridPaste(e, contactGrid, setContactGrid, 6)} className="bg-slate-950 border border-slate-800 rounded-lg overflow-auto max-h-[300px]">
              <table className="w-full text-left border-collapse text-xs table-fixed">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/50 text-slate-400 sticky top-0">
                    {contactHeaders.map((h, i) => (
                      <th key={i} className={`p-2 bg-slate-900 font-medium border-r border-slate-800/40 ${i === 5 ? "w-40" : "w-32"}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900/60">
                  {contactGrid.map((row, rIdx) => (
                    <tr key={rIdx} className="hover:bg-slate-900/20">
                      {row.map((cell, cIdx) => (
                        <td key={cIdx} className="p-1 border-r border-slate-900/40">
                          <input type="text" value={cell} 
                            onChange={(e) => {
                              const updated = [...contactGrid];
                              updated[rIdx][cIdx] = e.target.value;
                              setContactGrid(updated);
                            }}
                            placeholder={cIdx === 5 ? "例: 15 (任意)" : ""}
                            className="w-full bg-transparent px-1 py-1 rounded focus:bg-slate-800 focus:outline-none text-[11px]" 
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-between items-center pt-2">
              <button onClick={() => setContactGrid([...contactGrid, ["", "", "", "", "", ""]])} className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 bg-slate-950 border border-slate-800 px-2 py-1 rounded cursor-pointer">
                <Plus className="w-3 h-3" /> 行を追加
              </button>
              <button onClick={saveContacts} disabled={isLoading} className="bg-purple-500 hover:bg-purple-600 disabled:bg-slate-800 text-white px-4 py-2 text-xs font-bold rounded-lg flex items-center gap-1.5 cursor-pointer">
                <Save className="w-3.5 h-3.5" /> <span>{isLoading ? "保存中..." : "外部連絡先を全入替で保存"}</span>
              </button>
            </div>
          </div>
        )}

        {/* TAB 4: 代替わり設定 */}
        {activeTab === "generation" && (
          <div className="space-y-6 max-w-xl mx-auto py-4">
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 text-center space-y-4">
              <span className="text-xs text-purple-400 uppercase tracking-widest font-bold block">システム共有 設定期</span>
              <div className="text-5xl font-black font-mono text-white tracking-tight">
                第 <span className="text-purple-400">{currentGeneration}</span> 期
              </div>
              <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                ここで設定された「期」はブラウザに記憶され、メール作成タブなどの別画面でも自動参照されます。
              </p>
            </div>

            <div className="flex gap-4">
              <button 
                onClick={() => {
                  if(currentGeneration <= 1) return;
                  updateGenerationSetting(currentGeneration - 1);
                }}
                className="flex-1 bg-slate-950 border border-slate-800 hover:bg-slate-900 text-slate-300 font-bold py-3 text-xs rounded-xl transition-all cursor-pointer text-center"
              >
                ◀ 1個昔の期に戻す (キャンセル)
              </button>
              
              <button 
                onClick={() => {
                  updateGenerationSetting(currentGeneration + 1);
                }}
                className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold py-3 text-xs rounded-xl shadow-lg shadow-purple-500/10 transition-all cursor-pointer text-center"
              >
                次の代へ引き継ぐ (代替わり) ▶
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}