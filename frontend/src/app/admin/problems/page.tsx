"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { problemsApi } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  Shield, BookOpen, Plus, Search, Filter, 
  MoreVertical, Edit2, Trash2, ExternalLink,
  CheckCircle2, Clock, XCircle, AlertCircle
} from "lucide-react";
import Link from "next/link";
import clsx from "clsx";

interface Problem {
  id: string;
  slug: string;
  title: string;
  difficulty: string;
  status: string;
  creator_name: string;
  created_at: string;
  solves: number;
}

export default function AdminProblemsPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [problems, setProblems] = useState<Problem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchProblems = async () => {
    setLoading(true);
    try {
      // Use the standard problemsApi which handles absolute URLs and tokens
      const data = await problemsApi.list({ status: "all" });
      setProblems(data?.data || []);
    } catch (err) {
      toast.error("Failed to fetch problems");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProblems();
  }, []);

  const handleDelete = async (slug: string) => {
    if (!confirm("Are you sure you want to delete this problem? This action is permanent.")) return;
    
    try {
      await problemsApi.delete(slug);
      toast.success("Problem deleted");
      fetchProblems();
    } catch (err) {
      toast.error("Delete failed");
    }
  };

  const filtered = problems.filter(p => 
    p.title.toLowerCase().includes(search.toLowerCase()) || 
    p.slug.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="h-14 w-14 rounded-2xl flex items-center justify-center bg-kenyx-accent/10 border border-kenyx-accent/20 shadow-lg">
            <BookOpen className="h-7 w-7 text-kenyx-accent" />
          </div>
          <div>
            <div className="section-label mb-1">Content Management</div>
            <h1 className="text-4xl font-black text-white tracking-tight">Problem Library.</h1>
            <p className="text-sm text-kenyx-text-muted mt-1.5">Manage and moderate all platform challenges.</p>
          </div>
        </div>

        <Link href="/create" className="btn-accent py-3 px-6 text-sm">
          <Plus className="h-4 w-4" />
          New Problem
        </Link>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/5">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-kenyx-text-muted" />
          <input 
            type="text" 
            placeholder="Search by title or slug..."
            className="kenyx-input pl-11 py-2.5 text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button className="btn-secondary py-2.5 px-4 text-xs flex items-center gap-2 flex-1 sm:flex-none">
            <Filter className="h-3.5 w-3.5" /> Filter
          </button>
        </div>
      </div>

      {/* Problems Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.02]">
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-kenyx-text-muted">Problem</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-kenyx-text-muted">Status</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-kenyx-text-muted">Difficulty</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-kenyx-text-muted">Creator</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-kenyx-text-muted text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={5} className="px-6 py-4"><div className="h-10 bg-white/5 rounded-lg" /></td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center text-kenyx-text-muted">
                    <div className="flex flex-col items-center gap-3">
                      <AlertCircle className="h-10 w-10 opacity-20" />
                      <p>No problems found.</p>
                    </div>
                  </td>
                </tr>
              ) : filtered.map((problem) => (
                <tr key={problem.id} className="hover:bg-white/[0.02] transition-colors group">
                  <td className="px-6 py-5">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-white group-hover:text-kenyx-accent transition-colors">{problem.title}</span>
                      <span className="text-[10px] text-kenyx-text-muted font-mono">{problem.slug}</span>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-2">
                      {problem.status === 'approved' ? (
                        <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-green-500 bg-green-500/10 px-2 py-0.5 rounded">
                          <CheckCircle2 className="h-3 w-3" /> Live
                        </span>
                      ) : problem.status === 'pending' ? (
                        <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-yellow-500 bg-yellow-500/10 px-2 py-0.5 rounded">
                          <Clock className="h-3 w-3" /> Pending
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-red-500 bg-red-500/10 px-2 py-0.5 rounded">
                          <XCircle className="h-3 w-3" /> {problem.status}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <span className={clsx(
                      "text-[10px] font-bold uppercase px-2 py-0.5 rounded",
                      problem.difficulty === 'easy' ? "text-green-500 bg-green-500/5" :
                      problem.difficulty === 'medium' ? "text-yellow-500 bg-yellow-500/5" : "text-red-500 bg-red-500/5"
                    )}>
                      {problem.difficulty}
                    </span>
                  </td>
                  <td className="px-6 py-5">
                    <span className="text-xs text-kenyx-text-secondary">{problem.creator_name}</span>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center justify-end gap-2">
                      <Link 
                        href={`/problems/${problem.slug}`} 
                        className="p-2 rounded-lg hover:bg-white/5 text-kenyx-text-muted hover:text-white transition-all"
                        title="View Problem"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                      <button 
                        className="p-2 rounded-lg hover:bg-white/5 text-kenyx-text-muted hover:text-kenyx-accent transition-all"
                        title="Edit Problem"
                        onClick={() => router.push(`/admin/problems/${problem.slug}/edit`)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button 
                        className="p-2 rounded-lg hover:bg-white/5 text-kenyx-text-muted hover:text-red-500 transition-all"
                        title="Delete Problem"
                        onClick={() => handleDelete(problem.slug)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
