"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {Calendar,FileText,Mail,FilePlus,CheckSquare} from "lucide-react";

const navItems=[{label:"ホーム",href:"/calendar",icon:Calendar},{label:"引き継ぎ",href:"/hikitugi",icon:FileText},{label:"メール",href:"/email",icon:Mail},{label:"書類作成",href:"/document",icon:FilePlus},{label:"タスク",href:"/task",icon:CheckSquare},{label:"設定",href:"/setting",icon:FilePlus}]

export default function GlobalNav(){
    const pathname=usePathname();
    return(
        <header className="hidden md:flex fixed top-0 left-0 w-full h-16 bg-slate-900 text-white border-b border-slate-800 items-center justify-between px-6 z-50">
            <div className="font-bold text-lg text-emerald-400">川内テニス　役員</div>
            <nav className="flex gap-1">
                {navItems.map((item) => {
                    const isActive=pathname.startsWith(item.href);
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex items-center gap-2 py-2 rounded-md text-sm font-medium transition-colors ${
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