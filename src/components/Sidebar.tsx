"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Users, FileWarning, TrendingUp, LayoutDashboard, UserCircle2, Settings, Clock, Home, FileHeart, UserPlus, Award, MessageCircle, ListChecks, PlaneTakeoff, Building2, LogOut } from "lucide-react";

const nav = [
  { href: "/", label: "ダッシュボード", icon: LayoutDashboard },
  { href: "/employees", label: "従業員", icon: Users },
  { href: "/attendance", label: "勤怠・残業", icon: Clock },
  { href: "/visa", label: "在留資格", icon: FileWarning },
  { href: "/departures", label: "帰国・退職予定", icon: PlaneTakeoff },
  { href: "/career", label: "キャリアラダー", icon: TrendingUp },
  { href: "/certifications", label: "資格管理", icon: Award },
  { href: "/one-on-ones", label: "1on1 面談", icon: MessageCircle },
  { href: "/one-on-ones/concerns", label: "悩み集約ボード", icon: ListChecks },
  { href: "/workplace", label: "作業区管理", icon: Building2 },
  { href: "/dormitories", label: "寮管理", icon: Home },
  { href: "/support", label: "生活サポート", icon: FileHeart },
  { href: "/recruitment", label: "採用予定", icon: UserPlus },
  { href: "/my", label: "マイページ（現場）", icon: UserCircle2 },
  { href: "/admin", label: "管理設定", icon: Settings },
];

export function Sidebar({ userId }: { userId: string }) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  return (
    <aside className="w-64 bg-slate-900 text-slate-100 h-screen sticky top-0 flex flex-col flex-shrink-0">
      <div className="p-5 border-b border-slate-700">
        <div className="flex items-center justify-between">
          <div className="text-xs text-slate-400 tracking-wide">中温 TMS</div>
          {userId && (
            <span className="text-xs text-slate-300 bg-slate-700 px-2 py-0.5 rounded-full font-mono">
              {userId}
            </span>
          )}
        </div>
        <div className="text-lg font-bold mt-0.5">タレントマネジメント</div>
      </div>
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {nav.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? "bg-slate-700 text-white"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <Icon size={18} />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-slate-700">
        <div className="text-xs text-slate-400 mb-3">
          <div>株式会社中温</div>
          <div className="mt-0.5">MVP v0.1</div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-red-900 hover:text-white transition-colors"
        >
          <LogOut size={16} />
          ログアウト
        </button>
      </div>
    </aside>
  );
}
