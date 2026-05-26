"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, LogOut, LayoutDashboard, Shield, Menu, X, Bell, CheckCircle2, Clock, Settings } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { useAuthStore } from "@/store/auth";
import { usersApi } from "@/lib/api";
import clsx from "clsx";

const NAV_LINKS = [
  { href: "/problems",     label: "Problems"    },
  { href: "/battle",       label: "Battle"      },
  { href: "/leaderboard",  label: "Leaderboard" },
  { href: "/create",       label: "Create"      },
];

export function Navbar() {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setNotifOpen(false);
        setProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    setMounted(true);
    if (user) {
      usersApi.notifications().then(setNotifications).catch(console.error);
    }
  }, [user]);

  if (!mounted || pathname?.startsWith("/admin")) return null;

  const unreadCount = (notifications || []).filter(n => !n.is_read).length;

  return (
    <>
      {user && !user.is_verified && (
        <div className="bg-kenyx-warning/10 border-b border-kenyx-warning/20 py-2 px-5 text-center relative z-50">
          <p className="text-[10px] uppercase font-black tracking-widest text-kenyx-warning">
            Action Required: Please verify your email to unlock problem creation and competitive battles.
          </p>
        </div>
      )}

      <header className="sticky top-0 z-[100] w-full border-b border-kenyx-border bg-kenyx-bg/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center h-14 px-5 md:px-8">
          <Link href="/" className="flex items-center gap-1 mr-8 shrink-0 group">
            <span className="font-bold text-lg tracking-tight text-kenyx-text-primary">
              Kenyx
            </span>
            <span
              className="w-1.5 h-1.5 rounded-full mb-3 ml-0.5 group-hover:scale-110 transition-transform"
              style={{ background: "#a8ff3e" }}
            />
          </Link>

          <nav className="hidden md:flex items-center gap-1 flex-1">
            {NAV_LINKS.map((link) => {
              const active = pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={clsx(
                    "nav-link rounded-md transition-colors",
                    active
                      ? "text-kenyx-text-primary"
                      : "text-kenyx-text-secondary hover:text-kenyx-text-primary"
                  )}
                >
                  {active && (
                    <span
                      className="mr-1.5 inline-block w-1 h-1 rounded-full"
                      style={{ background: "#a8ff3e" }}
                    />
                  )}
                  {link.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2 md:gap-4 ml-auto" ref={dropdownRef}>
            {user ? (
              <>
                <div className="relative">
                  <button 
                    onClick={() => { setNotifOpen(!notifOpen); setProfileOpen(false); }}
                    className="p-2 rounded-lg text-kenyx-text-muted hover:text-kenyx-text-primary hover:bg-white/5 transition-all relative"
                  >
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                      <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-kenyx-accent rounded-full border-2 border-kenyx-bg animate-pulse" />
                    )}
                  </button>

                  <AnimatePresence>
                    {notifOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute right-0 mt-2 w-80 card p-0 z-50 overflow-hidden shadow-2xl"
                      >
                        <div className="p-4 border-b border-white/5 flex items-center justify-between">
                           <span className="text-xs font-bold text-white uppercase tracking-widest">Notifications</span>
                           {unreadCount > 0 && (
                             <button onClick={() => usersApi.markAllNotificationsRead().then(() => setNotifications((notifications || []).map(n => ({...n, is_read: true}))))} className="text-[10px] text-kenyx-accent hover:underline">Mark all read</button>
                           )}
                        </div>
                        <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                          {!notifications || notifications.length === 0 ? (
                            <div className="py-12 text-center text-xs text-kenyx-text-muted">No notifications yet.</div>
                          ) : (
                            notifications.map((n) => (
                              <Link 
                                key={n.id}
                                href={n.link || "#"}
                                onClick={() => setNotifOpen(false)}
                                className={clsx(
                                  "flex gap-3 p-4 hover:bg-white/5 transition-colors border-l-2",
                                  n.is_read ? "border-transparent" : "border-kenyx-accent bg-kenyx-accent/5"
                                )}
                              >
                                 <div className={clsx(
                                   "h-8 w-8 rounded-lg flex items-center justify-center shrink-0",
                                   n.type === 'success' ? "bg-kenyx-success/20 text-kenyx-success" : "bg-white/10 text-kenyx-text-muted"
                                 )}>
                                    {n.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                                 </div>
                                 <div>
                                    <div className="text-xs font-bold text-white mb-0.5">{n.title}</div>
                                    <p className="text-[10px] text-kenyx-text-secondary leading-normal line-clamp-2">{n.message}</p>
                                    <div className="text-[9px] text-kenyx-text-muted mt-1.5">{new Date(n.created_at).toLocaleDateString()}</div>
                                 </div>
                              </Link>
                            ))
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="relative hidden md:block">
                  <button
                    onClick={() => { setProfileOpen(!profileOpen); setNotifOpen(false); }}
                    id="profile-menu-btn"
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm hover:bg-white/5 transition-colors"
                  >
                    {user.avatar_url ? (
                      <img src={user.avatar_url} alt={user.username} className="h-6 w-6 rounded-full object-cover border border-kenyx-border" />
                    ) : (
                      <div
                        className="h-6 w-6 rounded-full flex items-center justify-center text-kenyx-bg text-xs font-bold"
                        style={{ background: "#a8ff3e" }}
                      >
                        {user.username[0].toUpperCase()}
                      </div>
                    )}
                    <span className="text-kenyx-text-primary font-medium">{user.username}</span>
                    <ChevronDown
                      className={clsx(
                        "h-3.5 w-3.5 text-kenyx-text-muted transition-transform duration-200",
                        profileOpen && "rotate-180"
                      )}
                    />
                  </button>

                  <AnimatePresence>
                    {profileOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 6, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 6, scale: 0.97 }}
                        transition={{ duration: 0.12 }}
                        id="profile-dropdown"
                        className="absolute right-0 top-full mt-2 w-48 card p-1.5 z-50 shadow-2xl"
                      >
                        <Link
                          href="/dashboard"
                          onClick={() => setProfileOpen(false)}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-kenyx-text-secondary hover:text-kenyx-text-primary hover:bg-white/5 transition-colors"
                        >
                          <LayoutDashboard className="h-3.5 w-3.5" /> Dashboard
                        </Link>
                        <Link
                          href="/settings"
                          onClick={() => setProfileOpen(false)}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-kenyx-text-secondary hover:text-kenyx-text-primary hover:bg-white/5 transition-colors"
                        >
                          <Settings className="h-3.5 w-3.5" /> Settings
                        </Link>
                        {user.role === "admin" && (
                          <Link
                            href="/admin"
                            onClick={() => setProfileOpen(false)}
                            className="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-kenyx-warning hover:bg-white/5 transition-colors"
                          >
                            <Shield className="h-3.5 w-3.5" /> Admin Panel
                          </Link>
                        )}
                        <div className="my-1 h-px bg-kenyx-border" />
                        <button
                          id="logout-btn"
                          onClick={() => { logout(); setProfileOpen(false); }}
                          className="flex w-full items-center gap-2.5 px-3 py-2 rounded-md text-sm text-kenyx-danger hover:bg-kenyx-danger-dim transition-colors"
                        >
                          <LogOut className="h-3.5 w-3.5" /> Sign out
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </>
            ) : (
              <div className="hidden md:flex items-center gap-4">
                <Link href="/login" className="btn-ghost" id="login-btn">Sign in</Link>
                <Link
                  href="/signup"
                  id="signup-btn"
                  className="btn-accent"
                >
                  Get started
                </Link>
              </div>
            )}
          </div>

          <button
            className="md:hidden ml-2 btn-ghost p-2"
            onClick={() => setMobileOpen(!mobileOpen)}
            id="mobile-menu-btn"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="overflow-hidden border-t border-kenyx-border md:hidden"
              id="mobile-menu"
            >
              <div className="px-5 py-4 space-y-1">
                {NAV_LINKS.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className="block px-3 py-2.5 rounded-md text-sm text-kenyx-text-secondary hover:text-kenyx-text-primary hover:bg-white/5 transition-colors"
                  >
                    {link.label}
                  </Link>
                ))}
                <Link
                  href="/settings"
                  onClick={() => setMobileOpen(false)}
                  className="block px-3 py-2.5 rounded-md text-sm text-kenyx-text-secondary hover:text-kenyx-text-primary hover:bg-white/5 transition-colors"
                >
                  Settings
                </Link>
                <div className="pt-3 border-t border-kenyx-border flex gap-2">
                  {user ? (
                    <button onClick={() => { logout(); setMobileOpen(false); }} className="btn-outline flex-1 justify-center">
                      Sign out
                    </button>
                  ) : (
                    <>
                      <Link href="/login" onClick={() => setMobileOpen(false)} className="btn-outline flex-1 justify-center">Sign in</Link>
                      <Link href="/signup" onClick={() => setMobileOpen(false)} className="btn-accent flex-1 justify-center">Get started</Link>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>
    </>
  );
}
