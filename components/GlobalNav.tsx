"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
// 💡 BookOpen（過去問用）を追加
import { Calendar, FileText, Mail, FilePlus, CheckSquare, BookOpen,Settings} from "lucide-react";
// 💡 Supabaseをインポート
import { supabase } from "@/supabase";

// 各ナビゲーションに「役員専用かどうか（requiresOfficer）」の目印をつけます
const navItems = [
    { label: "ホーム", href: "/calendar", icon: Calendar, requiresOfficer: false },
    { label: "過去問", href: "/kakomon", icon: BookOpen, requiresOfficer: false }, // 💡 追加
    { label: "引き継ぎ", href: "/hikitugi", icon: FileText, requiresOfficer: true },
    { label: "メール", href: "/email", icon: Mail, requiresOfficer: true },
    { label: "書類作成", href: "/document", icon: FilePlus, requiresOfficer: true },
    { label: "タスク", href: "/task", icon: CheckSquare, requiresOfficer: true },
    { label: "設定", href: "/setting", icon: Settings, requiresOfficer: true }
];

export default function GlobalNav() {
    const pathname = usePathname();
    const [role, setRole] = useState<string | null>(null);

    // 💡 ログインユーザーのrole（役職シグナル）を取得
    useEffect(() => {
        const fetchUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setRole(user.user_metadata?.role || "member");
            }
        };
        fetchUser();
    }, []);

    // 💡 ユーザーの role に応じて表示するタブを絞り込む
    const visibleItems = navItems.filter((item) => {
        // 役員専用のタブの場合、roleが 'officer' の人だけ表示する
        if (item.requiresOfficer) {
            return role === "officer";
        }
        // それ以外のタブ（ホーム・過去問）は全員に表示する
        return true;
    });

    return (
        <header className="hidden md:flex fixed top-0 left-0 w-full h-16 bg-slate-900 text-white border-b border-slate-800 items-center justify-between px-6 z-50">
            {/* 💡 ロゴのテキストも role に応じて少し変えると親切です */}
            <div className="font-bold text-lg text-emerald-400">
                {role === "officer" ? "川内テニスクラブ 役員用" : "川内テニスクラブ"}
            </div>
            
            <nav className="flex gap-1">
                {/* 💡 全部の navItems ではなく、絞り込んだ visibleItems をループさせる */}
                {visibleItems.map((item) => {
                    const isActive = pathname.startsWith(item.href);
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex items-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                                isActive
                                    ? "bg-emerald-500 text-white"
                                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                            }`}
                        >
                            <item.icon className="w-4 h-4" />
                            {item.label}
                        </Link>
                    );
                })}
            </nav>
        </header>
    );
}