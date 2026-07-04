"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
// 💡 User（アカウント用）を追加
import { Calendar, FileText, Mail, FilePlus, CheckSquare, BookOpen, Settings, User } from "lucide-react";
import { supabase } from "@/supabase";

// 各ナビゲーションに「役員専用かどうか（requiresOfficer）」の目印をつけます
const navItems = [
    { label: "カレンダー", href: "/calendar", icon: Calendar, requiresOfficer: false },
    { label: "過去問", href: "/kakomon", icon: BookOpen, requiresOfficer: false },
    { label: "引き継ぎ", href: "/hikitugi", icon: FileText, requiresOfficer: true },
    { label: "メール", href: "/email", icon: Mail, requiresOfficer: true },
    { label: "書類作成", href: "/document", icon: FilePlus, requiresOfficer: true },
    { label: "タスク", href: "/task", icon: CheckSquare, requiresOfficer: true },
    { label: "設定", href: "/setting", icon: Settings, requiresOfficer: true },
    { label: "アカウント", href: "/account", icon: User, requiresOfficer: false } // 💡 全員が使えるアカウントタブを追加
];

export default function GlobalNav() {
    const pathname = usePathname();
    const [role, setRole] = useState<string | null>(null);

    // ログインユーザーのrole（役職シグナル）を取得
    useEffect(() => {
        const fetchUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setRole(user.user_metadata?.role || "member");
            }
        };
        fetchUser();
    }, []);

    // ユーザーの role に応じて表示するタブを絞り込む
    const visibleItems = navItems.filter((item) => {
        if (item.requiresOfficer) {
            return role === "officer";
        }
        return true;
    });

    return (
        // 💡 hidden md:flex を flex に書き換えました
        <header className="flex fixed top-0 left-0 w-full h-16 bg-slate-900 text-white border-b border-slate-800 items-center justify-between px-6 z-50">
            <Link 
                href="/calendar" 
                className="font-bold text-lg text-emerald-400 hover:opacity-80 transition-opacity cursor-pointer"
            >
                {role === "officer" ? "川内テニスクラブ 役員用" : "川内テニスクラブ"}
            </Link>
            
            <nav className="flex gap-1">
                {visibleItems.map((item) => {
                    const isActive = pathname.startsWith(item.href);
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex items-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-colors cursor-pointer ${
                                isActive
                                    ? "bg-emerald-500 text-white"
                                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                            }`}
                        >
                            <item.icon className="w-4 h-4" />
                            {/* 💡 メニューの文字数が多くてスマホで溢れる場合は、スマホだけ文字を非表示（hidden md:inline）にするのもアリです */}
                            <span className="hidden md:inline">{item.label}</span>
                        </Link>
                    );
                })}
            </nav>
        </header>
    );
}