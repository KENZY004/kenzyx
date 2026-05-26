"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Users, 
  LayoutDashboard, 
  CheckCircle2, 
  ArrowLeft, 
  LogOut,
  Shield,
  Activity,
  BookOpen
} from "lucide-react";
import { useAuthStore } from "@/store/auth";
import clsx from "clsx";

const ADMIN_LINKS = [
  { href: "/admin",          label: "Overview",   icon: LayoutDashboard },
  { href: "/admin/problems", label: "Library",    icon: BookOpen        },
  { href: "/admin/users",     label: "Users",      icon: Users           },
  { href: "/admin/review",    label: "Moderation", icon: CheckCircle2     },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();

  return (
    <aside className="w-64 h-screen flex flex-col border-r border-kenyx-border bg-kenyx-bg sticky top-0">
      {/* Brand Header */}
      <div className="p-6 flex items-center gap-3">
        <div className="p-2 rounded-lg bg-kenyx-warning/10 text-kenyx-warning">
          <Shield className="h-5 w-5" />
        </div>
        <div className="flex flex-col">
          <span className="font-bold text-sm tracking-tight text-kenyx-text-primary uppercase">
            Kenyx Control
          </span>
          <span className="text-[10px] text-kenyx-warning/70 font-bold uppercase tracking-widest">
            Superuser
          </span>
        </div>
      </div>

      {/* Main Nav */}
      <nav className="flex-1 px-4 py-2 space-y-1">
        {ADMIN_LINKS.map((link) => {
          const active = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={clsx(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 group",
                active 
                  ? "bg-kenyx-warning/5 text-kenyx-warning font-semibold border border-kenyx-warning/20 shadow-lg shadow-kenyx-warning/5" 
                  : "text-kenyx-text-secondary hover:text-kenyx-text-primary hover:bg-white/5"
              )}
            >
              <link.icon className={clsx("h-4 w-4", active ? "text-kenyx-warning" : "text-kenyx-text-muted group-hover:text-kenyx-text-secondary")} />
              {link.label}
            </Link>
          );
        })}
        
        <div className="pt-6 mt-6 border-t border-kenyx-border">
          <Link
            href="/problems"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-kenyx-text-muted hover:text-kenyx-text-primary hover:bg-white/5 transition-all"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Player Site
          </Link>
        </div>
      </nav>

      {/* User Session */}
      <div className="p-4 border-t border-kenyx-border">
        <div className="p-3 rounded-xl bg-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-full bg-kenyx-warning text-kenyx-bg flex items-center justify-center font-bold text-xs">
              {user?.username[0].toUpperCase()}
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="text-xs font-bold text-kenyx-text-primary truncate">
                {user?.username}
              </span>
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[10px] text-kenyx-text-muted uppercase font-bold tracking-tight">Active</span>
              </div>
            </div>
          </div>
          <button 
            onClick={logout}
            className="p-1.5 rounded-lg text-kenyx-text-muted hover:text-kenyx-danger hover:bg-kenyx-danger/10 transition-colors"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
