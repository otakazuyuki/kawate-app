"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/supabase";
import { 
  getMainGenres, 
  getSubGenres, 
  createMainGenre, 
  createSubGenre, 
  deleteMainGenre, 
  deleteSubGenre,
  uploadHikitugiFile,
  searchHikitugiFiles
} from "@/actions/hikitugiActions";
import { 
  Folder, 
  FileText, 
  Search, 
  Plus, 
  Trash2, 
  Lock, 
  Unlock, 
  AlertCircle, 
  User, 
  FolderPlus,
  UploadCloud,
  Layers,
  Download,
  CheckCircle,
  Clock
} from "lucide-react";

interface MainGenre { id: string; ki: number; name: string; }
interface SubGenre { 
  id: string; 
  ki: number; 
  main_genre_id: string; 
  name: string; 
  hikitugi_main_genres?: { name: string } | any;
  is_completed?: boolean;
}
interface HikitugiFile {
  id: string;
  title: string;
  google_drive_file_id: string;
  ki: number;
  role: string;
  memo: string;
  created_at: string;
  is_role_restricted: boolean;
  hikitugi_main_genres?: { name: string };
  hikitugi_sub_genres?: { name: string };
}

export default function HikitugiPage() {
  // --- 認証・メタデータ系の状態 ---
  const [token, setToken] = useState<string | null>(null);
  const [userMeta, setUserMeta] = useState<{ name: string; ki: number; role: string } | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  // --- タブ切り替え ---
  const [activeTab, setActiveTab] = useState<"search" | "manage">("search");

  // --- DBデータ ---
  const [mainGenres, setMainGenres] = useState<MainGenre[]>([]);
  const [subGenres, setSubGenres] = useState<SubGenre[]>([]);
  const [searchResults, setSearchResults] = useState<HikitugiFile[]>([]);
  const [searching, setSearching] = useState(false);
  
  // 💡 変更点1: DBから取得した役職リストを格納するStateを追加
  const [dbRoles, setDbRoles] = useState<string[]>([]);

  // --- 検索フォームの状態 ---
  const [searchKi, setSearchKi] = useState<string>("");
  const [searchRole, setSearchRole] = useState<string>("");
  const [searchMain, setSearchMain] = useState<string>("");
  const [searchSub, setSearchSub] = useState<string>("");

  // --- ジャンル追加フォームの状態 ---
  const [newMainName, setNewMainName] = useState("");
  const [newSubName, setNewSubName] = useState("");
  const [selectedMainForSub, setSelectedMainForSub] = useState("");

  // --- 資料アップロードフォームの状態 ---
  const [selectedSubForUpload, setSelectedSubForUpload] = useState<SubGenre | null>(null);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadMemo, setUploadMemo] = useState("");
  const [isRoleRestricted, setIsRoleRestricted] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // ==========================================
  // 1. 初期化: ログイン情報・セッショントークンの取得
  // ==========================================
  useEffect(() => {
    const initSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session && session.user) {
          setToken(session.access_token);
          const meta = session.user.user_metadata;
          const currentKi = meta.generation ? Number(meta.generation) : 68;
          
          setUserMeta({
            name: meta.name || "未設定",
            ki: currentKi,
            role: meta.title || "役員",
          });

          setSearchKi(String(currentKi));
          setSearchRole(meta.title || "");
          await loadGenres(currentKi);
        }
      } catch (err) {
        console.error("セッション初期化エラー:", err);
      } finally {
        setLoadingUser(false);
      }
    };
    initSession();
  }, []);

  // ==========================================
  // 2. ジャンル構造および役職リストの読み込み
  // ==========================================
  const loadGenres = async (ki: number) => {
    const mainRes = await getMainGenres(ki);
    const subRes = await getSubGenres(ki);
    if (mainRes.success && mainRes.data) setMainGenres(mainRes.data);
    if (subRes.success && subRes.data) setSubGenres(subRes.data);
  };

  // 💡 変更点2: ログインユーザーの「期」に合わせた役職リストを取得する関数を追加
  const fetchCurrentGenerationRoles = async (ki: number) => {
    try {
      const { data, error } = await supabase
        .from("officers")
        .select("role")
        .eq("generation", ki);

      if (error) {
        console.error("役職リストの取得に失敗しました:", error);
        return;
      }

      if (data) {
        const uniqueRoles = Array.from(
          new Set(data.map((d) => d.role).filter(Boolean))
        );
        setDbRoles(uniqueRoles);
      }
    } catch (err) {
      console.error("予期せぬエラーが発生しました:", err);
    }
  };

  useEffect(() => {
    if (userMeta?.ki) {
      loadGenres(userMeta.ki);
      // 💡 変更点3: 期が特定できたら役職データも合わせて取得
      fetchCurrentGenerationRoles(userMeta.ki);
    }
  }, [userMeta?.ki, activeTab]);

  // ==========================================
  // 3. 資料検索処理
  // ==========================================
  const handleSearch = async () => {
    if (!userMeta) return;
    setSearching(true);
    try {
      const res = await searchHikitugiFiles({
        ki: searchKi ? Number(searchKi) : undefined,
        role: searchRole || undefined,
        mainGenreId: searchMain || undefined,
        subGenreId: searchSub || undefined,
        currentUserRole: userMeta.role
      });

      if (res.success && res.data) {
        setSearchResults(res.data as any);
      } else {
        alert(res.error);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSearching(false);
    }
  };

  // ==========================================
  // 4. 資料アップロード処理
  // ==========================================
  const handleUploadFile = async () => {
    if (!token || !userMeta || !selectedSubForUpload) return;
    if (!uploadTitle.trim()) return alert("資料タイトルを入力してください");
    if (!selectedFile) return alert("ファイルを選択してください");

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const metadata = {
        title: uploadTitle,
        ki: userMeta.ki,
        role: userMeta.role,
        mainGenreId: selectedSubForUpload.main_genre_id,
        subGenreId: selectedSubForUpload.id,
        isRoleRestricted,
        memo: uploadMemo,
      };

      const res = await uploadHikitugiFile(formData, metadata, token);

      if (res.success) {
        alert("🎉 Googleドライブへの保存と引き継ぎデータの登録が完了しました！");
        setUploadTitle("");
        setUploadMemo("");
        setSelectedFile(null);
        setIsRoleRestricted(false);
        setSelectedSubForUpload(null);
        await loadGenres(userMeta.ki);
      } else {
        alert(`❌ アップロード失敗: ${res.error}`);
      }
    } catch (err) {
      console.error(err);
      alert("予期せぬエラーが発生しました");
    } finally {
      setUploading(false);
    }
  };

  // ==========================================
  // 5. ジャンル管理系のハンドラー
  // ==========================================
  const handleCreateMain = async () => {
    if (!userMeta?.ki || !newMainName.trim()) return;
    const res = await createMainGenre(userMeta.ki, newMainName);
    if (res.success) {
      setNewMainName("");
      loadGenres(userMeta.ki);
    } else alert(res.error);
  };

  const handleCreateSub = async () => {
    if (!userMeta?.ki || !selectedMainForSub || !newSubName.trim()) return alert("親ジャンルを選択し、名前を入力してください");
    const res = await createSubGenre(userMeta.ki, selectedMainForSub, newSubName);
    if (res.success) {
      setNewSubName("");
      loadGenres(userMeta.ki);
    } else alert(res.error);
  };

  const handleDeleteMain = async (id: string) => {
    if (!confirm("本当にこのメインジャンルを削除しますか？紐づくサブジャンルも全て削除されます。")) return;
    const res = await deleteMainGenre(id);
    if (res.success && userMeta) loadGenres(userMeta.ki);
  };

  const handleDeleteSub = async (id: string) => {
    if (!confirm("本当にこのサブジャンルを削除しますか？")) return;
    const res = await deleteSubGenre(id);
    if (res.success && userMeta) loadGenres(userMeta.ki);
  };

  if (loadingUser) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-400 text-sm">ユーザー情報を読み込み中...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 font-sans">
      
      {/* 👤 マイステータス・バー */}
      <div className="max-w-7xl mx-auto mb-6 bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 flex items-center justify-between shadow-xl">
        <div className="flex items-center gap-2 text-xs text-slate-300">
          <User className="w-4 h-4 text-purple-400" />
          <span>ログイン中:</span>
          <span className="font-bold text-purple-400">{userMeta?.ki}期 {userMeta?.role}</span>
          <span className="text-slate-500">({userMeta?.name} さん)</span>
        </div>
        <div className="text-xs bg-slate-950 text-slate-400 px-3 py-1 rounded-full border border-slate-800">引き継ぎ管理システム</div>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* 左側カラム */}
        <div className="lg:col-span-4 space-y-6">
          <div className="grid grid-cols-2 p-1 bg-slate-900 rounded-xl border border-slate-800 shadow-md">
            <button
              onClick={() => setActiveTab("search")}
              className={`flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                activeTab === "search" ? "bg-slate-800 text-emerald-400 shadow" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Search className="w-3.5 h-3.5" /> 資料を探す
            </button>
            <button
              onClick={() => setActiveTab("manage")}
              className={`flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                activeTab === "manage" ? "bg-slate-800 text-purple-400 shadow" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Layers className="w-3.5 h-3.5" /> 資料追加・ジャンル管理
            </button>
          </div>

          {activeTab === "search" && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 shadow-xl">
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-1.5 pb-2 border-b border-slate-800">
                <Search className="w-4 h-4 text-emerald-400" /> 検索条件を指定
              </h3>
              
              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-400 mb-1 font-bold">期 (数字入力)</label>
                  <input
                    type="number"
                    value={searchKi}
                    onChange={(e) => setSearchKi(e.target.value)}
                    className="w-full h-9 bg-slate-950 border border-slate-800 rounded-lg px-3 text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
                    placeholder="例: 68"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-bold">担当役職</label>
                  {/* 💡 変更点4: 手書きの option タグを排除し、dbRoles からマップするように変更 */}
                  <select 
                    value={searchRole}
                    onChange={(e) => setSearchRole(e.target.value)}
                    className="w-full h-9 bg-slate-950 border border-slate-800 rounded-lg px-2 text-slate-200 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">全て選択</option>
                    {dbRoles.map((roleName) => (
                      <option key={roleName} value={roleName}>
                        {roleName}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-bold">メインジャンル</label>
                  <select
                    value={searchMain}
                    onChange={(e) => { setSearchMain(e.target.value); setSearchSub(""); }}
                    className="w-full h-9 bg-slate-950 border border-slate-800 rounded-lg px-2 text-slate-200 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">全て選択</option>
                    {mainGenres.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-bold">サブジャンル</label>
                  <select
                    value={searchSub}
                    onChange={(e) => setSearchSub(e.target.value)}
                    className="w-full h-9 bg-slate-950 border border-slate-800 rounded-lg px-2 text-slate-200 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">全て選択</option>
                    {subGenres
                      .filter(s => !searchMain || s.main_genre_id === searchMain)
                      .map(s => <option key={s.id} value={s.id}>{s.name}</option>)
                    }
                  </select>
                </div>

                <button 
                  onClick={handleSearch}
                  disabled={searching}
                  className="w-full h-9 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 text-white font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer mt-4 shadow-lg shadow-emerald-600/10"
                >
                  <Search className="w-3.5 h-3.5" /> {searching ? "検索中..." : "検索する"}
                </button>
              </div>
            </div>
          )}

          {activeTab === "manage" && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-5 shadow-xl text-xs">
              <div className="space-y-2">
                <h4 className="font-bold text-slate-300 flex items-center gap-1">
                  <FolderPlus className="w-3.5 h-3.5 text-purple-400" /> メインジャンルの追加
                </h4>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="例: 夏合宿, 球技大会"
                    value={newMainName}
                    onChange={(e) => setNewMainName(e.target.value)}
                    className="flex-1 h-9 bg-slate-950 border border-slate-800 rounded-lg px-3 text-slate-200 focus:outline-none focus:border-purple-500"
                  />
                  <button onClick={handleCreateMain} className="px-3 bg-purple-600 hover:bg-purple-500 rounded-lg font-bold flex items-center justify-center cursor-pointer">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-800/60">
                <h4 className="font-bold text-slate-300 flex items-center gap-1">
                  <FolderPlus className="w-3.5 h-3.5 text-purple-400" /> サブジャンルの追加
                </h4>
                <select
                  value={selectedMainForSub}
                  onChange={(e) => setSelectedMainForSub(e.target.value)}
                  className="w-full h-9 bg-slate-950 border border-slate-800 rounded-lg px-2 text-slate-200 focus:outline-none focus:border-purple-500"
                >
                  <option value="">親メインジャンルを選択</option>
                  {mainGenres.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="例: 実施届, メール下書き"
                    value={newSubName}
                    onChange={(e) => setNewSubName(e.target.value)}
                    className="flex-1 h-9 bg-slate-950 border border-slate-800 rounded-lg px-3 text-slate-200 focus:outline-none focus:border-purple-500"
                  />
                  <button onClick={handleCreateSub} className="px-3 bg-purple-600 hover:bg-purple-500 rounded-lg font-bold flex items-center justify-center cursor-pointer">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 右側カラム */}
        <div className="lg:col-span-8">
          {activeTab === "search" && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 min-h-[550px] shadow-xl flex flex-col">
              <h3 className="text-sm font-bold text-slate-200 mb-4 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-emerald-400" /> 該当する引き継ぎ資料 ({searchResults.length}件)
              </h3>

              {searchResults.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-slate-800 rounded-xl p-8 text-center text-slate-500">
                  <Search className="w-8 h-8 mb-2 text-slate-700" />
                  <p className="text-xs">条件を設定して検索ボタンを押してください。</p>
                </div>
              ) : (
                <div className="space-y-3 overflow-y-auto max-h-[500px] pr-1">
                  {searchResults.map(file => (
                    <div key={file.id} className="bg-slate-950 border border-slate-850 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all hover:border-slate-700">
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center flex-wrap gap-2">
                          <span className="text-[10px] bg-slate-800 text-slate-300 font-mono px-2 py-0.5 rounded border border-slate-700">{file.ki}期</span>
                          <span className="text-[10px] bg-purple-950/40 text-purple-400 font-bold px-2 py-0.5 rounded border border-purple-900/40">{file.role}</span>
                          {file.is_role_restricted && (
                            <span className="text-[10px] bg-rose-950/40 text-rose-400 border border-rose-900/40 px-1.5 py-0.5 rounded flex items-center gap-1 font-bold">
                              <Lock className="w-2.5 h-2.5" /> 役職限定
                            </span>
                          )}
                          <span className="text-[10px] text-slate-500 flex items-center gap-1 ml-auto font-mono">
                            <Clock className="w-2.5 h-2.5" /> {new Date(file.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-slate-200">{file.title}</h4>
                        <div className="text-[11px] text-slate-400 bg-slate-900/50 p-2 rounded border border-slate-850 leading-relaxed whitespace-pre-wrap">
                          <span className="text-[10px] font-bold text-slate-500 block mb-0.5">📂 ジャンル: {(file as any).hikitugi_main_genres?.name} ＞ {(file as any).hikitugi_sub_genres?.name}</span>
                          {file.memo || "（メモ・申し送り事項はありません）"}
                        </div>
                      </div>
                      
                      <div className="flex md:flex-col items-end justify-between md:justify-center gap-2 pt-2 md:pt-0 border-t md:border-t-0 border-slate-850">
                        <a 
                          href={`/api/hikitugi/download?id=${file.google_drive_file_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="h-9 px-4 bg-slate-800 hover:bg-slate-700 text-emerald-400 font-bold rounded-lg border border-slate-700 transition-all flex items-center justify-center gap-1.5 cursor-pointer text-xs w-full md:w-auto shadow-md"
                        >
                          <Download className="w-3.5 h-3.5" /> 開く / DL
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "manage" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl flex flex-col h-[550px]">
                <h3 className="text-sm font-bold text-slate-200 mb-3 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-purple-400" /> {userMeta?.ki}期のジャンル構造
                </h3>
                
                <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs">
                  {mainGenres.length === 0 ? (
                    <p className="text-slate-500 italic text-center pt-8">ジャンルが登録されていません</p>
                  ) : (
                    mainGenres.map(main => (
                      <div key={main.id} className="bg-slate-950 border border-slate-850 rounded-lg p-2.5 space-y-2">
                        <div className="flex items-center justify-between font-bold text-slate-300 bg-slate-900 px-2 py-1.5 rounded border border-slate-800/50">
                          <span className="flex items-center gap-1"><Folder className="w-3.5 h-3.5 text-amber-500" /> {main.name}</span>
                          <button onClick={() => handleDeleteMain(main.id)} className="text-slate-500 hover:text-rose-400 transition-colors cursor-pointer">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="pl-4 space-y-1">
                          {subGenres.filter(sub => sub.main_genre_id === main.id).length === 0 ? (
                            <p className="text-[10px] text-slate-600 italic pl-2">サブジャンルなし</p>
                          ) : (
                            subGenres
                              .filter(sub => sub.main_genre_id === main.id)
                              .map(sub => (
                                <div 
                                  key={sub.id} 
                                  onClick={() => {
                                    setSelectedSubForUpload({
                                      ...sub,
                                      hikitugi_main_genres: { name: main.name }
                                    });
                                  }}
                                  className={`flex items-center justify-between p-2 rounded group transition-all cursor-pointer border ${
                                    selectedSubForUpload?.id === sub.id 
                                      ? "bg-purple-950/40 border-purple-800 text-purple-300" 
                                      : "bg-slate-900/40 border-transparent hover:bg-slate-900 text-slate-400 hover:text-slate-200"
                                  }`}
                                >
                                  <span className="flex items-center gap-1.5">
                                    <FileText className="w-3 h-3 text-slate-500" />
                                    {sub.name}
                                    
                                    {sub.is_completed ? (
                                      <span className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1 rounded-sm flex items-center gap-0.5 font-bold">
                                        <CheckCircle className="w-2 h-2" />完了
                                      </span>
                                    ) : (
                                      <span className="text-[9px] bg-amber-500/10 text-amber-500 border border-amber-500/20 px-1 rounded-sm flex items-center gap-0.5 font-bold animate-pulse">
                                        <AlertCircle className="w-2 h-2" />未
                                      </span>
                                    )}
                                  </span>
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); handleDeleteSub(sub.id); }}
                                    className="text-slate-600 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              ))
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl flex flex-col h-[550px]">
                <h3 className="text-sm font-bold text-slate-200 mb-3 flex items-center gap-1.5">
                  <UploadCloud className="w-4 h-4 text-purple-400" /> 資料をアップロード
                </h3>

                {selectedSubForUpload ? (
                  <div className="flex-1 flex flex-col justify-between text-xs space-y-3">
                    <div className="space-y-3 overflow-y-auto flex-1 pr-1">
                      <div className="bg-purple-950/20 border border-purple-900/60 rounded-lg p-2 text-purple-300 font-bold">
                        選択中: {selectedSubForUpload.hikitugi_main_genres?.name} ＞ {selectedSubForUpload.name}
                      </div>

                      <div>
                        <label className="block text-slate-400 mb-1 font-bold">資料タイトル</label>
                        <input
                          type="text"
                          placeholder="例: 令和8年度 実施届"
                          value={uploadTitle}
                          onChange={(e) => setUploadTitle(e.target.value)}
                          className="w-full h-9 bg-slate-950 border border-slate-800 rounded-lg px-3 text-slate-200 focus:outline-none focus:border-purple-500"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-400 mb-1 font-bold">ファイル選択</label>
                        <input
                          type="file"
                          onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                          className="w-full text-slate-400 border border-slate-850 rounded-lg bg-slate-950 px-2 py-1.5 text-[11px] focus:outline-none file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[11px] file:font-bold file:bg-slate-800 file:text-slate-200 hover:file:bg-slate-700 file:cursor-pointer"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-400 mb-1 font-bold flex items-center justify-between">
                          <span>閲覧権限の制限</span>
                          <button 
                            type="button"
                            onClick={() => setIsRoleRestricted(!isRoleRestricted)}
                            className={`flex items-center gap-1 px-2 py-0.5 rounded border transition-all text-[10px] cursor-pointer font-bold ${
                              isRoleRestricted 
                                ? "bg-rose-500/10 text-rose-400 border-rose-500/20" 
                                : "bg-slate-950 text-slate-400 border-slate-800"
                            }`}
                          >
                            {isRoleRestricted ? (
                              <><Lock className="w-2.5 h-2.5" /> 同役職のみ可</>
                            ) : (
                              <><Unlock className="w-2.5 h-2.5" /> 全員に公開</>
                            )}
                          </button>
                        </label>
                        <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                          有効にすると、投稿者と同じ役職（例：{userMeta?.role}）のユーザーだけがこの資料を検索・閲覧できるようになります。
                        </p>
                      </div>

                      <div>
                        <label className="block text-slate-400 mb-1 font-bold">メモ・申し送り事項</label>
                        <textarea
                          placeholder="注意点や、来期に向けてのアドバイスなどがあれば記入してください"
                          value={uploadMemo}
                          onChange={(e) => setUploadMemo(e.target.value)}
                          rows={4}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-purple-500 resize-none leading-relaxed"
                        />
                      </div>
                    </div>

                    <button 
                      onClick={handleUploadFile}
                      disabled={uploading}
                      className="w-full h-10 bg-purple-600 hover:bg-purple-500 disabled:bg-purple-800 text-white font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer mt-2 shadow-lg shadow-purple-600/10"
                    >
                      <UploadCloud className="w-4 h-4" /> {uploading ? "Googleドライブへ保存中..." : "Googleドライブへ保存"}
                    </button>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-slate-800 rounded-xl p-8 text-center text-slate-600">
                    <Layers className="w-7 h-7 mb-1.5 text-slate-700" />
                    <p className="text-[11px]">左のツリーから、アップロードしたい<br />サブジャンルをタップしてください。</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}