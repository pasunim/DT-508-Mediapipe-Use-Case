"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

interface NavbarProps {
  username: string;
  avatarColor: string;
}

export default function Navbar({ username, avatarColor }: NavbarProps) {
  const path = usePathname();
  const links = [
    { href: "/game",        label: "เล่น",    icon: "🎮" },
    { href: "/profile",     label: "โปรไฟล์", icon: "👤" },
    { href: "/leaderboard", label: "อันดับ",  icon: "🏆" },
  ];

  return (
    <>
      {/* Top bar — desktop */}
      <nav className="border-b border-slate-800 bg-[#0f0f1a]/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="font-bold text-violet-400 text-sm sm:text-base">✋ GestureGame</span>
            {/* Desktop nav links */}
            <div className="hidden sm:flex gap-1">
              {links.map(l => (
                <Link
                  key={l.href} href={l.href}
                  className={`px-3 py-1.5 rounded-lg text-sm transition ${path === l.href ? "bg-violet-600 text-white" : "text-slate-400 hover:text-white hover:bg-slate-800"}`}
                >
                  {l.label}
                </Link>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0" style={{ background: avatarColor }}>
              {username[0]?.toUpperCase()}
            </div>
            <span className="text-sm text-slate-300 hidden sm:inline">{username}</span>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="text-xs text-slate-500 hover:text-red-400 transition ml-1"
            >
              ออก
            </button>
          </div>
        </div>
      </nav>

      {/* Bottom tab bar — mobile only */}
      <nav className="sm:hidden fixed bottom-0 inset-x-0 z-50 bg-[#0f0f1a]/95 backdrop-blur border-t border-slate-800">
        <div className="flex justify-around items-center h-16">
          {links.map(l => {
            const active = path === l.href;
            return (
              <Link
                key={l.href} href={l.href}
                className={`flex flex-col items-center gap-0.5 px-6 py-2 rounded-xl transition ${active ? "text-violet-400" : "text-slate-500"}`}
              >
                <span className="text-xl">{l.icon}</span>
                <span className="text-[10px] font-medium">{l.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Spacer so content isn't hidden behind bottom bar on mobile */}
      <div className="sm:hidden h-16" />
    </>
  );
}
