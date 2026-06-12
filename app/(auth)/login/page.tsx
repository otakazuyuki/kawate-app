'use client';

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/supabase";

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (error) {
        alert(`ログイン失敗: ${error.message}`);
        return;
      }

      alert("ログイン成功！");
      router.push('/calendar');
      
    } catch (err) {
      alert("予期せぬエラーが発生しました");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-950">
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 max-w-sm w-full text-center">
        <h1 className="text-2xl font-bold text-slate-100 mb-2">川内テニスクラブ</h1>
        <p className="text-sm text-slate-400 mb-6">役員専用ログイン</p>
        
        <form onSubmit={handleLogin} className="space-y-4 mb-6 text-left">
          <div>
            <label className="block text-xs text-slate-400 mb-1 px-1">大学メールアドレス</label>
            <input
              type="email"
              placeholder="example@university.ac.jp"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-10 bg-slate-800 border border-slate-700 rounded-md px-3 text-slate-200 text-sm focus:outline-none focus:border-emerald-500"
              required
              disabled={loading}
            />
          </div>
          
          <div>
            <label className="block text-xs text-slate-400 mb-1 px-1">パスワード</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full h-10 bg-slate-800 border border-slate-700 rounded-md px-3 text-slate-200 text-sm focus:outline-none focus:border-emerald-500"
              required
              disabled={loading}
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-medium py-2 rounded-md transition-colors mt-2 disabled:opacity-50"
          >
            {loading ? "ログイン中..." : "ログインする(テスト)"}
          </button>
        </form>
      </div>
    </div>
  );
}