"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { adminApi } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  Users, Shield, Mail, Calendar,
  Search, Filter, MoreVertical, ExternalLink,
  Award, Zap, Trash2, ShieldCheck, ShieldOff,
  Ban, CheckCircle, X,
} from "lucide-react";
import clsx from "clsx";

interface User {
  id: string;
  username: string;
  email: string;
  role: string;
  is_banned: boolean;
  reputation: number;
  streak: number;
  last_active: string;
  created_at: string;
  avatar_url?: string;
}

export default function UserManagementPage() {
  const { user: currentUser } = useAuthStore();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [actionMenu, setActionMenu] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<User | null>(null);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    if (!currentUser) { router.push("/login"); return; }
    if (currentUser.role !== "admin") {
      router.push("/");
      toast.error("Admin access required");
      return;
    }
    fetchUsers();
  }, [currentUser, router]);

  const fetchUsers = () => {
    adminApi.users()
      .then(setUsers)
      .catch(() => toast.error("Failed to load user list"))
      .finally(() => setLoading(false));
  };

  const handleDelete = async (user: User) => {
    setProcessing(user.id);
    try {
      await adminApi.deleteUser(user.id);
      setUsers(prev => prev.filter(u => u.id !== user.id));
      toast.success(`User "${user.username}" has been anonymized and removed.`);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Failed to delete user";
      toast.error(msg);
    } finally {
      setProcessing(null);
      setConfirmDelete(null);
    }
  };

  const handleBanToggle = async (user: User) => {
    const newBanned = !user.is_banned;
    setProcessing(user.id);
    setActionMenu(null);
    try {
      await adminApi.banUser(user.id, newBanned);
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, is_banned: newBanned } : u));
      toast.success(newBanned
        ? `"${user.username}" has been suspended.`
        : `"${user.username}" has been reinstated.`
      );
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Failed to update ban status";
      toast.error(msg);
    } finally {
      setProcessing(null);
    }
  };

  const handleRoleToggle = async (user: User) => {
    const newRole = user.role === "admin" ? "user" : "admin";
    setProcessing(user.id);
    setActionMenu(null);
    try {
      await adminApi.updateUserRole(user.id, newRole);
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, role: newRole } : u));
      toast.success(`"${user.username}" is now ${newRole === "admin" ? "an Admin" : "a regular User"}.`);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Failed to update role";
      toast.error(msg);
    } finally {
      setProcessing(null);
    }
  };

  const filteredUsers = users.filter(u =>
    u.username.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-kenyx-bg">
        <div className="h-10 w-10 rounded-full border-2 border-kenyx-accent border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-grid-sm flex flex-col" onClick={() => setActionMenu(null)}>
      <div
        className="h-px w-full shrink-0"
        style={{ background: "linear-gradient(90deg, transparent, #a8ff3e 15%, rgba(168,255,62,0.3) 50%, transparent)" }}
      />

      <div className="mx-auto w-full max-w-7xl px-5 py-12 flex-1">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div className="flex items-center gap-4">
            <div
              className="h-12 w-12 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: "rgba(168,255,62,0.08)", border: "1px solid rgba(168,255,62,0.2)" }}
            >
              <Users className="h-6 w-6 text-kenyx-accent" />
            </div>
            <div>
              <div className="section-label mb-1">Accounts</div>
              <h1 className="text-3xl font-black text-white tracking-tight">Manage Users.</h1>
              <p className="text-sm text-kenyx-text-muted mt-1">Found {users.length} registered accounts.</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-kenyx-text-muted" />
              <input
                type="text"
                placeholder="Search username or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="kenyx-input pl-10 py-2.5 text-sm md:w-64"
              />
            </div>
            <button className="btn-secondary py-2.5 px-4 h-[42px]">
              <Filter className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* User Table */}
        <div className="card overflow-hidden border-white/5">
          <div className="overflow-x-auto min-h-[350px]">
            <table className="w-full text-left border-collapse">
              <thead className="bg-white/5 text-[10px] font-bold uppercase tracking-widest text-kenyx-text-muted border-b border-white/5">
                <tr>
                  <th className="px-6 py-4">User</th>
                  <th className="px-6 py-4">Status & Role</th>
                  <th className="px-6 py-4">Performance</th>
                  <th className="px-6 py-4">Joined</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredUsers.map((u) => {
                  const isMe = u.id === currentUser?.id;
                  const isBusy = processing === u.id;

                  return (
                    <tr key={u.id} className={clsx("hover:bg-white/[0.02] transition-colors group", u.is_banned && "opacity-60")}>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-kenyx-surface border border-white/10 flex items-center justify-center shrink-0 overflow-hidden">
                            {u.avatar_url ? (
                              <img src={u.avatar_url} alt={u.username} className="h-full w-full object-cover" />
                            ) : (
                              <span className="text-sm font-bold text-kenyx-accent">{u.username.substring(0, 2).toUpperCase()}</span>
                            )}
                          </div>
                          <div>
                            <div className="text-sm font-bold text-white flex items-center gap-1.5">
                              {u.username}
                              {isMe && <span className="text-[9px] bg-white/10 px-1 py-0.5 rounded text-kenyx-text-muted">You</span>}
                              {u.is_banned && <span className="text-[9px] bg-red-500/20 text-red-400 border border-red-500/30 px-1 py-0.5 rounded font-bold uppercase">Banned</span>}
                            </div>
                            <div className="text-xs text-kenyx-text-muted flex items-center gap-1.5">
                              <Mail className="h-3 w-3" />
                              {u.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center gap-2">
                            <span className={clsx(
                              "text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider",
                              u.role === "admin" ? "bg-purple-500/10 text-purple-400 border border-purple-500/20" : "bg-white/5 text-kenyx-text-muted border border-white/10"
                            )}>
                              {u.role}
                            </span>
                            {u.role === "admin" && <Shield className="h-3 w-3 text-purple-400" />}
                          </div>
                          <div className={clsx("text-[10px] flex items-center gap-1.5 uppercase font-bold", u.is_banned ? "text-red-400" : "text-kenyx-text-muted")}>
                            <span className={clsx("h-1 w-1 rounded-full", u.is_banned ? "bg-red-500" : "bg-green-500")} />
                            {u.is_banned ? "Suspended" : `Active ${new Date(u.last_active).toLocaleDateString()}`}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-4">
                          <div className="flex flex-col">
                            <div className="flex items-center gap-1 text-xs font-bold text-white">
                              <Award className="h-3 w-3 text-kenyx-accent" />
                              {u.reputation}
                            </div>
                            <span className="text-[10px] text-kenyx-text-muted uppercase font-bold tracking-tighter">Reputation</span>
                          </div>
                          <div className="flex flex-col">
                            <div className="flex items-center gap-1 text-xs font-bold text-white">
                              <Zap className="h-3 w-3 text-orange-400" />
                              {u.streak}
                            </div>
                            <span className="text-[10px] text-kenyx-text-muted uppercase font-bold tracking-tighter">Streak</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="text-xs text-kenyx-text-secondary flex items-center gap-1.5">
                          <Calendar className="h-3 w-3" />
                          {new Date(u.created_at).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-5 text-right">
                        {isMe ? (
                          <span className="text-[10px] text-kenyx-text-muted italic">—</span>
                        ) : (
                          <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => router.push(`/profile/${u.username}`)}
                              className="p-2 rounded-lg hover:bg-white/10 text-kenyx-text-muted hover:text-white transition-colors"
                              title="View profile"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </button>

                            <div className="relative">
                              <button
                                disabled={isBusy}
                                onClick={() => setActionMenu(actionMenu === u.id ? null : u.id)}
                                className="p-2 rounded-lg hover:bg-white/10 text-kenyx-text-muted hover:text-white transition-colors disabled:opacity-40"
                                title="More actions"
                              >
                                {isBusy
                                  ? <div className="h-4 w-4 rounded-full border-2 border-kenyx-accent border-t-transparent animate-spin" />
                                  : <MoreVertical className="h-4 w-4" />
                                }
                              </button>

                              <AnimatePresence>
                                {actionMenu === u.id && (
                                  <motion.div
                                    initial={{ opacity: 0, scale: 0.95, y: -4 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95, y: -4 }}
                                    transition={{ duration: 0.12 }}
                                    className="absolute right-0 top-10 z-50 min-w-[185px] rounded-xl border border-white/10 shadow-2xl overflow-hidden"
                                    style={{ background: "#111" }}
                                  >
                                    {/* Ban / Unban — primary moderation action */}
                                    <button
                                      onClick={() => handleBanToggle(u)}
                                      className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-white/5 transition-colors text-left"
                                    >
                                      {u.is_banned ? (
                                        <>
                                          <CheckCircle className="h-4 w-4 text-green-400" />
                                          <div>
                                            <div className="text-white font-medium">Unban User</div>
                                            <div className="text-[10px] text-kenyx-text-muted">Restore access</div>
                                          </div>
                                        </>
                                      ) : (
                                        <>
                                          <Ban className="h-4 w-4 text-orange-400" />
                                          <div>
                                            <div className="text-white font-medium">Suspend User</div>
                                            <div className="text-[10px] text-kenyx-text-muted">Block login, keep data</div>
                                          </div>
                                        </>
                                      )}
                                    </button>

                                    {/* Promote / Demote */}
                                    <button
                                      onClick={() => handleRoleToggle(u)}
                                      className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-white/5 transition-colors text-left"
                                    >
                                      {u.role === "admin" ? (
                                        <>
                                          <ShieldOff className="h-4 w-4 text-yellow-400" />
                                          <div>
                                            <div className="text-white font-medium">Demote to User</div>
                                            <div className="text-[10px] text-kenyx-text-muted">Remove admin access</div>
                                          </div>
                                        </>
                                      ) : (
                                        <>
                                          <ShieldCheck className="h-4 w-4 text-purple-400" />
                                          <div>
                                            <div className="text-white font-medium">Promote to Admin</div>
                                            <div className="text-[10px] text-kenyx-text-muted">Grant admin access</div>
                                          </div>
                                        </>
                                      )}
                                    </button>

                                    <div className="border-t border-white/5" />

                                    {/* Delete — permanent, destructive */}
                                    <button
                                      onClick={() => { setConfirmDelete(u); setActionMenu(null); }}
                                      className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-red-500/10 transition-colors text-left"
                                    >
                                      <Trash2 className="h-4 w-4 text-red-400" />
                                      <div>
                                        <div className="text-red-400 font-medium">Anonymize & Remove</div>
                                        <div className="text-[10px] text-red-400/60">Wipe PII, keep community data</div>
                                      </div>
                                    </button>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filteredUsers.length === 0 && (
            <div className="py-20 text-center">
              <Search className="h-12 w-12 text-kenyx-text-muted mx-auto mb-4 opacity-20" />
              <p className="text-sm font-medium text-white">
                {search ? `No users found matching "${search}"` : "No users registered yet."}
              </p>
              <p className="text-xs text-kenyx-text-muted mt-1">
                {search ? "Try another keyword or clear the search." : "Users will appear here once they sign up."}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {confirmDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
            onClick={() => setConfirmDelete(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="card p-6 max-w-sm w-full"
              style={{ border: "1px solid rgba(239,68,68,0.3)" }}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="h-10 w-10 rounded-full bg-red-500/10 flex items-center justify-center">
                  <Trash2 className="h-5 w-5 text-red-400" />
                </div>
                <button onClick={() => setConfirmDelete(null)} className="text-kenyx-text-muted hover:text-white transition-colors">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <h3 className="text-lg font-bold text-white mb-1">Anonymize User?</h3>
              <p className="text-sm text-kenyx-text-muted mb-1">You are about to anonymize:</p>
              <p className="text-sm font-semibold text-white mb-1">{confirmDelete.username}</p>
              <p className="text-xs text-kenyx-text-muted mb-4">{confirmDelete.email}</p>
              <div className="rounded-lg p-3 mb-5" style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)" }}>
                <p className="text-xs text-red-400 font-medium mb-1">⚠️ This will:</p>
                <ul className="text-xs text-red-400/70 space-y-0.5 list-disc list-inside">
                  <li>Wipe name, email, password &amp; avatar</li>
                  <li>Rename to <code className="font-mono">deleted_user_xxxx</code></li>
                  <li>Permanently ban the account</li>
                </ul>
                <p className="text-xs text-green-400/70 mt-2">✓ Submissions &amp; problems are kept for the community.</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmDelete(null)}
                  className="btn-secondary flex-1 py-2.5 text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(confirmDelete)}
                  disabled={processing === confirmDelete.id}
                  className="flex-1 py-2.5 px-4 rounded-lg text-sm font-bold bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 transition-colors disabled:opacity-50"
                >
                  {processing === confirmDelete.id ? "Anonymizing..." : "Anonymize & Remove"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
