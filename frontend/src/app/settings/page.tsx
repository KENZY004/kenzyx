"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth";
import { usersApi } from "@/lib/api";
import { motion } from "framer-motion";
import { 
  User, 
  Mail, 
  Shield, 
  Save, 
  Loader2, 
  Camera, 
  ArrowLeft,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import toast from "react-hot-toast";
import Link from "next/link";
import clsx from "clsx";

export default function SettingsPage() {
  const { user, isInitialized, setUser } = useAuthStore();
  const router = useRouter();
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    bio: "",
    avatar_url: "",
  });

  useEffect(() => {
    if (isInitialized && !user) {
      router.push("/login?redirect=/settings");
      return;
    }

    if (user) {
      setFormData({
        bio: user.bio || "",
        avatar_url: user.avatar_url || "",
      });
    }
  }, [user, isInitialized, router]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await usersApi.updateMe(formData);
      // Update local store user
      if (user) {
        setUser({ ...user, ...formData });
      }
      toast.success("Profile updated successfully!");
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  if (!isInitialized || !user) {
    return (
      <div className="min-h-[calc(100vh-56px)] flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-kenyx-accent animate-spin" />
      </div>
    );
  }

  return (
    <main className="min-h-[calc(100vh-56px)] py-12 px-5">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <div>
            <Link 
              href="/dashboard" 
              className="flex items-center gap-2 text-xs font-bold text-kenyx-text-muted hover:text-kenyx-text-primary transition-colors mb-2 uppercase tracking-widest"
            >
              <ArrowLeft className="h-3 w-3" /> Back to Dashboard
            </Link>
            <h1 className="text-3xl font-black text-white">Account Settings</h1>
            <p className="text-sm text-kenyx-text-muted mt-1">Manage your public profile and preferences.</p>
          </div>
          
          <div className="hidden sm:flex items-center gap-3">
             <div className={clsx(
               "px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2 border",
               user.role === 'admin' ? "bg-kenyx-warning/10 text-kenyx-warning border-kenyx-warning/20" : "bg-white/5 text-kenyx-text-muted border-white/10"
             )}>
                <Shield className="h-3 w-3" />
                {user.role} Account
             </div>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          {/* Profile Section */}
          <div className="card p-8">
            <div className="flex flex-col md:flex-row gap-8 items-start">
              {/* Avatar Upload Placeholder */}
              <div className="relative group shrink-0 mx-auto md:mx-0">
                <div className="h-32 w-32 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden">
                  {formData.avatar_url ? (
                    <img src={formData.avatar_url} alt="Avatar" className="h-full w-full object-cover" />
                  ) : (
                    <User className="h-12 w-12 text-kenyx-text-muted" />
                  )}
                </div>
                <div className="absolute inset-0 bg-kenyx-bg/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-3xl cursor-pointer">
                  <Camera className="h-6 w-6 text-white" />
                </div>
              </div>

              <div className="flex-1 w-full space-y-6">
                {/* Username (Locked) */}
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-kenyx-text-muted block mb-2">Username</label>
                  <div className="flex items-center gap-3 kenyx-input opacity-60 cursor-not-allowed">
                    <User className="h-4 w-4 text-kenyx-text-muted" />
                    <span className="text-sm font-medium text-white">{user.username}</span>
                  </div>
                  <p className="text-[10px] text-kenyx-text-muted mt-2">Usernames cannot be changed at this time.</p>
                </div>

                {/* Email (Locked) */}
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-kenyx-text-muted block mb-2">Email Address</label>
                  <div className="flex items-center gap-3 kenyx-input opacity-60 cursor-not-allowed">
                    <Mail className="h-4 w-4 text-kenyx-text-muted" />
                    <span className="text-sm font-medium text-white">{user.email}</span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-2">
                    {user.is_verified ? (
                      <span className="flex items-center gap-1 text-[10px] text-kenyx-success font-bold uppercase tracking-tighter">
                        <CheckCircle2 className="h-3 w-3" /> Verified
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[10px] text-kenyx-warning font-bold uppercase tracking-tighter">
                        <AlertCircle className="h-3 w-3" /> Unverified
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Details Section */}
          <div className="card p-8 space-y-6">
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-kenyx-text-muted block mb-2">Profile Picture URL</label>
              <input 
                type="url"
                value={formData.avatar_url}
                onChange={(e) => setFormData({ ...formData, avatar_url: e.target.value })}
                placeholder="https://example.com/avatar.jpg"
                className="kenyx-input text-sm"
              />
            </div>

            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-kenyx-text-muted block mb-2">Bio</label>
              <textarea 
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                placeholder="Tell the world about yourself..."
                className="kenyx-input text-sm resize-none h-32"
              />
              <p className="text-[10px] text-kenyx-text-muted mt-2">Brief description for your profile. Max 500 characters.</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-4">
             <button 
               type="button" 
               onClick={() => router.back()}
               className="btn-ghost"
               disabled={saving}
             >
               Cancel
             </button>
             <button 
               type="submit" 
               className="btn-accent flex items-center gap-2"
               disabled={saving}
             >
               {saving ? (
                 <>
                   <Loader2 className="h-4 w-4 animate-spin" /> Saving...
                 </>
               ) : (
                 <>
                   <Save className="h-4 w-4" /> Save Changes
                 </>
               )}
             </button>
          </div>
        </form>

        {/* Danger Zone */}
        <div className="mt-12 pt-12 border-t border-white/5">
           <h2 className="text-lg font-bold text-white mb-4">Danger Zone</h2>
           <div className="card border-kenyx-danger/20 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                 <h3 className="text-sm font-bold text-white">Delete Account</h3>
                 <p className="text-xs text-kenyx-text-muted mt-1">Once deleted, your account and all data cannot be recovered.</p>
              </div>
              <button className="btn-outline border-kenyx-danger/30 text-kenyx-danger hover:bg-kenyx-danger/10 text-xs px-5">
                Delete Account
              </button>
           </div>
        </div>
      </div>
    </main>
  );
}
