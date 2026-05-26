"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { adminApi, problemsApi } from "@/lib/api";
import toast from "react-hot-toast";
import { 
  CheckCircle2, XCircle, Clock, Eye, 
  Trash2, AlertCircle, Loader2, ChevronRight,
  Code2, TestTube2, Scale, TagIcon, ArrowLeft
} from "lucide-react";
import Link from "next/link";
import clsx from "clsx";

interface TestCase {
  input: string;
  expected: string;
  is_sample: boolean;
}

interface Problem {
  id: string;
  slug: string;
  title: string;
  description: string;
  difficulty: string;
  status: string;
  creator_name: string;
  comparison_mode: string;
  created_at: string;
  test_cases?: TestCase[];
}

export default function ModerationPage() {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [reviewing, setReviewing] = useState<Problem | null>(null);
  const [processing, setProcessing] = useState<string | null>(null);

  const fetchPending = async () => {
    try {
      const data = await adminApi.pending();
      setProblems(data || []);
    } catch (err) {
      toast.error("Failed to fetch pending problems");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPending();
  }, []);

  const handleReview = async (slug: string) => {
    setSelectedSlug(slug);
    try {
      const res = await problemsApi.get(slug);
      const data = res.problem;
      setReviewing(data);
    } catch (err) {
      toast.error("Failed to load problem details");
    }
  };

  const approve = async (slug: string) => {
    setProcessing(slug);
    try {
      await adminApi.approve(slug);
      toast.success("Problem approved and published! 🚀");
      setProblems(problems.filter(p => p.slug !== slug));
      setReviewing(null);
    } catch (err) {
      toast.error("Approval failed");
    } finally {
      setProcessing(null);
    }
  };

  const reject = async (slug: string) => {
    const reason = window.prompt("Reason for rejection:");
    if (reason === null) return;
    
    setProcessing(slug);
    try {
      await adminApi.reject(slug, reason);
      toast.success("Problem rejected.");
      setProblems(problems.filter(p => p.slug !== slug));
      setReviewing(null);
    } catch (err) {
      toast.error("Rejection failed");
    } finally {
      setProcessing(null);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 text-kenyx-accent animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tighter mb-2">
            Moderation Queue
          </h1>
          <p className="text-sm text-kenyx-text-muted">
            Vetting community challenges for quality and integrity.
          </p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10">
          <Clock className="h-4 w-4 text-kenyx-accent" />
          <span className="text-xs font-bold text-white">{problems.length} Pending</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* List Column */}
        <div className="lg:col-span-1 space-y-4">
          <AnimatePresence mode="popLayout">
            {problems.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="card p-8 text-center"
              >
                <div className="bg-kenyx-accent/10 w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="h-6 w-6 text-kenyx-accent" />
                </div>
                <h3 className="text-white font-bold mb-1">Queue Clear</h3>
                <p className="text-xs text-kenyx-text-muted">No problems waiting for review.</p>
              </motion.div>
            ) : (
              problems.map((p) => (
                <motion.div
                  key={p.id}
                  layout
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  onClick={() => handleReview(p.slug)}
                  className={clsx(
                    "card p-4 cursor-pointer transition-all border-l-4 group",
                    selectedSlug === p.slug ? "bg-white/10 border-kenyx-accent" : "hover:bg-white/5 border-transparent"
                  )}
                >
                  <div className="flex justify-between items-start gap-3">
                    <div className="min-w-0">
                      <h4 className="text-sm font-bold text-white truncate group-hover:text-kenyx-accent transition-colors">
                        {p.title}
                      </h4>
                      <p className="text-[10px] text-kenyx-text-muted mt-1 uppercase font-bold tracking-tight">
                        By {p.creator_name}
                      </p>
                    </div>
                    <div className={clsx(
                      "text-[9px] font-black uppercase px-1.5 py-0.5 rounded",
                      p.difficulty === 'hard' ? "bg-kenyx-danger/10 text-kenyx-danger" :
                      p.difficulty === 'medium' ? "bg-kenyx-warning/10 text-kenyx-warning" : "bg-kenyx-success/10 text-kenyx-success"
                    )}>
                      {p.difficulty}
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>

        {/* Review Column */}
        <div className="lg:col-span-2">
          <AnimatePresence mode="wait">
            {!reviewing ? (
              <motion.div 
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="h-full min-h-[400px] rounded-3xl border-2 border-dashed border-white/5 flex flex-col items-center justify-center text-center p-8"
              >
                <Eye className="h-12 w-12 text-white/10 mb-4" />
                <p className="text-sm text-kenyx-text-muted">Select a problem to start the review.</p>
              </motion.div>
            ) : (
              <motion.div 
                key={reviewing.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="card p-0 overflow-hidden"
              >
                {/* Header Section */}
                <div className="p-8 border-b border-white/5 bg-gradient-to-br from-white/5 to-transparent">
                  <div className="flex justify-between items-start mb-4">
                    <h2 className="text-2xl font-black text-white tracking-tighter">
                      {reviewing.title}
                    </h2>
                    <div className="flex gap-2">
                      <button 
                         onClick={() => reject(reviewing.slug)}
                         disabled={processing === reviewing.slug}
                         className="h-10 w-10 flex items-center justify-center rounded-xl bg-kenyx-danger/10 text-kenyx-danger border border-kenyx-danger/20 hover:bg-kenyx-danger hover:text-white transition-all disabled:opacity-50"
                         title="Reject"
                      >
                        <XCircle className="h-5 w-5" />
                      </button>
                      <button 
                         onClick={() => approve(reviewing.slug)}
                         disabled={processing === reviewing.slug}
                         className="h-10 px-6 flex items-center justify-center gap-2 rounded-xl bg-kenyx-accent text-kenyx-bg font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                      >
                        {processing === reviewing.slug ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                        Approve
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-4 text-[10px] font-bold uppercase tracking-wider text-kenyx-text-muted">
                    <div className="flex items-center gap-1.5 bg-white/5 px-3 py-1 rounded-lg">
                      <Clock className="h-3 w-3 text-kenyx-accent" />
                      Submitted {new Date(reviewing.created_at).toLocaleDateString()}
                    </div>
                    <div className="flex items-center gap-1.5 bg-white/5 px-3 py-1 rounded-lg text-white">
                      <Scale className="h-3 w-3 text-kenyx-accent" />
                      Grading: {reviewing.comparison_mode}
                    </div>
                  </div>
                </div>

                {/* Content Section */}
                <div className="p-8 space-y-8 h-[600px] overflow-y-auto custom-scrollbar">
                  {/* Description */}
                  <section>
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-kenyx-text-secondary mb-4">
                      <Code2 className="h-3.5 w-3.5" /> Description
                    </div>
                    <div className="prose prose-invert prose-sm max-w-none bg-white/5 p-6 rounded-2xl border border-white/5 leading-relaxed">
                      {reviewing.description}
                    </div>
                  </section>

                  {/* Test Cases */}
                  <section>
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-kenyx-text-secondary mb-4">
                      <TestTube2 className="h-3.5 w-3.5" /> Test Cases ({reviewing.test_cases?.length || 0})
                    </div>
                    <div className="space-y-3">
                      {reviewing.test_cases?.map((tc, i) => (
                        <div key={i} className="flex gap-4 p-4 rounded-xl bg-white/5 border border-white/5 group hover:border-white/10 transition-colors">
                          <div className="shrink-0 text-[10px] font-black text-white/20 pt-1">
                            {i + 1}
                          </div>
                          <div className="grid grid-cols-2 gap-4 flex-1">
                            <div>
                              <div className="text-[9px] uppercase font-bold text-kenyx-text-muted mb-1.5">Input</div>
                              <code className="block text-[11px] font-mono p-2 bg-black/40 rounded border border-white/5 text-white/80 whitespace-pre-wrap">
                                {tc.input}
                              </code>
                            </div>
                            <div>
                               <div className="text-[9px] uppercase font-bold text-kenyx-text-muted mb-1.5">Expected</div>
                               <code className="block text-[11px] font-mono p-2 bg-black/40 rounded border border-white/5 text-kenyx-accent whitespace-pre-wrap">
                                 {tc.expected}
                               </code>
                            </div>
                          </div>
                          {tc.is_sample && (
                            <div className="shrink-0 pt-1">
                               <span className="text-[8px] bg-white/10 text-white px-1.5 py-0.5 rounded font-black uppercase tracking-tighter">Sample</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </section>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
