"use client";

import { useState, useEffect, FormEvent } from "react";
import { supabase } from "@/supabase";
import { User, Mail, ShieldAlert, Users, KeyRound, LogOut, Lock, RefreshCw } from "lucide-react";

export default function AccountPage() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  
  // パスワード変更用のステート
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [updating, setUpdating] = useState(false);

  // 1. ログインしているユーザー情報の取得
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error || !user) {
          // 万が一ユーザー情報が取れなければログイン画面へ
          window.location.href = "/login";
          return;
        }
        setUser(user);
      } catch (err) {
        console.error("ユーザー情報の取得に失敗しました:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, []);

  // 2. ログアウト処理
  const handleLogout = async () => {
    if (!confirm("本当にログアウトしますか？")) return;
    
    try {
      // Supabaseのサインアウトを実行
      await supabase.auth.signOut();
      
      // 💡【最重要】ミドルウェア用にセットした鍵クッキーを完全に消去
      document.cookie = "current_key=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
      
      // ログイン画面へ強制リフレッシュ遷移（これでミドルウェア側も確実に初期化されます）
      window.location.href = "/login";
    } catch (err) {
      alert("ログアウト中にエラーが発生しました");
      console.error(err);
    }
  };

  // 3. パスワード変更処理
  const handlePasswordChange = async (e: FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      alert("エラー: 入力された2つのパスワードが一致しません。");
      return;
    }

    if (newPassword.length < 6) {
      alert("セキュリティのため、パスワードは6文字以上で入力してください。");
      return;
    }

    setUpdating(true);
    try {
      // Supabase Auth のユーザー情報を更新（パスワード変更）
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        alert(`パスワード変更失敗: ${error.message}`);
        return;
      }

      alert("🎉 パスワードが正常に変更されました！");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      alert("予期せぬエラーが発生しました");
      console.error(err);
    } finally {
      setUpdating(false);
    }
  };

  // ローディング画面
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100">
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
          アカウント情報を読み込み中...
        </div>
      </div>
    );
  }

  const metadata = user?.user_metadata || {};
  const isOfficer = metadata.role === "officer";

  return (
    <div className="min-h-screen pt-24 pb-12 px-6 bg-slate-950 text-slate-100 flex justify-center">
      <div className="max-w-2xl w-full space-y-8">
        
        {/* タイトルセクション */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">アカウント設定</h1>
          <p className="text-xs text-slate-400 mt-1">
            ログイン中の情報の確認、パスワードの変更、ログアウトが行えます。
          </p>
        </div>

        {/* メインレイアウト (レスポンシブで横並び・縦並び切り替え) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          
          {/* 左側＆中央：情報と変更フォーム（2カラム分） */}
          <div className="md:col-span-2 space-y-6">
            
            {/* 1. 登録情報確認カード */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-6">
              <div className="flex items-center justify-between border-b border-slate-800/60 pb-3">
                <h2 className="text-sm font-bold text-slate-200 flex items-center gap-1.5">
                  <User className="w-4 h-4 text-emerald-400" /> 登録情報
                </h2>
                
                {/* 役員か一般部員かでバッジを切り替え */}
                <span className={`text-[10px] px-2.5 py-0.5 font-bold rounded-full flex items-center gap-1 ${
                  isOfficer 
                    ? "bg-purple-500/10 text-purple-400 border border-purple-500/20" 
                    : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                }`}>
                  {isOfficer ? <ShieldAlert className="w-3 h-3" /> : <Users className="w-3 h-3" />}
                  {isOfficer ? "役員アカウント" : "一般部員アカウント"}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">氏名</label>
                  <div className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 text-sm font-medium">
                    {metadata.name || "未設定"}
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1 flex items-center gap-1">
                    <Mail className="w-3 h-3" /> メールアドレス
                  </label>
                  <div className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 text-sm font-mono truncate select-all">
                    {user?.email}
                  </div>
                </div>

                {/* 💡 役員でログインしている時だけ「期」と「役職」を自動表示 */}
                {isOfficer && (
                  <>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 mb-1">期（世代）</label>
                      <div className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 text-sm font-medium">
                        {metadata.generation ? `${metadata.generation}期` : "未設定"}
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 mb-1">役職</label>
                      <div className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 text-sm font-medium text-purple-400">
                        {metadata.title || "未設定"}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* 2. パスワード変更カード */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
              <h2 className="text-sm font-bold text-slate-200 flex items-center gap-1.5 border-b border-slate-800/60 pb-3">
                <Lock className="w-4 h-4 text-emerald-400" /> パスワードの変更
              </h2>

              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1 px-1 flex items-center gap-1">
                    <KeyRound className="w-3 h-3" /> 新しいパスワード
                  </label>
                  <input
                    type="password"
                    placeholder="6文字以上で入力"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full h-10 bg-slate-950 border border-slate-800 rounded-lg px-3 text-slate-200 text-sm focus:outline-none focus:border-emerald-500 transition-all"
                    required
                    disabled={updating}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1 px-1 flex items-center gap-1">
                    <KeyRound className="w-3 h-3 text-slate-500" /> 新しいパスワード (確認確認用)
                  </label>
                  <input
                    type="password"
                    placeholder="もう一度入力"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full h-10 bg-slate-950 border border-slate-800 rounded-lg px-3 text-slate-200 text-sm focus:outline-none focus:border-emerald-500 transition-all"
                    required
                    disabled={updating}
                  />
                </div>

                <button
                  type="submit"
                  disabled={updating}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 font-bold py-2.5 rounded-lg transition-all text-xs flex items-center justify-center gap-1.5 cursor-pointer text-white shadow-lg shadow-emerald-500/10"
                >
                  {updating ? "パスワードを更新中..." : "パスワードを変更する"}
                </button>
              </form>
            </div>

          </div>

          {/* 右側：クイックアクション・ログアウトボタン（1カラム分） */}
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl text-center space-y-4">
              <div className="w-12 h-12 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-center mx-auto text-slate-400">
                <User className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-200">{metadata.name || "部員"}</h3>
                <p className="text-[11px] text-slate-400 mt-0.5 font-mono truncate">{user?.email}</p>
              </div>
              
              <div className="pt-2 border-t border-slate-800/60">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full bg-rose-600/10 hover:bg-rose-600/20 text-rose-400 border border-rose-500/20 font-bold py-2 rounded-lg transition-all text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  ログアウトする
                </button>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}