"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { adminApi } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  Shield, BarChart3, Users, BookOpen, Clock, 
  ChevronRight, ArrowUpRight, Zap, Target,
} from "lucide-react";
import Link from "next/link";
import clsx from "clsx";

interface Stats {
  total_users: number;
  total_problems: number;
  total_submissions: number;
  pending_problems: number;
  approved_problems: number;
  active_battles: number;
  difficulty_freq: Record<string, number>;
}

export default function AdminDashboardPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.stats()
      .then(setStats)
      .catch((err) => {
        console.error("Failed to fetch admin stats:", err);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-kenyx-bg">
        <div className="h-10 w-10 rounded-full border-2 border-kenyx-accent border-t-transparent animate-spin" />
      </div>
    );
  }

  const cards = [
    { label: "Community", value: stats?.total_users || 0, icon: Users, sub: "Registered Developers", color: "#6366f1", href: "/admin/users" },
    { label: "Content", value: stats?.total_problems || 0, icon: BookOpen, sub: "Coding Problems", color: "#3fb950", href: "/admin/problems" },
    { label: "Execution", value: stats?.total_submissions || 0, icon: Zap, sub: "Total Submissions", color: "#e3b341" },
    { label: "Competition", value: stats?.active_battles || 0, icon: Target, sub: "Active 1v1 Battles", color: "#f85149" },
  ];

  return (
    <div className="flex flex-col">
      <div className="w-full flex-1">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div className="flex items-center gap-5">
            <div
              className="h-14 w-14 rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-kenyx-accent/10"
              style={{ background: "rgba(168,255,62,0.08)", border: "1px solid rgba(168,255,62,0.2)" }}
            >
              <Shield className="h-7 w-7 text-kenyx-accent" />
            </div>
            <div>
              <div className="section-label mb-1">Superuser</div>
              <h1 className="text-4xl font-black text-kenyx-text-primary tracking-tight">Control Center.</h1>
              <p className="text-sm text-kenyx-text-muted mt-1.5 flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                Live Status: Platform Operational
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
             <Link href="/admin/review" className="btn-secondary py-2.5 px-5 text-sm">
                Queue ({stats?.pending_problems || 0})
             </Link>
             <Link href="/create" className="btn-accent py-2.5 px-5 text-sm">
                Add Problem
             </Link>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {cards.map((card, i) => (
            <Link 
              key={card.label} 
              href={card.href || "#"}
              className={clsx(!card.href && "pointer-events-none")}
            >
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="card p-6 group hover:border-kenyx-accent/30 transition-all duration-300 overflow-hidden relative h-full"
              >
                <div className="flex items-center justify-between mb-4">
                  <div 
                     className="p-2.5 rounded-xl bg-white/5 group-hover:bg-opacity-10 transition-colors"
                     style={{ color: card.color }}
                  >
                    <card.icon className="h-5 w-5" />
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-kenyx-text-muted opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0" />
                </div>
                <div className="text-4xl font-black text-white mb-1">{card.value.toLocaleString()}</div>
                <div className="text-xs font-bold uppercase tracking-widest text-kenyx-text-muted mb-4">{card.label}</div>
                <div className="text-[10px] text-kenyx-text-muted font-medium bg-white/5 py-1 px-2 rounded-md inline-block">
                  {card.sub}
                </div>
                
                {/* Decorative gradient corner */}
                <div 
                  className="absolute -right-4 -bottom-4 w-24 h-24 blur-3xl opacity-10 group-hover:opacity-20 transition-opacity"
                  style={{ background: card.color }}
                />
              </motion.div>
            </Link>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main management area */}
          <div className="lg:col-span-2 space-y-8">
             <section>
                <div className="flex items-center justify-between mb-6">
                   <h2 className="text-lg font-bold text-white flex items-center gap-2">
                      <Clock className="h-4 w-4 text-kenyx-accent" />
                      Platform Health
                   </h2>
                </div>
                <div className="card p-8 bg-grid-white/5">
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                      <div>
                        <span className="text-[10px] uppercase font-bold tracking-tighter text-kenyx-text-muted block mb-4">Moderation Status</span>
                        <div className="space-y-4">
                           <div className="flex items-center justify-between group cursor-pointer" onClick={() => router.push("/admin/review")}>
                              <span className="text-sm text-kenyx-text-secondary group-hover:text-white transition-colors">Pending Review</span>
                              <span className={clsx("text-xs font-bold px-2 py-0.5 rounded", (stats?.pending_problems || 0) > 0 ? "bg-red-500/10 text-red-500" : "bg-white/5 text-kenyx-text-muted")}>
                                {stats?.pending_problems || 0}
                              </span>
                           </div>
                           <div className="flex items-center justify-between">
                              <span className="text-sm text-kenyx-text-secondary">Approved Content</span>
                              <span className="text-xs font-bold text-kenyx-accent">{stats?.approved_problems || 0}</span>
                           </div>
                        </div>
                      </div>
                      
                      <div className="md:border-x border-white/5 md:px-8">
                        <span className="text-[10px] uppercase font-bold tracking-tighter text-kenyx-text-muted block mb-4">Difficulty Spread</span>
                        <div className="space-y-2">
                           {['easy', 'medium', 'hard'].map(diff => (
                             <div key={diff} className="flex items-center gap-3">
                                <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
                                   <div 
                                      className="h-full rounded-full transition-all duration-1000"
                                      style={{ 
                                        width: `${((stats?.difficulty_freq[diff] || 0) / (stats?.total_problems || 1)) * 100}%`,
                                        background: diff === 'easy' ? '#3fb950' : diff === 'medium' ? '#e3b341' : '#f85149'
                                      }}
                                   />
                                </div>
                                <span className="text-[10px] font-bold text-kenyx-text-muted uppercase w-12">{diff}</span>
                             </div>
                           ))}
                        </div>
                      </div>

                      <div>
                        <span className="text-[10px] uppercase font-bold tracking-tighter text-kenyx-text-muted block mb-4">Quick Actions</span>
                         <div className="flex flex-col gap-2">
                           <Link href="/admin/problems" className="text-xs font-bold text-kenyx-text-primary hover:text-kenyx-accent flex items-center justify-between p-2 rounded-lg hover:bg-white/5 transition-all">
                              Manage Problems
                              <ChevronRight className="h-3 w-3" />
                           </Link>
                           <Link href="/admin/users" className="text-xs font-bold text-kenyx-text-primary hover:text-kenyx-accent flex items-center justify-between p-2 rounded-lg hover:bg-white/5 transition-all">
                              Manage Users
                              <ChevronRight className="h-3 w-3" />
                           </Link>
                           <Link href="/admin/review" className="text-xs font-bold text-kenyx-text-primary hover:text-kenyx-accent flex items-center justify-between p-2 rounded-lg hover:bg-white/5 transition-all">
                              Review Queue
                              <ChevronRight className="h-3 w-3" />
                           </Link>
                         </div>
                      </div>
                   </div>
                </div>
             </section>
          </div>

          {/* Sidebar logic */}
          <div className="space-y-8">
             <section>
                <h2 className="text-lg font-bold text-white mb-6">Recent Activity</h2>
                <div className="space-y-4">
                   {[1, 2, 3].map(i => (
                     <div key={i} className="card p-4 flex items-start gap-4">
                        <div className="h-8 w-8 rounded-lg bg-kenyx-accent/10 flex items-center justify-center shrink-0">
                           <Zap className="h-4 w-4 text-kenyx-accent" />
                        </div>
                        <div>
                           <p className="text-xs text-white font-medium">New implementation submitted</p>
                           <p className="text-[10px] text-kenyx-text-muted mt-0.5">2 minutes ago • Problem #12</p>
                        </div>
                     </div>
                   ))}
                </div>
             </section>
          </div>
        </div>
      </div>
    </div>
  );
}
