"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/supabase";
import { createKakomonSubject, uploadKakomonFile, deleteKakomonFile } from "@/actions/kakomonActions"; // 👈 deleteKakomonFileを追加
import { Search, Plus, GraduationCap, School, BookOpen, User, Calendar, Clock, FileText, Download, Upload, AlertCircle, Trash2 } from "lucide-react"; // 👈 Trash2を追加

// 東北大の学部・学科データ
const FACULTY_DATA: { [key: string]: string[] } = {
  "文学部": [], "教育学部": [], "法学部": [], "経済学部": [],
  "理学部": ["数学科", "物理学科", "宇宙地球物理学科", "化学科", "地圏環境科学科", "地球惑星物質科学科", "生物学科"],
  "医学部": ["医学科", "保健学科"], "歯学部": [], "薬学部": [],
  "工学部": ["機械知能・航空工学科", "電気情報物理工学科", "化学・バイオ工学科", "材料科学総合学科", "建築・社会環境工学科"],
  "農学部": []
};

interface SubjectType { id: string; name: string; }
// 💡 created_by を型定義に追加
interface FileType { id: string; name: string; drive_file_id: string; professor: string; year: number; semester: string; created_by: string; }

export default function KakomonPage() {
  const [viewMode, setViewMode] = useState<"search" | "add">("search");
  
  // 共通・検索用ステート
  const [category, setCategory] = useState<"全学" | "専門">("全学");
  const [faculty, setFaculty] = useState("");
  const [department, setDepartment] = useState("");
  const [subjectId, setSubjectId] = useState("");     
  const [professor, setProfessor] = useState("");
  const [year, setYear] = useState("");
  const [semester, setSemester] = useState("");
  
  const [subjects, setSubjects] = useState<SubjectType[]>([]); 
  const [files, setFiles] = useState<FileType[]>([]);         
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [loadingFiles, setLoadingFiles] = useState(false);

  // 🎯 【新規追加モード用】の独立したステート
  const [addMode, setAddMode] = useState<"select_subject" | "create_subject">("select_subject");
  const [newSubjectName, setNewSubjectName] = useState(""); 
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // 💡 ログインユーザー情報・トークン保持用のステート
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);

  // 学部変更時に学科をリセット
  useEffect(() => { setDepartment(""); }, [faculty]);

  // 💡 初期化時および認証状態変更時にユーザー情報を取得・監視する
  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setToken(session.access_token);
        setCurrentUserId(session.user.id);
      }
    };
    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setToken(session?.access_token || null);
      setCurrentUserId(session?.user?.id || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Supabaseから科目一覧を取得（検索・追加の両方で使用）
  const fetchSubjects = async () => {
    setLoadingSubjects(true);
    let query = supabase.from("kakomon_subjects").select("id, name").eq("category", category);
    if (category === "専門") {
      if (faculty) query = query.eq("faculty", faculty);
      if (department) query = query.eq("department", department);
    }
    const { data } = await query;
    setSubjects(data || []);
    setLoadingSubjects(false);
  };

  useEffect(() => { fetchSubjects(); }, [category, faculty, department]);

  // 🔍 過去問検索処理 (削除後に再利用できるよう e をオプショナルに修正)
  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!subjectId) return alert("科目を選択してください");
    setLoadingFiles(true);
    
    // 💡 created_by も検索対象に含めるように修正
    let query = supabase.from("kakomon_files").select("id, name, drive_file_id, professor, year, semester, created_by").eq("subject_id", subjectId);
    if (professor) query = query.eq("professor", professor);
    if (year) query = query.eq("year", parseInt(year));
    if (semester) query = query.eq("semester", semester);
    const { data } = await query;
    setFiles(data || []);
    setLoadingFiles(false);
  };

  // 🗑️ 過去問削除処理
  const handleDelete = async (fileId: string, driveFileId: string) => {
    if (!confirm("本当にこの過去問資料を削除しますか？\nデータベースおよびGoogleドライブから完全に削除されます。")) return;
    if (!token) return alert("認証トークンがありません。再ログインしてください。");

    try {
      const res = await deleteKakomonFile(fileId, driveFileId, token);
      if (res.success) {
        if (res.warning) {
          alert(`⚠️ ${res.warning}`);
        } else {
          alert("🗑️ 過去問資料を削除しました。");
        }
        handleSearch(); // 一覧を再読み込みして最新化
      } else {
        alert(`❌ 削除に失敗しました: ${res.error}`);
      }
    } catch (err: any) {
      alert(`❌ エラーが発生しました: ${err.message}`);
    }
  };

  // ➕ 過去問アップロード処理（Drive ＆ Supabase連動）
  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) return alert("ファイルを選択してください");
    if (!year || !semester) return alert("年度と学期を入力してください");

    setIsUploading(true);
    let targetSubjectId = subjectId;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      // 新しい科目を作る場合
      if (addMode === "create_subject") {
        if (!newSubjectName.trim()) throw new Error("新しい科目名を入力してください");
        
        const res = await createKakomonSubject({
          category,
          faculty: category === "専門" ? faculty : undefined,
          department: category === "専門" ? department : undefined,
          name: newSubjectName.trim()
        });
        
        if (!res.success || !res.data) throw new Error(res.error || "科目の作成に失敗しました");
        targetSubjectId = res.data.id;
      }

      if (!targetSubjectId) throw new Error("科目が指定されていません");

      // ファイルアップロードの実行
      const formData = new FormData();
      formData.append("file", uploadFile);

      const fileRes = await uploadKakomonFile(
        formData, 
        targetSubjectId, 
        {
          professor: professor.trim(),
          year: parseInt(year),
          semester: semester
        },
        token
      );

      if (!fileRes.success) throw new Error(fileRes.error || "ファイルのアップロードに失敗しました");

      alert("🎉 過去問のアップロードに成功しました！Google DriveとSupabaseに保存されました。");
      
      // フォームの初期化
      setUploadFile(null);
      setNewSubjectName("");
      await fetchSubjects(); 
      setViewMode("search"); 
    } catch (err: any) {
      alert(`❌ エラー: ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* ヘッダーエリア */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-emerald-400" /> 過去問ライブラリ
            </h1>
            <p className="text-xs text-slate-400 mt-1">Google Driveと完全同期中</p>
          </div>

          <div className="flex p-1 bg-slate-900 rounded-xl border border-slate-800">
            <button onClick={() => setViewMode("search")} className={`flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${viewMode === "search" ? "bg-slate-800 text-emerald-400 shadow" : "text-slate-400"}`}>
              <Search className="w-3.5 h-3.5" /> 検索・閲覧
            </button>
            <button onClick={() => setViewMode("add")} className={`flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${viewMode === "add" ? "bg-slate-800 text-emerald-400 shadow" : "text-slate-400"}`}>
              <Plus className="w-3.5 h-3.5" /> 過去問を追加
            </button>
          </div>
        </div>

        {/* 🔍 検索・閲覧モード */}
        {viewMode === "search" ? (
          <div className="space-y-6">
            <form onSubmit={handleSearch} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
              {/* 全学/専門 トグル */}
              <div className="grid grid-cols-2 p-1 bg-slate-950 rounded-xl border border-slate-800 max-w-xs">
                <button type="button" onClick={() => setCategory("全学")} className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${category === "全学" ? "bg-slate-800 text-emerald-400 shadow" : "text-slate-400"}`}>全学教育</button>
                <button type="button" onClick={() => setCategory("専門")} className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${category === "専門" ? "bg-slate-800 text-emerald-400 shadow" : "text-slate-400"}`}>専門科目</button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {category === "専門" && (
                  <>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 mb-1 flex items-center gap-1"><School className="w-3 h-3" /> 学部</label>
                      <select value={faculty} onChange={(e) => setFaculty(e.target.value)} className="w-full h-10 bg-slate-950 border border-slate-800 rounded-lg px-2 text-slate-200 text-sm focus:outline-none focus:border-emerald-500 cursor-pointer">
                        <option value="">学部を選択してください</option>
                        {Object.keys(FACULTY_DATA).map((f) => <option key={f} value={f}>{f}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 mb-1 flex items-center gap-1"><School className="w-3 h-3" /> 学科</label>
                      <select value={department} onChange={(e) => setDepartment(e.target.value)} disabled={!faculty || FACULTY_DATA[faculty]?.length === 0} className="w-full h-10 bg-slate-950 border border-slate-800 rounded-lg px-2 text-slate-200 text-sm focus:outline-none focus:border-emerald-500 cursor-pointer disabled:opacity-50">
                        <option value="">{faculty && FACULTY_DATA[faculty]?.length === 0 ? "学科なし" : "学科を選択してください"}</option>
                        {faculty && FACULTY_DATA[faculty].map((d) => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>
                  </>
                )}

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-400 mb-1 flex items-center gap-1"><BookOpen className="w-3 h-3" /> 科目名（授業名）</label>
                  <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} disabled={loadingSubjects} className="w-full h-10 bg-slate-950 border border-slate-800 rounded-lg px-2 text-slate-200 text-sm focus:outline-none focus:border-emerald-500 cursor-pointer" required>
                    <option value="">{loadingSubjects ? "科目を読み込み中..." : "科目を選択してください"}</option>
                    {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1 flex items-center gap-1"><User className="w-3 h-3" /> 担当教授</label>
                  <input type="text" placeholder="例: 鈴木教授 (任意)" value={professor} onChange={(e) => setProfessor(e.target.value)} className="w-full h-10 bg-slate-950 border border-slate-800 rounded-lg px-3 text-slate-200 text-sm focus:outline-none focus:border-emerald-500" />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div><label className="block text-xs font-bold text-slate-400 mb-1 flex items-center gap-1"><Calendar className="w-3 h-3" /> 年度</label>
                    <input type="number" placeholder="2026" value={year} onChange={(e) => setYear(e.target.value)} className="w-full h-10 bg-slate-950 border border-slate-800 rounded-lg px-3 text-slate-200 text-sm focus:outline-none focus:border-emerald-500" />
                  </div>
                  <div><label className="block text-xs font-bold text-slate-400 mb-1 flex items-center gap-1"><Clock className="w-3 h-3" /> 学期</label>
                    <select value={semester} onChange={(e) => setSemester(e.target.value)} className="w-full h-10 bg-slate-950 border border-slate-800 rounded-lg px-2 text-slate-200 text-sm focus:outline-none focus:border-emerald-500 cursor-pointer">
                      <option value="">すべて</option><option value="前期">前期</option><option value="後期">後期</option><option value="中間">中間</option><option value="期末">期末</option>
                    </select>
                  </div>
                </div>
              </div>

              <button type="submit" disabled={loadingFiles} className="w-full h-10 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 text-xs shadow-lg shadow-emerald-500/10 cursor-pointer mt-4">
                <Search className="w-4 h-4" /> {loadingFiles ? "検索中..." : "過去問を検索する"}
              </button>
            </form>

            {/* 📁 結果一覧 */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
              <h3 className="text-xs font-bold text-slate-400 flex items-center gap-1.5 px-1 mb-4"><FileText className="w-3.5 h-3.5 text-emerald-400" /> 検索結果一覧</h3>
              {files.length === 0 ? (
                <div className="text-center text-xs text-slate-500 py-12 border border-dashed border-slate-800 rounded-xl">条件に一致する過去問ファイルがありません。</div>
              ) : (
                <div className="border border-slate-800 rounded-xl overflow-hidden text-sm bg-slate-950">
                  {/* 💡 操作欄とファイル名のグリッド比率を調整 (5:3:2:2 ➔ 4:3:2:3) */}
                  <div className="grid grid-cols-12 bg-slate-900 p-3 text-xs font-bold text-slate-400 border-b border-slate-800">
                    <div className="col-span-4">ファイル名</div><div className="col-span-3">担当教授</div><div className="col-span-2">年度/学期</div><div className="col-span-3 text-center">操作</div>
                  </div>
                  {files.map((file) => (
                    <div key={file.id} className="grid grid-cols-12 p-3 border-b border-slate-900 items-center text-xs hover:bg-slate-900/50">
                      <div className="col-span-4 font-medium text-slate-200 truncate flex items-center gap-2"><FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />{file.name}</div>
                      <div className="col-span-3 text-slate-400">{file.professor || "未登録"}</div>
                      <div className="col-span-2 text-slate-400">{file.year}年 / {file.semester}</div>
                      
                      {/* 💡 操作ボタンエリア。自分が追加したファイルの場合のみ、開くボタンの横に削除ボタンが出現します */}
                      <div className="col-span-3 flex justify-center gap-1.5">
                        <a href={`/api/kakomon/download?id=${file.drive_file_id}`} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-1 bg-slate-800 hover:bg-slate-700 text-emerald-400 font-bold px-2.5 py-1.5 rounded-md text-[10px] shrink-0">
                          <Download className="w-3 h-3" /> 開く
                        </a>
                        {file.created_by === currentUserId && (
                          <button
                            type="button"
                            onClick={() => handleDelete(file.id, file.drive_file_id)}
                            className="flex items-center justify-center gap-1 bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 border border-rose-900/30 font-bold px-2.5 py-1.5 rounded-md text-[10px] shrink-0 cursor-pointer transition-colors"
                          >
                            <Trash2 className="w-3 h-3" /> 削除
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* =========================================================
             ➕ 過去問を追加モード
             ========================================================= */
          <form onSubmit={handleUpload} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-xl">
            <h2 className="text-sm font-bold text-emerald-400 flex items-center gap-1.5"><Upload className="w-4 h-4" /> 過去問資料の新規アップロード</h2>

            {/* 1. 分類選択 */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-400 px-1">1. 過去問の分類を選択</label>
              <div className="grid grid-cols-2 p-1 bg-slate-950 rounded-xl border border-slate-800 max-w-xs">
                <button type="button" onClick={() => setCategory("全学")} className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${category === "全学" ? "bg-slate-800 text-emerald-400 shadow" : "text-slate-400"}`}>全学教育</button>
                <button type="button" onClick={() => setCategory("専門")} className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${category === "専門" ? "bg-slate-800 text-emerald-400 shadow" : "text-slate-400"}`}>専門科目</button>
              </div>
            </div>

            {/* 2. 学部・学科選択（専門の場合のみ） */}
            {category === "専門" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-l-2 border-slate-800 pl-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1 flex items-center gap-1"><School className="w-3 h-3" /> 学部</label>
                  <select value={faculty} onChange={(e) => setFaculty(e.target.value)} className="w-full h-10 bg-slate-950 border border-slate-800 rounded-lg px-2 text-slate-200 text-sm focus:outline-none focus:border-emerald-500 cursor-pointer" required>
                    <option value="">学部を選択してください</option>
                    {Object.keys(FACULTY_DATA).map((f) => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1 flex items-center gap-1"><School className="w-3 h-3" /> 学科</label>
                  <select value={department} onChange={(e) => setDepartment(e.target.value)} disabled={!faculty || FACULTY_DATA[faculty]?.length === 0} className="w-full h-10 bg-slate-950 border border-slate-800 rounded-lg px-2 text-slate-200 text-sm focus:outline-none focus:border-emerald-500 cursor-pointer disabled:opacity-50">
                    <option value="">{faculty && FACULTY_DATA[faculty]?.length === 0 ? "学科なし" : "学科を選択してください"}</option>
                    {faculty && FACULTY_DATA[faculty].map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              </div>
            )}

            {/* 3. 科目名の選択 or 新規作成トグル */}
            <div className="space-y-3 border-t border-slate-800/60 pt-4">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-400 px-1">2. 科目名の指定</label>
                <div className="flex gap-2 text-[10px] bg-slate-950 p-0.5 rounded-lg border border-slate-800">
                  <button type="button" onClick={() => setAddMode("select_subject")} className={`px-2 py-1 rounded-md font-bold cursor-pointer ${addMode === "select_subject" ? "bg-slate-800 text-emerald-400" : "text-slate-500"}`}>既存から選択</button>
                  <button type="button" onClick={() => setAddMode("create_subject")} className={`px-2 py-1 rounded-md font-bold cursor-pointer ${addMode === "create_subject" ? "bg-slate-800 text-purple-400" : "text-slate-500"}`}>➕ 新しい科目を追加</button>
                </div>
              </div>

              {addMode === "select_subject" ? (
                <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} disabled={loadingSubjects} className="w-full h-10 bg-slate-950 border border-slate-800 rounded-lg px-2 text-slate-200 text-sm focus:outline-none focus:border-emerald-500 cursor-pointer" required>
                  <option value="">{loadingSubjects ? "科目を読み込み中..." : "アップロード先の科目を選択してください"}</option>
                  {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              ) : (
                <div className="space-y-1 bg-purple-950/20 border border-purple-900/40 p-4 rounded-xl">
                  <span className="text-[10px] font-bold text-purple-400 bg-purple-900/40 px-2 py-0.5 rounded-md flex items-center gap-1 w-max mb-2"><AlertCircle className="w-3 h-3"/> 初めて登録する科目</span>
                  <input type="text" placeholder="例: 線形代数学A (Google Driveに自動でフォルダが作られます)" value={newSubjectName} onChange={(e) => setNewSubjectName(e.target.value)} className="w-full h-10 bg-slate-950 border border-purple-800 rounded-lg px-3 text-slate-200 text-sm focus:outline-none focus:border-purple-500" required />
                </div>
              )}
            </div>

            {/* 4. メタデータ ＆ ファイル選択 */}
            <div className="space-y-4 border-t border-slate-800/60 pt-4">
              <label className="block text-xs font-bold text-slate-400 px-1">3. ファイルと詳細情報の入力</label>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1 px-1">担当教授</label>
                  <input type="text" placeholder="鈴木教授" value={professor} onChange={(e) => setProfessor(e.target.value)} className="w-full h-10 bg-slate-950 border border-slate-800 rounded-lg px-3 text-slate-200 text-sm focus:outline-none focus:border-emerald-500" />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1 px-1">試験実施年度</label>
                  <input type="number" placeholder="2025" value={year} onChange={(e) => setYear(e.target.value)} className="w-full h-10 bg-slate-950 border border-slate-800 rounded-lg px-3 text-slate-200 text-sm focus:outline-none focus:border-emerald-500" required />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1 px-1">学期・試験の種類</label>
                  <select value={semester} onChange={(e) => setSemester(e.target.value)} className="w-full h-10 bg-slate-950 border border-slate-800 rounded-lg px-2 text-slate-200 text-sm focus:outline-none focus:border-emerald-500 cursor-pointer" required>
                    <option value="">選択...</option><option value="前期">前期</option><option value="後期">後期</option><option value="中間">中間</option><option value="期末">期末</option>
                  </select>
                </div>
              </div>

              {/* 本物のファイル選択UI */}
              <div className="border-2 border-dashed border-slate-800 hover:border-slate-700 bg-slate-950 rounded-xl p-6 text-center transition-colors relative">
                <input type="file" accept=".pdf,.doc,.docx,.png,.jpg" onChange={(e) => setUploadFile(e.target.files?.[0] || null)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" required />
                <div className="space-y-1">
                  <Upload className="w-6 h-6 text-slate-500 mx-auto" />
                  <p className="text-xs text-slate-300 font-bold">{uploadFile ? `選択中: ${uploadFile.name}` : "クリックして過去問ファイルを選択"}</p>
                  <p className="text-[10px] text-slate-500">PDF, Word, 画像（最大10MB）</p>
                </div>
              </div>
            </div>

            {/* 送信ボタン */}
            <button type="submit" disabled={isUploading} className="w-full h-10 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 text-xs shadow-lg shadow-emerald-500/10 cursor-pointer">
              <Upload className="w-4 h-4" />
              {isUploading ? "Google Driveに通信中 & 保存中..." : "この内容で過去問を登録する"}
            </button>
          </form>
        )}

      </div>
    </div>
  );
}